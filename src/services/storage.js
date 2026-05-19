import { logger } from "./logger.js";
import { hasSupabaseConfig, supabase } from "./supabase.js";

/**
 * Supabase Storage Service
 * Handles uploading and retrieving images from Supabase Storage buckets.
 */

const BUCKET_NAME = "generated-images";
const SUPABASE_PROJECT_URL = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const LOCKED_PUBLIC_BUCKET_PREFIX =
  "https://xbwsxmewhsmchhpbjmgr.supabase.co/storage/v1/object/public/generated-images/";
const DELETE_GENERATED_IMAGE_FUNCTION = "delete-generated-image";
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_JPEG_QUALITY = 0.85;
const JPEG_RECOMPRESS_THRESHOLD_BYTES = 1024 * 1024;

function normalizeStoragePath(path = "") {
  return String(path || "").replace(/^\/+/, "").trim();
}

function getSafeStoragePathFromPublicUrl(value = "") {
  const publicUrl = String(value || "").trim();
  if (!publicUrl) return "";

  try {
    const parsed = new URL(publicUrl);
    const normalizedUrl = `${parsed.origin}${parsed.pathname}`;
    const envPrefix = SUPABASE_PROJECT_URL
      ? `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${BUCKET_NAME}/`
      : "";
    const expectedPrefix =
      envPrefix && envPrefix === LOCKED_PUBLIC_BUCKET_PREFIX ? envPrefix : LOCKED_PUBLIC_BUCKET_PREFIX;

    if (!normalizedUrl.startsWith(expectedPrefix)) {
      return "";
    }

    const relativePath = decodeURIComponent(normalizedUrl.slice(expectedPrefix.length));
    return normalizeStoragePath(relativePath);
  } catch {
    return "";
  }
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

function getFileExtensionFromType(contentType = "") {
  const nextType = String(contentType || "").toLowerCase();
  if (nextType === "image/jpeg" || nextType === "image/jpg") return "jpg";
  if (nextType === "image/png") return "png";
  if (nextType === "image/webp") return "webp";
  if (nextType === "image/gif") return "gif";
  if (nextType === "image/avif") return "avif";
  return "";
}

function replaceStoragePathExtension(path = "", extension = "") {
  const normalizedPath = normalizeStoragePath(path);
  const safeExtension = String(extension || "").replace(/^\./, "").trim().toLowerCase();
  if (!normalizedPath || !safeExtension) return normalizedPath;

  if (/\.[a-z0-9]+$/i.test(normalizedPath)) {
    return normalizedPath.replace(/\.[a-z0-9]+$/i, `.${safeExtension}`);
  }

  return `${normalizedPath}.${safeExtension}`;
}

function buildOriginalStoragePath(path = "", blob) {
  const fallbackExtension = getFileExtensionFromType(getBlobContentType(blob)) || "bin";
  return replaceStoragePathExtension(path, fallbackExtension);
}

function shouldBypassOptimization(blob) {
  const contentType = getBlobContentType(blob).toLowerCase();
  if (!contentType.startsWith("image/")) return true;
  if (contentType === "image/gif") return true;
  return false;
}

function calculateTargetDimensions(width, height) {
  if (!width || !height) {
    return { width: 0, height: 0, resized: false };
  }

  if (width <= IMAGE_MAX_WIDTH) {
    return { width, height, resized: false };
  }

  const ratio = IMAGE_MAX_WIDTH / width;
  return {
    width: IMAGE_MAX_WIDTH,
    height: Math.max(1, Math.round(height * ratio)),
    resized: true,
  };
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0,
      };
      cleanup();
      resolve(dimensions);
    };

    image.onerror = () => {
      cleanup();
      reject(new Error("Image decode failed"));
    };

    image.decoding = "async";
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, contentType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas export failed"));
        return;
      }
      resolve(blob);
    }, contentType, quality);
  });
}

