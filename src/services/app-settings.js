const STORAGE_KEY = "autopost-studio-settings";
const PENDING_SYSTEM_OVERRIDES_KEY = "autopost-studio-pending-system-overrides";
const ENV_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() || "";
const ENV_GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const DEFAULT_BRAND_MEMORY =
  "AI ทำกิน คือเพจที่ลองใช้ AI แบบง่าย ๆ ให้คนไทยดู ว่า AI เอาไปช่วยงานจริง ทำคอนเทนต์จริง และต่อยอดหาเงินจริงได้ยังไง เขียนเหมือนเพื่อนที่ลองมาแล้วเล่าให้ฟัง ไม่ขายฝัน ไม่เทคนิคเกินไป เป้าหมายคือให้คนอ่านรู้สึกว่า 'อ๋อ แบบนี้ฉันก็ลองใช้ AI ได้เลย'";
const DEFAULT_WRITING_GUIDANCE =
  "เปิดด้วย Hook สั้น ชัด และหยุดคนอ่าน เนื้อหาอ่านง่าย ย่อยง่าย เว้นบรรทัด ไม่เขียนติดกันเป็นก้อน ใช้คำหลากหลาย ไม่เริ่มโพสต์ซ้ำ ๆ ไม่จบด้วย CTA เดิมทุกครั้ง สลับมุมเล่าเรื่องตามหัวข้อ เช่น checklist, how-to, mistake, quick win, mini story, before-after หรือ example-based หลีกเลี่ยง markdown เช่น *, **, ### และใช้อีโมจิให้น้อย เฉพาะจุดที่ช่วยให้อ่านง่ายจริง ๆ";
const DEFAULT_VISUAL_GUIDANCE =
  "modern, friendly, practical, creator economy, สีหลักน้ำเงิน ฟ้า ขาว เหลือง, whitespace เยอะ, มี Hook ภาษาไทยบนภาพแบบสั้นและชัด, มี mascot น้องลองดีเป็นหยดไฟ/ประกายไอเดียสีเหลือง, หลีกเลี่ยง cyberpunk หุ่นยนต์ ภาพมืด ภาพแน่น และข้อความเยอะเกินไป";

export const defaultWorkspacePages = [
  {
    id: "default",
    label: "หน้าหลัก",
    description: "ใช้ค่ากลางของระบบ",
    facebookPageId: "",
    facebookPageAccessToken: "",
    category: "หลัก",
    status: "active",
    brandMemory: DEFAULT_BRAND_MEMORY,
    readme: "",
    purpose: "",
    writingDirection: DEFAULT_WRITING_GUIDANCE,
    imageDirection: DEFAULT_VISUAL_GUIDANCE,
    visualDirection: DEFAULT_VISUAL_GUIDANCE,
    visualStyle: "",
    targetAudience: "คนไทยที่อยากเริ่มใช้ AI กับงานจริง คอนเทนต์จริง หรือหารายได้แบบจับต้องได้ โดยไม่อยากอ่านอะไรเทคนิคเกินไป",
    tone: "เป็นกันเอง, เหมือนเพื่อนเล่าให้ฟัง, ง่าย ไม่เทคนิค, กระชับ, ไม่ขายฝัน, ใช้คำหลากหลาย",
    postLength: "short",
    examplePost: "",
    contentPillars: "",
    avoidList: "",
    defaultCta: "",
    imageNegativePrompt: "",
    preferredWords: "",
    dislikedWords: "",
  },
  {
    id: "demo-mock",
    label: "เดโม / ทดสอบ",
    description: "ใช้ลอง flow แบบปลอดภัย",
    facebookPageId: "",
    facebookPageAccessToken: "",
    category: "ทดสอบ",
    status: "mock",
    brandMemory: "",
    readme: "",
    purpose: "",
    writingDirection: "",
    imageDirection: "",
    visualDirection: "",
    visualStyle: "",
    targetAudience: "",
    tone: "",
    postLength: "short",
    examplePost: "",
    contentPillars: "",
    avoidList: "",
    defaultCta: "",
    imageNegativePrompt: "",
    preferredWords: "",
    dislikedWords: "",
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
  const legacyBrandMemory = [page.description || "", page.purpose || "", page.readme || ""].filter(Boolean).join("\n\n").trim();
  const legacyVisualDirection = [page.visualDirection || "", page.imageDirection || "", page.visualStyle || ""]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return {
    id: page.id || `page-${Date.now()}`,
    label: page.label || "เพจใหม่",
    description: page.description || "",
    facebookPageId: page.facebookPageId || "",
    facebookPageAccessToken: page.facebookPageAccessToken || "",
    category: page.category || "",
    status: page.status || "draft",
    brandMemory: page.brandMemory || legacyBrandMemory || "",
    readme: page.readme || "",
    purpose: page.purpose || "",
    writingDirection: page.writingDirection || "",
    imageDirection: page.imageDirection || "",
    visualDirection: page.visualDirection || legacyVisualDirection || "",
    visualStyle: page.visualStyle || "",
    targetAudience: page.targetAudience || "",
    tone: page.tone || "",
    postLength: page.postLength || "short",
    examplePost: page.examplePost || "",
    contentPillars: page.contentPillars || "",
    avoidList: page.avoidList || "",
    defaultCta: page.defaultCta || "",
    imageNegativePrompt: page.imageNegativePrompt || "",
    preferredWords: page.preferredWords || "",
    dislikedWords: page.dislikedWords || "",
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
