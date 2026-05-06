import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = ".env";

if (!fs.existsSync(envFile)) {
  console.error("Missing .env file");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx), line.slice(idx + 1)];
    })
);

const requiredVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
for (const name of requiredVars) {
  if (!env[name]) {
    console.error(`Missing ${name} in .env`);
    process.exit(1);
  }
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const selectResult = await supabase
  .from("posts")
  .select(
    "id, page_id, topic, content, image_prompt, image_url, status, scheduled_at, posted_at, created_at"
  )
  .limit(1);

const probeDraft = {
  topic: "__permission_probe__",
  content: "Probe row for anonymous insert permission check",
  image_prompt: "none",
  image_url: "",
  status: "draft",
  created_at: new Date().toISOString(),
};

const insertResult = await supabase.from("posts").insert([probeDraft]).select("id").single();

const settingsSelectResult = await supabase
  .from("app_settings")
  .select("id, workspace_name, updated_at")
  .eq("id", "default")
  .maybeSingle();

const settingsProbe = {
  id: "default",
  workspace_name: "AutoPost Studio",
  business_name: "Permission Probe",
  brand_voice: "Probe",
  default_topic_hint: "Probe",
  openai_api_key: "",
  xai_api_key: "",
  facebook_app_id: "",
  facebook_app_secret: "",
  facebook_page_id: "",
  facebook_page_access_token: "",
  updated_at: new Date().toISOString(),
};

const settingsUpsertResult = await supabase
  .from("app_settings")
  .upsert(settingsProbe)
  .select("id")
  .single();

console.log("Supabase URL:", env.VITE_SUPABASE_URL);
console.log("SELECT status:", selectResult.status, selectResult.error?.message ?? "OK");
console.log("INSERT status:", insertResult.status, insertResult.error?.message ?? "OK");
console.log(
  "APP_SETTINGS SELECT status:",
  settingsSelectResult.status,
  settingsSelectResult.error?.message ?? "OK"
);
console.log(
  "APP_SETTINGS UPSERT status:",
  settingsUpsertResult.status,
  settingsUpsertResult.error?.message ?? "OK"
);

if (insertResult.data?.id) {
  await supabase.from("posts").delete().eq("id", insertResult.data.id);
  console.log("Cleanup: deleted temporary probe row");
}
