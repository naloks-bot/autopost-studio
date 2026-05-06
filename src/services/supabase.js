import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const POSTS_SELECT =
  "id, page_id, topic, content, image_prompt, image_url, image_provider, image_revised_prompt, image_storage_path, image_storage_mode, status, scheduled_at, posted_at, created_at";
const SETTINGS_SELECT =
  "id, workspace_name, business_name, brand_voice, default_topic_hint, openai_api_key, xai_api_key, facebook_app_id, facebook_app_secret, facebook_page_id, facebook_page_access_token, created_at, updated_at";

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

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
    page_id: post.page_id ?? null,
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

function classifySupabaseError(error) {
  if (!error) return "connected";

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

  const { data, error } = await supabase
    .from("posts")
    .select(POSTS_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error, mode: classifySupabaseError(error) };
  }

  return {
    data: (data ?? []).map((post) => normalizePost({ ...post, source: "remote" })),
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
    xaiApiKey: record.xai_api_key ?? "",
    facebookAppId: record.facebook_app_id ?? "",
    facebookAppSecret: record.facebook_app_secret ?? "",
    facebookPageId: record.facebook_page_id ?? "",
    facebookPageAccessToken: record.facebook_page_access_token ?? "",
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

  const { data, error } = await supabase
    .from("app_settings")
    .select(SETTINGS_SELECT)
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return { data: null, error, mode: classifySupabaseError(error) };
  }

  if (!data) {
    return { data: null, error: null, mode: "empty" };
  }

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

  const payload = {
    id: "default",
    workspace_name: settings.workspaceName,
    business_name: settings.businessName,
    brand_voice: settings.brandVoice,
    default_topic_hint: settings.defaultTopicHint,
    openai_api_key: settings.openaiApiKey,
    xai_api_key: settings.xaiApiKey,
    facebook_app_id: settings.facebookAppId,
    facebook_app_secret: settings.facebookAppSecret,
    facebook_page_id: settings.facebookPageId,
    facebook_page_access_token: settings.facebookPageAccessToken,
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

  return { data: normalizeSettings(data), error: null, mode: "connected" };
}
