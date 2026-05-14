import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger.js";
import { deriveHookFromContent, normalizeQualityChecklist } from "./content-stock.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const POSTS_SELECT =
  "id, page_id, topic, content, image_prompt, image_url, image_provider, image_revised_prompt, image_storage_path, image_storage_mode, hook, content_pillar, approved_at, quality_checklist, status, scheduled_at, posted_at, facebook_post_id, created_at, updated_at";
const POSTS_SELECT_FALLBACK =
  "id, page_id, topic, content, image_prompt, image_url, image_provider, image_revised_prompt, image_storage_path, image_storage_mode, status, scheduled_at, posted_at, created_at";
const POSTS_SELECT_LEGACY =
  "id, page_id, topic, content, image_prompt, image_url, status, scheduled_at, posted_at, created_at";
const POSTS_SELECT_BASE =
  "id, topic, content, image_prompt, image_url, status, scheduled_at, posted_at, created_at";
const POSTS_SELECT_VARIANTS = [POSTS_SELECT, POSTS_SELECT_FALLBACK, POSTS_SELECT_LEGACY, POSTS_SELECT_BASE];
const POSTS_SELECT_VARIANT_LABELS = ["full", "current-no-audit", "legacy-page-aware", "legacy-base"];
const PAGES_SELECT =
  "id, label, description, facebook_page_id, facebook_page_access_token, created_at, updated_at";
const PAGES_SELECT_FALLBACK =
  "id, facebook_page_id, facebook_page_access_token, created_at, updated_at";
const SETTINGS_SELECT =
  "id, workspace_name, business_name, brand_voice, default_topic_hint, openai_api_key, gemini_api_key, facebook_app_id, facebook_app_secret, facebook_page_id, facebook_page_access_token, facebook_publish_mode, scheduler_enabled, created_at, updated_at";

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!hasSupabaseConfig) {
  logger.warn("Supabase environment variables are missing (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY).");
}

export const supabase = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const postsSchemaFallbackWarnings = new Set();

export function getSupabaseEnvSnapshot() {
  return {
    url: SUPABASE_URL ?? "",
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
  };
}

export function normalizePost(post) {
  return {
    id: post.id ?? `local-${Date.now()}`,
    page_id: post.page_id ?? "default",
    topic: post.topic ?? "",
    content: post.content ?? "",
    image_prompt: post.image_prompt ?? "",
    image_url: post.image_url ?? "",
    image_provider: post.image_provider ?? null,
    image_revised_prompt: post.image_revised_prompt ?? null,
    image_storage_path: post.image_storage_path ?? null,
    image_storage_mode: post.image_storage_mode ?? null,
    hook: post.hook ?? deriveHookFromContent(post.content, post.topic),
    content_pillar: post.content_pillar ?? "",
    approved_at: post.approved_at ?? null,
    quality_checklist: normalizeQualityChecklist(post.quality_checklist),
    status: post.status ?? "draft",
    scheduled_at: post.scheduled_at ?? null,
    posted_at: post.posted_at ?? null,
    facebook_post_id: post.facebook_post_id ?? null,
    created_at: post.created_at ?? new Date().toISOString(),
    updated_at: post.updated_at ?? post.created_at ?? new Date().toISOString(),
    source: post.source ?? "remote",
  };
}

function sanitizeLogValue(value, maxLength = 240) {
  const next = String(value || "").replace(/\s+/g, " ").trim();
  if (!next) return "";
  return next.length <= maxLength ? next : `${next.slice(0, maxLength - 3)}...`;
}

function sanitizeSupabaseError(error) {
  if (!error) {
    return { message: "Unknown Supabase error" };
  }

  return removeUndefinedEntries({
    code: typeof error.code === "string" ? error.code : undefined,
    message: sanitizeLogValue(error.message || "Unknown Supabase error"),
    details: sanitizeLogValue(error.details),
    hint: sanitizeLogValue(error.hint),
  });
}

function logSupabaseOperationError(operation, error) {
  const sanitized = sanitizeSupabaseError(error);
  const summary = `[AutoPost Supabase] ${operation} failed${sanitized.code ? ` (${sanitized.code})` : ""}: ${sanitized.message}`;
  logger.warn(summary, sanitized);
  if (import.meta.env.PROD) {
    console.warn(summary, sanitized);
  }
}

