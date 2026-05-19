import { serve } from "std/http/server.ts";
import { createClient } from "supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const BUCKET_NAME = "generated-images";
const LOG_RETENTION_DAYS = 30;
const STALE_DRAFT_RETENTION_DAYS = 60;
const FAILED_TEST_RETENTION_DAYS = 14;
const ORPHAN_FILE_RETENTION_HOURS = 48;
const QUERY_PAGE_SIZE = 1000;
const STORAGE_PAGE_SIZE = 100;
const DELETE_BATCH_SIZE = 100;
const STORAGE_ROOTS = ["uploads", "thumbs"] as const;

const FAST_DELETE_STATUSES = new Set([
  "failed",
  "cancelled",
  "canceled",
  "test",
  "testing",
]);

const STALE_DELETE_STATUSES = new Set([
  "draft",
  "failed",
  "cancelled",
  "canceled",
  "rejected",
  "test",
  "testing",
  "local_draft",
  "local-draft",
  "local draft",
]);

const PROTECTED_POST_STATUSES = new Set([
  "review",
  "approved",
  "scheduled",
  "publishing",
  "posted",
  "published",
]);

type CleanupPayload = {
  dryRun?: boolean | string | number | null;
};

type PostRecord = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  image_storage_path?: string | null;
  thumbnail_storage_path?: string | null;
};

