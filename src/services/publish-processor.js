import { logger } from "./logger.js";
import { publishFacebookPost, validateFacebookConfig } from "./facebook.js";
import { fetchRemotePosts, updateRemotePostStatus } from "./supabase.js";

/**
 * Publish Processor Service
 * Centralized logic for processing scheduled posts.
 * Decoupled from React lifecycle to support future Edge Functions.
 */

// In-memory lock to prevent concurrent executions in the same environment
let isProcessing = false;

/**
 * Checks if a post is due for publication.
 * @param {Object} post - The post object.
 * @param {Date} now - Current time.
 * @returns {boolean}
 */
export function isPostDue(post, now = new Date()) {
  if (post.status !== "scheduled" || !post.scheduled_at) return false;
  const scheduledDate = new Date(post.scheduled_at);
  return scheduledDate <= now;
}

/**
 * Filters a list of posts to find those that are scheduled and due.
 */
export function getDueScheduledPosts(posts, now = new Date()) {
  return (posts || []).filter((post) => isPostDue(post, now));
}

/**
 * Core processor for scheduled posts.
 * Can be called by client-side scheduler or server-side Edge Function.
 * 
 * @param {Object} options 
 * @param {Array} options.posts - Optional pre-fetched posts (used by client).
 * @param {Object} options.settings - App settings containing config and safety modes.
 * @param {Function} options.onPostPublished - Callback for UI updates.
 * @returns {Promise<Object>} Summary of results.
 */
export async function processScheduledPosts({ posts, settings, onPostPublished } = {}) {
  const summary = {
    checked: 0,
    due: 0,
    published: 0,
    failed: 0,
    results: [],
  };

  if (isProcessing) {
    logger.debug("Processor: Already running, skipping this tick.");
    return { ...summary, error: "Concurrent execution locked" };
  }

  // 1. Validation & Safety Guards
  if (!settings) {
    return { ...summary, error: "Missing settings" };
  }

  if (!settings.schedulerEnabled) {
    logger.debug("Processor: Scheduler is disabled in settings.");
    return { ...summary, status: "disabled" };
  }

  if (!validateFacebookConfig(settings)) {
    logger.warn("Processor: Facebook configuration incomplete.");
    return { ...summary, error: "Facebook not configured" };
  }

  isProcessing = true;
  logger.info(`Processor: Starting tick (Mode: ${settings.facebookPublishMode || "mock"})...`);

  try {
    // 2. Fetch Data (if not provided)
    let candidatePosts = posts;
    if (!candidatePosts) {
      const fetchResult = await fetchRemotePosts();
      candidatePosts = fetchResult.data || [];
    }
    summary.checked = candidatePosts.length;

    // 3. Filter Due Posts
    const duePosts = getDueScheduledPosts(candidatePosts);
    summary.due = duePosts.length;

    if (duePosts.length === 0) {
      logger.debug("Processor: No due posts found.");
      return summary;
    }

    logger.info(`Processor: Found ${duePosts.length} due posts.`);

    // 4. Execute Publish Flow
    for (const post of duePosts) {
      try {
        const publishResult = await publishFacebookPost(post, settings);

        if (publishResult.data) {
          const postedAt = new Date().toISOString();
          const updateResult = await updateRemotePostStatus(post.id, "posted", {
            posted_at: postedAt,
          });

          if (updateResult.data) {
            logger.info(`Processor: Successfully published post '${post.topic}'`);
            summary.published++;
            summary.results.push({ id: post.id, status: "success", topic: post.topic });
            if (onPostPublished) onPostPublished(updateResult.data);
          } else {
            logger.error(`Processor: Published post '${post.topic}' but status update failed.`);
            summary.failed++;
            summary.results.push({
              id: post.id,
              status: "partial_failure",
              error: "Published to FB but failed to update status",
            });
          }
        } else {
          logger.error(`Processor: Failed to publish post '${post.topic}':`, publishResult.error);
          summary.failed++;
          summary.results.push({ id: post.id, status: "failure", error: publishResult.error });
        }
      } catch (err) {
        logger.error(`Processor: Unexpected error processing post '${post.topic}':`, err);
        summary.failed++;
        summary.results.push({ id: post.id, status: "error", error: err.message });
      }
    }
  } catch (globalErr) {
    logger.error("Processor: Critical error in publish flow:", globalErr);
    summary.error = globalErr.message;
  } finally {
    isProcessing = false;
  }

  return summary;
}