function warnPostsSchemaFallbackOnce(key, summary, details) {
  if (postsSchemaFallbackWarnings.has(key)) {
    return;
  }

  postsSchemaFallbackWarnings.add(key);
  logger.warn(summary, details);
  if (import.meta.env.PROD) {
    console.warn(summary, details);
  }
}

function isMissingPostsColumnError(error) {
  const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.code === "PGRST204" ||
        /column .*posts\.[a-z_]+.* does not exist/i.test(message) ||
        /Could not find the '[a-z_]+' column of 'posts' in the schema cache/i.test(message))
  );
}

function applyRowMode(query, { single = false, maybeSingle = false } = {}) {
  if (single) query = query.single();
  if (maybeSingle) query = query.maybeSingle();
  return query;
}

async function selectPostsQuery(buildQuery, options = {}) {
  let result = null;

  for (const [index, columns] of POSTS_SELECT_VARIANTS.entries()) {
    result = await applyRowMode(buildQuery(columns), options);
    if (!result.error || !isMissingPostsColumnError(result.error)) {
      if (!result.error && index > 0) {
        const operation = options.operation || "posts";
        warnPostsSchemaFallbackOnce(
          `select:${operation}:${POSTS_SELECT_VARIANT_LABELS[index]}`,
          `[AutoPost Supabase] ${operation} used posts schema fallback: ${POSTS_SELECT_VARIANT_LABELS[index]}`,
          {
            operation,
            fallback: POSTS_SELECT_VARIANT_LABELS[index],
          }
        );
      }
      return result;
    }
  }

  return result;
}

function removeUndefinedEntries(record = {}) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => typeof value !== "undefined"));
}

function stripPostsWriteColumns(payload = {}, columns = []) {
  const nextPayload = { ...payload };
  for (const column of columns) {
    delete nextPayload[column];
  }
  return removeUndefinedEntries(nextPayload);
}

function buildPostsWritePayloadVariants(payload = {}) {
  const variants = [
    removeUndefinedEntries(payload),
    stripPostsWriteColumns(payload, [
      "updated_at",
      "facebook_post_id",
      "image_provider",
      "image_revised_prompt",
      "image_storage_path",
      "image_storage_mode",
      "hook",
      "content_pillar",
      "approved_at",
      "quality_checklist",
    ]),
    stripPostsWriteColumns(payload, [
      "updated_at",
      "facebook_post_id",
      "image_provider",
      "image_revised_prompt",
      "image_storage_path",
      "image_storage_mode",
      "hook",
      "content_pillar",
      "approved_at",
      "quality_checklist",
      "page_id",
    ]),
  ];

  return variants.filter((variant, index) => {
    const serialized = JSON.stringify(variant);
    return variants.findIndex((candidate) => JSON.stringify(candidate) === serialized) === index;
  });
}

async function writePostsMutation(buildMutation, payload, options = {}) {
  let result = null;

  for (const [index, variantPayload] of buildPostsWritePayloadVariants(payload).entries()) {
    result = await selectPostsQuery((columns) => buildMutation(variantPayload).select(columns), options);
    if (!result.error || !isMissingPostsColumnError(result.error)) {
      if (!result.error && index > 0) {
        const operation = options.operation || "posts";
        const omittedColumns = Object.keys(payload).filter((key) => !(key in variantPayload));
        warnPostsSchemaFallbackOnce(
          `write:${operation}:${index}`,
          `[AutoPost Supabase] ${operation} used legacy posts write fallback`,
          {
            operation,
            fallback: `write-variant-${index}`,
            omittedColumns,
          }
        );
      }
      return result;
    }
  }

  return result;
}

function buildStatusPayload(status, extraData = {}) {
  return removeUndefinedEntries({
    status,
    ...extraData,
    updated_at: extraData.updated_at || new Date().toISOString(),
  });
}

