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
  image_storage_paths?: Array<string | null> | null;
  image_url?: string | null;
  image_urls?: Array<string | null> | null;
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

function resolveSafeStoragePathTarget(pathValue: string | null | undefined, imageUrlValue: string | null | undefined) {
  const directPath = normalizeStoragePath(pathValue);
  if (directPath) {
    return isSafeStoragePath(directPath) ? directPath : "";
  }

  const imageUrl = String(imageUrlValue || "").trim();
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

function buildDeleteTargets(payload: DeletePayload) {
  const pathList = Array.isArray(payload.image_storage_paths) ? payload.image_storage_paths : [];
  const imageUrlList = Array.isArray(payload.image_urls) ? payload.image_urls : [];
  const hasArrayTargets = pathList.length > 0 || imageUrlList.length > 0;
  const entries = hasArrayTargets
    ? Array.from({ length: Math.max(pathList.length, imageUrlList.length) }, (_, index) => ({
        path: pathList[index] ?? "",
        imageUrl: imageUrlList[index] ?? "",
      }))
    : [{ path: payload.image_storage_path ?? "", imageUrl: payload.image_url ?? "" }];

  const resolvedPaths: string[] = [];
  let invalidTargetFound = false;

  for (const entry of entries) {
    const hasInput = Boolean(String(entry.path || "").trim() || String(entry.imageUrl || "").trim());
    if (!hasInput) {
      continue;
    }

    const resolvedPath = resolveSafeStoragePathTarget(entry.path, entry.imageUrl);
    if (!resolvedPath) {
      invalidTargetFound = true;
      continue;
    }

    if (!resolvedPaths.includes(resolvedPath)) {
      resolvedPaths.push(resolvedPath);
    }
  }

  return {
    resolvedPaths,
    invalidTargetFound,
  };
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
      deleteTargetCount: 0,
    });
    return jsonResponse({ ok: true, skipped: true, reason: "status_guard" });
  }

  const deleteTargets = buildDeleteTargets(payload);
  if (deleteTargets.invalidTargetFound || !deleteTargets.resolvedPaths.length) {
    console.warn("[delete-generated-image] rejected unsafe path", {
      postId,
      status: status || null,
      deleteTargetCount: deleteTargets.resolvedPaths.length,
      hasDeleteInput:
        Boolean(String(payload.image_storage_path || "").trim()) ||
        Boolean(String(payload.image_url || "").trim()) ||
        (Array.isArray(payload.image_storage_paths) && payload.image_storage_paths.some((value) => String(value || "").trim())) ||
        (Array.isArray(payload.image_urls) && payload.image_urls.some((value) => String(value || "").trim())),
    });
    return jsonResponse({ ok: false, error: "Missing or unsafe storage path" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.info("[delete-generated-image] delete attempt", {
    postId,
    status: status || null,
    deleteTargetCount: deleteTargets.resolvedPaths.length,
    paths: deleteTargets.resolvedPaths,
  });

  const deletedPaths: string[] = [];
  const failedPaths: Array<{ path: string; error: string }> = [];

  for (const resolvedPath of deleteTargets.resolvedPaths) {
    const { error } = await adminClient.storage.from(BUCKET_NAME).remove([resolvedPath]);
    if (error) {
      failedPaths.push({
        path: resolvedPath,
        error: error.message || "Storage delete failed",
      });
      continue;
    }

    deletedPaths.push(resolvedPath);
  }

  if (failedPaths.length) {
    console.warn("[delete-generated-image] storage delete failed", {
      postId,
      status: status || null,
      deleteTargetCount: deleteTargets.resolvedPaths.length,
      deletedPaths,
      failedPaths,
    });
    return jsonResponse({
      ok: false,
      error: deletedPaths.length ? "Partial storage delete failure" : "Storage delete failed",
      path: deletedPaths[0] || deleteTargets.resolvedPaths[0] || null,
      paths: deletedPaths.length ? deletedPaths : deleteTargets.resolvedPaths,
      failed_paths: failedPaths,
      reason: deletedPaths.length ? "partial_delete_failure" : "delete_failed",
    });
  }

  console.info("[delete-generated-image] delete success", {
    postId,
    status: status || null,
    deleteTargetCount: deletedPaths.length,
    paths: deletedPaths,
  });
  return jsonResponse({
    ok: true,
    deleted: true,
    path: deletedPaths[0] || null,
    paths: deletedPaths,
  });
});
