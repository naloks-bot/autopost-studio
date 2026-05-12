const STORAGE_KEY = "autopost-studio-settings";

export const defaultWorkspacePages = [
  {
    id: "default",
    label: "Default Page",
    description: "Current stable Facebook settings",
    facebookPageId: "",
    facebookPageAccessToken: "",
  },
  {
    id: "demo-mock",
    label: "Demo / Mock Page",
    description: "Simulation for workspace testing",
    facebookPageId: "",
    facebookPageAccessToken: "",
  },
];

export const defaultSettings = {
  workspaceName: "AutoPost Studio",
  businessName: "",
  brandVoice: "มืออาชีพ ชัดเจน และกระชับ",
  defaultTopicHint: "",
  aiProvider: "mock",
  textProvider: "mock",
  imageProvider: "mock",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash",
  facebookAppId: "",
  facebookAppSecret: "",
  facebookPageId: "",
  facebookPageAccessToken: "",
  facebookPublishMode: "mock", // "mock" | "live"
  schedulerEnabled: false,
  activePageId: "default",
  workspacePages: defaultWorkspacePages,
};

function normalizeWorkspacePage(page = {}) {
  return {
    id: page.id || `page-${Date.now()}`,
    label: page.label || "Untitled Page",
    description: page.description || "",
    facebookPageId: page.facebookPageId || "",
    facebookPageAccessToken: page.facebookPageAccessToken || "",
  };
}

export function normalizeWorkspacePages(pages) {
  const source = Array.isArray(pages) && pages.length ? pages : defaultWorkspacePages;
  const seen = new Set();
  const normalized = source
    .map((page) => normalizeWorkspacePage(page))
    .filter((page) => {
      if (seen.has(page.id)) return false;
      seen.add(page.id);
      return true;
    });

  if (!normalized.some((page) => page.id === "default")) {
    normalized.unshift(normalizeWorkspacePage(defaultWorkspacePages[0]));
  }

  if (!normalized.some((page) => page.id === "demo-mock")) {
    normalized.push(normalizeWorkspacePage(defaultWorkspacePages[1]));
  }

  return normalized;
}

export function sanitizeSettings(settings = {}) {
  const workspacePages = normalizeWorkspacePages(settings.workspacePages);
  const activePageId = workspacePages.some((page) => page.id === settings.activePageId)
    ? settings.activePageId
    : "default";

  return {
    ...defaultSettings,
    ...settings,
    activePageId,
    workspacePages,
  };
}

export function getWorkspacePages(settings = {}) {
  return normalizeWorkspacePages(settings.workspacePages);
}

export function getActiveWorkspacePage(settings = {}) {
  const workspacePages = getWorkspacePages(settings);
  return workspacePages.find((page) => page.id === settings.activePageId) || workspacePages[0];
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAppSettings() {
  if (!canUseStorage()) return sanitizeSettings(defaultSettings);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return sanitizeSettings(parsed);
  } catch (error) {
    console.error("Failed to read app settings:", error);
    return sanitizeSettings(defaultSettings);
  }
}

export function saveAppSettings(settings) {
  if (!canUseStorage()) return sanitizeSettings(settings);

  const nextSettings = sanitizeSettings(settings);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  return nextSettings;
}
