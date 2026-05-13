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
    originalImageUrlType: getFacebookImageUrlType(originalImageUrl),
    resolvedImageUrlType: getFacebookImageUrlType(resolvedImageUrl),
    payloadPreview: {
      messageLength: String(post.content || post.topic || "").length,
      includesLink: Boolean(resolvedImageUrl),
      link: resolvedImageUrl || null,
    },
  };
}

/**
 * Builds the payload for the Facebook Graph API /feed endpoint.
 * @param {Object} post - The post object (topic, content, image_url, etc).
 * @param {Object} options - Optional parameters (published, scheduled_publish_time).
 * @returns {URLSearchParams}
 */
export function buildFacebookPostPayload(post, options = {}) {
  const diagnostics = getFacebookPublishDiagnostics(post);
  const params = new URLSearchParams();
  
  // Facebook uses 'message' for the main text body
  params.append("message", post.content || post.topic || "");
  
  // If an image URL is present, Facebook can attach it via link parameter
  if (diagnostics.resolvedImageUrl) {
    params.append("link", diagnostics.resolvedImageUrl);
  }
  
  // Scheduling options
  if (options.published === false) {
    params.append("published", "false");
    if (options.scheduled_publish_time) {
      // Must be a unix timestamp between 10 mins and 30 days in the future
      params.append("scheduled_publish_time", options.scheduled_publish_time.toString());
    }
  }

  return { params, diagnostics };
}

/**
 * Helper to extract readable error message from Facebook API response.
 */
function extractFacebookError(result, status) {
  if (result.error) {
    const code = result.error.code;
    const subcode = result.error.error_subcode;
    
    if (code === 190) return "Facebook Access Token expired or invalid. Please refresh it in Settings.";
    if (code === 200) return "Insufficient permissions. Ensure 'pages_manage_posts' is granted.";
    if (code === 100) return `Facebook Validation Error: ${result.error.message}`;
    
    return result.error.message || `Facebook Error (${code})`;
  }
  return `Facebook API Error: ${status}`;
}

/**
 * Publishes a post to the Facebook Page's feed immediately.
 * @param {Object} post - The post data.
 * @param {Object} settings - App settings containing tokens.
 * @returns {Promise<{data: any, error: string|null, mode: string}>}
 */
export async function publishFacebookPost(post, settings) {
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
    return {
      data: { id: "mock-facebook-post-id" },
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
    const { params: payload, diagnostics: payloadDiagnostics } = buildFacebookPostPayload(post);
    const url = `${FB_BASE_URL}/${settings.facebookPageId}/feed?access_token=${settings.facebookPageAccessToken}`;
    logger.info("Facebook publish payload prepared.", {
      publishMode: settings.facebookPublishMode,
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
      logger.error("Facebook Publish Failed:", msg, result);
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

    logger.info("Facebook Publish Successful.", result);
    return {
      data: result,
      error: null,
      mode: "connected",
      diagnostics: {
        ...payloadDiagnostics,
        publishMode: settings.facebookPublishMode,
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
    const { params: payload, diagnostics: payloadDiagnostics } = buildFacebookPostPayload(post, { 
      published: false, 
      scheduled_publish_time: scheduledTime 
    });
    const url = `${FB_BASE_URL}/${settings.facebookPageId}/feed?access_token=${settings.facebookPageAccessToken}`;
    logger.info("Facebook schedule payload prepared.", {
      publishMode: settings.facebookPublishMode,
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
      data: result,
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
