import { logger } from "./logger.js";

/**
 * Facebook Graph API Service
 * Handles communication with the Facebook Graph API for posting and scheduling.
 * 
 * REQUIRED PERMISSIONS (Facebook App Review):
 * - pages_manage_posts (to publish content)
 * - pages_read_engagement
 * - pages_show_list
 */

const FB_API_VERSION = "v23.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

/**
 * Validates if the required Facebook configuration is present.
 * @param {Object} settings - Application settings.
 * @returns {boolean}
 */
export function validateFacebookConfig(settings) {
  return Boolean(settings.facebookPageId && settings.facebookPageAccessToken);
}

/**
 * Builds the payload for the Facebook Graph API /feed endpoint.
 * @param {Object} post - The post object (topic, content, image_url, etc).
 * @param {Object} options - Optional parameters (published, scheduled_publish_time).
 * @returns {URLSearchParams}
 */
export function buildFacebookPostPayload(post, options = {}) {
  const params = new URLSearchParams();
  
  // Facebook uses 'message' for the main text body
  params.append("message", post.content || post.topic || "");
  
  // If an image URL is present, Facebook can attach it via link parameter
  if (post.image_url) {
    params.append("link", post.image_url);
  }
  
  // Scheduling options
  if (options.published === false) {
    params.append("published", "false");
    if (options.scheduled_publish_time) {
      // Must be a unix timestamp between 10 mins and 30 days in the future
      params.append("scheduled_publish_time", options.scheduled_publish_time.toString());
    }
  }

  return params;
}

/**
 * Helper to extract readable error message from Facebook API response.
 */
function extractFacebookError(result, status) {
  if (result.error) {
    const code = result.error.code;
    const subcode = result.error.error_subcode;
    
    if (code === 190) return "Facebook Access Token expired or invalid. Please refresh it in Settings.";
    if (code === 200) return "Insufficient permissions. Ensure 'pages_manage_posts' is granted.";
    if (code === 100) return `Facebook Validation Error: ${result.error.message}`;
    
    return result.error.message || `Facebook Error (${code})`;
  }
  return `Facebook API Error: ${status}`;
}

/**
 * Publishes a post to the Facebook Page's feed immediately.
 * @param {Object} post - The post data.
 * @param {Object} settings - App settings containing tokens.
 * @returns {Promise<{data: any, error: string|null, mode: string}>}
 */
export async function publishFacebookPost(post, settings) {
  if (!validateFacebookConfig(settings)) {
    logger.warn("Facebook configuration missing during publish attempt.");
    return { 
      data: null, 
      error: "Missing Facebook Page ID or Access Token", 
      mode: "mock" 
    };
  }

  logger.info(`Publishing to Facebook Page: ${settings.facebookPageId}`);
  try {
    const payload = buildFacebookPostPayload(post);
    const url = `${FB_BASE_URL}/${settings.facebookPageId}/feed?access_token=${settings.facebookPageAccessToken}`;

    const response = await fetch(url, {
      method: "POST",
      body: payload,
    });

    const result = await response.json();

    if (!response.ok) {
      const msg = extractFacebookError(result, response.status);
      logger.error("Facebook Publish Failed:", msg, result);
      throw new Error(msg);
    }

    logger.info("Facebook Publish Successful.", result);
    return { data: result, error: null, mode: "connected" };
  } catch (err) {
    logger.error("Network or API error during Facebook publish:", err);
    return { data: null, error: err.message, mode: "connected" };
  }
}

/**
 * Schedules a post for future publication.
 * @param {Object} post - The post data.
 * @param {number} scheduledTime - Unix timestamp for publication.
 * @param {Object} settings - App settings.
 * @returns {Promise<{data: any, error: string|null, mode: string}>}
 */
export async function scheduleFacebookPost(post, scheduledTime, settings) {
  if (!validateFacebookConfig(settings)) {
    return { 
      data: null, 
      error: "Missing Facebook Page ID or Access Token", 
      mode: "mock" 
    };
  }

  logger.info(`Scheduling Facebook post for timestamp: ${scheduledTime}`);
  try {
    const payload = buildFacebookPostPayload(post, { 
      published: false, 
      scheduled_publish_time: scheduledTime 
    });
    const url = `${FB_BASE_URL}/${settings.facebookPageId}/feed?access_token=${settings.facebookPageAccessToken}`;

    const response = await fetch(url, {
      method: "POST",
      body: payload,
    });

    const result = await response.json();

    if (!response.ok) {
      const msg = extractFacebookError(result, response.status);
      logger.error("Facebook Schedule Failed:", msg, result);
      throw new Error(msg);
    }

    logger.info("Facebook Schedule Successful.", result);
    return { data: result, error: null, mode: "connected" };
  } catch (err) {
    logger.error("Network or API error during Facebook schedule:", err);
    return { data: null, error: err.message, mode: "connected" };
  }
}
