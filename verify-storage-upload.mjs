import fs from "node:fs";

function loadEnvFile() {
  const candidates = [".env.local", ".env"];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    const env = {};
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) env[match[1]] = match[2];
    }
    if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
      return env;
    }
  }

  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local/.env");
}

function classifyUrl(value = "") {
  if (!value) return "empty";
  if (value.startsWith("blob:")) return "blob";
  if (value.startsWith("file:")) return "file";
  if (value.startsWith("http://localhost") || value.startsWith("https://localhost")) return "localhost";
  if (value.startsWith("http://127.0.0.1") || value.startsWith("https://127.0.0.1")) return "localhost";
  if (value.startsWith("https://")) return "https";
  if (value.startsWith("http://")) return "http";
  return "other";
}

async function main() {
  const env = loadEnvFile();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const uploadHeaders = {
    ...headers,
    "Content-Type": "image/png",
    "x-upsert": "true",
  };

  const testPath = `uploads/verify-${Date.now()}.png`;
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0XcAAAAASUVORK5CYII=",
    "base64"
  );

  const result = {
    bucketName: "generated-images",
    bucketStatus: null,
    uploadStatus: null,
    publicUrl: `https://${new URL(supabaseUrl).host}/storage/v1/object/public/generated-images/${testPath}`,
    publicUrlKind: null,
    safeUrl: false,
  };

  const bucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/generated-images`, { headers });
  result.bucketStatus = {
    ok: bucketResponse.ok,
    status: bucketResponse.status,
    body: await bucketResponse.text(),
  };

  const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/generated-images/${testPath}`, {
    method: "POST",
    headers: uploadHeaders,
    body: pngBytes,
  });

  result.uploadStatus = {
    ok: uploadResponse.ok,
    status: uploadResponse.status,
    body: await uploadResponse.text(),
  };

  result.publicUrlKind = classifyUrl(result.publicUrl);
  result.safeUrl = result.publicUrlKind === "https";

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
