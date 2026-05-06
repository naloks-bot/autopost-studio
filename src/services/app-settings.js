const STORAGE_KEY = "autopost-studio-settings";

export const defaultSettings = {
  workspaceName: "AutoPost Studio",
  businessName: "",
  brandVoice: "มืออาชีพ ชัดเจน และกระชับ",
  defaultTopicHint: "",
  aiProvider: "mock",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  xaiApiKey: "",
  xaiModel: "grok-3-mini",
  facebookAppId: "",
  facebookAppSecret: "",
  facebookPageId: "",
  facebookPageAccessToken: "",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAppSettings() {
  if (!canUseStorage()) return defaultSettings;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...defaultSettings, ...parsed };
  } catch (error) {
    console.error("Failed to read app settings:", error);
    return defaultSettings;
  }
}

export function saveAppSettings(settings) {
  if (!canUseStorage()) return defaultSettings;

  const nextSettings = { ...defaultSettings, ...settings };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  return nextSettings;
}
