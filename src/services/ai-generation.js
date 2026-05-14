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

function buildFallbackImagePromptFromContent(formData = {}) {
  const topic = String(formData.topic || "").trim();
  const caption = sanitizeGeneratedCaption(String(formData.content || "").trim());
  const pageDirection = String(formData.pageImageDirection || "").trim();
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
  const pageWritingDirection = formData.pageWritingDirection ? `Page writing direction: ${formData.pageWritingDirection}` : "";
  const pageImageDirection = formData.pageImageDirection ? `Page image direction: ${formData.pageImageDirection}` : "";
  const pageReadme = formData.pageReadme ? `Page memory: ${formData.pageReadme}` : "";
  const pageTone = formData.pageTone ? `Page tone: ${formData.pageTone}` : "";
  const pagePurpose = formData.pagePurpose ? `Page purpose: ${formData.pagePurpose}` : "";
  const pageTargetAudience = formData.pageTargetAudience ? `Target audience: ${formData.pageTargetAudience}` : "";
  const pageContentPillars = formData.pageContentPillars ? `Content pillars: ${formData.pageContentPillars}` : "";
  const pageAvoidList = formData.pageAvoidList ? `Avoid list: ${formData.pageAvoidList}` : "";
  const pageDefaultCta = formData.pageDefaultCta ? `Default CTA: ${formData.pageDefaultCta}` : "";

  return `Generate a high-engaging social media post for ${business}.
Tone: ${voice}
Topic: ${topic}
${pageLabel}
${pageTone}
${pagePurpose}
${pageTargetAudience}
${pageContentPillars}
${pageAvoidList}
${pageDefaultCta}
${pageWritingDirection}
${pageImageDirection}
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
  const pageImageDirection = formData.pageImageDirection ? `Page image direction: ${formData.pageImageDirection}` : "";
  const pageWritingDirection = formData.pageWritingDirection ? `Page writing direction: ${formData.pageWritingDirection}` : "";
  const pageReadme = formData.pageReadme ? `Page memory: ${formData.pageReadme}` : "";
  const pagePurpose = formData.pagePurpose ? `Page purpose: ${formData.pagePurpose}` : "";
  const pageTargetAudience = formData.pageTargetAudience ? `Target audience: ${formData.pageTargetAudience}` : "";
  const pageContentPillars = formData.pageContentPillars ? `Content pillars: ${formData.pageContentPillars}` : "";
  const pageAvoidList = formData.pageAvoidList ? `Avoid list: ${formData.pageAvoidList}` : "";

  return `Write one production-ready English image generation prompt for a social media post.
Topic: ${topic}
Brand voice: ${voice}
${content}
${pageLabel}
${pagePurpose}
${pageTargetAudience}
${pageContentPillars}
${pageAvoidList}
${pageWritingDirection}
${pageImageDirection}
${pageReadme}
Rules:
- Return English only.
- Return one prompt only.
- Focus on subject, composition, mood, lighting, and visual direction.
- Do not include explanations or labels.`;
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
