/**
 * AI Generation Service
 * Handles building prompts and calling AI models (OpenAI/xAI)
 * Currently in Phase 5.1: Mock implementations for testing flow
 */

/**
 * Builds a structured prompt for social media post generation
 * @param {Object} formData - Current form state (topic, etc.)
 * @param {Object} settings - App settings (business name, brand voice, etc.)
 * @returns {string} The constructed prompt
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
 * @param {Object} formData - Current form state (topic, content, etc.)
 * @param {Object} settings - App settings
 * @returns {string} The constructed prompt
 */
export function buildImagePrompt(formData, settings) {
  const topic = formData.topic || "Abstract concept";
  const voice = settings.brandVoice || "Modern";

  return `High-quality social media visual for "${topic}". ${voice} style, clean composition, vibrant colors, premium lighting, 4k resolution, optimized for social media engagement.`;
}

/**
 * Generates post content using AI (Mock version)
 * @param {Object} params - { formData, settings }
 * @returns {Promise<Object>} Mock uniform result
 */
export async function generatePostContent({ formData, settings }) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const prompt = buildContentPrompt(formData, settings);
  console.log("Mocking content generation with prompt:", prompt);

  if (!formData.topic) {
    return {
      data: null,
      error: "Topic is required to generate content",
      mode: "mock",
    };
  }

  const mockData = `[Mock Generated Content]\n\nหัวข้อ: ${formData.topic}\n\nนี่คือตัวอย่างเนื้อหาที่ถูกสร้างขึ้นโดย AI สำหรับ ${settings.businessName || "ธุรกิจของคุณ"} โดยเน้นโทนเสียงแบบ ${settings.brandVoice || "มืออาชีพ"}\n\nเนื้อหาประกอบด้วยการชี้ปัญหาของลูกค้า แนะนำบริการ และปิดท้ายด้วย Call to Action ที่ชัดเจน!`;

  return {
    data: mockData,
    error: null,
    mode: "mock",
  };
}

/**
 * Generates an image prompt using AI (Mock version)
 * @param {Object} params - { formData, settings }
 * @returns {Promise<Object>} Mock uniform result
 */
export async function generateImagePrompt({ formData, settings }) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const prompt = buildImagePrompt(formData, settings);
  console.log("Mocking image prompt generation with prompt:", prompt);

  if (!formData.topic) {
    return {
      data: null,
      error: "Topic is required to generate image prompt",
      mode: "mock",
    };
  }

  const mockPrompt = `Premium visual of ${formData.topic}, ${settings.brandVoice || "elegant"} aesthetic, professional photography style.`;

  return {
    data: mockPrompt,
    error: null,
    mode: "mock",
  };
}
