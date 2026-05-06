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
  // Note: For real image uploads, /{page-id}/photos is often preferred,
  // but /{page-id}/feed with 'link' works for existing URLs.
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
 * Publishes a post to the Facebook Page's feed immediately.
 * @param {Object} post - The post data.
 * @param {Object} settings - App settings containing tokens.
 * @returns {Promise<{data: any, error: string|null, mode: string}>}
 */
export async function publishFacebookPost(post, settings) {
  if (!validateFacebookConfig(settings)) {
    return { 
      data: null, 
      error: "Missing Facebook Page ID or Access Token", 
      mode: "mock" 
    };
  }

  try {
    const payload = buildFacebookPostPayload(post);
    const url = `${FB_BASE_URL}/${settings.facebookPageId}/feed?access_token=${settings.facebookPageAccessToken}`;

    const response = await fetch(url, {
      method: "POST",
      body: payload,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Facebook API error");
    }

    return { data: result, error: null, mode: "connected" };
  } catch (err) {
    console.error("Facebook publish error:", err);
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
      throw new Error(result.error?.message || "Facebook API error");
    }

    return { data: result, error: null, mode: "connected" };
  } catch (err) {
    console.error("Facebook schedule error:", err);
    return { data: null, error: err.message, mode: "connected" };
  }
}
