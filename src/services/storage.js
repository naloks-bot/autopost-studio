import { hasSupabaseConfig, supabase } from "./supabase.js";

/**
 * Supabase Storage Service
 * Handles uploading and retrieving images from Supabase Storage buckets.
 */

const BUCKET_NAME = "generated-images";

/**
 * Returns the public URL for a given storage path.
 * @param {string} path - The path inside the bucket.
 * @returns {string | null}
 */
export function getPublicImageUrl(path) {
  if (!hasSupabaseConfig || !supabase) return null;
  
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data?.publicUrl || null;
}

/**
 * Uploads a binary blob to Supabase Storage.
 * @param {string} filePath - Destination path (e.g. 'drafts/image.png').
 * @param {Blob} blob - The image data.
 * @returns {Promise<{data: string | null, error: string | null, mode: "connected" | "offline"}>}
 */
export async function uploadImageBlob(filePath, blob) {
  if (!hasSupabaseConfig || !supabase) {
    return { data: null, error: "Supabase not configured", mode: "offline" };
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      return { data: null, error: error.message, mode: "connected" };
    }

    const publicUrl = getPublicImageUrl(data.path);
    return { data: publicUrl, error: null, mode: "connected" };
  } catch (err) {
    return { data: null, error: err.message, mode: "connected" };
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

  try {
    // 1. Fetch image as blob
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();

    // 2. Upload to storage
    return await uploadImageBlob(filePath, blob);
  } catch (err) {
    return { data: null, error: err.message, mode: "connected" };
  }
}