async function optimizeImageForUpload(filePath, blob) {
  const originalContentType = getBlobContentType(blob).toLowerCase();
  const originalPath = buildOriginalStoragePath(filePath, blob);
  const originalSize = typeof blob?.size === "number" ? blob.size : 0;

  const baseDiagnostics = {
    originalPath,
    originalType: originalContentType,
    originalSize,
    optimized: false,
    fallbackReason: "",
  };

  if (!(blob instanceof Blob)) {
    return {
      blob,
      filePath: originalPath,
      diagnostics: {
        ...baseDiagnostics,
        fallbackReason: "invalid_blob",
      },
    };
  }

  if (shouldBypassOptimization(blob)) {
    return {
      blob,
      filePath: originalPath,
      diagnostics: {
        ...baseDiagnostics,
        fallbackReason: originalContentType === "image/gif" ? "gif_preserved" : "unsupported_content_type",
      },
    };
  }

  let dimensions;
  try {
    dimensions = await loadImageFromBlob(blob);
  } catch (error) {
    logger.warn("Image optimization skipped; browser could not decode the source image.", {
      path: originalPath,
      contentType: originalContentType,
      error: error instanceof Error ? error.message : String(error || "Unknown decode error"),
    });
    return {
      blob,
      filePath: originalPath,
      diagnostics: {
        ...baseDiagnostics,
        fallbackReason: "decode_failed",
      },
    };
  }

  const { width: sourceWidth, height: sourceHeight } = dimensions;
  const { width: targetWidth, height: targetHeight, resized } = calculateTargetDimensions(sourceWidth, sourceHeight);
  const isJpegSource = originalContentType === "image/jpeg" || originalContentType === "image/jpg";
  const shouldOptimize = !isJpegSource || resized || originalSize > JPEG_RECOMPRESS_THRESHOLD_BYTES;

  if (!shouldOptimize) {
    return {
      blob,
      filePath: originalPath,
      diagnostics: {
        ...baseDiagnostics,
        width: sourceWidth,
        height: sourceHeight,
        optimizedWidth: sourceWidth,
        optimizedHeight: sourceHeight,
        fallbackReason: "already_acceptable_jpeg",
      },
    };
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Canvas context unavailable");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);

    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await new Promise((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("Image redraw failed"));
        nextImage.decoding = "async";
        nextImage.src = objectUrl;
      });
      context.drawImage(image, 0, 0, targetWidth, targetHeight);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    const optimizedBlob = await canvasToBlob(canvas, "image/jpeg", IMAGE_JPEG_QUALITY);
    if (isJpegSource && !resized && optimizedBlob.size >= originalSize) {
      return {
        blob,
        filePath: originalPath,
        diagnostics: {
          ...baseDiagnostics,
          width: sourceWidth,
          height: sourceHeight,
          optimizedWidth: sourceWidth,
          optimizedHeight: sourceHeight,
          fallbackReason: "jpeg_not_smaller",
        },
      };
    }

    return {
      blob: optimizedBlob,
      filePath: replaceStoragePathExtension(filePath, "jpg"),
      diagnostics: {
        ...baseDiagnostics,
        optimized: true,
        optimizedType: "image/jpeg",
        optimizedSize: optimizedBlob.size,
        width: sourceWidth,
        height: sourceHeight,
        optimizedWidth: targetWidth,
        optimizedHeight: targetHeight,
      },
    };
  } catch (error) {
    logger.warn("Image optimization failed; uploading the original source file instead.", {
      path: originalPath,
      contentType: originalContentType,
      error: error instanceof Error ? error.message : String(error || "Unknown optimization error"),
    });
    return {
      blob,
      filePath: originalPath,
      diagnostics: {
        ...baseDiagnostics,
        width: sourceWidth,
        height: sourceHeight,
        optimizedWidth: sourceWidth,
        optimizedHeight: sourceHeight,
        fallbackReason: "optimization_failed",
      },
    };
  }
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

export function resolveStoredImageDeletePath({ path = "", imageUrl = "" } = {}) {
  return normalizeStoragePath(path) || getSafeStoragePathFromPublicUrl(imageUrl);
}

