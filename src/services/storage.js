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
const THUMBNAIL_MAX_WIDTH = 480;
const THUMBNAIL_JPEG_QUALITY = 0.78;

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

function calculateTargetDimensions(width, height, maxWidth = IMAGE_MAX_WIDTH) {
  if (!width || !height) {
    return { width: 0, height: 0, resized: false };
  }

  if (width <= maxWidth) {
    return { width, height, resized: false };
  }

  const ratio = maxWidth / width;
  return {
    width: maxWidth,
    height: Math.max(1, Math.round(height * ratio)),
    resized: true,
  };
}

function deriveThumbnailStoragePath(path = "") {
  const normalizedPath = normalizeStoragePath(path);
  if (!normalizedPath) return "";

  const segments = normalizedPath.split("/").filter(Boolean);
  if (!segments.length) return "";
  const relativePath = segments.length > 1 ? segments.slice(1).join("/") : segments[0];
  return replaceStoragePathExtension(`thumbs/${relativePath}`, "jpg");
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
  const { width: targetWidth, height: targetHeight, resized } = calculateTargetDimensions(sourceWidth, sourceHeight, IMAGE_MAX_WIDTH);
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

async function createThumbnailForUpload(filePath, blob) {
  const thumbnailPath = deriveThumbnailStoragePath(filePath);
  const originalContentType = getBlobContentType(blob).toLowerCase();
  const originalSize = typeof blob?.size === "number" ? blob.size : 0;

  const baseDiagnostics = {
    sourcePath: normalizeStoragePath(filePath),
    thumbnailPath,
    originalType: originalContentType,
    originalSize,
    optimized: false,
    fallbackReason: "",
  };

  if (!(blob instanceof Blob)) {
    return {
      blob: null,
      filePath: "",
      diagnostics: {
        ...baseDiagnostics,
        fallbackReason: "invalid_blob",
      },
    };
  }

  if (!originalContentType.startsWith("image/") || originalContentType === "image/gif") {
    return {
      blob: null,
      filePath: "",
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
    logger.warn("Thumbnail generation skipped; browser could not decode the source image.", {
      path: normalizeStoragePath(filePath),
      error: error instanceof Error ? error.message : String(error || "Unknown decode error"),
    });
    return {
      blob: null,
      filePath: "",
      diagnostics: {
        ...baseDiagnostics,
        fallbackReason: "decode_failed",
      },
    };
  }

  const { width: sourceWidth, height: sourceHeight } = dimensions;
  const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(sourceWidth, sourceHeight, THUMBNAIL_MAX_WIDTH);

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
        nextImage.onerror = () => reject(new Error("Thumbnail redraw failed"));
        nextImage.decoding = "async";
        nextImage.src = objectUrl;
      });
      context.drawImage(image, 0, 0, targetWidth, targetHeight);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    const thumbnailBlob = await canvasToBlob(canvas, "image/jpeg", THUMBNAIL_JPEG_QUALITY);
    return {
      blob: thumbnailBlob,
      filePath: thumbnailPath,
      diagnostics: {
        ...baseDiagnostics,
        optimized: true,
        optimizedType: "image/jpeg",
        optimizedSize: thumbnailBlob.size,
        width: sourceWidth,
        height: sourceHeight,
        optimizedWidth: targetWidth,
        optimizedHeight: targetHeight,
      },
    };
  } catch (error) {
    logger.warn("Thumbnail generation failed; continuing with the full image only.", {
      path: normalizeStoragePath(filePath),
      error: error instanceof Error ? error.message : String(error || "Unknown thumbnail error"),
    });
    return {
      blob: null,
      filePath: "",
      diagnostics: {
        ...baseDiagnostics,
        width: sourceWidth,
        height: sourceHeight,
        optimizedWidth: targetWidth,
        optimizedHeight: targetHeight,
        fallbackReason: "thumbnail_failed",
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

function buildDeleteTargetPayload({ path = "", imageUrl = "", paths = [], imageUrls = [] } = {}) {
  const hasArrayTargets =
    (Array.isArray(paths) && paths.length > 0) ||
    (Array.isArray(imageUrls) && imageUrls.length > 0);
  const pathList = Array.isArray(paths) ? paths : [];
  const imageUrlList = Array.isArray(imageUrls) ? imageUrls : [];
  const entries = hasArrayTargets
    ? Array.from({ length: Math.max(pathList.length, imageUrlList.length) }, (_, index) => ({
        path: pathList[index] || "",
        imageUrl: imageUrlList[index] || "",
      }))
    : [{ path, imageUrl }];

  const resolvedPaths = [];
  for (const entry of entries) {
    const resolvedPath = resolveStoredImageDeletePath(entry);
    if (resolvedPath && !resolvedPaths.includes(resolvedPath)) {
      resolvedPaths.push(resolvedPath);
    }
  }

  return {
    entries,
    resolvedPaths,
    firstResolvedPath: resolvedPaths[0] || null,
  };
}

async function uploadPreparedStorageBlob({ path, blob, contentType, bucketState, diagnostics, label = "image" }) {
  const normalizedPath = normalizeStoragePath(path);
  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(normalizedPath, blob, {
    cacheControl: "3600",
    upsert: true,
    contentType,
  });

  if (error) {
    const message = classifyStorageError(error);
    logger.error(`Supabase Storage ${label} upload failed.`, {
      bucket: BUCKET_NAME,
      path: normalizedPath,
      contentType,
      error,
      bucketCheck: bucketState.ok ? "ok" : bucketState.reason,
      optimization: diagnostics,
    });
    return { data: null, error: message, path: normalizedPath };
  }

  const storedPath = normalizeStoragePath(data?.path || normalizedPath);
  const publicUrl = getPublicImageUrl(storedPath);
  if (!publicUrl) {
    const message = `Supabase ${label} upload succeeded, but a public HTTPS URL could not be generated for '${storedPath}'.`;
    logger.error(message, {
      bucket: BUCKET_NAME,
      path: storedPath,
      uploadData: data,
      optimization: diagnostics,
    });
    return { data: null, error: message, path: storedPath };
  }

  logger.info(`Supabase Storage ${label} upload successful.`, {
    bucket: BUCKET_NAME,
    path: storedPath,
    publicUrl,
    optimization: diagnostics,
  });
  return { data: publicUrl, error: null, path: storedPath };
}

export async function deleteStoredImage({ path = "", imageUrl = "", paths = [], imageUrls = [], status = "", postId = null } = {}) {
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

  const deleteTargets = buildDeleteTargetPayload({ path, imageUrl, paths, imageUrls });
  if (!deleteTargets.resolvedPaths.length) {
    return {
      deleted: false,
      error: null,
      mode: "connected",
      path: null,
      paths: [],
      skipped: true,
      reason: "missing_safe_path",
    };
  }

  logger.info("Deleting image object from Supabase Storage.", {
    functionName: DELETE_GENERATED_IMAGE_FUNCTION,
    deleteTargetCount: deleteTargets.resolvedPaths.length,
    paths: deleteTargets.resolvedPaths,
    status: String(status || "").trim().toLowerCase() || null,
    postId: postId || null,
  });

  try {
    const { data, error } = await supabase.functions.invoke(DELETE_GENERATED_IMAGE_FUNCTION, {
      body: {
        image_storage_path: path || "",
        image_url: imageUrl || "",
        image_storage_paths: deleteTargets.entries.map((entry) => String(entry.path || "")),
        image_urls: deleteTargets.entries.map((entry) => String(entry.imageUrl || "")),
        status: String(status || "").trim().toLowerCase() || "",
        post_id: postId || null,
      },
    });

    if (error) {
      const message = String(error.message || "Edge Function image delete failed").trim();
      logger.warn("Edge Function image delete request failed.", {
        functionName: DELETE_GENERATED_IMAGE_FUNCTION,
        deleteTargetCount: deleteTargets.resolvedPaths.length,
        paths: deleteTargets.resolvedPaths,
        error,
      });
      return {
        deleted: false,
        error: message,
        mode: "connected",
        path: deleteTargets.firstResolvedPath,
        paths: deleteTargets.resolvedPaths,
        skipped: false,
        reason: "function_request_failed",
      };
    }

    if (!data?.ok) {
      const message = String(data?.error || "Edge Function image delete failed").trim();
      logger.warn("Edge Function image delete rejected.", {
        functionName: DELETE_GENERATED_IMAGE_FUNCTION,
        deleteTargetCount: deleteTargets.resolvedPaths.length,
        paths: deleteTargets.resolvedPaths,
        response: data,
      });
      return {
        deleted: false,
        error: message,
        mode: "connected",
        path: data?.path || deleteTargets.firstResolvedPath,
        paths: data?.paths || deleteTargets.resolvedPaths,
        skipped: false,
        reason: data?.reason || "function_rejected",
      };
    }

    if (data?.skipped) {
      logger.info("Edge Function image delete skipped.", {
        functionName: DELETE_GENERATED_IMAGE_FUNCTION,
        deleteTargetCount: (data?.paths || deleteTargets.resolvedPaths).length,
        paths: data?.paths || deleteTargets.resolvedPaths,
        reason: data?.reason || "",
      });
      return {
        deleted: false,
        error: null,
        mode: "connected",
        path: data?.path || deleteTargets.firstResolvedPath,
        paths: data?.paths || deleteTargets.resolvedPaths,
        skipped: true,
        reason: data?.reason || "skipped",
      };
    }

    logger.info("Edge Function image delete successful.", {
      functionName: DELETE_GENERATED_IMAGE_FUNCTION,
      deleteTargetCount: (data?.paths || deleteTargets.resolvedPaths).length,
      paths: data?.paths || deleteTargets.resolvedPaths,
    });
    return {
      deleted: true,
      error: null,
      mode: "connected",
      path: data?.path || deleteTargets.firstResolvedPath,
      paths: data?.paths || deleteTargets.resolvedPaths,
      skipped: false,
      reason: "",
    };
  } catch (error) {
    const message = String(error?.message || error || "Unexpected image delete error").trim();
    logger.warn("Unexpected Edge Function image delete error.", {
      functionName: DELETE_GENERATED_IMAGE_FUNCTION,
      deleteTargetCount: deleteTargets.resolvedPaths.length,
      paths: deleteTargets.resolvedPaths,
      error,
    });
    return {
      deleted: false,
      error: message,
      mode: "connected",
      path: deleteTargets.firstResolvedPath,
      paths: deleteTargets.resolvedPaths,
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
    return { data: null, error: "Supabase not configured", mode: "offline", path: null, thumbnailUrl: null, thumbnailPath: null };
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
    const fullUpload = await uploadPreparedStorageBlob({
      path: normalizedPath,
      blob: preparedUpload.blob,
      contentType,
      bucketState,
      diagnostics: preparedUpload.diagnostics,
      label: "image",
    });

    if (!fullUpload.data) {
      return { data: null, error: fullUpload.error, mode: "connected", path: fullUpload.path, thumbnailUrl: null, thumbnailPath: null };
    }

    let thumbnailUrl = null;
    let thumbnailPath = null;
    const preparedThumbnail = await createThumbnailForUpload(fullUpload.path || normalizedPath, preparedUpload.blob);
    if (preparedThumbnail.blob && preparedThumbnail.filePath) {
      const thumbnailUpload = await uploadPreparedStorageBlob({
        path: preparedThumbnail.filePath,
        blob: preparedThumbnail.blob,
        contentType: "image/jpeg",
        bucketState,
        diagnostics: preparedThumbnail.diagnostics,
        label: "thumbnail",
      });

      if (thumbnailUpload.data) {
        thumbnailUrl = thumbnailUpload.data;
        thumbnailPath = thumbnailUpload.path || preparedThumbnail.filePath;
      } else {
        logger.warn("Thumbnail upload failed; continuing with full image only.", {
          bucket: BUCKET_NAME,
          path: preparedThumbnail.filePath,
          error: thumbnailUpload.error,
          optimization: preparedThumbnail.diagnostics,
        });
      }
    }

    return {
      data: fullUpload.data,
      error: null,
      mode: "connected",
      path: fullUpload.path,
      thumbnailUrl,
      thumbnailPath,
    };
  } catch (err) {
    const message = classifyStorageError(err);
    logger.error("Unexpected error during storage upload.", {
      bucket: BUCKET_NAME,
      path: normalizedPath,
      contentType,
      error: err,
      optimization: preparedUpload.diagnostics,
    });
    return { data: null, error: message, mode: "connected", path: normalizedPath, thumbnailUrl: null, thumbnailPath: null };
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
    return { data: null, error: "Supabase not configured", mode: "offline", path: null, thumbnailUrl: null, thumbnailPath: null };
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
    return { data: null, error: message, mode: "connected", path: null, thumbnailUrl: null, thumbnailPath: null };
  }
}
