import { serve } from "std/http/server.ts";
import { createClient } from "supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const FB_API_VERSION = "v23.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;
const SCHEDULER_DIAGNOSTIC_LIMIT = 100;

function normalizePageId(pageId: string | null | undefined) {
  return typeof pageId === "string" && pageId.trim() ? pageId.trim() : "default";
}

function isUnsafeImageUrl(value: string | null | undefined) {
  const next = String(value || "").trim();
  if (!next) return false;

  if (
    next.startsWith("blob:") ||
    next.startsWith("data:") ||
    next.startsWith("file:") ||
    next.startsWith("http://localhost") ||
    next.startsWith("https://localhost") ||
    next.startsWith("http://127.0.0.1") ||
    next.startsWith("https://127.0.0.1")
  ) {
    return true;
  }

  try {
    const parsed = new URL(next);
    return parsed.protocol !== "http:" && parsed.protocol !== "https:";
  } catch {
    return true;
  }
}

function getImageUrlType(value: string | null | undefined) {
  const next = String(value || "").trim();
  if (!next) return "empty";
  if (next.startsWith("blob:")) return "blob";
  if (next.startsWith("data:")) return "data";
  if (next.startsWith("file:")) return "file";
  if (next.startsWith("http://localhost") || next.startsWith("https://localhost")) return "localhost";
  if (next.startsWith("http://127.0.0.1") || next.startsWith("https://127.0.0.1")) return "localhost";

  try {
    return new URL(next).protocol.replace(":", "") || "unknown";
  } catch {
    return "invalid";
  }
}

function resolveEffectivePublishConfig(post: Record<string, any>, settings: Record<string, any>, pages: Array<Record<string, any>>) {
  const requestedPageId = normalizePageId(post.page_id);
  const resolvedPage =
    pages.find((page) => page.id === requestedPageId) ||
    pages.find((page) => page.id === "default") ||
    pages[0] ||
    {
      id: "default",
      label: "Default Page",
      facebook_page_id: "",
      facebook_page_access_token: "",
    };

  const publishMode = settings.facebook_publish_mode || "mock";
  const hasPageSpecificPageId = Boolean(resolvedPage.facebook_page_id);
  const hasPageSpecificToken = Boolean(resolvedPage.facebook_page_access_token);
  const hasGlobalPageId = Boolean(settings.facebook_page_id);
  const hasGlobalPageToken = Boolean(settings.facebook_page_access_token);
  const pageConfigReady = hasPageSpecificPageId && hasPageSpecificToken;
  const globalConfigReady = hasGlobalPageId && hasGlobalPageToken;
  const source = resolvedPage.id === requestedPageId ? "matched" : "fallback";

  if (publishMode !== "live") {
    const mockConfigReady = pageConfigReady || globalConfigReady;
    return {
      requestedPageId,
      resolvedPageId: resolvedPage.id || "default",
      pageLabel: resolvedPage.label || "Default Page",
      effectivePublishSource: "mock",
      effectivePublishLabel: "Mock Safe",
      livePagePublishStatus: "Disabled",
      pageId: pageConfigReady ? resolvedPage.facebook_page_id : settings.facebook_page_id,
      accessToken: pageConfigReady ? resolvedPage.facebook_page_access_token : settings.facebook_page_access_token,
      canAttemptPublish: mockConfigReady,
      reason: mockConfigReady ? "" : "Facebook publish config is incomplete for both page-specific and global settings.",
    };
  }

  if (pageConfigReady) {
    return {
      requestedPageId,
      resolvedPageId: resolvedPage.id || "default",
      pageLabel: resolvedPage.label || "Default Page",
      effectivePublishSource: "page-specific",
      effectivePublishLabel: "Page-Specific Live",
      livePagePublishStatus: "Active",
      pageId: resolvedPage.facebook_page_id,
      accessToken: resolvedPage.facebook_page_access_token,
      canAttemptPublish: true,
      reason: "",
    };
  }

  if (source === "fallback" && requestedPageId !== resolvedPage.id) {
    return {
      requestedPageId,
      resolvedPageId: resolvedPage.id || "default",
      pageLabel: resolvedPage.label || "Default Page",
      effectivePublishSource: "blocked",
      effectivePublishLabel: "Blocked",
      livePagePublishStatus: "Blocked",
      pageId: "",
      accessToken: "",
      canAttemptPublish: false,
      reason: "Requested page could not be resolved. Live publish was blocked to avoid publishing to the wrong page.",
    };
  }

  if ((resolvedPage.id || "default") !== "default") {
    return {
      requestedPageId,
      resolvedPageId: resolvedPage.id || "default",
      pageLabel: resolvedPage.label || "Default Page",
      effectivePublishSource: "blocked",
      effectivePublishLabel: "Blocked",
      livePagePublishStatus: "Blocked",
      pageId: "",
      accessToken: "",
      canAttemptPublish: false,
      reason: "Page-specific publish config is incomplete. Live publish was blocked to avoid publishing to the wrong page.",
    };
  }

  if (globalConfigReady) {
    return {
      requestedPageId,
      resolvedPageId: resolvedPage.id || "default",
      pageLabel: resolvedPage.label || "Default Page",
      effectivePublishSource: "global-v1",
      effectivePublishLabel: "Global V1 Live",
      livePagePublishStatus: "Fallback",
      pageId: settings.facebook_page_id,
      accessToken: settings.facebook_page_access_token,
      canAttemptPublish: true,
      reason: "Default page is using the stable global V1 publish config.",
    };
  }

  return {
    requestedPageId,
    resolvedPageId: resolvedPage.id || "default",
    pageLabel: resolvedPage.label || "Default Page",
    effectivePublishSource: "blocked",
    effectivePublishLabel: "Blocked",
    livePagePublishStatus: "Blocked",
    pageId: "",
    accessToken: "",
    canAttemptPublish: false,
    reason: "Global V1 publish config is incomplete, and no safe page-specific live config is available.",
  };
}

