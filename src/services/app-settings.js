const STORAGE_KEY = "autopost-studio-settings";
const PENDING_SYSTEM_OVERRIDES_KEY = "autopost-studio-pending-system-overrides";
const ENV_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() || "";
const ENV_GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || "gemini-2.5-flash";

export const defaultWorkspacePages = [
  {
    id: "default",
    label: "หน้าหลัก",
    description: "ใช้ค่ากลางของระบบ",
    facebookPageId: "",
    facebookPageAccessToken: "",
    category: "หลัก",
    status: "active",
    readme: "",
    purpose: "",
    writingDirection: "",
    imageDirection: "",
    visualStyle: "",
    targetAudience: "",
    tone: "",
    contentPillars: "",
    avoidList: "",
    defaultCta: "",
  },
  {
    id: "demo-mock",
    label: "เดโม / ทดสอบ",
    description: "ใช้ลอง flow แบบปลอดภัย",
    facebookPageId: "",
    facebookPageAccessToken: "",
    category: "ทดสอบ",
    status: "mock",
    readme: "",
    purpose: "",
    writingDirection: "",
    imageDirection: "",
    visualStyle: "",
    targetAudience: "",
    tone: "",
    contentPillars: "",
    avoidList: "",
    defaultCta: "",
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
  geminiApiKey: ENV_GEMINI_API_KEY,
  geminiModel: ENV_GEMINI_MODEL,
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
    label: page.label || "เพจใหม่",
    description: page.description || "",
    facebookPageId: page.facebookPageId || "",
    facebookPageAccessToken: page.facebookPageAccessToken || "",
    category: page.category || "",
    status: page.status || "draft",
    readme: page.readme || "",
    purpose: page.purpose || "",
    writingDirection: page.writingDirection || "",
    imageDirection: page.imageDirection || "",
    visualStyle: page.visualStyle || "",
    targetAudience: page.targetAudience || "",
    tone: page.tone || "",
    contentPillars: page.contentPillars || "",
    avoidList: page.avoidList || "",
    defaultCta: page.defaultCta || "",
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
    geminiModel: ENV_GEMINI_MODEL,
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

export function getPendingSystemOverrides() {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(PENDING_SYSTEM_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      facebookPublishMode:
        parsed.facebookPublishMode === "live" || parsed.facebookPublishMode === "mock"
          ? parsed.facebookPublishMode
          : undefined,
      schedulerEnabled: typeof parsed.schedulerEnabled === "boolean" ? parsed.schedulerEnabled : undefined,
    };
  } catch (error) {
    console.error("Failed to read pending system overrides:", error);
    return {};
  }
}

export function savePendingSystemOverrides(overrides = {}) {
  if (!canUseStorage()) return {};

  const current = getPendingSystemOverrides();
  const next = {
    ...current,
    ...overrides,
  };
  window.localStorage.setItem(PENDING_SYSTEM_OVERRIDES_KEY, JSON.stringify(next));
  return next;
}

export function clearPendingSystemOverrides(keys = []) {
  if (!canUseStorage()) return;

  if (!Array.isArray(keys) || keys.length === 0) {
    window.localStorage.removeItem(PENDING_SYSTEM_OVERRIDES_KEY);
    return;
  }

  const current = getPendingSystemOverrides();
  for (const key of keys) {
    delete current[key];
  }

  const hasValues = Object.values(current).some((value) => typeof value !== "undefined");
  if (hasValues) {
    window.localStorage.setItem(PENDING_SYSTEM_OVERRIDES_KEY, JSON.stringify(current));
  } else {
    window.localStorage.removeItem(PENDING_SYSTEM_OVERRIDES_KEY);
  }
}
