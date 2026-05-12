import { serve } from "std/http/server.ts";
import { createClient } from "supabase-js";

/**
 * process-scheduled-posts
 * 
 * Supabase Edge Function to process due scheduled posts.
 * identify due posts -> publish to Facebook -> update post status.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const FB_API_VERSION = "v23.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

function normalizePageId(pageId: string | null | undefined) {
  return typeof pageId === "string" && pageId.trim() ? pageId.trim() : "default";
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
      livePerPagePublishStatus: "Disabled",
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
      livePerPagePublishStatus: "Active",
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
      livePerPagePublishStatus: "Blocked",
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
      livePerPagePublishStatus: "Blocked",
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
      livePerPagePublishStatus: "Fallback",
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
    livePerPagePublishStatus: "Blocked",
    pageId: "",
    accessToken: "",
    canAttemptPublish: false,
    reason: "Global V1 publish config is incomplete, and no safe page-specific live config is available.",
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
    console.error("Unauthorized: Invalid or missing cron secret.");
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

    // 1. Fetch Settings
    console.log("Fetching app settings...");
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
      console.log("Scheduler is disabled in settings. Skipping.");
      return new Response(JSON.stringify({ message: "Scheduler disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch Due Posts
    console.log("Checking for due scheduled posts...");
    const now = new Date().toISOString();
    const { data: duePosts, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (postsError) throw postsError;

    if (!duePosts || duePosts.length === 0) {
      console.log("No due posts found.");
      return new Response(JSON.stringify({ message: "No due posts", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${duePosts.length} due posts. Processing...`);

    const results = [];
    const publishMode = settings.facebook_publish_mode || "mock";
    let pages: Array<Record<string, any>> = [];
    const pagesResult = await supabase
      .from("pages")
      .select("id, label, facebook_page_id, facebook_page_access_token");

    if (pagesResult.error) {
      const pageErrorMessage = String(pagesResult.error.message || "");
      if (/relation .* does not exist/i.test(pageErrorMessage)) {
        console.warn("Pages table missing. Falling back to default/global publish config.");
      } else {
        console.warn("Workspace pages fetch failed. Falling back to default/global publish config.", pagesResult.error);
      }
    } else {
      pages = pagesResult.data || [];
    }

    // 3. Process Each Post
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
        live_page_publish_status: publishConfig.livePerPagePublishStatus,
      };

      try {
        if (!publishConfig.canAttemptPublish) {
          throw new Error(publishConfig.reason || "Publish blocked");
        }

        if (publishMode === "live") {
          console.log(`Live publishing post: ${post.id} (${post.topic})`);

          const payload = new URLSearchParams();
          payload.append("message", post.content || post.topic || "");
          if (post.image_url) {
            payload.append("link", post.image_url);
          }

          const fbUrl = `${FB_BASE_URL}/${publishConfig.pageId}/feed?access_token=${publishConfig.accessToken}`;
          const fbResponse = await fetch(fbUrl, {
            method: "POST",
            body: payload,
          });

          const fbData = await fbResponse.json();

          if (!fbResponse.ok) {
            throw new Error(fbData.error?.message || `Facebook API Error: ${fbResponse.status}`);
          }

          console.log(`Live publish successful: ${fbData.id}`);
          postResult.action = "live_publish";
          postResult.facebook_id = fbData.id;
        } else {
          console.log(`Mock publishing post: ${post.id} (${post.topic})`);
          postResult.action = "mock_publish";
          postResult.facebook_id = "mock-edge-id-" + Date.now();
        }

        // 4. Update Status in Supabase
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            status: "posted",
            posted_at: new Date().toISOString(),
          })
          .eq("id", post.id);

        if (updateError) throw updateError;

        postResult.success = true;
        console.log(`Post updated successfully: ${post.id}`);

      } catch (err) {
        console.error(`Error processing post ${post.id}:`, err.message);
        postResult.error = err.message;
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
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("Critical error in edge function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