function buildLogMetadata(post: Record<string, any>, publishConfig: Record<string, any>, extra: Record<string, any> = {}) {
  return {
    topic: post.topic || "",
    scheduled_at: post.scheduled_at || null,
    attempted_at: new Date().toISOString(),
    publish_mode: extra.publish_mode || "mock",
    publish_source: publishConfig.effectivePublishSource,
    live_page_publish_status: publishConfig.livePagePublishStatus,
    effective_page_id: publishConfig.resolvedPageId,
    image_url_type: getImageUrlType(post.image_url),
    result: extra.result || null,
    error_message: extra.error_message || "",
    fallback_reason: extra.fallback_reason || publishConfig.reason || "",
    facebook_error_payload: extra.facebook_error_payload || null,
    facebook_post_id: extra.facebook_post_id || null,
  };
}

function buildFacebookPublishRequest(post: Record<string, any>) {
  const params = new URLSearchParams();
  const message = post.content || post.topic || "";
  const safeImageUrl = !isUnsafeImageUrl(post.image_url) ? String(post.image_url || "").trim() : "";

  if (safeImageUrl) {
    params.append("url", safeImageUrl);
    if (message) {
      params.append("caption", message);
    }
    return {
      endpoint: "photos",
      params,
      publishTarget: "photo",
    };
  }

  if (message) {
    params.append("message", message);
  }

  return {
    endpoint: "feed",
    params,
    publishTarget: "feed",
  };
}

function parseScheduledTimestamp(value: string | null | undefined) {
  const next = String(value || "").trim();
  if (!next) return null;

  const direct = new Date(next);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const normalized = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(next) ? next : `${next}Z`;
  const fallback = new Date(normalized);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

function getServerTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  } catch {
    return "unknown";
  }
}

