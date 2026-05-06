import { logger } from "./logger.js";
import { publishFacebookPost, validateFacebookConfig } from "./facebook.js";
import { updateRemotePostStatus } from "./supabase.js";

/**
 * Client-Side Scheduler Service
 * Detects and publishes scheduled posts when their time is due.
 */

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
 * @param {Array} posts - List of post objects.
 * @param {Date} now - Current time.
 * @returns {Array}
 */
export function getDueScheduledPosts(posts, now = new Date()) {
  return (posts || []).filter(post => isPostDue(post, now));
}

/**
 * Executes a single scheduler tick: finds due posts and attempts to publish them.
 * @param {Array} posts - Current remote posts.
 * @param {Object} settings - App settings.
 * @param {Object} options - Optional callbacks.
 * @returns {Promise<Object>} Summary of the tick results.
 */
export async function runSchedulerTick(posts, settings, options = {}) {
  const summary = {
    checked: (posts || []).length,
    due: 0,
    published: 0,
    failed: 0,
    results: []
  };

  if (!validateFacebookConfig(settings)) {
    logger.warn("Scheduler skipped: Facebook not configured.");
    return { ...summary, error: "Facebook not configured" };
  }

  const duePosts = getDueScheduledPosts(posts);
  summary.due = duePosts.length;

  if (duePosts.length === 0) {
    logger.debug("Scheduler tick: No due posts found.");
    return summary;
  }

  logger.info(`Scheduler tick: Found ${duePosts.length} due posts.`);

  for (const post of duePosts) {
    try {
      const publishResult = await publishFacebookPost(post, settings);
      
      if (publishResult.data) {
        const postedAt = new Date().toISOString();
        const updateResult = await updateRemotePostStatus(post.id, "posted", {
          posted_at: postedAt
        });

        if (updateResult.data) {
          logger.info(`Scheduler: Successfully published post '${post.topic}'`);
          summary.published++;
          summary.results.push({ id: post.id, status: "success", topic: post.topic });
          if (options.onPostPublished) options.onPostPublished(updateResult.data);
        } else {
          logger.error(`Scheduler: Published post '${post.topic}' but status update failed.`);
          summary.failed++;
          summary.results.push({ id: post.id, status: "partial_failure", error: "Published to FB but failed to update status" });
        }
      } else {
        logger.error(`Scheduler: Failed to publish post '${post.topic}':`, publishResult.error);
        summary.failed++;
        summary.results.push({ id: post.id, status: "failure", error: publishResult.error });
      }
    } catch (err) {
      logger.error(`Scheduler: Unexpected error processing post '${post.topic}':`, err);
      summary.failed++;
      summary.results.push({ id: post.id, status: "error", error: err.message });
    }
  }

  return summary;
}
