import { logger } from "./logger.js";
import { getFacebookPublishDiagnostics, publishFacebookPost } from "./facebook.js";
import { createOperationLog } from "./operation-logs.js";
import { fetchRemotePosts, updateRemotePostStatus } from "./supabase.js";
import { resolveEffectivePublishConfig } from "./page-context.js";

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
      const effectivePublish = resolveEffectivePublishConfig({
        post,
        settings,
      });
      const publishDiagnostics = getFacebookPublishDiagnostics(post);

      try {
        logger.debug("Processor: Resolved scheduled post publish config.", {
          postId: post.id,
          requestedPageId: effectivePublish.requestedPageId,
          resolvedPageId: effectivePublish.resolvedPageId,
          effectivePublishSource: effectivePublish.effectivePublishSource,
          livePerPagePublishStatus: effectivePublish.livePerPagePublishStatus,
        });

        if (!effectivePublish.canAttemptPublish) {
          logger.warn(`Processor: Blocking post '${post.topic}' due to unsafe publish routing.`, effectivePublish.blockedReason);
          await createOperationLog({
            level: "warn",
            source: "scheduler",
            event: "publish_blocked",
            message: effectivePublish.blockedReason || "Scheduled publish was blocked.",
            page_id: effectivePublish.resolvedPageId,
            post_id: post.id,
            metadata: {
              topic: post.topic,
              publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              image_url_type: publishDiagnostics.originalImageUrlType,
              fallback_reason: effectivePublish.fallbackReason || "",
            },
          });
          summary.failed++;
          summary.results.push({
            id: post.id,
            status: "blocked",
            topic: post.topic,
            page_id: effectivePublish.resolvedPageId,
            page_label: effectivePublish.label,
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
            error: effectivePublish.blockedReason || effectivePublish.fallbackReason || "Publish blocked",
          });
          continue;
        }

        if (effectivePublish.effectiveSettings.facebookPublishMode === "live" && publishDiagnostics.imageBlocked) {
          logger.warn(`Processor: Blocking post '${post.topic}' due to unsafe image URL.`, publishDiagnostics.originalImageUrl);
          await createOperationLog({
            level: "warn",
            source: "scheduler",
            event: "publish_blocked",
            message: "Scheduled publish was blocked because the image URL is not public and publish-safe.",
            page_id: effectivePublish.resolvedPageId,
            post_id: post.id,
            metadata: {
              topic: post.topic,
              publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              image_url_type: publishDiagnostics.originalImageUrlType,
              fallback_reason: effectivePublish.fallbackReason || "",
            },
          });
          summary.failed++;
          summary.results.push({
            id: post.id,
            status: "blocked",
            topic: post.topic,
            page_id: effectivePublish.resolvedPageId,
            page_label: effectivePublish.label,
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
            error: "Unsafe image URL blocked scheduled publish",
          });
          continue;
        }

        if (effectivePublish.fallbackReason) {
          logger.info(`Processor: Using publish fallback for post '${post.topic}'.`, {
            reason: effectivePublish.fallbackReason,
            source: effectivePublish.effectivePublishSource,
            targetPageId: effectivePublish.effectivePageId,
          });
          await createOperationLog({
            level: "info",
            source: "scheduler",
            event: "publish_fallback",
            message: effectivePublish.fallbackReason,
            page_id: effectivePublish.resolvedPageId,
            post_id: post.id,
            metadata: {
              topic: post.topic,
              publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              effective_page_id: effectivePublish.effectivePageId,
              image_url_type: publishDiagnostics.originalImageUrlType,
              fallback_reason: effectivePublish.fallbackReason,
            },
          });
        }

        const publishResult = await publishFacebookPost(post, effectivePublish.effectiveSettings);

        if (publishResult.data) {
          const postedAt = new Date().toISOString();
          const updateResult = await updateRemotePostStatus(post.id, "posted", {
            posted_at: postedAt,
          });

          if (updateResult.data) {
            logger.info(`Processor: Successfully published post '${post.topic}'`);
            await createOperationLog({
              level: "info",
              source: "scheduler",
              event: "publish_success",
              message: `Scheduled publish succeeded for "${post.topic}".`,
              page_id: effectivePublish.resolvedPageId,
              post_id: post.id,
              metadata: {
                publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
                publish_source: effectivePublish.effectivePublishSource,
                live_page_publish_status: effectivePublish.livePerPagePublishStatus,
                effective_page_id: effectivePublish.effectivePageId,
                image_url_type: publishResult.diagnostics?.resolvedImageUrlType || publishDiagnostics.resolvedImageUrlType,
                fallback_reason: effectivePublish.fallbackReason || "",
              },
            });
            summary.published++;
            summary.results.push({
              id: post.id,
              status: "success",
              topic: post.topic,
              page_id: effectivePublish.resolvedPageId,
              page_label: effectivePublish.label,
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              fallback_reason: effectivePublish.fallbackReason || "",
            });
            if (onPostPublished) onPostPublished(updateResult.data);
          } else {
            logger.error(`Processor: Published post '${post.topic}' but status update failed.`);
            await createOperationLog({
              level: "error",
              source: "scheduler",
              event: "publish_partial_failure",
              message: `Scheduled publish succeeded but status update failed for "${post.topic}".`,
              page_id: effectivePublish.resolvedPageId,
              post_id: post.id,
              metadata: {
                publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
                publish_source: effectivePublish.effectivePublishSource,
                live_page_publish_status: effectivePublish.livePerPagePublishStatus,
                image_url_type: publishResult.diagnostics?.resolvedImageUrlType || publishDiagnostics.resolvedImageUrlType,
                fallback_reason: effectivePublish.fallbackReason || "",
              },
            });
            summary.failed++;
            summary.results.push({
              id: post.id,
              status: "partial_failure",
              page_id: effectivePublish.resolvedPageId,
              page_label: effectivePublish.label,
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              error: "Published to FB but failed to update status",
            });
          }
        } else {
          logger.error(`Processor: Failed to publish post '${post.topic}':`, publishResult.error);
          await createOperationLog({
            level: "error",
            source: "scheduler",
            event: "publish_failure",
            message: publishResult.error || `Scheduled publish failed for "${post.topic}".`,
            page_id: effectivePublish.resolvedPageId,
            post_id: post.id,
            metadata: {
              publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              image_url_type: publishResult.diagnostics?.originalImageUrlType || publishDiagnostics.originalImageUrlType,
              fallback_reason: effectivePublish.fallbackReason || "",
              facebook_error_payload: publishResult.facebookErrorPayload || null,
            },
          });
          summary.failed++;
          summary.results.push({
            id: post.id,
            status: "failure",
            page_id: effectivePublish.resolvedPageId,
            page_label: effectivePublish.label,
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
            error: publishResult.error,
          });
        }
      } catch (err) {
        logger.error(`Processor: Unexpected error processing post '${post.topic}':`, err);
        await createOperationLog({
          level: "error",
          source: "scheduler",
          event: "publish_error",
          message: err.message || `Unexpected scheduled publish error for "${post.topic}".`,
          page_id: effectivePublish.resolvedPageId,
          post_id: post.id,
          metadata: {
            publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
            image_url_type: publishDiagnostics.originalImageUrlType,
            fallback_reason: effectivePublish.fallbackReason || "",
          },
        });
        summary.failed++;
        summary.results.push({
          id: post.id,
          status: "error",
          page_id: effectivePublish.resolvedPageId,
          page_label: effectivePublish.label,
          publish_source: effectivePublish.effectivePublishSource,
          live_page_publish_status: effectivePublish.livePerPagePublishStatus,
          error: err.message,
        });
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
