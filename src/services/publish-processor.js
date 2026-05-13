import { logger } from "./logger.js";
import { getFacebookPublishDiagnostics, publishFacebookPost } from "./facebook.js";
import { createOperationLog } from "./operation-logs.js";
import {
  claimRemotePostForPublishing,
  fetchRemotePosts,
  finalizeRemotePublishedPost,
  markRemotePostFailed,
} from "./supabase.js";
import { resolveEffectivePublishConfig } from "./page-context.js";

/**
 * Publish Processor Service
 * Centralized logic for processing scheduled posts.
 * Decoupled from React lifecycle to support future Edge Functions.
 */

// In-memory lock to prevent concurrent executions in the same environment
let isProcessing = false;

function buildSchedulerLogEntry({
  level = "info",
  event = "unknown",
  message = "",
  post = null,
  effectivePublish = null,
  publishDiagnostics = null,
  extraMetadata = {},
}) {
  return {
    category: "scheduler",
    level,
    source: "scheduler",
    event,
    message,
    page_id: effectivePublish?.resolvedPageId || post?.page_id || null,
    post_id: post?.id || null,
    metadata: {
      topic: post?.topic || "",
      scheduled_at: post?.scheduled_at || null,
      attempted_at: new Date().toISOString(),
      post_status: post?.status || null,
      publish_mode: effectivePublish?.effectiveSettings?.facebookPublishMode || "mock",
      publish_source: effectivePublish?.effectivePublishSource || null,
      live_page_publish_status: effectivePublish?.livePerPagePublishStatus || null,
      effective_page_id: effectivePublish?.effectivePageId || null,
      image_url_type: publishDiagnostics?.resolvedImageUrlType || publishDiagnostics?.originalImageUrlType || "none",
      result: extraMetadata.result || null,
      error_message: extraMetadata.error_message || "",
      fallback_reason: extraMetadata.fallback_reason || effectivePublish?.fallbackReason || "",
      facebook_error_payload: extraMetadata.facebook_error_payload || null,
      ...extraMetadata,
    },
  };
}

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
    await createOperationLog({
      category: "scheduler",
      level: "info",
      source: "scheduler",
      event: "scheduler_started",
      message: "Scheduler run started.",
      metadata: {
        attempted_at: new Date().toISOString(),
        publish_mode: settings.facebookPublishMode || "mock",
        scheduler_enabled: Boolean(settings.schedulerEnabled),
        due_count: duePosts.length,
        result: "started",
      },
    });

    // 4. Execute Publish Flow
    for (const post of duePosts) {
      const effectivePublish = resolveEffectivePublishConfig({
        post,
        settings,
      });
      const publishDiagnostics = getFacebookPublishDiagnostics(post);

      try {
        await createOperationLog(
          buildSchedulerLogEntry({
            event: "post_due",
            message: `Post due for scheduler processing: "${post.topic}".`,
            post,
            effectivePublish,
            publishDiagnostics,
            extraMetadata: {
              result: "due",
            },
          })
        );
        logger.debug("Processor: Resolved scheduled post publish config.", {
          postId: post.id,
          requestedPageId: effectivePublish.requestedPageId,
          resolvedPageId: effectivePublish.resolvedPageId,
          effectivePublishSource: effectivePublish.effectivePublishSource,
          livePerPagePublishStatus: effectivePublish.livePerPagePublishStatus,
        });

        const claimResult = await claimRemotePostForPublishing(post.id, ["scheduled"], {
          scheduled_at: post.scheduled_at || null,
        });

        if (!claimResult.claimed) {
          await createOperationLog(
            buildSchedulerLogEntry({
              level: "warn",
              event: "publish_skipped",
              message: `Scheduled publish skipped for "${post.topic}" because the post state changed before claim.`,
              post: claimResult.data || post,
              effectivePublish,
              publishDiagnostics,
              extraMetadata: {
                result: "skipped",
                error_message: "Post state changed before scheduler claim",
              },
            })
          );
          summary.results.push({
            id: post.id,
            status: "skipped",
            topic: post.topic,
            page_id: effectivePublish.resolvedPageId,
            page_label: effectivePublish.label,
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
            error: "Post state changed before scheduler claim",
          });
          continue;
        }

        const claimedPost = claimResult.data || { ...post, status: "publishing" };
        await createOperationLog(
          buildSchedulerLogEntry({
            event: "publish_claimed",
            message: `Scheduler claimed "${post.topic}" for publishing.`,
            post: claimedPost,
            effectivePublish,
            publishDiagnostics,
            extraMetadata: {
              result: "claimed",
            },
          })
        );

        if (!effectivePublish.canAttemptPublish) {
          logger.warn(`Processor: Blocking post '${post.topic}' due to unsafe publish routing.`, effectivePublish.blockedReason);
          const failedUpdate = await markRemotePostFailed(post.id);
          await createOperationLog(
            buildSchedulerLogEntry({
              level: "warn",
              event: "publish_blocked",
              message: effectivePublish.blockedReason || "Scheduled publish was blocked.",
              post: failedUpdate.data || claimedPost,
              effectivePublish,
              publishDiagnostics,
              extraMetadata: {
                result: "skipped",
                error_message: effectivePublish.blockedReason || effectivePublish.fallbackReason || "Publish blocked",
              },
            })
          );
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
          const failedUpdate = await markRemotePostFailed(post.id);
          await createOperationLog(
            buildSchedulerLogEntry({
              level: "warn",
              event: "publish_blocked",
              message: "Scheduled publish was blocked because the image URL is not public and publish-safe.",
              post: failedUpdate.data || claimedPost,
              effectivePublish,
              publishDiagnostics,
              extraMetadata: {
                result: "skipped",
                error_message: "Unsafe image URL blocked scheduled publish",
                attempted_image_url: publishDiagnostics.originalImageUrl || null,
              },
            })
          );
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
          await createOperationLog(
            buildSchedulerLogEntry({
              event: "publish_fallback",
              message: effectivePublish.fallbackReason,
              post: claimedPost,
              effectivePublish,
              publishDiagnostics,
              extraMetadata: {
                result: "fallback",
                fallback_reason: effectivePublish.fallbackReason,
              },
            })
          );
        }

        await createOperationLog(
          buildSchedulerLogEntry({
            event: "publish_attempt",
            message: `Scheduler attempted publish for "${post.topic}".`,
            post: claimedPost,
            effectivePublish,
            publishDiagnostics,
            extraMetadata: {
              result:
                effectivePublish.effectiveSettings.facebookPublishMode === "live"
                  ? "live_attempt"
                  : "mock_attempt",
            },
          })
        );

        const publishResult = await publishFacebookPost(post, effectivePublish.effectiveSettings);

        if (publishResult.data) {
          const postedAt = new Date().toISOString();
          await createOperationLog(
            buildSchedulerLogEntry({
              event: "facebook_publish_success",
              message:
                effectivePublish.effectiveSettings.facebookPublishMode === "live"
                  ? `Facebook live publish succeeded for "${post.topic}".`
                  : `Mock publish completed for "${post.topic}".`,
              post: claimedPost,
              effectivePublish,
              publishDiagnostics: publishResult.diagnostics || publishDiagnostics,
              extraMetadata: {
                result: effectivePublish.effectiveSettings.facebookPublishMode === "live" ? "success" : "mock",
                facebook_post_id: publishResult.data.id || null,
              },
            })
          );
          const updateResult = await finalizeRemotePublishedPost(post.id, {
            postedAt,
            facebookPostId: publishResult.data.id || null,
          });

          if (updateResult.data) {
            logger.info(`Processor: Successfully published post '${post.topic}'`);
            await createOperationLog(
              buildSchedulerLogEntry({
                event: "db_finalize_success",
                message: `Publish finalization saved for "${post.topic}".`,
                post: updateResult.data,
                effectivePublish,
                publishDiagnostics: publishResult.diagnostics || publishDiagnostics,
                extraMetadata: {
                  result: effectivePublish.effectiveSettings.facebookPublishMode === "live" ? "success" : "mock",
                  facebook_post_id: publishResult.data.id || null,
                },
              })
            );
            await createOperationLog(
              buildSchedulerLogEntry({
                event: "publish_completed",
                message:
                  effectivePublish.effectiveSettings.facebookPublishMode === "live"
                    ? `Scheduled live publish completed for "${post.topic}".`
                    : `Scheduled mock publish completed for "${post.topic}".`,
                post: updateResult.data,
                effectivePublish,
                publishDiagnostics: publishResult.diagnostics || publishDiagnostics,
                extraMetadata: {
                  result: effectivePublish.effectiveSettings.facebookPublishMode === "live" ? "success" : "mock",
                  facebook_post_id: publishResult.data.id || null,
                },
              })
            );
            summary.published++;
            summary.results.push({
              id: post.id,
              status: effectivePublish.effectiveSettings.facebookPublishMode === "live" ? "success" : "mock",
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
            await createOperationLog(
              buildSchedulerLogEntry({
                level: "error",
                event: "publish_completed",
                message: `Scheduled publish succeeded but status update failed for "${post.topic}".`,
                post,
                effectivePublish,
                publishDiagnostics: publishResult.diagnostics || publishDiagnostics,
                extraMetadata: {
                  result: "failed",
                  error_message: "Published to FB but failed to update status",
                },
              })
            );
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
          const failedUpdate = await markRemotePostFailed(post.id);
          await createOperationLog(
            buildSchedulerLogEntry({
              level: "error",
              event: "facebook_publish_failed",
              message: publishResult.error || `Facebook publish failed for "${post.topic}".`,
              post: failedUpdate.data || claimedPost,
              effectivePublish,
              publishDiagnostics: publishResult.diagnostics || publishDiagnostics,
              extraMetadata: {
                result: publishResult.mode === "mock" ? "mock" : "failed",
                error_message: publishResult.error || "",
                facebook_error_payload: publishResult.facebookErrorPayload || null,
              },
            })
          );
          await createOperationLog(
            buildSchedulerLogEntry({
              level: "error",
              event: "publish_completed",
              message: publishResult.error || `Scheduled publish failed for "${post.topic}".`,
              post: failedUpdate.data || claimedPost,
              effectivePublish,
              publishDiagnostics: publishResult.diagnostics || publishDiagnostics,
              extraMetadata: {
                result: publishResult.mode === "mock" ? "mock" : "failed",
                error_message: publishResult.error || "",
                facebook_error_payload: publishResult.facebookErrorPayload || null,
              },
            })
          );
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
        const failedUpdate = await markRemotePostFailed(post.id);
        await createOperationLog(
          buildSchedulerLogEntry({
            level: "error",
            event: "facebook_publish_failed",
            message: err.message || `Unexpected scheduled publish error for "${post.topic}".`,
            post: failedUpdate.data || post,
            effectivePublish,
            publishDiagnostics,
            extraMetadata: {
              result: "failed",
              error_message: err.message || "Unexpected scheduled publish error",
            },
          })
        );
        await createOperationLog(
          buildSchedulerLogEntry({
            level: "error",
            event: "publish_completed",
            message: err.message || `Unexpected scheduled publish error for "${post.topic}".`,
            post: failedUpdate.data || post,
            effectivePublish,
            publishDiagnostics,
            extraMetadata: {
              result: "failed",
              error_message: err.message || "Unexpected scheduled publish error",
            },
          })
        );
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
