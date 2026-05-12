import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const POSTS_SELECT =
  "id, page_id, topic, content, image_prompt, image_url, image_provider, image_revised_prompt, image_storage_path, image_storage_mode, status, scheduled_at, posted_at, created_at";
const PAGES_SELECT =
  "id, label, description, facebook_page_id, facebook_page_access_token, created_at, updated_at";
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
    created_at: post.created_at ?? new Date().toISOString(),
    source: post.source ?? "remote",
  };
}

function normalizeWorkspacePage(record) {
  return {
    id: record.id ?? "default",
    label: record.label ?? "Untitled Page",
    description: record.description ?? "",
    facebookPageId: record.facebook_page_id ?? "",
    facebookPageAccessToken: record.facebook_page_access_token ?? "",
  };
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

export async function fetchRemotePosts() {
  if (!supabase) {
    return {
      data: [],
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info("Fetching remote posts...");
  const { data, error } = await supabase
    .from("posts")
    .select(POSTS_SELECT)
    .order("created_at", { ascending: false });

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
  const { data, error } = await supabase
    .from("pages")
    .select(PAGES_SELECT)
    .order("created_at", { ascending: true });

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

export async function insertRemoteDraft(draft) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info("Inserting remote draft...");
  const payload = {
    page_id: draft.page_id || null,
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
  };

  const { data, error } = await supabase
    .from("posts")
    .insert([payload])
    .select(POSTS_SELECT)
    .single();

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

export async function updateRemotePostStatus(postId, status, extraData = {}) {
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing Supabase environment variables."),
      mode: "offline",
    };
  }

  logger.info(`Updating status for post ${postId} to: ${status}`);
  const payload = {
    status,
    ...extraData,
  };

  const { data, error } = await supabase
    .from("posts")
    .update(payload)
    .eq("id", postId)
    .select(POSTS_SELECT)
    .single();

  if (error) {
    return {
      data: null,
      error,
      mode: classifySupabaseError(error),
    };
  }

  logger.info("Post status update successful.");
  return {
    data: normalizePost({ ...data, source: "remote" }),
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
    openaiApiKey: record.openai_api_key ?? "",
    geminiApiKey: record.gemini_api_key ?? "",
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
