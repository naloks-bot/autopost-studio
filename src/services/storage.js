import { logger } from "./logger.js";
import { hasSupabaseConfig, supabase } from "./supabase.js";

/**
 * Supabase Storage Service
 * Handles uploading and retrieving images from Supabase Storage buckets.
 */

const BUCKET_NAME = "generated-images";

function normalizeStoragePath(path = "") {
  return String(path || "").replace(/^\/+/, "").trim();
}

function isPublicHttpsUrl(value = "") {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getBlobContentType(blob) {
  const nextType = typeof blob?.type === "string" ? blob.type.trim() : "";
  return nextType || "application/octet-stream";
}

function classifyStorageError(error) {
  const message = String(error?.message || error || "").trim();
  const statusCode = String(error?.statusCode || error?.status || "");

  if (/bucket not found/i.test(message)) {
    return `Bucket '${BUCKET_NAME}' not found. Create the bucket and make sure the name matches exactly.`;
  }

  if (/row-level security policy/i.test(message) || statusCode === "403") {
    return `Supabase Storage policy blocked upload to '${BUCKET_NAME}'. Add anon insert/update access for this bucket.`;
  }

  if (/mime type/i.test(message)) {
    return `Supabase Storage rejected the file content type: ${message}`;
  }

  return message || "Supabase Storage upload failed.";
}

async function inspectStorageBucket() {
  if (!supabase) return { ok: false, reason: "Supabase client unavailable" };

  try {
    const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
    if (error) {
      return { ok: false, reason: classifyStorageError(error) };
    }

    return {
      ok: true,
      id: data?.id || BUCKET_NAME,
      public: Boolean(data?.public),
    };
  } catch (error) {
    return { ok: false, reason: classifyStorageError(error) };
  }
}

/**
 * Returns the public URL for a given storage path.
 * @param {string} path - The path inside the bucket.
 * @returns {string | null}
 */
export function getPublicImageUrl(path) {
  if (!hasSupabaseConfig || !supabase) return null;

  const normalizedPath = normalizeStoragePath(path);
  if (!normalizedPath) return null;

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(normalizedPath);
  const publicUrl = data?.publicUrl || null;
  return isPublicHttpsUrl(publicUrl) ? publicUrl : null;
}

/**
 * Uploads a binary blob to Supabase Storage.
 * @param {string} filePath - Destination path (e.g. 'drafts/image.png').
 * @param {Blob} blob - The image data.
 * @returns {Promise<{data: string | null, error: string | null, mode: "connected" | "offline"}>}
 */
export async function uploadImageBlob(filePath, blob) {
  if (!hasSupabaseConfig || !supabase) {
    logger.warn("Supabase not configured for storage upload.");
    return { data: null, error: "Supabase not configured", mode: "offline" };
  }

  const normalizedPath = normalizeStoragePath(filePath);
  const contentType = getBlobContentType(blob);
  const bucketState = await inspectStorageBucket();

  logger.info("Uploading image blob to Supabase Storage.", {
    bucket: BUCKET_NAME,
    path: normalizedPath,
    contentType,
    size: typeof blob?.size === "number" ? blob.size : null,
    bucketPublic: bucketState.ok ? bucketState.public : null,
    bucketCheck: bucketState.ok ? "ok" : bucketState.reason,
  });

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(normalizedPath, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType,
      });

    if (error) {
      const msg = classifyStorageError(error);
      logger.error("Supabase Storage upload failed.", {
        bucket: BUCKET_NAME,
        path: normalizedPath,
        contentType,
        error,
        bucketCheck: bucketState.ok ? "ok" : bucketState.reason,
      });
      return { data: null, error: msg, mode: "connected" };
    }

    const storedPath = normalizeStoragePath(data?.path || normalizedPath);
    const publicUrl = getPublicImageUrl(storedPath);
    if (!publicUrl) {
      const message = `Supabase upload succeeded, but a public HTTPS URL could not be generated for '${storedPath}'.`;
      logger.error(message, {
        bucket: BUCKET_NAME,
        path: storedPath,
        uploadData: data,
      });
      return { data: null, error: message, mode: "connected" };
    }

    logger.info("Supabase Storage upload successful.", {
      bucket: BUCKET_NAME,
      path: storedPath,
      publicUrl,
    });
    return { data: publicUrl, error: null, mode: "connected" };
  } catch (err) {
    const message = classifyStorageError(err);
    logger.error("Unexpected error during storage upload.", {
      bucket: BUCKET_NAME,
      path: normalizedPath,
      contentType,
      error: err,
    });
    return { data: null, error: message, mode: "connected" };
  }
}

/**
 * Downloads an image from a URL and uploads it to Supabase Storage.
 * @param {string} filePath - Destination path.
 * @param {string} imageUrl - Source URL.
 * @returns {Promise<{data: string | null, error: string | null, mode: "connected" | "offline"}>}
 */
export async function uploadImageFromUrl(filePath, imageUrl) {
  if (!hasSupabaseConfig || !supabase) {
    return { data: null, error: "Supabase not configured", mode: "offline" };
  }

  logger.info("Mirroring image to Supabase Storage.", {
    bucket: BUCKET_NAME,
    path: normalizeStoragePath(filePath),
    sourceUrl: imageUrl,
  });
  try {
    // 1. Fetch image as blob
    const response = await fetch(imageUrl);
    if (!response.ok) {
      logger.error("Failed to fetch source image for mirroring.", {
        sourceUrl: imageUrl,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const sourceContentType = response.headers.get("content-type") || "application/octet-stream";
    const sourceBlob = await response.blob();
    const uploadBlob =
      sourceBlob.type === sourceContentType ? sourceBlob : sourceBlob.slice(0, sourceBlob.size, sourceContentType);

    // 2. Upload to storage
    return await uploadImageBlob(filePath, uploadBlob);
  } catch (err) {
    const message = classifyStorageError(err);
    logger.error("Mirroring operation failed.", {
      bucket: BUCKET_NAME,
      path: normalizeStoragePath(filePath),
      sourceUrl: imageUrl,
      error: err,
    });
    return { data: null, error: message, mode: "connected" };
  }
}
