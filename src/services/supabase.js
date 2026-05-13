import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const POSTS_SELECT =
  "id, page_id, topic, content, image_prompt, image_url, image_provider, image_revised_prompt, image_storage_path, image_storage_mode, status, scheduled_at, posted_at, facebook_post_id, created_at, updated_at";
const POSTS_SELECT_FALLBACK =
  "id, page_id, topic, content, image_prompt, image_url, image_provider, image_revised_prompt, image_storage_path, image_storage_mode, status, scheduled_at, posted_at, created_at";
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
    status: post.status ?? "draft",
    scheduled_at: post.scheduled_at ?? null,
    posted_at: post.posted_at ?? null,
    facebook_post_id: post.facebook_post_id ?? null,
    created_at: post.created_at ?? new Date().toISOString(),
    updated_at: post.updated_at ?? post.created_at ?? new Date().toISOString(),
    source: post.source ?? "remote",
  };
}

function isMissingPostsColumnError(error) {
  return Boolean(
    error &&
      (error.code === "42703" ||
        /column .*posts\.(facebook_post_id|updated_at).* does not exist/i.test(error.message || ""))
  );
}

async function selectPostsQuery(builder, { single = false, maybeSingle = false } = {}) {
  let query = builder.select(POSTS_SELECT);
  if (single) query = query.single();
  if (maybeSingle) query = query.maybeSingle();

  let result = await query;
  if (result.error && isMissingPostsColumnError(result.error)) {
    let fallbackQuery = builder.select(POSTS_SELECT_FALLBACK);
    if (single) fallbackQuery = fallbackQuery.single();
    if (maybeSingle) fallbackQuery = fallbackQuery.maybeSingle();
    result = await fallbackQuery;
  }

  return result;
}

function buildStatusPayload(status, extraData = {}) {
  return {
    status,
    ...extraData,
    updated_at: extraData.updated_at || new Date().toISOString(),
  };
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
    return { data: [], error, mode: classifySupabaseError(error) };
  }

  return {
    data: (data ?? []).map((page) => normalizeWorkspacePage(page)),
    error: null,
    mode: "connected",
  };
}

function buildDraftPayload(draft = {}) {
  return {
    page_id: draft.page_id || "default",
    topic: draft.topic,
    content: draft.content,
    image_prompt: draft.image_prompt,
    image_url: draft.image_url,
    image_provider: draft.image_provider || null,
    image_revised_prompt: draft.image_revised_prompt || null,
    image_storage_path: draft.image_storage_path || null,
    image_storage_mode: draft.image_storage_mode || null,
    status: draft.status || "draft",
    scheduled_at: draft.scheduled_at || null,
    created_at: draft.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
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
  let query = supabase
    .from("posts")
    .select(POSTS_SELECT)
    .order("created_at", { ascending: false });
  let { data, error } = await query;

  if (error && isMissingPostsColumnError(error)) {
    query = supabase
      .from("posts")
      .select(POSTS_SELECT_FALLBACK)
      .order("created_at", { ascending: false });
    ({ data, error } = await query);
  }

  if (error) {
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

  let { data, error } = await selectPostsQuery(
    supabase
      .from("posts")
      .insert([payload]),
    { single: true }
  );

  if (error && isPageForeignKeyError(error)) {
    const ensuredPages = await ensureRemotePages(options.workspacePages || [], payload.page_id);
    if (!ensuredPages.error) {
      const validPageId = ensuredPages.data.some((page) => page.id === payload.page_id)
        ? payload.page_id
        : "default";
      payload = { ...payload, page_id: validPageId };
      const retryResult = await selectPostsQuery(
        supabase
          .from("posts")
          .insert([payload]),
        { single: true }
      );
      data = retryResult.data;
      error = retryResult.error;
    }
  }

  if (error) {
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

  let { data, error } = await selectPostsQuery(
    supabase
      .from("posts")
      .update(payload)
      .eq("id", postId),
    { single: true }
  );

  if (error && isPageForeignKeyError(error)) {
    const ensuredPages = await ensureRemotePages(options.workspacePages || [], payload.page_id);
    if (!ensuredPages.error) {
      const validPageId = ensuredPages.data.some((page) => page.id === payload.page_id)
        ? payload.page_id
        : "default";
      payload = { ...payload, page_id: validPageId };
      const retryResult = await selectPostsQuery(
        supabase
          .from("posts")
          .update(payload)
          .eq("id", postId),
        { single: true }
      );
      data = retryResult.data;
      error = retryResult.error;
    }
  }

  if (error) {
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

  const { data, error } = await selectPostsQuery(
    supabase
      .from("posts")
      .update(payload)
      .eq("id", postId),
    { single: true }
  );

  if (error) {
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

export async function fetchRemotePostById(postId) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  const { data, error } = await selectPostsQuery(
    supabase
      .from("posts")
      .eq("id", postId),
    { maybeSingle: true }
  );

  if (error) {
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
  let builder = supabase
    .from("posts")
    .update(payload)
    .eq("id", postId)
    .in("status", allowedStatuses);

  if (typeof extraFilters.scheduled_at !== "undefined") {
    builder = extraFilters.scheduled_at === null
      ? builder.is("scheduled_at", null)
      : builder.eq("scheduled_at", extraFilters.scheduled_at);
  }

  const { data, error } = await selectPostsQuery(builder, { maybeSingle: true });

  if (error) {
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

  let builder = supabase
    .from("posts")
    .update(fullPayload)
    .eq("id", postId)
    .eq("status", "publishing");

  let { data, error } = await selectPostsQuery(builder, { maybeSingle: true });

  if (error && isMissingPostsColumnError(error)) {
    const fallbackPayload = buildStatusPayload("posted", {
      posted_at: nextPostedAt,
      scheduled_at: null,
    });
    builder = supabase
      .from("posts")
      .update(fallbackPayload)
      .eq("id", postId)
      .eq("status", "publishing");
    ({ data, error } = await selectPostsQuery(builder, { maybeSingle: true }));
  }

  if (error) {
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

  const { data, error } = await selectPostsQuery(
    supabase
      .from("posts")
      .update(buildStatusPayload("failed", {
        scheduled_at: null,
      }))
      .eq("id", postId)
      .eq("status", "publishing"),
    { maybeSingle: true }
  );

  if (error) {
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
