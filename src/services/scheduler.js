import { processScheduledPosts } from "./publish-processor.js";

/**
 * Client-Side Scheduler Service
 * Lightweight wrapper around the publish processor for background polling.
 */

/**
 * Executes a single scheduler tick: delegates to the centralized processor.
 * @param {Array} posts - Current remote posts.
 * @param {Object} settings - App settings.
 * @param {Object} options - Optional callbacks.
 * @returns {Promise<Object>} Summary of the tick results.
 */
export async function runSchedulerTick(posts, settings, options = {}) {
  // Simply wrap the centralized processor call
  return processScheduledPosts({
    posts,
    settings,
    onPostPublished: options.onPostPublished
  });
}
