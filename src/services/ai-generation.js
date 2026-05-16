import { logger } from "./logger.js";

const PROVIDER_LABELS = {
  mock: "Mock",
  openai: "OpenAI",
  gemini: "Gemini",
  codex: "Codex CLI",
};

const THAI_IMAGE_PROMPT_LABELS = [
  "\u0e1e\u0e23\u0e2d\u0e21\u0e1e\u0e4c\u0e17 \u0e23\u0e39\u0e1b\u0e20\u0e32\u0e1e",
  "\u0e23\u0e39\u0e1b\u0e20\u0e32\u0e1e",
  "\u0e2a\u0e44\u0e15\u0e25\u0e4c\u0e20\u0e32\u0e1e",
  "\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22\u0e20\u0e32\u0e1e",
];

const IMAGE_PROMPT_LABELS_PATTERN = [
  "IMAGE[_\\s-]*PROMPT",
  "VISUAL[_\\s-]*PROMPT",
  "Image\\s*Prompt",
  "PROMPT\\s*รูปภาพ",
  ...THAI_IMAGE_PROMPT_LABELS.map((label) => label.replace(/\s+/g, "\\s*")),
].join("|");

const CAPTION_LABELS_PATTERN = [
  "CAPTION",
  "CAPTION\\s*ONLY",
  "ข้อความ",
  "ข้อความ\\s*CAPTION",
  "POST\\s*TEXT",
].join("|");

const IMAGE_PROMPT_SECTION_PATTERN = new RegExp(`(?:^|\\n)\\s*(?:${IMAGE_PROMPT_LABELS_PATTERN})(?:\\s*:|\\s*$)`, "i");
const IMAGE_PROMPT_LINE_PATTERN = new RegExp(`^(?:${IMAGE_PROMPT_LABELS_PATTERN})(?:\\s*:|\\s*$)`, "i");
const IMAGE_PROMPT_REMOVE_PATTERN = new RegExp(`^\\s*(?:${IMAGE_PROMPT_LABELS_PATTERN})(?:\\s*:)?\\s*`, "i");
const CAPTION_LINE_PATTERN = new RegExp(`^(?:${CAPTION_LABELS_PATTERN})(?:\\s*:|\\s*$)`, "i");
const CAPTION_REMOVE_PATTERN = new RegExp(`^\\s*(?:${CAPTION_LABELS_PATTERN})(?:\\s*:)?\\s*`, "i");
const VISUAL_METADATA_PATTERN = /^(?:style|visual style|aspect ratio|ratio|shot|lighting|camera|cinematic|composition|mood|สไตล์ภาพ|โทนสีหลัก)\s*:/i;
const VISUAL_INLINE_PATTERN = /(?:\b4:5\b|\b9:16\b|\bcinematic\b)/i;

function compactProviderError(message, fallback = "Provider request failed.") {
  const next = String(message || "").replace(/\s+/g, " ").trim();
  if (!next) return fallback;
  if (next.length <= 140) return next;
  return `${next.slice(0, 137)}...`;
}

function getGeminiUserError(status, message = "", fallback = "Gemini request failed.") {
  if (status === 429) return "Gemini quota เต็ม / rate limit";
  if (status === 404) return "Gemini model ไม่รองรับหรือชื่อ model ไม่ถูกต้อง";
  if (status === 403) return "Gemini key หรือ project ไม่มีสิทธิ์ใช้งาน";
  return compactProviderError(message, fallback);
}

function getGeminiFallbackNotice(errorCode, detail) {
  if (errorCode === 429) return "Gemini quota เต็ม / rate limit ระบบจึงสร้าง Mock แทนชั่วคราว";
  if (errorCode === 404) return "Gemini model ไม่รองรับหรือชื่อ model ไม่ถูกต้อง ระบบจึงสร้าง Mock แทน";
  if (errorCode === 403) return "Gemini key หรือ project ไม่มีสิทธิ์ใช้งาน ระบบจึงสร้าง Mock แทน";
  return `Gemini failed. Mock content was generated to keep the flow safe.${detail ? ` ${compactProviderError(detail)}` : ""}`;
}

function createGenerationResult(payload) {
  return {
    data: payload.data ?? null,
    error: payload.error ?? null,
    errorCode: payload.errorCode ?? null,
    rawError: payload.rawError ?? null,
    mode: payload.mode || "mock",
    status: payload.status || "success",
    requestedProvider: payload.requestedProvider || payload.mode || "mock",
    fallbackReason: payload.fallbackReason || null,
    noticeTone: payload.noticeTone || null,
    noticeMessage: payload.noticeMessage || null,
  };
}

function hasOpenAIKey(settings) {
  return Boolean(settings?.openaiApiKey?.trim());
}

function hasGeminiKey(settings) {
  return Boolean(getGeminiApiKey(settings));
}

function getPreferredTextProvider(settings) {
  return settings?.textProvider?.toLowerCase() || settings?.aiProvider?.toLowerCase() || "mock";
}

function getGeminiApiKey(settings) {
  return settings?.geminiApiKey?.trim() || import.meta.env.VITE_GEMINI_API_KEY?.trim() || "";
}

function getGeminiModel(settings) {
  return import.meta.env.VITE_GEMINI_MODEL?.trim() || settings?.geminiModel?.trim() || "gemini-2.5-flash";
}

function getPreferredImageProvider(settings) {
  return settings?.imageProvider?.toLowerCase() || "mock";
}

function sanitizeImagePromptValue(value = "") {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(IMAGE_PROMPT_REMOVE_PATTERN, "")
    .trim();
}

