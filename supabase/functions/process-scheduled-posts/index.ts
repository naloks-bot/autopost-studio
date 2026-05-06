import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

/**
 * process-scheduled-posts
 * 
 * Supabase Edge Function to process due scheduled posts.
 * Triggered via HTTP POST (usually by a cron job / GitHub Action).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 2. Security Check: Method
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Security Check: Cron Secret
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
    // 4. Initialize Supabase Client with Service Role Key (Server-side only)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 5. Fetch Settings
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

    // 6. Check if scheduler is enabled
    if (!settings.scheduler_enabled) {
      console.log("Scheduler is disabled in settings. Skipping.");
      return new Response(JSON.stringify({ message: "Scheduler disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Fetch Due Posts
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

    /**
     * PHASE 9C TODO: 
     * Implement full Facebook publishing flow here.
     * For Phase 9B, we return the list of IDs that would be processed.
     */
    const postIds = duePosts.map(p => p.id);

    return new Response(
      JSON.stringify({
        message: "Due posts identified",
        count: duePosts.length,
        postIds,
        publishMode: settings.facebook_publish_mode || "mock",
        status: "Phase 9B Scaffold Active"
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
