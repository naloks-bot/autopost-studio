import { logger } from "./logger.js";
import { getPublicImageUrl } from "./storage.js";

/**
 * Facebook Graph API Service
 * Handles communication with the Facebook Graph API for posting and scheduling.
 * 
 * REQUIRED PERMISSIONS (Facebook App Review):
 * - pages_manage_posts (to publish content)
 * - pages_read_engagement
 * - pages_show_list
 */

const FB_API_VERSION = "v23.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

function normalizePageId(value = "") {
  return String(value || "").trim();
}

function getTokenFingerprint(token = "") {
  const value = String(token || "");
  if (!value) return "";

  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${(hash >>> 0).toString(16).padStart(8, "0")}:${value.slice(-4)}`;
}

function getImageUrlHost(value = "") {
  const next = String(value || "").trim();
  if (!next) return "";
  try {
    return new URL(next).host;
  } catch {
    return "";
  }
}

function getEndpointType(endpoint = "feed") {
  return endpoint === "photos" ? "photo_url" : "feed_text";
}

function sanitizeFacebookErrorPayload(payload) {
  const error = payload?.error || payload;
  if (!error || typeof error !== "object") return null;
  return {
    message: error.message || "",
    type: error.type || "",
    code: error.code || null,
    error_subcode: error.error_subcode || null,
    fbtrace_id: error.fbtrace_id || "",
  };
}

const FACEBOOK_PERMISSION_NAMES = [
  "pages_manage_posts",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_read_user_content",
  "pages_manage_ads",
  "pages_show_list",
  "pages_messaging",
];

function getMissingFacebookPermissions(message = "") {
  const text = String(message || "");
  return FACEBOOK_PERMISSION_NAMES.filter((permission) => text.includes(permission));
}

function getFacebookTokenRefreshMessage() {
  return "Facebook Page token หมดอายุ ไม่มีสิทธิ์ หรือไม่ตรงกับเพจ กรุณา refresh/re-save Page Access Token ใน Settings > Manage Pages แล้วลองใหม่";
}

function buildSanitizedLiveDiagnostics({
  post = {},
  settings = {},
  payloadDiagnostics = {},
  endpoint = "feed",
  endpointPageId = "",
  configuredPageId = "",
  pageTargetSource = "configured_page_id",
  pageTargetName = "",
  pageIdMismatch = false,
  pageLookupError = null,
  publishPath = "unknown",
  activeAppPageId = "",
  localPageKey = "",
  tokenProbePageId = "",
  missingPermissions = [],
} = {}) {
  const tokenSource = settings.facebookTokenSource || settings.facebookPublishSource || "unknown";
  const imageUrl = payloadDiagnostics.resolvedImageUrl || "";
  const graphPageId = endpointPageId || configuredPageId || "";
  const appPageId = activeAppPageId || settings.facebookWorkspacePageId || localPageKey || "";
  const probePageId = tokenProbePageId || (pageTargetSource === "token_profile_id" ? endpointPageId || "" : "");

  return {
    publish_path: publishPath,
    active_app_page_id: appPageId,
    local_page_key: localPageKey || appPageId,
    page_id: graphPageId,
    facebook_graph_page_id: graphPageId,
    configured_page_id: configuredPageId || "",
    token_probe_page_id: probePageId,
    token_profile_page_id: probePageId,
    token_owner_page_id_matches_target_page_id: Boolean(probePageId && graphPageId && probePageId === graphPageId),
    page_id_source: pageTargetSource,
    page_id_mismatch: Boolean(pageIdMismatch),
    page_name: pageTargetName || settings.facebookPageLabel || "",
    token_present: Boolean(settings.facebookPageAccessToken),
    token_fingerprint: getTokenFingerprint(settings.facebookPageAccessToken),
    token_source: tokenSource,
    endpoint_type: getEndpointType(endpoint),
    endpoint_path: `/${endpointPageId || configuredPageId || ""}/${endpoint}`,
    has_image: Boolean(imageUrl),
    image_url_host: getImageUrlHost(imageUrl),
    mode: settings.facebookPublishMode || "mock",
    post_id: post.id || null,
    title: post.topic || "",
    scheduled_at: post.scheduled_at || null,
    page_lookup_error: pageLookupError,
    missing_permissions: Array.isArray(missingPermissions) ? missingPermissions : [],
  };
}

export function getSanitizedFacebookPublishDiagnostics(post = {}, settings = {}, options = {}) {
  const {
    diagnostics: payloadDiagnostics,
    endpoint,
  } = buildFacebookPostPayload(post);
  const pageId = normalizePageId(options.endpointPageId || settings.facebookPageId);

  return buildSanitizedLiveDiagnostics({
    post,
    settings,
    payloadDiagnostics,
    endpoint,
    endpointPageId: pageId,
    configuredPageId: normalizePageId(options.configuredPageId || settings.facebookPageId),
    pageTargetSource: options.pageTargetSource || "configured_page_id",
    pageTargetName: options.pageTargetName || "",
    pageIdMismatch: options.pageIdMismatch || false,
    pageLookupError: options.pageLookupError || null,
    publishPath: options.publishPath || "unknown",
    activeAppPageId: options.activeAppPageId || settings.facebookWorkspacePageId || "",
    localPageKey: options.localPageKey || settings.facebookWorkspacePageId || "",
    tokenProbePageId: options.tokenProbePageId || "",
    missingPermissions: options.missingPermissions || [],
  });
}

/**
 * Validates if the required Facebook configuration is present.
 * @param {Object} settings - Application settings.
 * @returns {boolean}
 */
export function validateFacebookConfig(settings) {
  return Boolean(settings.facebookPageId && settings.facebookPageAccessToken);
}

function isUnsafeFacebookImageUrl(value = "") {
  const next = String(value || "").trim();
  if (!next) return false;
  if (
    next.startsWith("blob:") ||
    next.startsWith("data:") ||
    next.startsWith("file:") ||
    next.startsWith("http://localhost") ||
    next.startsWith("https://localhost") ||
    next.startsWith("http://127.0.0.1") ||
    next.startsWith("https://127.0.0.1")
  ) {
    return true;
  }

  try {
    const parsed = new URL(next);
    return parsed.protocol !== "http:" && parsed.protocol !== "https:";
  } catch {
    return true;
  }
}

export function getFacebookImageUrlType(value = "") {
  const next = String(value || "").trim();
  if (!next) return "empty";
  if (next.startsWith("blob:")) return "blob";
  if (next.startsWith("file:")) return "file";
  if (next.startsWith("data:")) return "data";
  if (
    next.startsWith("http://localhost") ||
    next.startsWith("https://localhost") ||
    next.startsWith("http://127.0.0.1") ||
    next.startsWith("https://127.0.0.1")
  ) {
    return "localhost";
  }

  try {
    const parsed = new URL(next);
    if (parsed.protocol === "https:") return "https";
    if (parsed.protocol === "http:") return "http";
    return parsed.protocol.replace(":", "") || "other";
  } catch {
    return "invalid";
  }
}

export function getFacebookPublishDiagnostics(post = {}) {
  const originalImageUrl = String(post.image_url || "").trim();
  const storageImageUrl =
    post.image_storage_mode === "supabase" && post.image_storage_path
      ? getPublicImageUrl(post.image_storage_path) || ""
      : "";
  const originalIsSafe = Boolean(originalImageUrl) && !isUnsafeFacebookImageUrl(originalImageUrl);
  const storageIsSafe = Boolean(storageImageUrl) && !isUnsafeFacebookImageUrl(storageImageUrl);
  const resolvedImageUrl = originalIsSafe ? originalImageUrl : storageIsSafe ? storageImageUrl : "";

  let imageStatus = "none";
  if (originalImageUrl && originalIsSafe) {
    imageStatus = "public-url";
  } else if (originalImageUrl && storageIsSafe) {
    imageStatus = "recovered-from-storage";
  } else if (originalImageUrl) {
    imageStatus = "unsafe-local-url";
  } else if (storageIsSafe) {
    imageStatus = "storage-url";
  }

  return {
    originalImageUrl,
    resolvedImageUrl,
    imageStatus,
    imageBlocked: Boolean(originalImageUrl && !resolvedImageUrl),
    publishTarget: resolvedImageUrl ? "photo" : "feed",
    originalImageUrlType: getFacebookImageUrlType(originalImageUrl),
    resolvedImageUrlType: getFacebookImageUrlType(resolvedImageUrl),
    payloadPreview: {
      messageLength: String(post.content || post.topic || "").length,
      includesImage: Boolean(resolvedImageUrl),
      imageUrl: resolvedImageUrl || null,
    },
  };
}

/**
 * Builds the payload for the Facebook Graph API publish endpoint.
 * @param {Object} post - The post object (topic, content, image_url, etc).
 * @param {Object} options - Optional parameters (published, scheduled_publish_time).
 * @returns {{params: URLSearchParams, diagnostics: Object, endpoint: string}}
 */
export function buildFacebookPostPayload(post, options = {}) {
  const diagnostics = getFacebookPublishDiagnostics(post);
  const params = new URLSearchParams();
  const message = post.content || post.topic || "";
  
  if (diagnostics.resolvedImageUrl) {
    params.append("url", diagnostics.resolvedImageUrl);
    if (message) {
      params.append("caption", message);
    }
  } else if (message) {
    params.append("message", message);
  }
  
  // Scheduling options
  if (options.published === false) {
    params.append("published", "false");
    if (options.scheduled_publish_time) {
      // Must be a unix timestamp between 10 mins and 30 days in the future
      params.append("scheduled_publish_time", options.scheduled_publish_time.toString());
    }
  }

  return {
    params,
    diagnostics,
    endpoint: diagnostics.resolvedImageUrl ? "photos" : "feed",
  };
}

/**
 * Helper to extract readable error message from Facebook API response.
 */
function extractFacebookError(result, status) {
  if (result.error) {
    const code = result.error.code;
    const subcode = result.error.error_subcode;
    const missingPermissions = getMissingFacebookPermissions(result.error.message);
    
    if (missingPermissions.length || code === 190 || code === 200) return getFacebookTokenRefreshMessage();
    if (code === 100) return `Facebook Validation Error: ${result.error.message}`;
    
    return result.error.message || `Facebook Error (${code})`;
  }
  return `Facebook API Error: ${status}`;
}

async function resolveLiveFacebookPageTarget(settings) {
  const configuredPageId = normalizePageId(settings.facebookPageId);
  const accessToken = String(settings.facebookPageAccessToken || "");

  if (!accessToken) {
    return {
      pageId: configuredPageId,
      configuredPageId,
      pageName: "",
      source: "configured_page_id",
      mismatch: false,
      tokenProbePageId: "",
      lookupError: null,
    };
  }

  try {
    const lookupUrl = new URL(`${FB_BASE_URL}/me`);
    lookupUrl.searchParams.set("fields", "id,name");
    lookupUrl.searchParams.set("access_token", accessToken);
    const response = await fetch(lookupUrl);
    const result = await response.json();

    if (!response.ok || !result?.id) {
      return {
        pageId: configuredPageId,
        configuredPageId,
        pageName: "",
        source: "configured_page_id",
        mismatch: false,
        tokenProbePageId: "",
        lookupError: sanitizeFacebookErrorPayload(result) || { status: response.status },
      };
    }

    const tokenPageId = normalizePageId(result.id);
    const mismatch = Boolean(configuredPageId && tokenPageId && configuredPageId !== tokenPageId);

    return {
      pageId: tokenPageId || configuredPageId,
      configuredPageId,
      pageName: result.name || "",
      source: mismatch || !configuredPageId ? "token_profile_id" : "configured_page_id",
      mismatch,
      tokenProbePageId: tokenPageId,
      lookupError: null,
    };
  } catch (error) {
    return {
      pageId: configuredPageId,
      configuredPageId,
      pageName: "",
      source: "configured_page_id",
      mismatch: false,
      tokenProbePageId: "",
      lookupError: { message: error?.message || "Facebook page token lookup failed" },
    };
  }
}

/**
 * Publishes a post to the Facebook Page's feed immediately.
 * @param {Object} post - The post data.
 * @param {Object} settings - App settings containing tokens.
 * @returns {Promise<{data: any, error: string|null, mode: string}>}
 */
export async function publishFacebookPost(post, settings, options = {}) {
  const diagnostics = getFacebookPublishDiagnostics(post);
  if (!validateFacebookConfig(settings)) {
    logger.warn("Facebook configuration missing during publish attempt.");
    return { 
      data: null, 
      error: "Missing Facebook Page ID or Access Token", 
      mode: "mock",
      diagnostics,
      facebookErrorPayload: null,
    };
  }

  if (settings.facebookPublishMode !== "live") {
    logger.info("Facebook Publish (MOCK MODE): Simulating success...");
    const mockDiagnostics = getSanitizedFacebookPublishDiagnostics(post, settings);
    if (options.onDiagnostics) {
      await options.onDiagnostics(mockDiagnostics);
    }
    return {
      data: { id: "mock-facebook-post-id" },
      error: null,
      mode: "mock",
      diagnostics: {
        ...diagnostics,
        publishMode: settings.facebookPublishMode || "mock",
        sanitized: mockDiagnostics,
      },
      facebookErrorPayload: null,
    };
  }

  if (diagnostics.imageBlocked) {
    const error = "Image publish requires a public HTTPS image URL. Supabase persistence is not ready for this post.";
    logger.warn("Facebook publish blocked due to unsafe image URL.", {
      publishMode: settings.facebookPublishMode,
      imageUrlType: diagnostics.originalImageUrlType,
      resolvedImageUrlType: diagnostics.resolvedImageUrlType,
      originalImageUrl: diagnostics.originalImageUrl || null,
    });
    return {
      data: null,
      error,
      mode: "connected",
      diagnostics: {
        ...diagnostics,
        publishMode: settings.facebookPublishMode,
      },
      facebookErrorPayload: null,
    };
  }

  logger.info(`Publishing to Facebook Page: ${settings.facebookPageId}`);
  try {
    const {
      params: payload,
      diagnostics: payloadDiagnostics,
      endpoint,
    } = buildFacebookPostPayload(post);
    const pageTarget = await resolveLiveFacebookPageTarget(settings);
    if (!pageTarget.pageId) {
      return {
        data: null,
        error: "Missing Facebook Page ID after live token validation.",
        mode: "connected",
        diagnostics: {
          ...payloadDiagnostics,
          publishMode: settings.facebookPublishMode,
        },
        facebookErrorPayload: null,
      };
    }

    const sanitizedDiagnostics = buildSanitizedLiveDiagnostics({
      post,
      settings,
      payloadDiagnostics,
      endpoint,
      endpointPageId: pageTarget.pageId,
      configuredPageId: pageTarget.configuredPageId,
      pageTargetSource: pageTarget.source,
      pageTargetName: pageTarget.pageName,
      pageIdMismatch: pageTarget.mismatch,
      pageLookupError: pageTarget.lookupError,
      publishPath: options.publishPath || "manual",
      activeAppPageId: options.activeAppPageId || settings.facebookWorkspacePageId || "",
      localPageKey: options.localPageKey || settings.facebookWorkspacePageId || "",
      tokenProbePageId: pageTarget.tokenProbePageId || "",
      missingPermissions: getMissingFacebookPermissions(pageTarget.lookupError?.message || ""),
    });
    logger.info("Facebook live publish diagnostics.", sanitizedDiagnostics);
    if (options.onDiagnostics) {
      await options.onDiagnostics(sanitizedDiagnostics);
    }

    const url = `${FB_BASE_URL}/${pageTarget.pageId}/${endpoint}?access_token=${settings.facebookPageAccessToken}`;
    logger.info("Facebook publish payload prepared.", {
      publishMode: settings.facebookPublishMode,
      publishTarget: payloadDiagnostics.publishTarget,
      imageUrlType: payloadDiagnostics.resolvedImageUrlType,
      ...payloadDiagnostics.payloadPreview,
    });

    const response = await fetch(url, {
      method: "POST",
      body: payload,
    });

    const result = await response.json();

    if (!response.ok) {
      const msg = extractFacebookError(result, response.status);
      const facebookErrorPayload = sanitizeFacebookErrorPayload(result) || result?.error || result;
      const missingPermissions = Array.from(new Set([
        ...getMissingFacebookPermissions(pageTarget.lookupError?.message || ""),
        ...getMissingFacebookPermissions(result?.error?.message || ""),
      ]));
      logger.error("Facebook Publish Failed:", msg, facebookErrorPayload);
      return {
        data: null,
        error: msg,
        mode: "connected",
        diagnostics: {
          ...payloadDiagnostics,
          publishMode: settings.facebookPublishMode,
          sanitized: {
            ...sanitizedDiagnostics,
            missing_permissions: missingPermissions,
          },
        },
        facebookErrorPayload,
      };
    }

    logger.info("Facebook Publish Successful.", result);
    return {
      data: {
        ...result,
        id: result.post_id || result.id || null,
      },
      error: null,
      mode: "connected",
      diagnostics: {
        ...payloadDiagnostics,
        publishMode: settings.facebookPublishMode,
        sanitized: sanitizedDiagnostics,
      },
      facebookErrorPayload: null,
    };
  } catch (err) {
    logger.error("Network or API error during Facebook publish:", err);
    return {
      data: null,
      error: err.message,
      mode: "connected",
      diagnostics: {
        ...diagnostics,
        publishMode: settings.facebookPublishMode,
      },
      facebookErrorPayload: null,
    };
  }
}

/**
 * Schedules a post for future publication.
 * @param {Object} post - The post data.
 * @param {number} scheduledTime - Unix timestamp for publication.
 * @param {Object} settings - App settings.
 * @returns {Promise<{data: any, error: string|null, mode: string}>}
 */
export async function scheduleFacebookPost(post, scheduledTime, settings) {
  const diagnostics = getFacebookPublishDiagnostics(post);
  if (!validateFacebookConfig(settings)) {
    return { 
      data: null, 
      error: "Missing Facebook Page ID or Access Token", 
      mode: "mock",
      diagnostics,
      facebookErrorPayload: null,
    };
  }

  if (settings.facebookPublishMode !== "live") {
    logger.info("Facebook Schedule (MOCK MODE): Simulating success...");
    return {
      data: { id: "mock-facebook-schedule-id" },
      error: null,
      mode: "mock",
      diagnostics: {
        ...diagnostics,
        publishMode: settings.facebookPublishMode || "mock",
      },
      facebookErrorPayload: null,
    };
  }

  if (diagnostics.imageBlocked) {
    const error = "Scheduled image publish requires a public HTTPS image URL. Supabase persistence is not ready for this post.";
    logger.warn("Facebook schedule blocked due to unsafe image URL.", {
      publishMode: settings.facebookPublishMode,
      imageUrlType: diagnostics.originalImageUrlType,
      resolvedImageUrlType: diagnostics.resolvedImageUrlType,
      originalImageUrl: diagnostics.originalImageUrl || null,
    });
    return {
      data: null,
      error,
      mode: "connected",
      diagnostics: {
        ...diagnostics,
        publishMode: settings.facebookPublishMode,
      },
      facebookErrorPayload: null,
    };
  }

  logger.info(`Scheduling Facebook post for timestamp: ${scheduledTime}`);
  try {
    const {
      params: payload,
      diagnostics: payloadDiagnostics,
      endpoint,
    } = buildFacebookPostPayload(post, { 
      published: false, 
      scheduled_publish_time: scheduledTime 
    });
    const url = `${FB_BASE_URL}/${settings.facebookPageId}/${endpoint}?access_token=${settings.facebookPageAccessToken}`;
    logger.info("Facebook schedule payload prepared.", {
      publishMode: settings.facebookPublishMode,
      publishTarget: payloadDiagnostics.publishTarget,
      imageUrlType: payloadDiagnostics.resolvedImageUrlType,
      ...payloadDiagnostics.payloadPreview,
    });

    const response = await fetch(url, {
      method: "POST",
      body: payload,
    });

    const result = await response.json();

    if (!response.ok) {
      const msg = extractFacebookError(result, response.status);
      logger.error("Facebook Schedule Failed:", msg, result);
      return {
        data: null,
        error: msg,
        mode: "connected",
        diagnostics: {
          ...payloadDiagnostics,
          publishMode: settings.facebookPublishMode,
        },
        facebookErrorPayload: result?.error || result,
      };
    }

    logger.info("Facebook Schedule Successful.", result);
    return {
      data: {
        ...result,
        id: result.post_id || result.id || null,
      },
      error: null,
      mode: "connected",
      diagnostics: {
        ...payloadDiagnostics,
        publishMode: settings.facebookPublishMode,
      },
      facebookErrorPayload: null,
    };
  } catch (err) {
    logger.error("Network or API error during Facebook schedule:", err);
    return {
      data: null,
      error: err.message,
      mode: "connected",
      diagnostics: {
        ...diagnostics,
        publishMode: settings.facebookPublishMode,
      },
      facebookErrorPayload: null,
    };
  }
}