type StorageListEntry = {
  name?: string | null;
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type StorageFileRecord = {
  path: string;
  root: "uploads" | "thumbs";
  timestamp: string | null;
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

function parseBooleanFlag(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function parseTimestamp(value: string | null | undefined) {
  const next = String(value || "").trim();
  if (!next) return null;

  const date = new Date(next);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function hasTraversalSegment(path: string) {
  return path.split("/").some((segment) => segment === "." || segment === "..");
}

function getStorageRoot(path: string) {
  if (path.startsWith("uploads/")) return "uploads";
  if (path.startsWith("thumbs/")) return "thumbs";
  return "";
}

function isSafeCleanupStoragePath(pathValue: string | null | undefined) {
  const path = normalizeStoragePath(pathValue);
  if (!path) return false;
  if (path.includes("?") || path.includes("#")) return false;
  if (path.startsWith("http://") || path.startsWith("https://")) return false;
  if (hasTraversalSegment(path)) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9/_\-.]*$/.test(path)) return false;

  const root = getStorageRoot(path);
  if (!root) return false;

  const segments = path.split("/").filter(Boolean);
  return segments.length >= 3;
}

function buildIsoCutoff(daysOrHours: number, unit: "days" | "hours", now: Date) {
  const next = new Date(now.getTime());
  if (unit === "days") {
    next.setUTCDate(next.getUTCDate() - daysOrHours);
  } else {
    next.setUTCHours(next.getUTCHours() - daysOrHours);
  }
  return next.toISOString();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

async function fetchAllRows<T>(fetchPage: (from: number, to: number) => Promise<T[]>) {
  const rows: T[] = [];

  for (let from = 0; ; from += QUERY_PAGE_SIZE) {
    const to = from + QUERY_PAGE_SIZE - 1;
    const page = await fetchPage(from, to);
    rows.push(...page);

    if (page.length < QUERY_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function fetchOperationLogIds(adminClient: ReturnType<typeof createClient>, cutoffIso: string) {
  return await fetchAllRows<string>(async (from, to) => {
    const { data, error } = await adminClient
      .from("operation_logs")
      .select("id")
      .lt("created_at", cutoffIso)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to read operation_logs cleanup candidates: ${error.message || "Unknown error"}`);
    }

    return (data || []).map((row: { id: string }) => row.id).filter(Boolean);
  });
}

async function fetchAllPosts(adminClient: ReturnType<typeof createClient>) {
  return await fetchAllRows<PostRecord>(async (from, to) => {
    const { data, error } = await adminClient
      .from("posts")
      .select("id, status, created_at, image_storage_path, thumbnail_storage_path")
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to read posts cleanup candidates: ${error.message || "Unknown error"}`);
    }

    return (data || []) as PostRecord[];
  });
}

function classifyPostCleanupCandidates(posts: PostRecord[], now: Date) {
  const staleDraftCutoffMs = new Date(buildIsoCutoff(STALE_DRAFT_RETENTION_DAYS, "days", now)).getTime();
  const failedTestCutoffMs = new Date(buildIsoCutoff(FAILED_TEST_RETENTION_DAYS, "days", now)).getTime();
  const deleteCandidates: PostRecord[] = [];
  let skippedProtectedPosts = 0;
  const skippedConservativeStatuses = new Set<string>();

  for (const post of posts) {
    const status = normalizeStatus(post.status);
    const createdAt = parseTimestamp(post.created_at);
    if (!createdAt) {
      if (status) skippedConservativeStatuses.add(status);
      continue;
    }

    const createdAtMs = createdAt.getTime();
    const eligibleForFastDelete = FAST_DELETE_STATUSES.has(status) && createdAtMs <= failedTestCutoffMs;
    const eligibleForStaleDelete = STALE_DELETE_STATUSES.has(status) && createdAtMs <= staleDraftCutoffMs;
    const protectedByStatus = PROTECTED_POST_STATUSES.has(status);

    if (eligibleForFastDelete || eligibleForStaleDelete) {
      deleteCandidates.push(post);
      continue;
    }

    if (protectedByStatus && createdAtMs <= failedTestCutoffMs) {
      skippedProtectedPosts += 1;
      continue;
    }

    if (createdAtMs <= staleDraftCutoffMs && !STALE_DELETE_STATUSES.has(status)) {
      skippedConservativeStatuses.add(status || "(empty)");
    }
  }

  return {
    deleteCandidates,
    skippedProtectedPosts,
    skippedConservativeStatuses: Array.from(skippedConservativeStatuses).sort(),
  };
}

async function deleteRowsByIds(
  adminClient: ReturnType<typeof createClient>,
  tableName: "operation_logs" | "posts",
  ids: string[],
) {
  let deletedCount = 0;

  for (let index = 0; index < ids.length; index += DELETE_BATCH_SIZE) {
    const batch = ids.slice(index, index + DELETE_BATCH_SIZE);
    if (!batch.length) continue;

    const { data, error } = await adminClient
      .from(tableName)
      .delete()
      .in("id", batch)
      .select("id");

    if (error) {
      throw new Error(`Failed to delete ${tableName} cleanup batch: ${error.message || "Unknown error"}`);
    }

    deletedCount += Array.isArray(data) ? data.length : batch.length;
  }

  return deletedCount;
}

async function listStorageEntries(
  adminClient: ReturnType<typeof createClient>,
  path: string,
) {
  const entries: StorageListEntry[] = [];

  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await adminClient.storage.from(BUCKET_NAME).list(path, {
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Failed to list storage path '${path}': ${error.message || "Unknown error"}`);
    }

    const page = Array.isArray(data) ? (data as StorageListEntry[]) : [];
    entries.push(...page);

    if (page.length < STORAGE_PAGE_SIZE) {
      break;
    }
  }

  return entries;
}

function buildStorageFileRecord(root: "uploads" | "thumbs", parentPath: string, entry: StorageListEntry) {
  const name = String(entry?.name || "").trim();
  if (!name || !name.includes(".")) return null;

  const nextPath = normalizeStoragePath(`${parentPath}/${name}`);
  if (!isSafeCleanupStoragePath(nextPath)) {
    return null;
  }

  return {
    path: nextPath,
    root,
    timestamp: entry?.created_at || entry?.updated_at || null,
  } satisfies StorageFileRecord;
}

async function collectStorageFiles(adminClient: ReturnType<typeof createClient>) {
  const files: StorageFileRecord[] = [];

  for (const root of STORAGE_ROOTS) {
    const topLevelEntries = await listStorageEntries(adminClient, root);

    for (const entry of topLevelEntries) {
      const name = String(entry?.name || "").trim();
      if (!name) continue;

      const topLevelPath = normalizeStoragePath(`${root}/${name}`);
      if (name.includes(".")) {
        const directFile = buildStorageFileRecord(root, root, entry);
        if (directFile) files.push(directFile);
        continue;
      }

      const nestedEntries = await listStorageEntries(adminClient, topLevelPath);
      for (const nestedEntry of nestedEntries) {
        const nestedFile = buildStorageFileRecord(root, topLevelPath, nestedEntry);
        if (nestedFile) {
          files.push(nestedFile);
        }
      }
    }
  }

  return files;
}

function buildReferenceSet(posts: PostRecord[], excludedPostIds = new Set<string>()) {
  const references = new Set<string>();

  for (const post of posts) {
    if (excludedPostIds.has(post.id)) continue;

    const fullPath = normalizeStoragePath(post.image_storage_path);
    const thumbPath = normalizeStoragePath(post.thumbnail_storage_path);

    if (isSafeCleanupStoragePath(fullPath)) {
      references.add(fullPath);
    }

    if (isSafeCleanupStoragePath(thumbPath)) {
      references.add(thumbPath);
    }
  }

  return references;
}

function collectOrphanCandidates(
  files: StorageFileRecord[],
  references: Set<string>,
  now: Date,
) {
  const cutoffMs = new Date(buildIsoCutoff(ORPHAN_FILE_RETENTION_HOURS, "hours", now)).getTime();
  const uploads: string[] = [];
  const thumbs: string[] = [];

  for (const file of files) {
    if (!isSafeCleanupStoragePath(file.path)) continue;
    if (references.has(file.path)) continue;

    const timestamp = parseTimestamp(file.timestamp);
    if (!timestamp) continue;
    if (timestamp.getTime() > cutoffMs) continue;

    if (file.root === "uploads") {
      uploads.push(file.path);
    } else if (file.root === "thumbs") {
      thumbs.push(file.path);
    }
  }

  return {
    uploads: uniqueStrings(uploads),
    thumbs: uniqueStrings(thumbs),
  };
}

async function deleteStoragePaths(
  adminClient: ReturnType<typeof createClient>,
  paths: string[],
) {
  let deletedCount = 0;
  const errors: string[] = [];

  for (const path of paths) {
    if (!isSafeCleanupStoragePath(path)) {
      errors.push(`Skipped unsafe storage delete path: ${path}`);
      continue;
    }

    const { error } = await adminClient.storage.from(BUCKET_NAME).remove([path]);
    if (error) {
      errors.push(`Failed to delete storage path '${path}': ${error.message || "Unknown error"}`);
      continue;
    }

    deletedCount += 1;
  }

  return {
    deletedCount,
    errors,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const cronSecretHeader = req.headers.get("x-cron-secret");
  const systemCronSecret = Deno.env.get("CRON_SECRET") || "";

  if (!systemCronSecret || cronSecretHeader !== systemCronSecret) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  const requestUrl = new URL(req.url);
  let payload: CleanupPayload = {};

  try {
    const rawBody = await req.text();
    payload = rawBody ? (JSON.parse(rawBody) as CleanupPayload) : {};
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const dryRun = parseBooleanFlag(
    typeof payload.dryRun !== "undefined" ? payload.dryRun : requestUrl.searchParams.get("dryRun"),
    true,
  );

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Missing Supabase service role configuration" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const errors: string[] = [];

  try {
    const logCutoffIso = buildIsoCutoff(LOG_RETENTION_DAYS, "days", now);
    const operationLogIds = await fetchOperationLogIds(adminClient, logCutoffIso);

    const allPosts = await fetchAllPosts(adminClient);
    const postCleanup = classifyPostCleanupCandidates(allPosts, now);
    const postIdsToDelete = uniqueStrings(postCleanup.deleteCandidates.map((post) => post.id));

    let logsDeleted = 0;
    let postsDeleted = 0;

    if (!dryRun) {
      logsDeleted = await deleteRowsByIds(adminClient, "operation_logs", operationLogIds);
      postsDeleted = await deleteRowsByIds(adminClient, "posts", postIdsToDelete);
    }

    const remainingPostsForReferences = dryRun
      ? allPosts
      : await fetchAllPosts(adminClient);
    const excludedPostIds = dryRun ? new Set(postIdsToDelete) : new Set<string>();
    const references = buildReferenceSet(remainingPostsForReferences, excludedPostIds);

    const storageFiles = await collectStorageFiles(adminClient);
    const orphanCandidates = collectOrphanCandidates(storageFiles, references, now);

    let orphanUploadsDeleted = 0;
    let orphanThumbsDeleted = 0;

    if (!dryRun) {
      const uploadDeleteResult = await deleteStoragePaths(adminClient, orphanCandidates.uploads);
      orphanUploadsDeleted = uploadDeleteResult.deletedCount;
      errors.push(...uploadDeleteResult.errors);

      const thumbDeleteResult = await deleteStoragePaths(adminClient, orphanCandidates.thumbs);
      orphanThumbsDeleted = thumbDeleteResult.deletedCount;
      errors.push(...thumbDeleteResult.errors);
    }

    console.info("[cleanup-maintenance] run complete", {
      dryRun,
      logsCountWouldDelete: operationLogIds.length,
      postsCountWouldDelete: postIdsToDelete.length,
      orphanUploadsCountWouldDelete: orphanCandidates.uploads.length,
      orphanThumbsCountWouldDelete: orphanCandidates.thumbs.length,
      skippedProtectedPosts: postCleanup.skippedProtectedPosts,
      skippedConservativeStatuses: postCleanup.skippedConservativeStatuses,
      errors,
    });

    return jsonResponse({
      ok: true,
      dryRun,
      retention: {
        operationLogsDays: LOG_RETENTION_DAYS,
        staleDraftDays: STALE_DRAFT_RETENTION_DAYS,
        failedTestDays: FAILED_TEST_RETENTION_DAYS,
        orphanHours: ORPHAN_FILE_RETENTION_HOURS,
      },
      logsDeleted,
      logsCountWouldDelete: operationLogIds.length,
      postsDeleted,
      postsCountWouldDelete: postIdsToDelete.length,
      orphanUploadsDeleted,
      orphanUploadsCountWouldDelete: orphanCandidates.uploads.length,
      orphanThumbsDeleted,
      orphanThumbsCountWouldDelete: orphanCandidates.thumbs.length,
      skippedProtectedPosts: postCleanup.skippedProtectedPosts,
      skippedConservativeStatuses: postCleanup.skippedConservativeStatuses,
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "Unknown cleanup error");
    return jsonResponse({
      ok: false,
      dryRun,
      error: message,
      errors: [message, ...errors],
    }, 500);
  }
});
