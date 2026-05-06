/**
 * AI Generation Service
 * Handles building prompts and calling AI models (OpenAI/xAI)
 * Phase 5.4: Structure for real API integration
 */

/**
 * Determines the AI provider based on available settings
 * @param {Object} settings - App settings
 * @returns {"openai" | "xai" | "mock"}
 */
export function getAIProvider(settings) {
  if (settings?.openaiApiKey && settings.openaiApiKey.startsWith("sk-")) {
    return "openai";
  }
  if (settings?.xaiApiKey && settings.xaiApiKey.startsWith("xai-")) {
    return "xai";
  }
  return "mock";
}

/**
 * Builds a structured prompt for social media post generation
 */
export function buildContentPrompt(formData, settings) {
  const voice = settings.brandVoice || "Professional";
  const business = settings.businessName || "My Brand";
  const topic = formData.topic || "Social Media Update";

  return `Generate a high-engaging social media post for ${business}.
Tone: ${voice}
Topic: ${topic}
Structure: Grab attention, address pain points, offer solution, and include a clear call to action.
Platform: Facebook/Instagram`;
}

/**
 * Builds a prompt for generating an image to accompany the post
 */
export function buildImagePrompt(formData, settings) {
  const topic = formData.topic || "Abstract concept";
  const voice = settings.brandVoice || "Modern";

  return `High-quality social media visual for "${topic}". ${voice} style, clean composition, vibrant colors, premium lighting, 4k resolution, optimized for social media engagement.`;
}

/**
 * Real OpenAI API call for text generation
 */
async function generateWithOpenAI(prompt, apiKey) {
  if (!apiKey) {
    return {
      data: null,
      error: "ไม่พบ OpenAI API Key ในการตั้งค่า",
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
        model: "gpt-4o-mini",
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
        error: "OpenAI ไม่ได้ส่งเนื้อหากลับมาในรูปแบบที่ถูกต้อง",
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
      error: `เครือข่ายขัดข้อง: ${error.message}`,
      mode: "openai",
    };
  }
}

/**
 * Placeholder for xAI API call
 * TODO: Implement real fetch in Checkpoint 5.5
 */
async function generateWithXAI(prompt, apiKey) {
  console.log("xAI Provider: (Placeholder) Waiting for real integration");
  // Simulate delay
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return {
    data: `[xAI Mock] นี่คือเนื้อหาที่จำลองว่าสร้างจาก xAI สำหรับหัวข้อ: ${prompt.slice(0, 50)}...`,
    error: null,
    mode: "xai",
  };
}

/**
 * Generates post content using the appropriate provider
 */
export async function generatePostContent({ formData, settings }) {
  if (!formData?.topic || formData.topic.trim().length < 5) {
    return {
      data: null,
      error: "กรุณาใส่หัวข้อโพสต์อย่างน้อย 5 ตัวอักษร เพื่อให้ AI มีข้อมูลเพียงพอในการสร้างเนื้อหา",
      mode: "mock",
    };
  }

  const provider = getAIProvider(settings);
  const prompt = buildContentPrompt(formData, settings);

  if (provider === "openai") {
    return generateWithOpenAI(prompt, settings.openaiApiKey);
  }

  if (provider === "xai") {
    return generateWithXAI(prompt, settings.xaiApiKey);
  }

  // Fallback to Mock
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const mockData = `[Mock Generated Content]\n\nหัวข้อ: ${formData.topic}\n\nนี่คือตัวอย่างเนื้อหาที่ถูกสร้างขึ้นโดย AI สำหรับ ${settings.businessName || "ธุรกิจของคุณ"} โดยเน้นโทนเสียงแบบ ${settings.brandVoice || "มืออาชีพ"}\n\nเนื้อหาประกอบด้วยการชี้ปัญหาของลูกค้า แนะนำบริการ และปิดท้ายด้วย Call to Action ที่ชัดเจน!`;

  return {
    data: mockData,
    error: null,
    mode: "mock",
  };
}

/**
 * Generates an image prompt using the appropriate provider
 */
export async function generateImagePrompt({ formData, settings }) {
  if (!formData?.topic || formData.topic.trim().length < 5) {
    return {
      data: null,
      error: "กรุณาใส่หัวข้อโพสต์อย่างน้อย 5 ตัวอักษร ก่อนสร้าง Prompt รูป",
      mode: "mock",
    };
  }

  const provider = getAIProvider(settings);
  const prompt = buildImagePrompt(formData, settings);

  // For now, we keep image prompt generation mock to save tokens as requested
  if (provider === "openai") {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      data: `[Mock OpenAI Image Prompt] ${formData.topic}, high quality visual.`,
      error: null,
      mode: "openai",
    };
  }

  if (provider === "xai") {
    const result = await generateWithXAI(prompt, settings.xaiApiKey);
    return { ...result, data: `[xAI Image Prompt] ${formData.topic}, cinematic lighting.` };
  }

  // Fallback to Mock
  await new Promise((resolve) => setTimeout(resolve, 800));
  const mockPrompt = `Premium visual of ${formData.topic}, ${settings.brandVoice || "elegant"} aesthetic, professional photography style.`;

  return {
    data: mockPrompt,
    error: null,
    mode: "mock",
  };
}