function sanitizeCaptionValue(value = "") {
  return String(value || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (CAPTION_LINE_PATTERN.test(trimmed)) return false;
      if (IMAGE_PROMPT_LINE_PATTERN.test(trimmed)) return false;
      if (VISUAL_METADATA_PATTERN.test(trimmed)) return false;
      if (VISUAL_INLINE_PATTERN.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeGeneratedCaption(value = "") {
  const normalized = String(value || "").replace(/\r/g, "").trim();
  if (!normalized) return "";

  const markerIndex = normalized.search(IMAGE_PROMPT_SECTION_PATTERN);
  const captionOnly = markerIndex >= 0 ? normalized.slice(0, markerIndex) : normalized;
  return sanitizeCaptionValue(captionOnly.replace(CAPTION_REMOVE_PATTERN, ""));
}

function classifyGeneratedLine(trimmed = "") {
  if (!trimmed) return null;

  if (IMAGE_PROMPT_LINE_PATTERN.test(trimmed) || VISUAL_METADATA_PATTERN.test(trimmed)) {
    return {
      type: "imagePrompt",
      remainder: trimmed
        .replace(IMAGE_PROMPT_REMOVE_PATTERN, "")
        .replace(VISUAL_METADATA_PATTERN, "")
        .trim(),
    };
  }

  if (CAPTION_LINE_PATTERN.test(trimmed)) {
    return {
      type: "caption",
      remainder: trimmed.replace(CAPTION_REMOVE_PATTERN, "").trim(),
    };
  }

  if (/^(?:ภาพประกอบ|สไตล์ภาพ|โทนสีหลัก)(?:\s*:|\s*$)/i.test(trimmed)) {
    return {
      type: "imagePrompt",
      remainder: trimmed.replace(/^(?:ภาพประกอบ|สไตล์ภาพ|โทนสีหลัก)(?:\s*:)?\s*/i, "").trim(),
    };
  }

  return null;
}

export function parseGeneratedPostResponse(rawText = "") {
  const raw = String(rawText || "").replace(/\r/g, "").trim();
  if (!raw) {
    return {
      caption: "",
      imagePrompt: "",
      usedFallback: false,
      raw,
    };
  }

  const lines = raw.split("\n");
  const captionLines = [];
  const imagePromptLines = [];
  let currentSection = "caption";

  for (const line of lines) {
    const trimmed = line.trim();
    const classified = classifyGeneratedLine(trimmed);

    if (classified?.type) {
      currentSection = classified.type;
      if (classified.remainder) {
        if (classified.type === "imagePrompt") imagePromptLines.push(classified.remainder);
        if (classified.type === "caption") captionLines.push(classified.remainder);
      }
      continue;
    }

    if (currentSection !== "imagePrompt" && VISUAL_INLINE_PATTERN.test(trimmed)) {
      currentSection = "imagePrompt";
    }

    if (currentSection === "imagePrompt") {
      imagePromptLines.push(line);
    } else {
      captionLines.push(line);
    }
  }

  return {
    caption: sanitizeGeneratedCaption(captionLines.join("\n")),
    imagePrompt: sanitizeImagePromptValue(imagePromptLines.join("\n")),
    usedFallback: true,
    raw,
  };
}

export function splitGeneratedPostContent(rawText = "") {
  const parsed = parseGeneratedPostResponse(rawText);
  return {
    cleanCaption: sanitizeGeneratedCaption(parsed.caption || rawText),
    cleanImagePrompt: sanitizeImagePromptValue(parsed.imagePrompt || ""),
    raw: parsed.raw,
    usedFallback: parsed.usedFallback,
  };
}

export function getProviderLabel(provider) {
  return PROVIDER_LABELS[provider] || "ไม่ทราบ";
}

export function getTextProviderRuntime(settings, lastResult = null) {
  const preferred = getPreferredTextProvider(settings);

  let runtime;
  if (preferred === "mock") {
    runtime = {
      selectedProvider: "mock",
      activeProvider: "mock",
      statusLabel: "พร้อม",
      detail: "กำลังใช้โหมดทดสอบ",
      tone: "ready",
    };
  } else if (preferred === "openai") {
    runtime = hasOpenAIKey(settings)
      ? {
          selectedProvider: "openai",
          activeProvider: "openai",
          statusLabel: "พร้อม",
          detail: "พบ OpenAI key แล้ว",
          tone: "ready",
        }
      : {
          selectedProvider: "openai",
          activeProvider: "mock",
          statusLabel: "ใช้โหมดทดสอบ",
          detail: "ยังไม่พบ OpenAI key",
          tone: "warning",
        };
  } else if (preferred === "gemini") {
    runtime = hasGeminiKey(settings)
      ? {
          selectedProvider: "gemini",
          activeProvider: "gemini",
          statusLabel: "พร้อม",
          detail: "พบ Gemini key แล้ว",
          tone: "ready",
        }
      : {
          selectedProvider: "gemini",
          activeProvider: "mock",
          statusLabel: "ใช้โหมดทดสอบ",
          detail: "ยังไม่พบ Gemini key",
          tone: "warning",
        };
  } else if (preferred === "codex") {
    runtime = {
      selectedProvider: "codex",
      activeProvider: "mock",
      statusLabel: "ใช้โหมดทดสอบ",
      detail: "Codex CLI ยังไม่เปิดใช้",
      tone: "warning",
    };
  } else {
    runtime = {
      selectedProvider: "mock",
      activeProvider: "mock",
      statusLabel: "พร้อม",
      detail: "กำลังใช้โหมดทดสอบ",
      tone: "ready",
    };
  }

  if (!lastResult || lastResult.requestedProvider !== runtime.selectedProvider) {
    return runtime;
  }

  if (lastResult.mode === "mock" && runtime.selectedProvider !== "mock") {
    return {
      ...runtime,
      activeProvider: "mock",
      statusLabel: "ใช้โหมดทดสอบ",
      detail: lastResult.noticeMessage || lastResult.error || runtime.detail,
      tone: "warning",
    };
  }

  if (lastResult.mode === runtime.selectedProvider && runtime.selectedProvider !== "mock") {
    return {
      ...runtime,
      statusLabel: "กำลังใช้งาน",
      detail: lastResult.noticeMessage || `ครั้งล่าสุดใช้ ${getProviderLabel(runtime.selectedProvider)}`,
      tone: "ready",
    };
  }

  return runtime;
}

export function getAIProvider(settings) {
  return getTextProviderRuntime(settings).activeProvider;
}

function getImagePromptProvider(settings) {
  const preferred = getPreferredImageProvider(settings);
  if (preferred === "gpt-image" || preferred === "dalle") {
    return hasOpenAIKey(settings) ? "openai" : "mock";
  }
  return "mock";
}

function getPostLengthGuidance(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "micro") return "Very short: 80-120 words";
  if (normalized === "short") return "Short: 120-180 words";
  if (normalized === "medium") return "Medium: 180-280 words";
  if (normalized === "long") return "Long: 300-450 words";
  return "";
}

function getVisualDirection(context = {}) {
  return String(context.pageVisualDirection || context.pageImageDirection || "").trim();
}

function buildFallbackImagePromptFromContent(formData = {}) {
  const topic = String(formData.topic || "").trim();
  const caption = sanitizeGeneratedCaption(String(formData.content || "").trim());
  const pageDirection = getVisualDirection(formData);
  const negativePrompt = String(formData.pageImageNegativePrompt || "").trim();
  const vibe = String(formData.pageTone || "").trim();
  const captionSnippet = caption
    .replace(/\s+/g, " ")
    .slice(0, 180)
    .trim();

  const segments = [
    topic || "editorial social media concept",
    captionSnippet ? `inspired by: ${captionSnippet}` : "",
    "cinematic editorial social media image",
    vibe ? `${vibe} tone` : "clear emotional storytelling",
    pageDirection || "strong subject, realistic lighting, clean composition",
    negativePrompt ? `avoid: ${negativePrompt}` : "",
    "vertical 4:5 framing",
  ]
    .filter(Boolean)
    .map((segment) => String(segment).replace(/\.$/, "").trim());

  return segments.join(", ");
}

export function buildContentPrompt(formData, settings) {
  const voice = settings.brandVoice || "Professional";
  const business = settings.businessName || "My Brand";
  const topic = formData.topic || "Social Media Update";
  const pageLabel = formData.pageLabel ? `Page: ${formData.pageLabel}` : "";
  const pageBrandMemory = formData.pageBrandMemory ? `Brand memory: ${formData.pageBrandMemory}` : "";
  const pageWritingDirection = formData.pageWritingDirection ? `Page writing direction: ${formData.pageWritingDirection}` : "";
  const visualDirection = getVisualDirection(formData);
  const pageImageDirection = visualDirection ? `Page visual direction: ${visualDirection}` : "";
  const pageReadme = formData.pageReadme ? `Page memory: ${formData.pageReadme}` : "";
  const pageTone = formData.pageTone ? `Page tone: ${formData.pageTone}` : "";
  const pagePurpose = formData.pagePurpose ? `Page purpose: ${formData.pagePurpose}` : "";
  const pageTargetAudience = formData.pageTargetAudience ? `Target audience: ${formData.pageTargetAudience}` : "";
  const pagePostLength = getPostLengthGuidance(formData.pagePostLength);
  const pagePostLengthLine = pagePostLength ? `Target post length: ${pagePostLength}` : "";
  const pageExamplePost = formData.pageExamplePost ? `Reference style example: ${formData.pageExamplePost}` : "";
  const pageContentPillars = formData.pageContentPillars ? `Content pillars: ${formData.pageContentPillars}` : "";
  const pageAvoidList = formData.pageAvoidList ? `Avoid list: ${formData.pageAvoidList}` : "";
  const pageDefaultCta = formData.pageDefaultCta ? `Default CTA: ${formData.pageDefaultCta}` : "";
  const pagePreferredWords = formData.pagePreferredWords ? `Preferred words or phrases: ${formData.pagePreferredWords}` : "";
  const pageDislikedWords = formData.pageDislikedWords ? `Words or phrases to avoid: ${formData.pageDislikedWords}` : "";
  const pageImageNegativePrompt = formData.pageImageNegativePrompt ? `Image negative prompt: ${formData.pageImageNegativePrompt}` : "";

  return `Generate a high-engaging social media post for ${business}.
Tone: ${voice}
Topic: ${topic}
${pageLabel}
${pageBrandMemory}
${pageTone}
${pagePurpose}
${pageTargetAudience}
${pagePostLengthLine}
${pageExamplePost}
${pageContentPillars}
${pageAvoidList}
${pageDefaultCta}
${pagePreferredWords}
${pageDislikedWords}
${pageWritingDirection}
${pageImageDirection}
${pageImageNegativePrompt}
${pageReadme}
Structure: Grab attention, address pain points, offer solution, and include a clear call to action.
Platform: Facebook/Instagram

Return in this exact format only:
CAPTION:
[write only the final publish-ready Thai social media caption]

IMAGE_PROMPT:
[write only an English image-generation prompt for a matching visual]

Rules:
- Do not add any headings, notes, bullets, or commentary outside these 2 sections.
- CAPTION must contain only the post text that will be published.
- Do not include image prompt text, visual instructions, style labels, aspect ratios, "cinematic", "4:5", or "9:16" inside CAPTION.
- IMAGE_PROMPT must always be in English, even if CAPTION is in Thai.
- Put all visual direction only inside IMAGE_PROMPT.`;
}

export function buildImagePrompt(formData, settings) {
  const topic = formData.topic || "Abstract concept";
  const voice = settings.brandVoice || "Modern";
  const content = formData.content ? `Caption context: ${formData.content}` : "";
  const pageLabel = formData.pageLabel ? `Page: ${formData.pageLabel}` : "";
  const pageBrandMemory = formData.pageBrandMemory ? `Brand memory: ${formData.pageBrandMemory}` : "";
  const visualDirection = getVisualDirection(formData);
  const pageImageDirection = visualDirection ? `Page visual direction: ${visualDirection}` : "";
  const pageWritingDirection = formData.pageWritingDirection ? `Page writing direction: ${formData.pageWritingDirection}` : "";
  const pageReadme = formData.pageReadme ? `Page memory: ${formData.pageReadme}` : "";
  const pagePurpose = formData.pagePurpose ? `Page purpose: ${formData.pagePurpose}` : "";
  const pageTargetAudience = formData.pageTargetAudience ? `Target audience: ${formData.pageTargetAudience}` : "";
  const pagePostLength = getPostLengthGuidance(formData.pagePostLength);
  const pagePostLengthLine = pagePostLength ? `Target caption length: ${pagePostLength}` : "";
  const pageExamplePost = formData.pageExamplePost ? `Reference style example: ${formData.pageExamplePost}` : "";
  const pageContentPillars = formData.pageContentPillars ? `Content pillars: ${formData.pageContentPillars}` : "";
  const pageAvoidList = formData.pageAvoidList ? `Avoid list: ${formData.pageAvoidList}` : "";
  const pagePreferredWords = formData.pagePreferredWords ? `Preferred words or phrases: ${formData.pagePreferredWords}` : "";
  const pageDislikedWords = formData.pageDislikedWords ? `Words or phrases to avoid: ${formData.pageDislikedWords}` : "";
  const pageImageNegativePrompt = formData.pageImageNegativePrompt ? `Image negative prompt: ${formData.pageImageNegativePrompt}` : "";

  return `Write one production-ready English image generation prompt for a social media post.
Topic: ${topic}
Brand voice: ${voice}
${content}
${pageLabel}
${pageBrandMemory}
${pagePurpose}
${pageTargetAudience}
${pagePostLengthLine}
${pageExamplePost}
${pageContentPillars}
${pageAvoidList}
${pagePreferredWords}
${pageDislikedWords}
${pageWritingDirection}
${pageImageDirection}
${pageImageNegativePrompt}
${pageReadme}
Rules:
- Return English only.
- Return one prompt only.
- Focus on subject, composition, mood, lighting, and visual direction.
- Do not include explanations or labels.`;
}

function buildBatchContentPrompt({ formData = {}, settings = {}, count = 5, angles = [] }) {
  const voice = settings.brandVoice || "Professional";
  const business = settings.businessName || "My Brand";
  const topic = formData.topic || "Social Media Update";
  const pageLabel = formData.pageLabel ? `Page: ${formData.pageLabel}` : "";
  const pageBrandMemory = formData.pageBrandMemory ? `Brand memory: ${formData.pageBrandMemory}` : "";
  const pageWritingDirection = formData.pageWritingDirection ? `Page writing direction: ${formData.pageWritingDirection}` : "";
  const visualDirection = getVisualDirection(formData);
  const pageImageDirection = visualDirection ? `Page visual direction: ${visualDirection}` : "";
  const pageReadme = formData.pageReadme ? `Page memory: ${formData.pageReadme}` : "";
  const pageTone = formData.pageTone ? `Page tone: ${formData.pageTone}` : "";
  const pagePurpose = formData.pagePurpose ? `Page purpose: ${formData.pagePurpose}` : "";
  const pageTargetAudience = formData.pageTargetAudience ? `Target audience: ${formData.pageTargetAudience}` : "";
  const pagePostLength = getPostLengthGuidance(formData.pagePostLength);
  const pagePostLengthLine = pagePostLength ? `Target post length: ${pagePostLength}` : "";
  const pageExamplePost = formData.pageExamplePost ? `Reference style example: ${formData.pageExamplePost}` : "";
  const pageContentPillars = formData.pageContentPillars ? `Content pillars: ${formData.pageContentPillars}` : "";
  const pageAvoidList = formData.pageAvoidList ? `Avoid list: ${formData.pageAvoidList}` : "";
  const pageDefaultCta = formData.pageDefaultCta ? `Default CTA: ${formData.pageDefaultCta}` : "";
  const pagePreferredWords = formData.pagePreferredWords ? `Preferred words or phrases: ${formData.pagePreferredWords}` : "";
  const pageDislikedWords = formData.pageDislikedWords ? `Words or phrases to avoid: ${formData.pageDislikedWords}` : "";
  const pageImageNegativePrompt = formData.pageImageNegativePrompt ? `Image negative prompt: ${formData.pageImageNegativePrompt}` : "";
  const angleList = angles.length
    ? angles.map((angle, index) => `${index + 1}. ${angle}`).join("\n")
    : Array.from({ length: count }, (_, index) => `${index + 1}. Distinct angle ${index + 1}`).join("\n");

  return `Generate ${count} meaningfully different Thai social media draft options for ${business}.
Tone: ${voice}
Topic: ${topic}
${pageLabel}
${pageBrandMemory}
${pageTone}
${pagePurpose}
${pageTargetAudience}
${pagePostLengthLine}
${pageExamplePost}
${pageContentPillars}
${pageAvoidList}
${pageDefaultCta}
${pagePreferredWords}
${pageDislikedWords}
${pageWritingDirection}
${pageImageDirection}
${pageImageNegativePrompt}
${pageReadme}

Use these angle hints, one draft per angle:
${angleList}

Return valid JSON only with this exact shape:
{
  "drafts": [
    {
      "title": "short unique Thai draft title",
      "hook": "unique Thai hook",
      "caption": "publish-ready Thai caption",
      "imagePrompt": "English image-generation prompt matching only this draft"
    }
  ]
}

Rules:
- Return exactly ${count} drafts.
- Every draft must have a clearly different angle, hook, caption structure, and image prompt.
- Do not reuse the same opening sentence across drafts.
- Do not add markdown, code fences, or commentary.
- Caption must contain only publish-ready post text.
- Image prompts must be in English and must not appear inside captions.`;
}

function extractJsonObjectResponse(raw = "") {
  const normalized = String(raw || "").trim();
  if (!normalized) return null;

  const candidates = [
    normalized,
    normalized.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim(),
  ];

  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(normalized.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
}

function extractJsonArrayResponse(raw = "") {
  const objectPayload = extractJsonObjectResponse(raw);
  if (Array.isArray(objectPayload?.drafts)) return objectPayload.drafts;
  if (Array.isArray(objectPayload)) return objectPayload;

  const normalized = String(raw || "").trim();
  const firstBracket = normalized.indexOf("[");
  const lastBracket = normalized.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    try {
      return JSON.parse(normalized.slice(firstBracket, lastBracket + 1));
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeBatchDraftItem(item = {}, index = 0, fallbackTopic = "") {
  const title = String(item.title || item.topic || "").trim();
  const caption = sanitizeGeneratedCaption(item.caption || item.content || "");
  const hook = String(item.hook || "").trim() || caption.split(/\r?\n/).find(Boolean) || title;
  const imagePrompt = sanitizeImagePromptValue(item.imagePrompt || item.image_prompt || item.visualPrompt || "");

  if (!caption) return null;

  return {
    title: title || `${fallbackTopic || "Batch draft"} ${index + 1}`,
    hook,
    caption,
    imagePrompt,
  };
}

function normalizeReviewScore(value) {
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) return null;
  return Math.max(0, Math.min(10, Math.round(numeric * 10) / 10));
}

function buildQualityReviewPrompt(post = {}, settings = {}, pageContext = {}) {
  const business = settings.businessName || pageContext.pageLabel || "แบรนด์นี้";
  const pageLabel = pageContext.pageLabel ? `Page: ${pageContext.pageLabel}` : "";
  const pagePurpose = pageContext.pagePurpose ? `Page purpose: ${pageContext.pagePurpose}` : "";
  const pageTargetAudience = pageContext.pageTargetAudience ? `Target audience: ${pageContext.pageTargetAudience}` : "";
  const pageTone = pageContext.pageTone ? `Page tone: ${pageContext.pageTone}` : "";
  const pageWritingDirection = pageContext.pageWritingDirection ? `Writing direction: ${pageContext.pageWritingDirection}` : "";
  const pageContentPillars = pageContext.pageContentPillars ? `Content pillars: ${pageContext.pageContentPillars}` : "";
  const pageAvoidList = pageContext.pageAvoidList ? `Avoid list: ${pageContext.pageAvoidList}` : "";
  const pageDefaultCta = pageContext.pageDefaultCta ? `Default CTA: ${pageContext.pageDefaultCta}` : "";
  const pageReadme = pageContext.pageReadme ? `Page memory: ${pageContext.pageReadme}` : "";

  return `You are reviewing a Thai social media draft for ${business}.
${pageLabel}
${pagePurpose}
${pageTargetAudience}
${pageTone}
${pageWritingDirection}
${pageContentPillars}
${pageAvoidList}
${pageDefaultCta}
${pageReadme}

Topic: ${post.topic || ""}
Hook: ${post.hook || ""}
Caption:
${post.content || ""}

Evaluate this draft on:
1. hook clarity
2. usefulness
3. fit with the page direction
4. engagement / call to participation
5. whether it feels natural and not overly AI-generated

Return valid JSON only with this exact shape:
{
  "score": 0-10 number,
  "feedback": "concise Thai feedback, maximum 2 short sentences",
  "improvementDirection": "one concise Thai sentence with the best next improvement"
}

Rules:
- Use Thai for feedback and improvementDirection.
- Score must be a number between 0 and 10.
- Be practical and concise.
- Do not include markdown, code fences, or extra commentary.`;
}

function buildImprovePostPrompt(post = {}, settings = {}, pageContext = {}, improvementDirection = "") {
  const business = settings.businessName || pageContext.pageLabel || "แบรนด์นี้";
  const pageLabel = pageContext.pageLabel ? `Page: ${pageContext.pageLabel}` : "";
  const pagePurpose = pageContext.pagePurpose ? `Page purpose: ${pageContext.pagePurpose}` : "";
  const pageTargetAudience = pageContext.pageTargetAudience ? `Target audience: ${pageContext.pageTargetAudience}` : "";
  const pageTone = pageContext.pageTone ? `Page tone: ${pageContext.pageTone}` : "";
  const pageWritingDirection = pageContext.pageWritingDirection ? `Writing direction: ${pageContext.pageWritingDirection}` : "";
  const pageContentPillars = pageContext.pageContentPillars ? `Content pillars: ${pageContext.pageContentPillars}` : "";
  const pageAvoidList = pageContext.pageAvoidList ? `Avoid list: ${pageContext.pageAvoidList}` : "";
  const pageDefaultCta = pageContext.pageDefaultCta ? `Default CTA: ${pageContext.pageDefaultCta}` : "";
  const pageReadme = pageContext.pageReadme ? `Page memory: ${pageContext.pageReadme}` : "";
  const extraDirection = improvementDirection ? `Improvement direction from review: ${improvementDirection}` : "";

  return `Rewrite this Thai social media draft for ${business}.
${pageLabel}
${pagePurpose}
${pageTargetAudience}
${pageTone}
${pageWritingDirection}
${pageContentPillars}
${pageAvoidList}
${pageDefaultCta}
${pageReadme}
${extraDirection}

Current topic: ${post.topic || ""}
Current hook: ${post.hook || ""}
Current caption:
${post.content || ""}

Goal:
- keep the original topic and intent
- make the hook clearer
- make the caption feel more natural, useful, and engaging
- keep it publish-ready in Thai
- avoid sounding generic or obviously AI-generated

Return valid JSON only with this exact shape:
{
  "hook": "improved Thai hook",
  "caption": "improved Thai caption"
}

Rules:
- Use Thai only.
- Keep both values concise and publish-ready.
- Do not include markdown, code fences, or extra commentary.`;
}

async function runTextTaskWithProvider(prompt, runtime, settings) {
  if (runtime.activeProvider === "openai") {
    return generateWithOpenAI(prompt, settings.openaiApiKey, settings.openaiModel);
  }

  return generateWithGemini(prompt, getGeminiApiKey(settings), getGeminiModel(settings));
}

function buildUnavailableTaskResult(runtime, message) {
  return createGenerationResult({
    data: null,
    error: message,
    mode: "mock",
    status: "blocked",
    requestedProvider: runtime.selectedProvider,
    fallbackReason: runtime.detail,
    noticeTone: "warning",
    noticeMessage: message,
  });
}

async function generateMockText(formData, settings, meta = {}) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return createGenerationResult({
    data: `CAPTION:
เริ่มต้นใช้ AI ไม่จำเป็นต้องยากเลย แค่เริ่มจากโจทย์เล็ก ๆ ที่ช่วยงานจริงในแต่ละวัน เช่น สรุปข้อมูล ช่วยเขียนโพสต์ หรือช่วยวางไอเดียก่อนลงมือทำ

ถ้าเป็นมือใหม่ ลองเลือกงานซ้ำ ๆ ที่กินเวลา แล้วให้ AI ช่วยเป็นผู้ช่วยร่างแรกก่อน จากนั้นค่อยปรับให้เป็นสไตล์ของคุณ จะเริ่มได้ง่ายกว่าและเห็นผลไวกว่า

หัวข้อวันนี้: ${formData.topic}

ลองเปิดใจทดลองจากเรื่องใกล้ตัว แล้วคุณจะเห็นว่า AI ช่วยประหยัดเวลาและทำให้งานชัดขึ้นได้มากกว่าที่คิด

IMAGE_PROMPT:
Friendly beginner learning AI at a desk with laptop, clean modern workspace, approachable technology atmosphere, soft natural lighting, realistic social media visual, vertical composition`,
    error: meta.error || null,
    mode: "mock",
    status: meta.status || "success",
    requestedProvider: meta.requestedProvider || "mock",
    fallbackReason: meta.fallbackReason || null,
    noticeTone: meta.noticeTone || null,
    noticeMessage: meta.noticeMessage || null,
  });
}

async function generateMockBatchText({ formData = {}, count = 5, angles = [], meta = {} } = {}) {
  await new Promise((resolve) => setTimeout(resolve, 700));

  const topic = String(formData.topic || "หัวข้อโพสต์").trim();
  const fallbackAngles = ["ปัญหาที่เจอบ่อย", "วิธีเริ่มแบบง่าย", "ตัวอย่างจากชีวิตจริง", "ข้อผิดพลาดที่ควรเลี่ยง", "เช็กลิสต์ก่อนลงมือ"];
  const drafts = Array.from({ length: count }, (_, index) => {
    const angle = angles[index] || fallbackAngles[index % fallbackAngles.length] || `มุมที่ ${index + 1}`;
    return {
      title: `${topic} - ${angle}`,
      hook: `${angle}: ${topic}`,
      caption: `${angle}\n\nถ้ากำลังคิดเรื่อง "${topic}" ลองมองจากมุมนี้ก่อน: เริ่มจากสิ่งที่ทำได้ทันทีหนึ่งอย่าง แล้วค่อยปรับให้เข้ากับงานจริงของคุณ\n\nโพสต์นี้เป็น draft ที่ ${index + 1} เพื่อให้ทีมเลือกมุมเล่าเรื่องได้หลากหลายขึ้น`,
      imagePrompt: `Editorial social media image about ${topic}, angle ${index + 1}: ${angle}, realistic lighting, clear subject, modern composition, vertical 4:5`,
    };
  });

  return createGenerationResult({
    data: drafts,
    error: meta.error || null,
    mode: "mock",
    status: meta.status || "success",
    requestedProvider: meta.requestedProvider || "mock",
    fallbackReason: meta.fallbackReason || null,
    noticeTone: meta.noticeTone || null,
    noticeMessage: meta.noticeMessage || null,
  });
}

async function generateWithOpenAI(prompt, apiKey, model = "gpt-4o-mini") {
  if (!apiKey) {
    return {
      data: null,
      error: "OpenAI API key is missing.",
      mode: "openai",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errorData.error?.message || `OpenAI API Error: ${response.status}`,
        mode: "openai",
      };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return {
        data: null,
        error: "OpenAI returned no message content.",
        mode: "openai",
      };
    }

    return {
      data: content.trim(),
      error: null,
      mode: "openai",
    };
  } catch (error) {
    return {
      data: null,
      error: `Network error: ${compactProviderError(error.message, "Unable to reach OpenAI.")}`,
      mode: "openai",
    };
  }
}

async function generateWithGemini(prompt, apiKey, model = "gemini-2.5-flash") {
  if (!apiKey) {
    logger.warn("Gemini generation skipped because no API key is available.");
    return {
      data: null,
      error: "Gemini API key is missing.",
      errorCode: "missing_key",
      mode: "gemini",
    };
  }

  try {
    const apiModel = model || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;
    logger.debug("Gemini request starting.", { model: apiModel, promptLength: prompt?.length || 0 });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = (() => {
        try {
          return errorText ? JSON.parse(errorText) : {};
        } catch {
          return {};
        }
      })();
      logger.error("Gemini API request failed.", {
        status: response.status,
        statusText: response.statusText,
        url,
        model: apiModel,
        error: errorData.error || errorText || "Unknown Gemini error",
      });
      return {
        data: null,
        error: getGeminiUserError(response.status, errorData.error?.message || errorText, `Gemini API Error: ${response.status}`),
        errorCode: response.status,
        rawError: errorData.error?.message || errorText || `Gemini API Error: ${response.status}`,
        mode: "gemini",
      };
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];
    const content = candidate?.content?.parts?.map((part) => part?.text || "").join("").trim();

    if (!content) {
      logger.warn("Gemini response returned no usable text.", {
        model: apiModel,
        finishReason: candidate?.finishReason || null,
        promptFeedback: result.promptFeedback || null,
      });
      return {
        data: null,
        error:
          result.promptFeedback?.blockReasonMessage ||
          result.promptFeedback?.blockReason ||
          candidate?.finishReason ||
          "Gemini returned no message content.",
        errorCode: candidate?.finishReason || result.promptFeedback?.blockReason || "empty_response",
        mode: "gemini",
      };
    }

    logger.debug("Gemini response received successfully.", {
      model: apiModel,
      outputLength: content.length,
    });

    return {
      data: content,
      error: null,
      errorCode: null,
      mode: "gemini",
    };
  } catch (error) {
    logger.error("Gemini network/request error.", {
      model: model || "gemini-2.5-flash",
      message: error?.message || "Unknown network error",
      stack: error?.stack || null,
    });
    return {
      data: null,
      error: `Network error: ${compactProviderError(error.message, "Unable to reach Gemini.")}`,
      errorCode: "network_error",
      rawError: error?.message || "Unknown network error",
      mode: "gemini",
    };
  }
}

export async function generatePostContent({ formData, settings }) {
  if (!formData?.topic || formData.topic.trim().length < 5) {
    return createGenerationResult({
      data: null,
      error: "Please enter at least 5 characters for the topic before generating content.",
      mode: "mock",
      status: "blocked",
      requestedProvider: getPreferredTextProvider(settings),
      fallbackReason: null,
      noticeTone: "danger",
      noticeMessage: "Topic is too short. Add a clearer topic before generating.",
    });
  }

  try {
    const runtime = getTextProviderRuntime(settings);
    const prompt = buildContentPrompt(formData, settings);

    if (runtime.activeProvider === "mock") {
      const result = await generateMockText(formData, settings, {
        requestedProvider: runtime.selectedProvider,
        error: runtime.selectedProvider === "mock" ? null : `${runtime.detail}. Using Mock fallback.`,
        fallbackReason: runtime.detail,
        status: runtime.selectedProvider === "mock" ? "success" : "fallback",
        noticeTone: runtime.selectedProvider === "mock" ? "info" : "warning",
        noticeMessage:
          runtime.selectedProvider === "mock"
            ? "Generated in Mock mode."
            : `${getProviderLabel(runtime.selectedProvider)} is not ready. Generated in Mock mode instead.`,
      });
      logger.info(`Text generation complete. Mode: ${result.mode}`);
      return result;
    }

    let result;
    if (runtime.activeProvider === "openai") {
      result = await generateWithOpenAI(prompt, settings.openaiApiKey, settings.openaiModel);
    } else {
      result = await generateWithGemini(prompt, getGeminiApiKey(settings), getGeminiModel(settings));
    }

    if (!result.data) {
      logger.warn(`Primary text provider failed. Falling back to mock. Provider: ${runtime.selectedProvider}`);
      result = await generateMockText(formData, settings, {
        requestedProvider: runtime.selectedProvider,
        error: `${getProviderLabel(runtime.selectedProvider)} failed. Using Mock fallback. ${compactProviderError(result.error)}`,
        fallbackReason: result.rawError || result.error,
        status: "fallback",
        noticeTone: "warning",
        noticeMessage:
          runtime.selectedProvider === "gemini"
            ? getGeminiFallbackNotice(result.errorCode, result.rawError || result.error)
            : `${getProviderLabel(runtime.selectedProvider)} failed. Mock content was generated to keep the flow safe.`,
      });
    } else {
      result = createGenerationResult({
        ...result,
        status: "success",
        requestedProvider: runtime.selectedProvider,
        fallbackReason: null,
        noticeTone: result.mode === "mock" ? "info" : "success",
        noticeMessage:
          result.mode === "mock"
            ? "Generated in Mock mode."
            : `Generated with ${getProviderLabel(result.mode)}.`,
      });
    }

    logger.info(`Text generation complete. Mode: ${result.mode}`);
    return result;
  } catch (err) {
    logger.error("Text generation failed:", err);
    return generateMockText(formData, settings, {
      requestedProvider: getPreferredTextProvider(settings),
      error: `Unexpected error. Using Mock fallback. ${compactProviderError(err.message)}`,
      fallbackReason: err.message,
      status: "fallback",
      noticeTone: "warning",
      noticeMessage: "The provider failed unexpectedly. Mock content was generated to keep the flow safe.",
    });
  }
}

export async function generateBatchPostContent({ formData, settings, count = 5, angles = [] } = {}) {
  const topic = String(formData?.topic || "").trim();
  if (!topic || topic.length < 5) {
    return createGenerationResult({
      data: [],
      error: "Please enter at least 5 characters for the topic before generating batch drafts.",
      mode: "mock",
      status: "blocked",
      requestedProvider: getPreferredTextProvider(settings),
      noticeTone: "danger",
      noticeMessage: "Topic is too short. Add a clearer topic before generating.",
    });
  }

  const runtime = getTextProviderRuntime(settings);
  const limitedCount = Math.max(1, Math.min(20, Number(count) || 5));

  if (runtime.activeProvider === "mock") {
    return generateMockBatchText({
      formData,
      count: limitedCount,
      angles,
      meta: {
        requestedProvider: runtime.selectedProvider,
        error: runtime.selectedProvider === "mock" ? null : `${runtime.detail}. Using Mock fallback.`,
        fallbackReason: runtime.detail,
        status: runtime.selectedProvider === "mock" ? "success" : "fallback",
        noticeTone: runtime.selectedProvider === "mock" ? "info" : "warning",
        noticeMessage:
          runtime.selectedProvider === "mock"
            ? "Generated batch in Mock mode."
            : `${getProviderLabel(runtime.selectedProvider)} is not ready. Generated Mock batch instead.`,
      },
    });
  }

  const prompt = buildBatchContentPrompt({
    formData,
    settings,
    count: limitedCount,
    angles,
  });

  const result = await runTextTaskWithProvider(prompt, runtime, settings);
  if (!result.data) {
    const isGeminiRateLimit = runtime.selectedProvider === "gemini" && result.errorCode === 429;
    const message = isGeminiRateLimit
      ? "Gemini quota เต็ม / rate limit กรุณารอสักครู่ หรือเปลี่ยน provider"
      : `${getProviderLabel(runtime.selectedProvider)} batch generation failed: ${compactProviderError(result.error)}`;

    return createGenerationResult({
      data: [],
      error: message,
      errorCode: result.errorCode,
      rawError: result.rawError || result.error,
      mode: result.mode || runtime.selectedProvider,
      status: "blocked",
      requestedProvider: runtime.selectedProvider,
      noticeTone: isGeminiRateLimit ? "warning" : "danger",
      noticeMessage: message,
    });
  }

  const parsedDrafts = extractJsonArrayResponse(result.data)
    .map((item, index) => normalizeBatchDraftItem(item, index, topic))
    .filter(Boolean)
    .slice(0, limitedCount);

  if (!parsedDrafts.length) {
    return createGenerationResult({
      data: [],
      error: "AI batch output could not be parsed.",
      mode: result.mode,
      status: "blocked",
      requestedProvider: runtime.selectedProvider,
      noticeTone: "danger",
      noticeMessage: "AI ส่ง batch draft กลับมาในรูปแบบที่อ่านไม่สำเร็จ กรุณาลองใหม่",
    });
  }

  return createGenerationResult({
    data: parsedDrafts,
    mode: result.mode,
    status: parsedDrafts.length >= limitedCount ? "success" : "partial",
    requestedProvider: runtime.selectedProvider,
    noticeTone: parsedDrafts.length >= limitedCount ? "success" : "warning",
    noticeMessage:
      parsedDrafts.length >= limitedCount
        ? `Generated ${parsedDrafts.length} distinct drafts with ${getProviderLabel(result.mode)}.`
        : `AI returned ${parsedDrafts.length}/${limitedCount} usable drafts.`,
  });
}

export async function reviewPostQuality({ post, settings, pageContext = {} }) {
  const runtime = getTextProviderRuntime(settings);
  if (runtime.activeProvider === "mock") {
    return buildUnavailableTaskResult(
      runtime,
      runtime.selectedProvider === "mock"
        ? "AI Quality Check ใช้ได้เมื่อเปิด OpenAI หรือ Gemini"
        : `${runtime.detail} จึงยังตรวจคุณภาพด้วย AI ไม่ได้`
    );
  }

  try {
    const prompt = buildQualityReviewPrompt(post, settings, pageContext);
    const result = await runTextTaskWithProvider(prompt, runtime, settings);
    if (!result.data) {
      if (runtime.selectedProvider === "gemini" && result.errorCode === 429) {
        return buildUnavailableTaskResult(runtime, "Gemini quota เต็ม / rate limit กรุณารอสักครู่ หรือเปลี่ยน provider");
      }
      return buildUnavailableTaskResult(
        runtime,
        `AI ตรวจคุณภาพไม่สำเร็จ: ${compactProviderError(result.error, "กรุณาลองใหม่อีกครั้ง")}`
      );
    }

    const payload = extractJsonObjectResponse(result.data);
    const score = normalizeReviewScore(payload?.score);
    if (!payload || score === null) {
      return buildUnavailableTaskResult(runtime, "AI ส่งผลตรวจกลับมาในรูปแบบที่อ่านไม่สำเร็จ กรุณาลองใหม่");
    }

    return createGenerationResult({
      data: {
        score,
        verdict: score >= 7 ? "ผ่าน แนะนำให้โพสต์" : "ควรปรับก่อนโพสต์",
        feedback: String(payload.feedback || "").trim(),
        improvementDirection: String(payload.improvementDirection || "").trim(),
      },
      mode: result.mode,
      status: "success",
      requestedProvider: runtime.selectedProvider,
      noticeTone: "success",
      noticeMessage: `AI ตรวจคุณภาพด้วย ${getProviderLabel(result.mode)} แล้ว`,
    });
  } catch (error) {
    return buildUnavailableTaskResult(runtime, `AI ตรวจคุณภาพไม่สำเร็จ: ${compactProviderError(error.message, "กรุณาลองใหม่อีกครั้ง")}`);
  }
}

export async function improvePostContent({ post, settings, pageContext = {}, improvementDirection = "" }) {
  const runtime = getTextProviderRuntime(settings);
  if (runtime.activeProvider === "mock") {
    return buildUnavailableTaskResult(
      runtime,
      runtime.selectedProvider === "mock"
        ? "การปรับปรุงโพสต์ด้วย AI ใช้ได้เมื่อเปิด OpenAI หรือ Gemini"
        : `${runtime.detail} จึงยังปรับปรุงโพสต์ด้วย AI ไม่ได้`
    );
  }

  try {
    const prompt = buildImprovePostPrompt(post, settings, pageContext, improvementDirection);
    const result = await runTextTaskWithProvider(prompt, runtime, settings);
    if (!result.data) {
      return buildUnavailableTaskResult(
        runtime,
        `AI ปรับปรุงโพสต์ไม่สำเร็จ: ${compactProviderError(result.error, "กรุณาลองใหม่อีกครั้ง")}`
      );
    }

    const payload = extractJsonObjectResponse(result.data);
    const caption = sanitizeGeneratedCaption(payload?.caption || "");
    const hook = String(payload?.hook || "").trim();
    if (!payload || !caption) {
      return buildUnavailableTaskResult(runtime, "AI ส่งโพสต์กลับมาในรูปแบบที่อ่านไม่สำเร็จ กรุณาลองใหม่");
    }

    return createGenerationResult({
      data: {
        hook,
        caption,
      },
      mode: result.mode,
      status: "success",
      requestedProvider: runtime.selectedProvider,
      noticeTone: "success",
      noticeMessage: `AI ปรับปรุงโพสต์ด้วย ${getProviderLabel(result.mode)} แล้ว`,
    });
  } catch (error) {
    return buildUnavailableTaskResult(runtime, `AI ปรับปรุงโพสต์ไม่สำเร็จ: ${compactProviderError(error.message, "กรุณาลองใหม่อีกครั้ง")}`);
  }
}

export async function generateImagePrompt({ formData, settings }) {
  const topicOrCaption = String(formData?.topic || formData?.content || "").trim();

  if (!topicOrCaption || topicOrCaption.length < 5) {
    return {
      data: null,
      error: "Please enter at least 5 characters of topic or caption before generating an image prompt.",
      mode: "mock",
    };
  }

  const provider = getImagePromptProvider(settings);
  const prompt = buildImagePrompt(formData, settings);
  const fallbackPrompt = buildFallbackImagePromptFromContent(formData);

  if (provider === "openai") {
    const result = await generateWithOpenAI(prompt, settings.openaiApiKey, settings.openaiModel || "gpt-4o-mini");
    if (result.data) {
      return {
        data: sanitizeImagePromptValue(result.data),
        error: null,
        mode: "openai",
        requestedPrompt: prompt,
      };
    }

    return {
      data: fallbackPrompt,
      error: result.error || null,
      mode: "mock",
      requestedPrompt: prompt,
    };
  }

  if (provider === "gemini") {
    const result = await generateWithGemini(prompt, getGeminiApiKey(settings), getGeminiModel(settings));
    if (result.data) {
      return {
        data: sanitizeImagePromptValue(result.data),
        error: null,
        mode: "gemini",
        requestedPrompt: prompt,
      };
    }

    return {
      data: fallbackPrompt,
      error: result.error || null,
      mode: "mock",
      requestedPrompt: prompt,
    };
  }

  return {
    data: fallbackPrompt,
    error: null,
    mode: "mock",
    requestedPrompt: prompt,
  };
}