function evaluateDuePostCandidate(post: Record<string, any>, serverNow: Date) {
  const scheduledDate = parseScheduledTimestamp(post.scheduled_at);
  const scheduledAtMs = scheduledDate?.getTime() ?? null;
  const serverNowMs = serverNow.getTime();
  const due = scheduledAtMs !== null && scheduledAtMs <= serverNowMs;

  return {
    post,
    due,
    diagnostics: {
      id: String(post.id || ""),
      status: post.status || null,
      scheduled_at: post.scheduled_at || null,
      parsed_scheduled_at: scheduledDate?.toISOString() || null,
      server_now: serverNow.toISOString(),
      server_now_ms: serverNowMs,
      scheduled_at_ms: scheduledAtMs,
      comparison_result: due ? "due" : scheduledAtMs === null ? "invalid_scheduled_at" : "not_due",
      comparison_expression: scheduledAtMs === null ? "invalid scheduled_at" : `${scheduledAtMs} <= ${serverNowMs}`,
      filter_logic_path:
        "db: status = scheduled AND scheduled_at IS NOT NULL -> edge: parse scheduled_at -> due if scheduled_at_ms <= server_now_ms",
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cronSecretHeader = req.headers.get("x-cron-secret");
  const systemCronSecret = Deno.env.get("CRON_SECRET");

  if (!systemCronSecret || cronSecretHeader !== systemCronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const writeOperationLog = async (entry: Record<string, any>) => {
      const { error } = await supabase.from("operation_logs").insert([entry]);
      if (error) {
        const message = String(error.message || "");
        if (!/relation .*operation_logs.* does not exist/i.test(message)) {
          console.warn("Operation log write skipped.", error);
        }
      }
    };

    const { data: settings, error: settingsError } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settings) {
      return new Response(JSON.stringify({ message: "No settings found, skipping." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.scheduler_enabled) {
      return new Response(JSON.stringify({ message: "Scheduler disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serverNow = new Date();
    const serverNowIso = serverNow.toISOString();
    const publishMode = settings.facebook_publish_mode || "mock";
    const { data: scheduledCandidates, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "scheduled")
      .not("scheduled_at", "is", null)
      .order("scheduled_at", { ascending: true });

    if (postsError) throw postsError;

    const candidateEvaluations = (scheduledCandidates || []).map((post) => evaluateDuePostCandidate(post, serverNow));
    const duePosts = candidateEvaluations.filter((entry) => entry.due).map((entry) => entry.post);
    const schedulerDiagnostics = {
      attempted_at: serverNowIso,
      publish_mode: publishMode,
      scheduler_enabled: true,
      server_timestamp: serverNowIso,
      server_timezone: getServerTimezone(),
      fetched_scheduled_posts_count: scheduledCandidates?.length || 0,
      due_count: duePosts.length,
      filter_logic_path:
        "db: status = scheduled AND scheduled_at IS NOT NULL -> edge: parse scheduled_at -> due if scheduled_at_ms <= server_now_ms",
      candidate_posts: candidateEvaluations
        .slice(0, SCHEDULER_DIAGNOSTIC_LIMIT)
        .map((entry) => entry.diagnostics),
    };

    console.log("scheduler_edge_due_query_diagnostics", JSON.stringify(schedulerDiagnostics));

    await writeOperationLog({
      category: "scheduler",
      level: "info",
      source: "scheduler_edge",
      event: "scheduler_due_query_diagnostics",
      message: "Scheduler due-post query diagnostics recorded.",
      metadata: {
        ...schedulerDiagnostics,
        result: duePosts.length > 0 ? "due_found" : "no_due",
      },
    });

    if (!duePosts || duePosts.length === 0) {
      return new Response(JSON.stringify({
        message: "No due posts",
        count: 0,
        diagnostics: {
          server_timestamp: serverNowIso,
          fetched_scheduled_posts_count: scheduledCandidates?.length || 0,
          due_count: 0,
          filter_logic_path: schedulerDiagnostics.filter_logic_path,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await writeOperationLog({
      category: "scheduler",
      level: "info",
      source: "scheduler_edge",
      event: "scheduler_started",
      message: "Scheduler run started.",
      metadata: {
        attempted_at: serverNowIso,
        publish_mode: publishMode,
        scheduler_enabled: true,
        due_count: duePosts.length,
        result: "started",
      },
    });

    const pagesResult = await supabase
      .from("pages")
      .select("id, label, facebook_page_id, facebook_page_access_token");
    const pages = pagesResult.error ? [] : pagesResult.data || [];

    const results: Array<Record<string, any>> = [];

    for (const post of duePosts) {
      const publishConfig = resolveEffectivePublishConfig(post, settings, pages);
      const postResult: Record<string, any> = {
        id: post.id,
        topic: post.topic,
        action: "skip",
        success: false,
        page_id: publishConfig.resolvedPageId,
        page_label: publishConfig.pageLabel,
        publish_source: publishConfig.effectivePublishSource,
        live_page_publish_status: publishConfig.livePagePublishStatus,
      };

      try {
        await writeOperationLog({
          category: "scheduler",
          level: "info",
          source: "scheduler_edge",
          event: "post_due",
          message: `Post due for scheduler processing: "${post.topic}".`,
          page_id: publishConfig.resolvedPageId,
          post_id: String(post.id),
          metadata: buildLogMetadata(post, publishConfig, {
            publish_mode: publishMode,
            result: "due",
          }),
        });

        const claimPayload = {
          status: "publishing",
          updated_at: new Date().toISOString(),
        };
        let claimQuery = supabase
          .from("posts")
          .update(claimPayload)
          .eq("id", post.id)
          .eq("status", "scheduled");
        if (post.scheduled_at) {
          claimQuery = claimQuery.eq("scheduled_at", post.scheduled_at);
        }
        const { data: claimedPost, error: claimError } = await claimQuery.select("*").maybeSingle();
        if (claimError) throw claimError;

        if (!claimedPost) {
          const { data: latestPost } = await supabase.from("posts").select("*").eq("id", post.id).maybeSingle();
          const alreadyCompleted =
            latestPost?.status === "posted" || (latestPost?.status !== "scheduled" && !latestPost?.scheduled_at);
          if (!alreadyCompleted) {
            await writeOperationLog({
              category: "scheduler",
              level: "warn",
              source: "scheduler_edge",
              event: "publish_skipped",
              message: `Scheduled publish skipped for "${post.topic}" because the post state changed before claim.`,
              page_id: publishConfig.resolvedPageId,
              post_id: String(post.id),
              metadata: buildLogMetadata(latestPost || post, publishConfig, {
                publish_mode: publishMode,
                result: "skipped",
                latest_status: latestPost?.status || null,
                error_message: "Post state changed before scheduler claim",
              }),
            });
          }
          postResult.action = alreadyCompleted ? "stale_completed" : "skipped";
          postResult.error = alreadyCompleted ? "" : "Post state changed before scheduler claim";
          results.push(postResult);
          continue;
        }

        await writeOperationLog({
          category: "scheduler",
          level: "info",
          source: "scheduler_edge",
          event: "publish_claimed",
          message: `Scheduler claimed "${post.topic}" for publishing.`,
          page_id: publishConfig.resolvedPageId,
          post_id: String(post.id),
          metadata: buildLogMetadata(claimedPost, publishConfig, {
            publish_mode: publishMode,
            result: "claimed",
          }),
        });

        if (!publishConfig.canAttemptPublish) {
          throw new Error(publishConfig.reason || "Publish blocked");
        }

        if (publishMode === "live" && isUnsafeImageUrl(post.image_url)) {
          throw new Error("Scheduled image publish requires a public HTTPS image URL.");
        }

        if (publishConfig.reason) {
          await writeOperationLog({
            category: "scheduler",
            level: "info",
            source: "scheduler_edge",
            event: "publish_fallback",
            message: publishConfig.reason,
            page_id: publishConfig.resolvedPageId,
            post_id: String(post.id),
            metadata: buildLogMetadata(claimedPost, publishConfig, {
              publish_mode: publishMode,
              result: "fallback",
              fallback_reason: publishConfig.reason,
            }),
          });
        }

        await writeOperationLog({
          category: "scheduler",
          level: "info",
          source: "scheduler_edge",
          event: "publish_attempt",
          message: `Scheduler attempted publish for "${post.topic}".`,
          page_id: publishConfig.resolvedPageId,
          post_id: String(post.id),
          metadata: buildLogMetadata(claimedPost, publishConfig, {
            publish_mode: publishMode,
            result: publishMode === "live" ? "live_attempt" : "mock_attempt",
          }),
        });

        let facebookPostId = `mock-edge-id-${Date.now()}`;
        if (publishMode === "live") {
          const publishRequest = buildFacebookPublishRequest(post);
          const fbResponse = await fetch(`${FB_BASE_URL}/${publishConfig.pageId}/${publishRequest.endpoint}?access_token=${publishConfig.accessToken}`, {
            method: "POST",
            body: publishRequest.params,
          });
          const fbData = await fbResponse.json();
          if (!fbResponse.ok) {
            throw new Error(fbData.error?.message || `Facebook API Error: ${fbResponse.status}`);
          }
          facebookPostId = fbData.post_id || fbData.id || facebookPostId;
        }

        await writeOperationLog({
          category: "scheduler",
          level: "info",
          source: "scheduler_edge",
          event: "facebook_publish_success",
          message:
            publishMode === "live"
              ? `Facebook live publish succeeded for "${post.topic}".`
              : `Mock publish completed for "${post.topic}".`,
          page_id: publishConfig.resolvedPageId,
          post_id: String(post.id),
          metadata: buildLogMetadata(claimedPost, publishConfig, {
            publish_mode: publishMode,
            result: publishMode === "live" ? "success" : "mock",
            facebook_post_id: facebookPostId,
          }),
        });

        const finalizePayload = {
          status: "posted",
          posted_at: new Date().toISOString(),
          facebook_post_id: facebookPostId,
          scheduled_at: null,
          updated_at: new Date().toISOString(),
        };
        let finalizeError: any = null;
        let finalizeData: any = null;
        ({ data: finalizeData, error: finalizeError } = await supabase
          .from("posts")
          .update(finalizePayload)
          .eq("id", post.id)
          .eq("status", "publishing")
          .select("*")
          .maybeSingle());

        if (finalizeError && /facebook_post_id|updated_at/i.test(String(finalizeError.message || ""))) {
          const fallbackFinalize = await supabase
            .from("posts")
            .update({
              status: "posted",
              posted_at: finalizePayload.posted_at,
              scheduled_at: null,
            })
            .eq("id", post.id)
            .eq("status", "publishing")
            .select("*")
            .maybeSingle();
          finalizeData = fallbackFinalize.data;
          finalizeError = fallbackFinalize.error;
        }
        if (finalizeError) throw finalizeError;
        if (!finalizeData) {
          const { data: latestPost, error: latestError } = await supabase.from("posts").select("*").eq("id", post.id).maybeSingle();
          if (latestError) throw latestError;
          if (latestPost?.status !== "posted") {
            throw new Error(`Post finalization did not reach posted state. Latest status: ${latestPost?.status || "unknown"}`);
          }
          finalizeData = latestPost;
        }

        await writeOperationLog({
          category: "scheduler",
          level: "info",
          source: "scheduler_edge",
          event: "db_finalize_success",
          message: `Publish finalization saved for "${post.topic}".`,
          page_id: publishConfig.resolvedPageId,
          post_id: String(post.id),
          metadata: buildLogMetadata(finalizeData || claimedPost, publishConfig, {
            publish_mode: publishMode,
            result: publishMode === "live" ? "success" : "mock",
            facebook_post_id: facebookPostId,
          }),
        });

        await writeOperationLog({
          category: "scheduler",
          level: "info",
          source: "scheduler_edge",
          event: "publish_completed",
          message:
            publishMode === "live"
              ? `Scheduled live publish completed for "${post.topic}".`
              : `Scheduled mock publish completed for "${post.topic}".`,
          page_id: publishConfig.resolvedPageId,
          post_id: String(post.id),
          metadata: buildLogMetadata(finalizeData || claimedPost, publishConfig, {
            publish_mode: publishMode,
            result: publishMode === "live" ? "success" : "mock",
            facebook_post_id: facebookPostId,
          }),
        });

        postResult.action = publishMode === "live" ? "live_publish" : "mock_publish";
        postResult.facebook_id = facebookPostId;
        postResult.success = true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err || "Unknown scheduler error");
        await supabase
          .from("posts")
          .update({
            status: "failed",
            scheduled_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.id)
          .eq("status", "publishing");

        await writeOperationLog({
          category: "scheduler",
          level: "error",
          source: "scheduler_edge",
          event: "facebook_publish_failed",
          message: errorMessage,
          page_id: publishConfig.resolvedPageId,
          post_id: String(post.id),
          metadata: buildLogMetadata(post, publishConfig, {
            publish_mode: publishMode,
            result: "failed",
            error_message: errorMessage,
          }),
        });

        await writeOperationLog({
          category: "scheduler",
          level: "error",
          source: "scheduler_edge",
          event: "publish_completed",
          message: errorMessage,
          page_id: publishConfig.resolvedPageId,
          post_id: String(post.id),
          metadata: buildLogMetadata(post, publishConfig, {
            publish_mode: publishMode,
            result: "failed",
            error_message: errorMessage,
          }),
        });

        postResult.error = errorMessage;
        postResult.fallback_reason = publishConfig.reason || "";
        postResult.success = false;
      }

      results.push(postResult);
    }

    return new Response(
      JSON.stringify({
        message: "Processing complete",
        count: duePosts.length,
        publishMode,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || "Unknown error");
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
