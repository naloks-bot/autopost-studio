import { serve } from "std/http/server.ts";
import { createClient } from "supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET_NAME = "generated-images";
const LOCKED_PUBLIC_BUCKET_PREFIX =
  "https://xbwsxmewhsmchhpbjmgr.supabase.co/storage/v1/object/public/generated-images/";
const ALLOWED_DELETE_STATUSES = new Set([
  "draft",
  "review",
  "approved",
  "failed",
  "local",
  "local_draft",
  "local-draft",
  "local draft",
  "unpublished",
]);
const BLOCKED_DELETE_STATUSES = new Set(["scheduled", "publishing", "posted", "published"]);

type DeletePayload = {
  image_storage_path?: string | null;
  image_url?: string | null;
  status?: string | null;
  post_id?: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStoragePath(path: string | null | undefined) {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

function hasTraversalSegment(path: string) {
  return path.split("/").some((segment) => segment === "." || segment === "..");
}

function isSafeStoragePath(path: string) {
  if (!path) return false;
  if (path.includes("?") || path.includes("#")) return false;
  if (path.startsWith("http://") || path.startsWith("https://")) return false;
  if (hasTraversalSegment(path)) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9/_\-.]*$/.test(path)) return false;
  return path.includes("/");
}

function resolveSafeStoragePath(payload: DeletePayload) {
  const directPath = normalizeStoragePath(payload.image_storage_path);
  if (directPath) {
    return isSafeStoragePath(directPath) ? directPath : "";
  }

  const imageUrl = String(payload.image_url || "").trim();
  if (!imageUrl) return "";

  try {
    const parsed = new URL(imageUrl);
    const normalizedUrl = `${parsed.origin}${parsed.pathname}`;
    if (!normalizedUrl.startsWith(LOCKED_PUBLIC_BUCKET_PREFIX)) {
      return "";
    }

    const relativePath = normalizeStoragePath(decodeURIComponent(normalizedUrl.slice(LOCKED_PUBLIC_BUCKET_PREFIX.length)));
    return isSafeStoragePath(relativePath) ? relativePath : "";
  } catch {
    return "";
  }
}

function canDeleteForStatus(status: string) {
  if (!status) return false;
  if (BLOCKED_DELETE_STATUSES.has(status)) return false;
  if (ALLOWED_DELETE_STATUSES.has(status)) return true;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Missing Supabase service role configuration" }, 500);
  }

  let payload: DeletePayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" });
  }

  const status = normalizeStatus(payload.status);
  const postId = String(payload.post_id || "").trim() || null;

  if (!canDeleteForStatus(status)) {
    console.info("[delete-generated-image] skipped by status guard", {
      postId,
      status: status || null,
    });
    return jsonResponse({ ok: true, skipped: true, reason: "status_guard" });
  }

  const resolvedPath = resolveSafeStoragePath(payload);
  if (!resolvedPath) {
    console.warn("[delete-generated-image] rejected unsafe path", {
      postId,
      status: status || null,
      hasImageStoragePath: Boolean(String(payload.image_storage_path || "").trim()),
    });
    return jsonResponse({ ok: false, error: "Missing or unsafe storage path" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.info("[delete-generated-image] delete attempt", {
    postId,
    status: status || null,
    path: resolvedPath,
  });

  const { error } = await adminClient.storage.from(BUCKET_NAME).remove([resolvedPath]);
  if (error) {
    console.warn("[delete-generated-image] storage delete failed", {
      postId,
      status: status || null,
      path: resolvedPath,
      error: error.message || "Unknown storage delete error",
    });
    return jsonResponse({ ok: false, error: error.message || "Storage delete failed", path: resolvedPath });
  }

  console.info("[delete-generated-image] delete success", {
    postId,
    status: status || null,
    path: resolvedPath,
  });
  return jsonResponse({ ok: true, deleted: true, path: resolvedPath });
});
