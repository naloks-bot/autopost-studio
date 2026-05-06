import { logger } from "./logger.js";

/**
 * AI Image Generation Service
 * Provides a unified interface for generating images via OpenAI or mock fallback.
 * The service mimics the architecture of `src/services/ai-generation.js`.
 */

/**
 * Detects which image provider to use based on settings.
 * @param {Object} settings - Application settings.
 * @returns {"openai" | "mock"}
 */
export function detectImageProvider(settings) {
  // Prefer explicit provider setting if present
  const pref = settings?.aiProvider?.toLowerCase();
  if (pref === "openai" && settings?.openaiApiKey) return "openai";
  // Fallback to auto‑detect based on key prefix
  if (settings?.openaiApiKey && settings.openaiApiKey.startsWith("sk-")) return "openai";
  return "mock";
}

/**
 * Generate a mock image.
 * Returns a placeholder image URL after a short async delay.
 * @param {string} prompt - The prompt (unused for mock).
 * @returns {Promise<{data:{imageUrl:string},error:null,mode:"mock"}>}
 */
export async function generateMockImage(prompt) {
  logger.info("Generating mock image...");
  // Simulate network latency (1 second)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Use a free placeholder service – e.g., picsum.photos
  const placeholderUrl = `https://picsum.photos/seed/${encodeURIComponent(
    prompt.slice(0, 10)
  )}/1024/1024`;
  return {
    data: { imageUrl: placeholderUrl },
    error: null,
    mode: "mock",
  };
}

/**
 * Generate an image using the OpenAI API.
 * @param {string} prompt - The original prompt supplied by the user.
 * @param {Object} settings - Application settings containing the OpenAI API key.
 * @returns {Promise<{data:{imageUrl:string,revisedPrompt?:string},error:string|null,mode:"openai"}>}
 */
export async function generateOpenAIImage(prompt, settings) {
  const apiKey = settings?.openaiApiKey;
  if (!apiKey) {
    logger.warn("OpenAI API key missing during image generation.");
    return {
      data: null,
      error: "OpenAI API key not configured",
      mode: "openai",
    };
  }

  logger.info("Generating OpenAI image...");
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      logger.error(`OpenAI Image API failed with status ${response.status}`, err);
      return {
        data: null,
        error: err.error?.message || `OpenAI Image API Error: ${response.status}`,
        mode: "openai",
      };
    }

    const result = await response.json();
    const imageUrl = result?.data?.[0]?.url;
    const revisedPrompt = result?.revised_prompt;

    if (!imageUrl) {
      logger.error("OpenAI returned success but no image URL found in response.");
      return {
        data: null,
        error: "OpenAI did not return an image URL",
        mode: "openai",
      };
    }

    logger.info("OpenAI image generation successful.");
    return {
      data: { imageUrl, ...(revisedPrompt && { revisedPrompt }) },
      error: null,
      mode: "openai",
    };
  } catch (e) {
    logger.error("Network error during OpenAI image generation:", e);
    return {
      data: null,
      error: `Network error: ${e.message}`,
      mode: "openai",
    };
  }
}

/**
 * Unified image generation entry point.
 * Detects the provider and delegates to the appropriate implementation.
 * @param {string} prompt - Prompt describing the desired image.
 * @param {Object} settings - Application settings.
 * @returns {Promise<{data:{imageUrl:string,revisedPrompt?:string},error:string|null,mode:"openai"|"mock"}>}
 */
export async function generateImage(prompt, settings) {
  const provider = detectImageProvider(settings);
  logger.info(`Starting image generation with provider: ${provider}`);
  if (provider === "openai") {
    return generateOpenAIImage(prompt, settings);
  }
  // Fallback to mock
  return generateMockImage(prompt);
}