function normalizeWorkspacePage(record) {
  const fallbackLabel =
    record.label ??
    record.name ??
    record.title ??
    (record.id === "default"
      ? "Default Page"
      : record.id === "demo-mock"
        ? "Demo / Mock Page"
        : "Untitled Page");
  const fallbackDescription =
    record.description ??
    record.summary ??
    (record.id === "default"
      ? "Current stable Facebook settings"
      : record.id === "demo-mock"
        ? "Simulation for workspace testing"
        : "");

  return {
    id: record.id ?? "default",
    label: fallbackLabel,
    description: fallbackDescription,
    facebookPageId: record.facebook_page_id ?? "",
    facebookPageAccessToken: record.facebook_page_access_token ?? "",
  };
}

function isMissingPagesColumnError(error) {
  return Boolean(
    error &&
      (error.code === "42703" || /column .*pages\.(label|description).* does not exist/i.test(error.message || ""))
  );
}

function classifySupabaseError(error) {
  if (!error) return "connected";

  logger.error("Supabase Error Caught:", error);

  if (
    error.code === "42501" ||
    error.code === "401" ||
    /row-level security/i.test(error.message)
  ) {
    return "read-only";
  }

  if (error.code === "42P01" || /relation .* does not exist/i.test(error.message)) {
    return "missing-table";
  }

  if (error.code === "PGRST116" || /contains 0 rows/i.test(error.message)) {
    return "empty";
  }

  return "error";
}

function isPageForeignKeyError(error) {
  return Boolean(
    error &&
      error.code === "23503" &&
      /posts_page_id_fkey|page_id/i.test(`${error.message || ""} ${error.details || ""}`)
  );
}

function buildRemotePagePayload(page = {}) {
  return {
    id: page.id || "default",
    label: page.label || "Default Page",
    description: page.description || "",
    facebook_page_id: page.facebookPageId || "",
    facebook_page_access_token: page.facebookPageAccessToken || "",
    updated_at: new Date().toISOString(),
  };
}

function applyScheduledAtFilter(query, extraFilters = {}) {
  if (typeof extraFilters.scheduled_at === "undefined") {
    return query;
  }

  return extraFilters.scheduled_at === null
    ? query.is("scheduled_at", null)
    : query.eq("scheduled_at", extraFilters.scheduled_at);
}

async function ensureRemotePages(workspacePages = [], requestedPageId = "default") {
  if (!supabase) {
    return { data: [], error: new Error("Missing Supabase environment variables."), mode: "offline" };
  }

  const pageMap = new Map();
  const requestedPage =
    workspacePages.find((page) => page.id === requestedPageId) ||
    workspacePages.find((page) => page.id === "default") || {
      id: "default",
      label: "Default Page",
      description: "Current stable Facebook settings",
      facebookPageId: "",
      facebookPageAccessToken: "",
    };

  for (const page of workspacePages) {
    pageMap.set(page.id, buildRemotePagePayload(page));
  }
  pageMap.set(requestedPage.id, buildRemotePagePayload(requestedPage));
  if (!pageMap.has("default")) {
    pageMap.set("default", buildRemotePagePayload({
      id: "default",
      label: "Default Page",
      description: "Current stable Facebook settings",
    }));
  }
  if (!pageMap.has("demo-mock")) {
    pageMap.set("demo-mock", buildRemotePagePayload({
      id: "demo-mock",
      label: "Demo / Mock Page",
      description: "Simulation for workspace testing",
    }));
  }

  const { data, error } = await supabase
    .from("pages")
    .upsert(Array.from(pageMap.values()))
    .select(PAGES_SELECT);

  if (error) {
    logSupabaseOperationError("ensureRemotePages", error);
    return { data: [], error, mode: classifySupabaseError(error) };
  }

  return {
    data: (data ?? []).map((page) => normalizeWorkspacePage(page)),
    error: null,
    mode: "connected",
  };
}

