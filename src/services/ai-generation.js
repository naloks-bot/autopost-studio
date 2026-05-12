import { logger } from "./logger.js";

const PROVIDER_LABELS = {
  mock: "Mock",
  openai: "OpenAI",
  gemini: "Gemini",
  codex: "Codex CLI",
};

function compactProviderError(message, fallback = "Provider request failed.") {
  const next = String(message || "").replace(/\s+/g, " ").trim();
  if (!next) return fallback;
  if (next.length <= 140) return next;
  return `${next.slice(0, 137)}...`;
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
  return Boolean(settings?.geminiApiKey?.trim());
}

function getPreferredTextProvider(settings) {
  return settings?.textProvider?.toLowerCase() || settings?.aiProvider?.toLowerCase() || "mock";
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

/**
 * Determines the AI provider based on available settings.
 * This stays aligned with text routing during Phase A.
 */
export function getAIProvider(settings) {
  return getTextProviderRuntime(settings).activeProvider;
}

/**
 * Builds a structured prompt for social media post generation.
 */
export function buildContentPrompt(formData, settings) {
  const voice = settings.brandVoice || "Professional";
  const business = settings.businessName || "My Brand";
  const topic = formData.topic || "Social Media Update";
  const pageLabel = formData.pageLabel ? `Page: ${formData.pageLabel}` : "";
  const pageWritingDirection = formData.pageWritingDirection ? `Page writing direction: ${formData.pageWritingDirection}` : "";
  const pageImageDirection = formData.pageImageDirection ? `Page image direction: ${formData.pageImageDirection}` : "";
  const pageReadme = formData.pageReadme ? `Page memory: ${formData.pageReadme}` : "";
  const pageTone = formData.pageTone ? `Page tone: ${formData.pageTone}` : "";

  return `Generate a high-engaging social media post for ${business}.
Tone: ${voice}
Topic: ${topic}
${pageLabel}
${pageTone}
${pageWritingDirection}
${pageImageDirection}
${pageReadme}
Structure: Grab attention, address pain points, offer solution, and include a clear call to action.
Platform: Facebook/Instagram`;
}

/**
 * Builds a prompt for generating an image to accompany the post.
 */
export function buildImagePrompt(formData, settings) {
  const topic = formData.topic || "Abstract concept";
  const voice = settings.brandVoice || "Modern";
  const content = formData.content ? `Post content context: ${formData.content}` : "";
  const pageLabel = formData.pageLabel ? `Page: ${formData.pageLabel}` : "";
  const pageImageDirection = formData.pageImageDirection ? `Page image direction: ${formData.pageImageDirection}` : "";
  const pageWritingDirection = formData.pageWritingDirection ? `Page writing direction: ${formData.pageWritingDirection}` : "";
  const pageReadme = formData.pageReadme ? `Page memory: ${formData.pageReadme}` : "";

  return `Create a clean social media image prompt for "${topic}".
Brand voice: ${voice}
${content}
${pageLabel}
${pageWritingDirection}
${pageImageDirection}
${pageReadme}
Return one clear production-ready image prompt focused on subject, composition, mood, and visual direction.`;
}

async function generateMockText(formData, settings, meta = {}) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return createGenerationResult({
      data: `[ข้อความตัวอย่างจากระบบ]\n\nหัวข้อ: ${formData.topic}\n\nนี่คือข้อความตัวอย่างสำหรับ ${settings.businessName || "ธุรกิจของคุณ"} โดยใช้โทน ${settings.brandVoice || "มืออาชีพ"}\n\nเนื้อหาจะเกริ่นประเด็นหลัก อธิบายให้เข้าใจง่าย และปิดท้ายด้วยคำชวนที่ชัดเจน`,
    error: meta.error || null,
    mode: "mock",
    status: meta.status || "success",
    requestedProvider: meta.requestedProvider || "mock",
    fallbackReason: meta.fallbackReason || null,
    noticeTone: meta.noticeTone || null,
    noticeMessage: meta.noticeMessage || null,
  });
}

/**
 * Real OpenAI API call for text generation.
 */
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

/**
 * Real Google Gemini API call for text generation.
 */
async function generateWithGemini(prompt, apiKey, model = "gemini-2.5-flash") {
  if (!apiKey) {
    return {
      data: null,
      error: "Gemini API key is missing.",
      mode: "gemini",
    };
  }

  try {
    const apiModel = model || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

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
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errorData.error?.message || `Gemini API Error: ${response.status}`,
        mode: "gemini",
      };
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return {
        data: null,
        error: "Gemini returned no message content.",
        mode: "gemini",
      };
    }

    return {
      data: content.trim(),
      error: null,
      mode: "gemini",
    };
  } catch (error) {
    return {
      data: null,
      error: `Network error: ${compactProviderError(error.message, "Unable to reach Gemini.")}`,
      mode: "gemini",
    };
  }
}

/**
 * Generates post content using the appropriate provider.
 */
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
      result = await generateWithGemini(prompt, settings.geminiApiKey, settings.geminiModel);
    }

    if (!result.data) {
      logger.warn(`Primary text provider failed. Falling back to mock. Provider: ${runtime.selectedProvider}`);
      result = await generateMockText(formData, settings, {
        requestedProvider: runtime.selectedProvider,
        error: `${getProviderLabel(runtime.selectedProvider)} failed. Using Mock fallback. ${compactProviderError(result.error)}`,
        fallbackReason: result.error,
        status: "fallback",
        noticeTone: "warning",
        noticeMessage: `${getProviderLabel(runtime.selectedProvider)} failed. Mock content was generated to keep the flow safe.`,
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

/**
 * Generates an image prompt using the appropriate provider.
 */
export async function generateImagePrompt({ formData, settings }) {
  if (!formData?.topic || formData.topic.trim().length < 5) {
    return {
      data: null,
      error: "Please enter at least 5 characters for the topic before generating an image prompt.",
      mode: "mock",
    };
  }

  const provider = getAIProvider(settings);
  const prompt = buildImagePrompt(formData, settings);

  if (provider === "openai") {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      data: `ภาพโปรโมต ${formData.topic} แบบพรีเมียม โฟกัสชัด แสงสวย องค์ประกอบสะอาด ${formData.pageImageDirection || ""}`.trim(),
      error: null,
      mode: "openai",
    };
  }

  if (provider === "gemini") {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      data: `ภาพ ${formData.topic} สำหรับโซเชียล โทนดึงดูดสายตา สไตล์มืออาชีพ ${formData.pageImageDirection || ""}`.trim(),
      error: null,
      mode: "gemini",
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 800));
  const mockPrompt = `ภาพ ${formData.topic} โทน ${settings.brandVoice || "เรียบหรู"} องค์ประกอบชัด สื่อสารง่าย เหมาะกับโพสต์ Facebook ${formData.pageImageDirection || ""}`.trim();

  return {
    data: mockPrompt,
    error: null,
    mode: "mock",
  };
}