export async function deleteStoredImage({ path = "", imageUrl = "", status = "", postId = null } = {}) {
  if (!hasSupabaseConfig || !supabase) {
    return {
      deleted: false,
      error: "Supabase not configured",
      mode: "offline",
      path: null,
      skipped: true,
      reason: "offline",
    };
  }

  const normalizedPath = resolveStoredImageDeletePath({ path, imageUrl });
  if (!normalizedPath) {
    return {
      deleted: false,
      error: null,
      mode: "connected",
      path: null,
      skipped: true,
      reason: "missing_safe_path",
    };
  }

  logger.info("Deleting image object from Supabase Storage.", {
    functionName: DELETE_GENERATED_IMAGE_FUNCTION,
    path: normalizedPath,
    status: String(status || "").trim().toLowerCase() || null,
    postId: postId || null,
  });

  try {
    const { data, error } = await supabase.functions.invoke(DELETE_GENERATED_IMAGE_FUNCTION, {
      body: {
        image_storage_path: path || "",
        image_url: imageUrl || "",
        status: String(status || "").trim().toLowerCase() || "",
        post_id: postId || null,
      },
    });

    if (error) {
      const message = String(error.message || "Edge Function image delete failed").trim();
      logger.warn("Edge Function image delete request failed.", {
        functionName: DELETE_GENERATED_IMAGE_FUNCTION,
        path: normalizedPath,
        error,
      });
      return {
        deleted: false,
        error: message,
        mode: "connected",
        path: normalizedPath,
        skipped: false,
        reason: "function_request_failed",
      };
    }

    if (!data?.ok) {
      const message = String(data?.error || "Edge Function image delete failed").trim();
      logger.warn("Edge Function image delete rejected.", {
        functionName: DELETE_GENERATED_IMAGE_FUNCTION,
        path: normalizedPath,
        response: data,
      });
      return {
        deleted: false,
        error: message,
        mode: "connected",
        path: data?.path || normalizedPath,
        skipped: false,
        reason: "function_rejected",
      };
    }

    if (data?.skipped) {
      logger.info("Edge Function image delete skipped.", {
        functionName: DELETE_GENERATED_IMAGE_FUNCTION,
        path: data?.path || normalizedPath,
        reason: data?.reason || "",
      });
      return {
        deleted: false,
        error: null,
        mode: "connected",
        path: data?.path || normalizedPath,
        skipped: true,
        reason: data?.reason || "skipped",
      };
    }

    logger.info("Edge Function image delete successful.", {
      functionName: DELETE_GENERATED_IMAGE_FUNCTION,
      path: data?.path || normalizedPath,
    });
    return {
      deleted: true,
      error: null,
      mode: "connected",
      path: data?.path || normalizedPath,
      skipped: false,
      reason: "",
    };
  } catch (error) {
    const message = String(error?.message || error || "Unexpected image delete error").trim();
    logger.warn("Unexpected Edge Function image delete error.", {
      functionName: DELETE_GENERATED_IMAGE_FUNCTION,
      path: normalizedPath,
      error,
    });
    return {
      deleted: false,
      error: message,
      mode: "connected",
      path: normalizedPath,
      skipped: false,
      reason: "function_exception",
    };
  }
}

/**
 * Uploads a binary blob to Supabase Storage.
 * @param {string} filePath - Destination path (e.g. 'drafts/image.png').
 * @param {Blob} blob - The image data.
 * @returns {Promise<{data: string | null, error: string | null, mode: "connected" | "offline", path: string | null}>}
 */
export async function uploadImageBlob(filePath, blob) {
  if (!hasSupabaseConfig || !supabase) {
    logger.warn("Supabase not configured for storage upload.");
    return { data: null, error: "Supabase not configured", mode: "offline", path: null };
  }

  const preparedUpload = await optimizeImageForUpload(filePath, blob);
  const normalizedPath = normalizeStoragePath(preparedUpload.filePath);
  const contentType = getBlobContentType(preparedUpload.blob);
  const bucketState = await inspectStorageBucket();

  logger.info("Uploading image blob to Supabase Storage.", {
    bucket: BUCKET_NAME,
    path: normalizedPath,
    contentType,
    size: typeof preparedUpload.blob?.size === "number" ? preparedUpload.blob.size : null,
    bucketPublic: bucketState.ok ? bucketState.public : null,
    bucketCheck: bucketState.ok ? "ok" : bucketState.reason,
    optimization: preparedUpload.diagnostics,
  });

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(normalizedPath, preparedUpload.blob, {
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
        optimization: preparedUpload.diagnostics,
      });
      return { data: null, error: msg, mode: "connected", path: normalizedPath };
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
      return { data: null, error: message, mode: "connected", path: storedPath };
    }

    logger.info("Supabase Storage upload successful.", {
      bucket: BUCKET_NAME,
      path: storedPath,
      publicUrl,
      optimization: preparedUpload.diagnostics,
    });
    return { data: publicUrl, error: null, mode: "connected", path: storedPath };
  } catch (err) {
    const message = classifyStorageError(err);
    logger.error("Unexpected error during storage upload.", {
      bucket: BUCKET_NAME,
      path: normalizedPath,
      contentType,
      error: err,
      optimization: preparedUpload.diagnostics,
    });
    return { data: null, error: message, mode: "connected", path: normalizedPath };
  }
}

/**
 * Downloads an image from a URL and uploads it to Supabase Storage.
 * @param {string} filePath - Destination path.
 * @param {string} imageUrl - Source URL.
 * @returns {Promise<{data: string | null, error: string | null, mode: "connected" | "offline", path: string | null}>}
 */
export async function uploadImageFromUrl(filePath, imageUrl) {
  if (!hasSupabaseConfig || !supabase) {
    return { data: null, error: "Supabase not configured", mode: "offline", path: null };
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
    return { data: null, error: message, mode: "connected", path: null };
  }
}