function buildDraftPayload(draft = {}) {
  return removeUndefinedEntries({
    page_id: draft.page_id || "default",
    topic: draft.topic,
    content: draft.content,
    image_prompt: draft.image_prompt,
    image_url: draft.image_url,
    image_provider: draft.image_provider || null,
    image_revised_prompt: draft.image_revised_prompt || null,
    image_storage_path: draft.image_storage_path || null,
    image_storage_mode: draft.image_storage_mode || null,
    hook: draft.hook || deriveHookFromContent(draft.content, draft.topic),
    content_pillar: draft.content_pillar || "",
    approved_at: draft.approved_at || null,
    quality_checklist: normalizeQualityChecklist(draft.quality_checklist),
    status: draft.status || "draft",
    scheduled_at: draft.scheduled_at || null,
    created_at: draft.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function fetchRemotePosts() {
  if (!supabase) {
    return {
      data: [],
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info("Fetching remote posts...");
  const { data, error } = await selectPostsQuery(
    (columns) =>
      supabase
        .from("posts")
        .select(columns)
        .order("created_at", { ascending: false }),
    { operation: "fetchRemotePosts" }
  );

  if (error) {
    logSupabaseOperationError("fetchRemotePosts", error);
    return { data: [], error, mode: classifySupabaseError(error) };
  }

  logger.info(`Fetched ${data?.length || 0} posts from Supabase.`);
  return {
    data: (data ?? []).map((post) => normalizePost({ ...post, source: "remote" })),
    error: null,
    mode: "connected",
  };
}

export async function fetchRemotePages() {
  if (!supabase) {
    return {
      data: [],
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info("Fetching remote workspace pages...");
  let { data, error } = await supabase
    .from("pages")
    .select(PAGES_SELECT)
    .order("created_at", { ascending: true });

  if (error && isMissingPagesColumnError(error)) {
    logger.warn("Pages table is using an older schema. Falling back to minimal page fields.", error);
    const fallbackResult = await supabase
      .from("pages")
      .select(PAGES_SELECT_FALLBACK)
      .order("created_at", { ascending: true });
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    return { data: [], error, mode: classifySupabaseError(error) };
  }

  logger.info(`Fetched ${data?.length || 0} workspace pages from Supabase.`);
  return {
    data: (data ?? []).map((page) => normalizeWorkspacePage(page)),
    error: null,
    mode: "connected",
  };
}

export async function saveRemotePages(workspacePages = []) {
  if (!supabase) {
    return {
      data: [],
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  const ensuredPages = await ensureRemotePages(workspacePages, "default");
  if (ensuredPages.error) {
    return {
      data: [],
      error: ensuredPages.error,
      mode: ensuredPages.mode,
    };
  }

  return {
    data: ensuredPages.data,
    error: null,
    mode: ensuredPages.mode,
  };
}

export async function insertRemoteDraft(draft, options = {}) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info("Inserting remote draft...");
  let payload = buildDraftPayload(draft);

  let { data, error } = await writePostsMutation(
    (nextPayload) => supabase.from("posts").insert([nextPayload]),
    payload,
    { single: true, operation: "insertRemoteDraft" }
  );

  if (error && isPageForeignKeyError(error)) {
    const ensuredPages = await ensureRemotePages(options.workspacePages || [], payload.page_id);
    if (!ensuredPages.error) {
      const validPageId = ensuredPages.data.some((page) => page.id === payload.page_id)
        ? payload.page_id
        : "default";
      payload = { ...payload, page_id: validPageId };
      const retryResult = await writePostsMutation(
        (nextPayload) => supabase.from("posts").insert([nextPayload]),
        payload,
        { single: true, operation: "insertRemoteDraftRetry" }
      );
      data = retryResult.data;
      error = retryResult.error;
    }
  }

  if (error) {
    logSupabaseOperationError("insertRemoteDraft", error);
    return {
      data: null,
      error,
      mode: classifySupabaseError(error),
    };
  }

  logger.info("Remote draft insertion successful.");
  return {
    data: normalizePost({ ...data, source: "remote" }),
    error: null,
    mode: "connected",
  };
}

export async function updateRemoteDraft(postId, draft, options = {}) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info(`Updating remote draft ${postId}...`);
  let payload = buildDraftPayload(draft);

  let { data, error } = await writePostsMutation(
    (nextPayload) => supabase.from("posts").update(nextPayload).eq("id", postId),
    payload,
    { single: true, operation: "updateRemoteDraft" }
  );

  if (error && isPageForeignKeyError(error)) {
    const ensuredPages = await ensureRemotePages(options.workspacePages || [], payload.page_id);
    if (!ensuredPages.error) {
      const validPageId = ensuredPages.data.some((page) => page.id === payload.page_id)
        ? payload.page_id
        : "default";
      payload = { ...payload, page_id: validPageId };
      const retryResult = await writePostsMutation(
        (nextPayload) => supabase.from("posts").update(nextPayload).eq("id", postId),
        payload,
        { single: true, operation: "updateRemoteDraftRetry" }
      );
      data = retryResult.data;
      error = retryResult.error;
    }
  }

  if (error) {
    logSupabaseOperationError("updateRemoteDraft", error);
    return {
      data: null,
      error,
      mode: classifySupabaseError(error),
    };
  }

  logger.info("Remote draft update successful.");
  return {
    data: normalizePost({ ...data, source: "remote" }),
    error: null,
    mode: "connected",
  };
}

export async function updateRemotePostStatus(postId, status, extraData = {}) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info(`Updating status for post ${postId} to: ${status}`);
  const payload = buildStatusPayload(status, extraData);

  const { data, error } = await writePostsMutation(
    (nextPayload) => supabase.from("posts").update(nextPayload).eq("id", postId),
    payload,
    { single: true, operation: "updateRemotePostStatus" }
  );

  if (error) {
    logSupabaseOperationError("updateRemotePostStatus", error);
    return {
      data: null,
      error,
      mode: classifySupabaseError(error),
    };
  }

  logger.info("Post status update successful.");
  const latest = await fetchRemotePostById(postId);
  return {
    data: latest.data || normalizePost({ ...data, source: "remote" }),
    error: null,
    mode: "connected",
  };
}

export async function deleteRemotePost(postId) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info(`Deleting remote post ${postId}...`);
  const { data, error } = await selectPostsQuery(
    (columns) => supabase.from("posts").delete().eq("id", postId).select(columns),
    { single: true, operation: "deleteRemotePost" }
  );

  if (error) {
    logSupabaseOperationError("deleteRemotePost", error);
    return {
      data: null,
      error,
      mode: classifySupabaseError(error),
    };
  }

  return {
    data: data ? normalizePost({ ...data, source: "remote" }) : null,
    error: null,
    mode: "connected",
  };
}

export async function fetchRemotePostById(postId) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  const { data, error } = await selectPostsQuery(
    (columns) => supabase.from("posts").select(columns).eq("id", postId),
    { maybeSingle: true, operation: "fetchRemotePostById" }
  );

  if (error) {
    logSupabaseOperationError("fetchRemotePostById", error);
    return { data: null, error, mode: classifySupabaseError(error) };
  }

  if (!data) {
    return { data: null, error: null, mode: "empty" };
  }

  return {
    data: normalizePost({ ...data, source: "remote" }),
    error: null,
    mode: "connected",
  };
}

export async function claimRemotePostForPublishing(postId, allowedStatuses = ["draft", "scheduled", "failed"], extraFilters = {}) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
      claimed: false,
    };
  }

  const payload = buildStatusPayload("publishing");
  const { data, error } = await writePostsMutation(
    (nextPayload) =>
      applyScheduledAtFilter(
        supabase
          .from("posts")
          .update(nextPayload)
          .eq("id", postId)
          .in("status", allowedStatuses),
        extraFilters
      ),
    payload,
    { maybeSingle: true, operation: "claimRemotePostForPublishing" }
  );

  if (error) {
    logSupabaseOperationError("claimRemotePostForPublishing", error);
    return {
      data: null,
      error,
      mode: classifySupabaseError(error),
      claimed: false,
    };
  }

  if (!data) {
    const latest = await fetchRemotePostById(postId);
    return {
      data: latest.data,
      error: null,
      mode: latest.mode,
      claimed: false,
    };
  }

  const latest = await fetchRemotePostById(postId);
  return {
    data: latest.data || normalizePost({ ...data, source: "remote" }),
    error: null,
    mode: "connected",
    claimed: true,
  };
}

export async function finalizeRemotePublishedPost(postId, { postedAt, facebookPostId } = {}) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  const nextPostedAt = postedAt || new Date().toISOString();
  const fullPayload = buildStatusPayload("posted", {
    posted_at: nextPostedAt,
    scheduled_at: null,
    facebook_post_id: facebookPostId || null,
  });

  const { data, error } = await writePostsMutation(
    (payload) =>
      supabase
        .from("posts")
        .update(payload)
        .eq("id", postId)
        .eq("status", "publishing"),
    fullPayload,
    { maybeSingle: true, operation: "finalizeRemotePublishedPost" }
  );

  if (error) {
    logSupabaseOperationError("finalizeRemotePublishedPost", error);
    return { data: null, error, mode: classifySupabaseError(error) };
  }

  if (!data) {
    const latest = await fetchRemotePostById(postId);
    return { data: latest.data, error: null, mode: latest.mode };
  }

  const latest = await fetchRemotePostById(postId);
  return {
    data: latest.data || normalizePost({ ...data, source: "remote" }),
    error: null,
    mode: "connected",
  };
}

export async function markRemotePostFailed(postId) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  const payload = buildStatusPayload("failed", {
    scheduled_at: null,
  });
  const { data, error } = await writePostsMutation(
    (nextPayload) =>
      supabase
        .from("posts")
        .update(nextPayload)
        .eq("id", postId)
        .eq("status", "publishing"),
    payload,
    { maybeSingle: true, operation: "markRemotePostFailed" }
  );

  if (error) {
    logSupabaseOperationError("markRemotePostFailed", error);
    return { data: null, error, mode: classifySupabaseError(error) };
  }

  if (!data) {
    const latest = await fetchRemotePostById(postId);
    return { data: latest.data, error: null, mode: latest.mode };
  }

  const latest = await fetchRemotePostById(postId);
  return {
    data: latest.data || normalizePost({ ...data, source: "remote" }),
    error: null,
    mode: "connected",
  };
}

export function normalizeSettings(record) {
  return {
    workspaceName: record.workspace_name ?? "",
    businessName: record.business_name ?? "",
    brandVoice: record.brand_voice ?? "",
    defaultTopicHint: record.default_topic_hint ?? "",
    openaiApiKey: record.openai_api_key || undefined,
    geminiApiKey: record.gemini_api_key || undefined,
    facebookAppId: record.facebook_app_id ?? "",
    facebookAppSecret: record.facebook_app_secret ?? "",
    facebookPageId: record.facebook_page_id ?? "",
    facebookPageAccessToken: record.facebook_page_access_token ?? "",
    facebookPublishMode: record.facebook_publish_mode ?? "mock",
    schedulerEnabled: record.scheduler_enabled ?? false,
  };
}

export async function fetchRemoteSettings() {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info("Fetching remote settings...");
  const { data, error } = await supabase
    .from("app_settings")
    .select(SETTINGS_SELECT)
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return { data: null, error, mode: classifySupabaseError(error) };
  }

  if (!data) {
    logger.info("No remote settings found. Using local defaults.");
    return { data: null, error: null, mode: "empty" };
  }

  logger.info("Remote settings loaded successfully.");
  return { data: normalizeSettings(data), error: null, mode: "connected" };
}

export async function saveRemoteSettings(settings) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info("Saving remote settings...");
  const payload = {
    id: "default",
    workspace_name: settings.workspaceName,
    business_name: settings.businessName,
    brand_voice: settings.brandVoice,
    default_topic_hint: settings.defaultTopicHint,
    openai_api_key: settings.openaiApiKey,
    gemini_api_key: settings.geminiApiKey,
    facebook_app_id: settings.facebookAppId,
    facebook_app_secret: settings.facebookAppSecret,
    facebook_page_id: settings.facebookPageId,
    facebook_page_access_token: settings.facebookPageAccessToken,
    facebook_publish_mode: settings.facebookPublishMode || "mock",
    scheduler_enabled: settings.schedulerEnabled ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(payload)
    .select(SETTINGS_SELECT)
    .single();

  if (error) {
    return { data: null, error, mode: classifySupabaseError(error) };
  }

  logger.info("Remote settings saved successfully.");
  return { data: normalizeSettings(data), error: null, mode: "connected" };
}
