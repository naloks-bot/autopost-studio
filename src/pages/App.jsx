import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CreatePage from "./CreatePage.jsx";
import StatusPage from "./StatusPage.jsx";
import SchedulerPage from "./SchedulerPage.jsx";
import LibraryPage from "./LibraryPage.jsx";
import LogsPage from "./LogsPage.jsx";
import SettingsPage from "./SettingsPage.jsx";
import PagesPage from "./PagesPage.jsx";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import GuideModal from "../components/GuideModal.jsx";
import { initialForm, statusCopy } from "../constants/appConstants.js";
import {
  defaultSettings,
  getActiveWorkspacePage,
  getAppSettings,
  getWorkspacePages,
  saveAppSettings,
  sanitizeSettings,
} from "../services/app-settings.js";
import { getLocalDrafts, removeLocalDraft, saveLocalDraft, updateLocalDraft } from "../services/local-drafts.js";
import {
  fetchRemotePages,
  fetchRemotePosts,
  fetchRemoteSettings,
  getSupabaseEnvSnapshot,
  hasSupabaseConfig,
  insertRemoteDraft,
  saveRemotePages,
  saveRemoteSettings,
  updateRemoteDraft,
  updateRemotePostStatus,
} from "../services/supabase.js";
import { createOperationLog, fetchOperationLogs } from "../services/operation-logs.js";
import { getFacebookPublishDiagnostics, publishFacebookPost, validateFacebookConfig } from "../services/facebook.js";
import {
  generateImagePrompt,
  generatePostContent,
  getTextProviderRuntime,
  sanitizeGeneratedCaption,
  splitGeneratedPostContent,
} from "../services/ai-generation.js";
import { resolveEffectivePublishConfig } from "../services/page-context.js";
import { runSchedulerTick } from "../services/scheduler.js";

const THEME_KEY = "autopost-studio-theme";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toUserSafeMessage(error, fallback = "เกิดข้อผิดพลาดบางอย่าง กรุณาลองอีกครั้ง") {
  const raw = typeof error === "string" ? error : error?.message;
  const next = String(raw || fallback).replace(/\s+/g, " ").trim();
  if (!next) return fallback;
  return next.length <= 160 ? next : `${next.slice(0, 157)}...`;
}

function createPageId(label = "") {
  const base = String(label || "page")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "page"}-${Date.now().toString().slice(-6)}`;
}

function buildClientOperationLog(entry = {}) {
  return {
    id: `client-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    level: entry.level || "info",
    source: entry.source || "system",
    event: entry.event || "unknown",
    message: entry.message || "",
    page_id: entry.page_id || null,
    post_id: entry.post_id ? String(entry.post_id) : null,
    metadata: entry.metadata || {},
  };
}

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
}

function mergeWorkspacePages(localPages = [], remotePages = []) {
  const remoteById = new Map((remotePages || []).map((page) => [page.id, page]));
  const merged = (localPages || []).map((page) => ({
    ...page,
    ...(remoteById.get(page.id) || {}),
  }));

  for (const remotePage of remotePages || []) {
    if (!merged.some((page) => page.id === remotePage.id)) {
      merged.push(remotePage);
    }
  }

  return merged;
}

function resolveSafeDraftPageId(activePageId, workspacePages = []) {
  const fallbackId = workspacePages.some((page) => page.id === "default") ? "default" : workspacePages[0]?.id || "default";
  return workspacePages.some((page) => page.id === activePageId) ? activePageId : fallbackId;
}

function SettingsField({ label, value, onChange, placeholder, multiline = false, secret = false, type = "text", options = [] }) {
  const sharedClassName =
    "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 appearance-none";

  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {type === "select" ? (
        <div className="relative">
          <select value={value} onChange={onChange} className={sharedClassName}>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      ) : multiline ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} className={`${sharedClassName} h-28`} />
      ) : (
        <input
          type={secret ? "password" : "text"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={sharedClassName}
        />
      )}
    </label>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("create");
  const [theme, setTheme] = useState(getInitialTheme);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [settings, setSettings] = useState(defaultSettings);
  const [remotePosts, setRemotePosts] = useState([]);
  const [localDrafts, setLocalDrafts] = useState([]);
  const [connectionMode, setConnectionMode] = useState(hasSupabaseConfig ? "connected" : "offline");
  const [connectionError, setConnectionError] = useState("");
  const [settingsSyncMode, setSettingsSyncMode] = useState(hasSupabaseConfig ? "connected" : "offline");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSchedulingPostId, setIsSchedulingPostId] = useState(null);
  const [isUnschedulingPostId, setIsUnschedulingPostId] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [lastTextGeneration, setLastTextGeneration] = useState(null);
  const [createNotice, setCreateNotice] = useState(null);
  const [statusNotice, setStatusNotice] = useState(null);
  const [operationLogs, setOperationLogs] = useState([]);
  const [logsMode, setLogsMode] = useState(hasSupabaseConfig ? "connected" : "offline");
  const [editingDraft, setEditingDraft] = useState(null);

  const schedulerLock = useRef(false);
  const dataLock = useRef(false);
  const stateRef = useRef({ remotePosts: [], settings: defaultSettings });

  useEffect(() => {
    stateRef.current = { remotePosts, settings };
  }, [remotePosts, settings]);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    void loadAllData(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void handleSchedulerTick();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const envSnapshot = getSupabaseEnvSnapshot();
  const isDark = theme !== "light";

  const allPendingPosts = useMemo(() => {
    const remotePending = remotePosts.filter((post) => post.status !== "posted");
    return [...localDrafts, ...remotePending].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [localDrafts, remotePosts]);

  const appendClientOperationLog = useCallback((entry, mode) => {
    if (mode) setLogsMode(mode);
    setOperationLogs((current) => [buildClientOperationLog(entry), ...current].slice(0, 100));
  }, []);

  const recordOperationLog = useCallback(
    async (entry) => {
      const result = await createOperationLog(entry);
      if (result.mode) setLogsMode(result.mode);

      if (result.data) {
        setOperationLogs((current) => [result.data, ...current].slice(0, 100));
      } else {
        appendClientOperationLog(entry, result.mode || (hasSupabaseConfig ? "error" : "offline"));
      }

      return result;
    },
    [appendClientOperationLog]
  );

  async function loadAllData(showSpinner = false) {
    if (dataLock.current) return;
    dataLock.current = true;
    if (showSpinner) setIsLoading(true);
    setConnectionError("");
    try {
      const localSettings = getAppSettings();
      setLocalDrafts(getLocalDrafts());

      const [postsResult, settingsResult, pagesResult, logsResult] = await Promise.all([
        fetchRemotePosts(),
        fetchRemoteSettings(),
        fetchRemotePages(),
        fetchOperationLogs(),
      ]);

      if (postsResult.data) setRemotePosts(postsResult.data);
      if (postsResult.mode) setConnectionMode(postsResult.mode);
      if (postsResult.error && postsResult.mode !== "offline") {
        setConnectionError(toUserSafeMessage(postsResult.error, "ยังโหลดร่างจาก Supabase ไม่ได้"));
      }

      if (logsResult.data) setOperationLogs(logsResult.data);
      if (logsResult.mode) setLogsMode(logsResult.mode);

      const workspacePages = pagesResult.data?.length
        ? mergeWorkspacePages(localSettings.workspacePages, pagesResult.data)
        : localSettings.workspacePages;
      if (settingsResult.mode) setSettingsSyncMode(settingsResult.mode);
      if (settingsResult.data) {
        setSettings(sanitizeSettings({ ...localSettings, ...settingsResult.data, workspacePages }));
      } else {
        setSettings(sanitizeSettings({ ...localSettings, workspacePages }));
      }
    } catch (error) {
      setConnectionError(toUserSafeMessage(error, "ยังโหลดข้อมูลระบบไม่สำเร็จ"));
    } finally {
      setIsLoading(false);
      dataLock.current = false;
    }
  }

  const updateForm = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setGenerationError("");
    setCreateNotice(null);
    setEditingDraft(null);
  }, []);

  const updateSettingsField = useCallback((key, value) => {
    setSettings((current) => sanitizeSettings({ ...current, [key]: value }));
  }, []);

  const updateWorkspacePage = useCallback((pageId, patch) => {
    setSettings((current) => {
      const workspacePages = getWorkspacePages(current).map((page) =>
        page.id === pageId ? { ...page, ...patch } : page
      );
      return sanitizeSettings({ ...current, workspacePages });
    });
  }, []);

  const addWorkspacePage = useCallback(() => {
    const nextPageId = createPageId("page");
    setSettings((current) => {
      const workspacePages = [
        ...getWorkspacePages(current),
        {
          id: nextPageId,
          label: "เพจใหม่",
          description: "",
          facebookPageId: "",
          facebookPageAccessToken: "",
          category: "",
          status: "draft",
          readme: "",
          writingDirection: "",
          imageDirection: "",
          visualStyle: "",
          targetAudience: "",
          tone: "",
        },
      ];
      return sanitizeSettings({ ...current, activePageId: nextPageId, workspacePages });
    });
    setSettingsMessage("เพิ่มเพจใหม่แล้ว อย่าลืมกดบันทึกข้อมูลเพจ");
    setActiveTab("pages");
  }, []);

  const removeWorkspacePage = useCallback((pageId) => {
    setSettings((current) => {
      const workspacePages = getWorkspacePages(current);
      const targetPage = workspacePages.find((page) => page.id === pageId);
      if (!targetPage) {
        setSettingsMessage("ไม่พบเพจที่ต้องการลบ");
        return current;
      }
      if (pageId === "default") {
        setSettingsMessage("ยังลบเพจหลักไม่ได้");
        return current;
      }
      if (current.activePageId === pageId) {
        setSettingsMessage("กรุณาเปลี่ยนไปใช้เพจอื่นก่อนลบเพจนี้");
        return current;
      }
      if (!window.confirm(`ต้องการลบเพจ "${targetPage.label}" ออกจากรายการใช่หรือไม่?`)) {
        return current;
      }

      setSettingsMessage(`ลบเพจ "${targetPage.label}" ออกจากรายการแล้ว อย่าลืมกดบันทึกข้อมูลเพจ`);
      return sanitizeSettings({
        ...current,
        workspacePages: workspacePages.filter((page) => page.id !== pageId),
      });
    });
  }, []);

  const handleLoadDraftToEditor = useCallback((draft) => {
    const nextPageId = draft.page_id || "default";
    setForm({
      topic: draft.topic || "",
      content: draft.content || "",
      imagePrompt: draft.image_prompt || "",
      imageUrl: draft.image_url || "",
    });
    setSettings((current) => {
      const workspacePages = getWorkspacePages(current);
      const activePageId = workspacePages.some((page) => page.id === nextPageId) ? nextPageId : current.activePageId;
      return sanitizeSettings({ ...current, activePageId });
    });
    setGenerationError("");
    setEditingDraft({
      id: draft.id,
      source: draft.source === "local" ? "local" : "remote",
      created_at: draft.created_at || null,
      image_provider: draft.image_provider || null,
      image_revised_prompt: draft.image_revised_prompt || null,
      image_storage_path: draft.image_storage_path || null,
      image_storage_mode: draft.image_storage_mode || null,
    });
    setCreateNotice({ tone: "info", message: "โหลดร่างกลับมาแก้ไขแล้ว" });
    setActiveTab("create");
  }, []);

  async function handleGenerateContent(overrides = {}) {
    if (!form.topic.trim()) {
      setCreateNotice({ tone: "warning", message: "กรุณาใส่หัวข้อก่อนสร้างข้อความ" });
      return;
    }

    setIsGenerating(true);
    setGenerationError("");
    setCreateNotice({ tone: "info", message: "กำลังสร้างข้อความ..." });

    try {
      const result = await generatePostContent({
        formData: {
          ...form,
          pageLabel: overrides.pageLabel ?? activeWorkspacePage?.label ?? "",
          pageWritingDirection: overrides.pageWritingDirection ?? activeWorkspacePage?.writingDirection ?? "",
          pageImageDirection: overrides.pageImageDirection ?? activeWorkspacePage?.imageDirection ?? "",
          pageReadme: overrides.pageReadme ?? activeWorkspacePage?.readme ?? "",
          pageTone: overrides.pageTone ?? activeWorkspacePage?.tone ?? "",
        },
        settings,
      });
      if (result.data) {
        const { cleanCaption, cleanImagePrompt } = splitGeneratedPostContent(result.data);
        const nextCaption = sanitizeGeneratedCaption(cleanCaption || "");
        let nextImagePrompt = cleanImagePrompt || "";

        if (!nextImagePrompt) {
          const imagePromptResult = await generateImagePrompt({
            formData: {
              ...form,
              content: nextCaption,
              pageLabel: overrides.pageLabel ?? activeWorkspacePage?.label ?? "",
              pageImageDirection: overrides.pageImageDirection ?? activeWorkspacePage?.imageDirection ?? "",
              pageWritingDirection: overrides.pageWritingDirection ?? activeWorkspacePage?.writingDirection ?? "",
              pageReadme: overrides.pageReadme ?? activeWorkspacePage?.readme ?? "",
            },
            settings,
          });
          nextImagePrompt = imagePromptResult.data || "";
        }

        updateForm("content", nextCaption);
        updateForm("imagePrompt", nextImagePrompt || "");
      }
      setLastTextGeneration(result);
      setGenerationError(result.status === "blocked" ? result.error || "" : "");
      setCreateNotice(
        result.noticeMessage
          ? { tone: result.noticeTone || "info", message: result.noticeMessage }
          : null
      );
    } catch (error) {
      const message = toUserSafeMessage(error, "ยังสร้างข้อความไม่สำเร็จ");
      setGenerationError(message);
      setCreateNotice({ tone: "danger", message });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateImagePrompt(overrides = {}) {
    if (!form.topic.trim()) {
      setCreateNotice({ tone: "warning", message: "กรุณาใส่หัวข้อก่อนช่วยคิดคำอธิบายภาพ" });
      return;
    }

    setIsGeneratingImagePrompt(true);
    setGenerationError("");
    setCreateNotice({ tone: "info", message: "กำลังช่วยคิดคำอธิบายภาพ..." });

    try {
      const result = await generateImagePrompt({
        formData: {
          ...form,
          pageLabel: overrides.pageLabel ?? activeWorkspacePage?.label ?? "",
          pageImageDirection: overrides.pageImageDirection ?? activeWorkspacePage?.imageDirection ?? "",
          pageWritingDirection: overrides.pageWritingDirection ?? activeWorkspacePage?.writingDirection ?? "",
          pageReadme: overrides.pageReadme ?? activeWorkspacePage?.readme ?? "",
        },
        settings,
      });
      if (result.data) {
        updateForm("imagePrompt", result.data);
        setCreateNotice({
          tone: "success",
          message: `เตรียมคำอธิบายภาพด้วย ${result.mode === "mock" ? "โหมดทดสอบ" : result.mode} แล้ว`,
        });
      } else if (result.error) {
        const message = toUserSafeMessage(result.error, "ยังสร้างคำอธิบายภาพไม่สำเร็จ");
        setGenerationError(message);
        setCreateNotice({ tone: "danger", message });
      }
    } catch (error) {
      const message = toUserSafeMessage(error, "ยังสร้างคำอธิบายภาพไม่สำเร็จ");
      setGenerationError(message);
      setCreateNotice({ tone: "danger", message });
    } finally {
      setIsGeneratingImagePrompt(false);
    }
  }

  async function handleSaveDraft(extraData = {}) {
    if (!form.topic.trim() || !form.content.trim()) {
      setCreateNotice({ tone: "warning", message: "กรุณาใส่หัวข้อและข้อความก่อนบันทึกร่าง" });
      return;
    }

    setIsSavingDraft(true);
    setCreateNotice({ tone: "info", message: "กำลังบันทึกร่าง..." });

    try {
      const safePageId = resolveSafeDraftPageId(settings.activePageId, settings.workspacePages);
      const pageWasAdjusted = safePageId !== (settings.activePageId || "default");
      const draft = {
        page_id: safePageId,
        topic: form.topic.trim(),
        content: sanitizeGeneratedCaption(form.content.trim()),
        image_prompt: extraData.image_prompt || form.imagePrompt.trim(),
        image_url: extraData.image_url || form.imageUrl.trim(),
        image_provider: extraData.image_provider || editingDraft?.image_provider || null,
        image_revised_prompt: extraData.image_revised_prompt || editingDraft?.image_revised_prompt || null,
        image_storage_path: extraData.image_storage_path || editingDraft?.image_storage_path || null,
        image_storage_mode: extraData.image_storage_mode || editingDraft?.image_storage_mode || null,
        status: "draft",
        created_at: editingDraft?.created_at || new Date().toISOString(),
      };

      const remote =
        editingDraft?.source === "remote"
          ? await updateRemoteDraft(editingDraft.id, draft, { workspacePages: settings.workspacePages })
          : await insertRemoteDraft(draft, { workspacePages: settings.workspacePages });

      if (remote.data) {
        setRemotePosts((current) => {
          if (editingDraft?.source === "remote") {
            return current.map((item) => (item.id === editingDraft.id ? remote.data : item));
          }
          return [remote.data, ...current];
        });

        if (editingDraft?.source === "local") {
          removeLocalDraft(editingDraft.id);
          setLocalDrafts((current) => current.filter((item) => item.id !== editingDraft.id));
        }

        resetForm();
        setCreateNotice({
          tone: "success",
          message: editingDraft?.source ? "อัปเดตร่างเรียบร้อยแล้ว" : "บันทึกร่างลง Supabase แล้ว",
        });
        if (pageWasAdjusted) {
          setCreateNotice({ tone: "success", message: "บันทึกร่างแล้ว โดยใช้เพจหลักเพื่อความปลอดภัย" });
        }
        return;
      }

      if (["read-only", "offline", "missing-table"].includes(remote.mode)) {
        const localEntry =
          editingDraft?.source === "local" ? updateLocalDraft(editingDraft.id, draft) : saveLocalDraft(draft);

        setLocalDrafts((current) => {
          if (!localEntry) return current;
          if (editingDraft?.source === "local") {
            return current.map((item) => (item.id === editingDraft.id ? localEntry : item));
          }
          return [localEntry, ...current];
        });

        resetForm();
        setCreateNotice({
          tone: "warning",
          message:
            editingDraft?.source === "local"
              ? "อัปเดตร่างในเครื่องแล้ว เพราะยังเขียนขึ้นคลาวด์ไม่ได้"
              : "Supabase ยังเขียนข้อมูลไม่ได้ จึงบันทึกไว้ในเครื่องแทน",
        });
        if (pageWasAdjusted) {
          setCreateNotice({ tone: "warning", message: "บันทึกร่างไว้ในเครื่องแล้ว โดยใช้เพจหลักแทนเพจที่ยังไม่พร้อม" });
        }
        return;
      }

      const message = toUserSafeMessage(remote.error, "บันทึกร่างไม่สำเร็จ");
      setCreateNotice({ tone: "danger", message });
    } catch (error) {
      setCreateNotice({ tone: "danger", message: toUserSafeMessage(error, "บันทึกร่างไม่สำเร็จ") });
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    try {
      const stored = saveAppSettings(settings);
      const [remoteSettings, remotePages] = await Promise.all([
        saveRemoteSettings(stored),
        saveRemotePages(stored.workspacePages),
      ]);
      const workspacePages = remotePages.data?.length
        ? mergeWorkspacePages(stored.workspacePages, remotePages.data)
        : stored.workspacePages;

      if (remoteSettings.data) {
        setSettings(sanitizeSettings({ ...stored, ...remoteSettings.data, workspacePages }));
        setSettingsSyncMode(remoteSettings.mode);
        setSettingsMessage("บันทึกการตั้งค่าระบบแล้ว");
        return;
      }

      setSettingsSyncMode(remoteSettings.mode);
      setSettingsMessage(toUserSafeMessage(remoteSettings.error, "บันทึกในเครื่องแล้ว แต่ยัง sync ขึ้น Supabase ไม่ได้"));
    } catch (error) {
      setSettingsSyncMode("error");
      setSettingsMessage(toUserSafeMessage(error, "บันทึกการตั้งค่าไม่สำเร็จ"));
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleSaveWorkspacePages() {
    setIsSavingSettings(true);
    try {
      const stored = saveAppSettings(settings);
      const remotePages = await saveRemotePages(stored.workspacePages);
      const nextPages = remotePages.data?.length
        ? mergeWorkspacePages(stored.workspacePages, remotePages.data)
        : stored.workspacePages;
      setSettings(sanitizeSettings({ ...stored, workspacePages: nextPages }));
      setSettingsMessage(
        remotePages.error
          ? toUserSafeMessage(remotePages.error, "บันทึกข้อมูลเพจไว้ในเครื่องแล้ว แต่ยัง sync ขึ้น Supabase ไม่ได้")
          : "บันทึกข้อมูลเพจแล้ว"
      );
    } catch (error) {
      setSettingsMessage(toUserSafeMessage(error, "บันทึกข้อมูลเพจไม่สำเร็จ"));
    } finally {
      setIsSavingSettings(false);
    }
  }

  const handlePublishPost = useCallback(
    async (postId) => {
      try {
        const post = remotePosts.find((item) => item.id === postId);
        if (!post) {
          setStatusNotice({ tone: "danger", message: "ไม่พบโพสต์ที่ต้องการ" });
          return;
        }

        const effectivePublish = resolveEffectivePublishConfig({
          post,
          settings,
          pages: settings.workspacePages,
        });
        const publishDiagnostics = getFacebookPublishDiagnostics(post);

        if (!effectivePublish.canAttemptPublish) {
          await recordOperationLog({
            level: "warn",
            source: "manual_publish",
            event: "publish_blocked",
            message: effectivePublish.blockedReason || effectivePublish.fallbackReason || "Manual publish was blocked.",
            page_id: effectivePublish.resolvedPageId,
            post_id: post.id,
            metadata: {
              topic: post.topic,
              publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              image_url_type: publishDiagnostics.originalImageUrlType,
              fallback_reason: effectivePublish.fallbackReason || "",
            },
          });
          setStatusNotice({
            tone: "warning",
            message: effectivePublish.blockedReason || effectivePublish.fallbackReason || "โพสต์นี้ยังไม่พร้อมสำหรับการโพสต์",
          });
          return;
        }

        if (effectivePublish.effectiveSettings.facebookPublishMode === "live" && publishDiagnostics.imageBlocked) {
          const message = "โพสต์จริงถูกบล็อก เพราะรูปนี้ยังไม่มี URL สาธารณะจาก Supabase สำหรับ Facebook";
          await recordOperationLog({
            level: "warn",
            source: "manual_publish",
            event: "publish_blocked",
            message,
            page_id: effectivePublish.resolvedPageId,
            post_id: post.id,
            metadata: {
              topic: post.topic,
              publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              image_url_type: publishDiagnostics.originalImageUrlType,
              image_storage_mode: post.image_storage_mode || null,
              image_storage_path: post.image_storage_path || null,
              attempted_image_url: publishDiagnostics.originalImageUrl || null,
              fallback_reason: effectivePublish.fallbackReason || "",
            },
          });
          setStatusNotice({
            tone: "warning",
            message: `${message} กรุณาอัปโหลดใหม่หรือบันทึกร่างหลังอัปโหลดขึ้นคลาวด์สำเร็จ`,
          });
          return;
        }

        if (effectivePublish.fallbackReason) {
          await recordOperationLog({
            level: "info",
            source: "manual_publish",
            event: "publish_fallback",
            message: effectivePublish.fallbackReason,
            page_id: effectivePublish.resolvedPageId,
            post_id: post.id,
            metadata: {
              topic: post.topic,
              publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              effective_page_id: effectivePublish.effectivePageId,
              image_url_type: publishDiagnostics.resolvedImageUrlType,
              fallback_reason: effectivePublish.fallbackReason,
            },
          });
        }

        if (effectivePublish.effectiveSettings.facebookPublishMode === "live") {
          const targetLabel =
            effectivePublish.effectivePublishSource === "page-specific"
              ? `${effectivePublish.label} (page-specific)`
              : effectivePublish.effectivePublishLabel;
          if (!window.confirm(`ต้องการโพสต์ "${post.topic}" ไปที่ Facebook ตอนนี้หรือไม่? (${targetLabel})`)) {
            return;
          }
        }

        const publishPost =
          publishDiagnostics.resolvedImageUrl && publishDiagnostics.resolvedImageUrl !== post.image_url
            ? { ...post, image_url: publishDiagnostics.resolvedImageUrl }
            : post;
        const result = await publishFacebookPost(publishPost, effectivePublish.effectiveSettings);
        if (result.error) {
          await recordOperationLog({
            level: "error",
            source: "manual_publish",
            event: "publish_failure",
            message: result.error || `Manual publish failed for "${post.topic}".`,
            page_id: effectivePublish.resolvedPageId,
            post_id: post.id,
            metadata: {
              publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              image_url_type: result.diagnostics?.originalImageUrlType || publishDiagnostics.originalImageUrlType,
              attempted_image_url: publishDiagnostics.originalImageUrl || null,
              fallback_reason: effectivePublish.fallbackReason || "",
              facebook_error_payload: result.facebookErrorPayload || null,
            },
          });
          setStatusNotice({ tone: "danger", message: `โพสต์ไม่สำเร็จ: ${toUserSafeMessage(result.error, "โพสต์ไม่สำเร็จ")}` });
          return;
        }

        const update = await updateRemotePostStatus(postId, "posted", { posted_at: new Date().toISOString() });
        if (update.data) {
          setRemotePosts((current) => current.map((item) => (item.id === postId ? update.data : item)));
          await recordOperationLog({
            level: "info",
            source: "manual_publish",
            event: "publish_success",
            message: `Manual publish succeeded for "${post.topic}".`,
            page_id: effectivePublish.resolvedPageId,
            post_id: post.id,
            metadata: {
              publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
              publish_source: effectivePublish.effectivePublishSource,
              live_page_publish_status: effectivePublish.livePerPagePublishStatus,
              effective_page_id: effectivePublish.effectivePageId,
              image_url_type: result.diagnostics?.resolvedImageUrlType || publishDiagnostics.resolvedImageUrlType,
              fallback_reason: effectivePublish.fallbackReason || "",
            },
          });
          setStatusNotice({ tone: "success", message: "โพสต์เรียบร้อยแล้ว" });
          return;
        }

        await recordOperationLog({
          level: "error",
          source: "manual_publish",
          event: "publish_partial_failure",
          message: `Manual publish succeeded but status update failed for "${post.topic}".`,
          page_id: effectivePublish.resolvedPageId,
          post_id: post.id,
          metadata: {
            publish_mode: effectivePublish.effectiveSettings.facebookPublishMode || "mock",
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
            image_url_type: publishDiagnostics.resolvedImageUrlType,
            fallback_reason: effectivePublish.fallbackReason || "",
          },
        });
        setStatusNotice({ tone: "warning", message: "โพสต์ไปแล้ว แต่ยังอัปเดตสถานะในระบบไม่สำเร็จ" });
      } catch (error) {
        await recordOperationLog({
          level: "error",
          source: "manual_publish",
          event: "publish_error",
          message: error?.message || "Unexpected manual publish error.",
          metadata: {},
        });
        setStatusNotice({ tone: "danger", message: `โพสต์ไม่สำเร็จ: ${toUserSafeMessage(error, "โพสต์ไม่สำเร็จ")}` });
      }
    },
    [recordOperationLog, remotePosts, settings]
  );

  const handleSchedulePost = useCallback(
    async (postId, scheduledAt) => {
      const post = remotePosts.find((item) => item.id === postId);
      if (!post) {
        setStatusNotice({ tone: "danger", message: "ไม่พบโพสต์ที่ต้องการตั้งเวลา" });
        return false;
      }

      if (!scheduledAt) {
        setStatusNotice({ tone: "warning", message: "กรุณาเลือกวันและเวลาที่ต้องการโพสต์" });
        return false;
      }

      const scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        setStatusNotice({ tone: "danger", message: "วันเวลาที่เลือกไม่ถูกต้อง" });
        return false;
      }

      setIsSchedulingPostId(postId);
      try {
        const update = await updateRemotePostStatus(postId, "scheduled", {
          scheduled_at: scheduledDate.toISOString(),
        });

        if (!update.data) {
          setStatusNotice({
            tone: "danger",
            message: `ตั้งเวลาโพสต์ไม่สำเร็จ: ${toUserSafeMessage(update.error, "ยังบันทึกเวลาลงระบบไม่ได้")}`,
          });
          return false;
        }

        setRemotePosts((current) => current.map((item) => (item.id === postId ? update.data : item)));
        await recordOperationLog({
          category: "scheduler",
          level: "info",
          source: "scheduler",
          event: "schedule_saved",
          message: `Saved schedule for "${post.topic || "Untitled post"}".`,
          page_id: post.page_id || "default",
          post_id: post.id,
          metadata: {
            topic: post.topic || "",
            publish_mode: settings.facebookPublishMode || "mock",
            scheduled_at: update.data.scheduled_at || scheduledDate.toISOString(),
            attempted_at: new Date().toISOString(),
            image_url_type: post.image_url
              ? post.image_url.startsWith("https://")
                ? "https"
                : post.image_url.split(":")[0] || "unknown"
              : "none",
            result: "scheduled",
          },
        });
        setStatusNotice({
          tone: "success",
          message: `ตั้งเวลาโพสต์แล้วสำหรับ ${formatDate(update.data.scheduled_at || scheduledDate.toISOString())}`,
        });
        return true;
      } catch (error) {
        setStatusNotice({
          tone: "danger",
          message: `ตั้งเวลาโพสต์ไม่สำเร็จ: ${toUserSafeMessage(error, "เกิดข้อผิดพลาดระหว่างบันทึกเวลา")}`,
        });
        return false;
      } finally {
        setIsSchedulingPostId(null);
      }
    },
    [recordOperationLog, remotePosts, settings.facebookPublishMode]
  );

  const handleUnschedulePost = useCallback(
    async (postId) => {
      const post = remotePosts.find((item) => item.id === postId);
      if (!post) {
        setStatusNotice({ tone: "danger", message: "ไม่พบโพสต์ที่ต้องการยกเลิกเวลา" });
        return false;
      }

      setIsUnschedulingPostId(postId);
      try {
        const update = await updateRemotePostStatus(postId, "draft", {
          scheduled_at: null,
        });

        if (!update.data) {
          setStatusNotice({
            tone: "danger",
            message: `ยกเลิกเวลาโพสต์ไม่สำเร็จ: ${toUserSafeMessage(update.error, "ยังอัปเดตสถานะกลับเป็น draft ไม่ได้")}`,
          });
          return false;
        }

        setRemotePosts((current) => current.map((item) => (item.id === postId ? update.data : item)));
        const logResult = await recordOperationLog({
          category: "scheduler",
          level: "info",
          source: "scheduler",
          event: "schedule_cancelled",
          message: `Cancelled scheduled publish for "${post.topic || "Untitled post"}".`,
          page_id: post.page_id || "default",
          post_id: post.id,
          metadata: {
            topic: post.topic || "",
            scheduled_at: post.scheduled_at || null,
            attempted_at: new Date().toISOString(),
            publish_mode: settings.facebookPublishMode || "mock",
            result: "cancelled",
          },
        });
        if (logResult.data) {
          const logsResult = await fetchOperationLogs();
          if (logsResult.data) setOperationLogs(logsResult.data);
          if (logsResult.mode) setLogsMode(logsResult.mode);
        }
        setStatusNotice({ tone: "success", message: "ยกเลิกเวลาโพสต์แล้ว รายการกลับเป็น draft เรียบร้อย" });
        return true;
      } catch (error) {
        setStatusNotice({
          tone: "danger",
          message: `ยกเลิกเวลาโพสต์ไม่สำเร็จ: ${toUserSafeMessage(error, "เกิดข้อผิดพลาดระหว่างยกเลิกเวลา")}`,
        });
        return false;
      } finally {
        setIsUnschedulingPostId(null);
      }
    },
    [recordOperationLog, remotePosts, settings.facebookPublishMode]
  );

  async function handleSchedulerTick() {
    if (schedulerLock.current) return;
    const { remotePosts: currentPosts, settings: currentSettings } = stateRef.current;
    if (!currentSettings.schedulerEnabled || !currentPosts?.length) return;

    schedulerLock.current = true;
      try {
        const summary = await runSchedulerTick(currentPosts, currentSettings, {
          onPostPublished: (updatedPost) => {
            setRemotePosts((current) => current.map((item) => (item.id === updatedPost.id ? updatedPost : item)));
          },
        });
        const logsResult = await fetchOperationLogs();
        if (logsResult.data) setOperationLogs(logsResult.data);
        if (logsResult.mode) setLogsMode(logsResult.mode);
        if (summary.due > 0 || summary.published > 0 || summary.failed > 0) {
          setSchedulerStatus({ lastRun: new Date().toISOString(), ...summary });
        }
    } catch (error) {
      console.error("Scheduler tick error:", error);
    } finally {
      schedulerLock.current = false;
    }
  }

  const handleDeleteLocalDraft = useCallback((id) => {
    removeLocalDraft(id);
    setLocalDrafts((current) => current.filter((draft) => draft.id !== id));
  }, []);

  const currentSettingsStatus = statusCopy[settingsSyncMode] ?? statusCopy.error;
  const SettingsStatusIcon = currentSettingsStatus.icon;
  const textProviderRuntime = getTextProviderRuntime(settings, lastTextGeneration);
  const workspacePages = getWorkspacePages(settings);
  const activeWorkspacePage = getActiveWorkspacePage(settings);

  return (
    <div className={`min-h-screen ${isDark ? "theme-dark" : "theme-light"}`}>
      <div className="flex h-screen overflow-hidden bg-slate-950 font-sans text-slate-200">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          workspaceName={settings.workspaceName}
          onOpenGuide={() => setIsGuideOpen(true)}
        />

        <div className="flex flex-1 flex-col lg:pl-64">
          <Header
            isDark={isDark}
            onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
            connectionMode={connectionMode}
            fbMode={validateFacebookConfig(settings) ? settings.facebookPublishMode : "missing"}
            textProviderRuntime={textProviderRuntime}
            onOpenGuide={() => setIsGuideOpen(true)}
            settings={settings}
            workspacePages={workspacePages}
            onPageChange={(value) => updateSettingsField("activePageId", value)}
          />

          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="mx-auto max-w-6xl">
              {connectionError && (
                <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {connectionError}
                </div>
              )}

              {isLoading ? (
                <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 text-sm text-slate-400">
                  กำลังโหลดข้อมูลระบบ...
                </div>
              ) : null}

              {!isLoading && activeTab === "create" && (
                <CreatePage
                  form={form}
                  settings={settings}
                  activeWorkspacePage={activeWorkspacePage}
                  updateForm={updateForm}
                  handleGenerateContent={handleGenerateContent}
                  handleGenerateImagePrompt={handleGenerateImagePrompt}
                  handleSaveDraft={handleSaveDraft}
                  isGenerating={isGenerating}
                  isGeneratingImagePrompt={isGeneratingImagePrompt}
                  isSavingDraft={isSavingDraft}
                  generationError={generationError}
                  textProviderRuntime={textProviderRuntime}
                  createNotice={createNotice}
                  editingDraft={editingDraft}
                />
              )}

              {!isLoading && activeTab === "pages" && (
                <PagesPage
                  settings={settings}
                  workspacePages={workspacePages}
                  activeWorkspacePage={activeWorkspacePage}
                  updateSettingsField={updateSettingsField}
                  updateWorkspacePage={updateWorkspacePage}
                  addWorkspacePage={addWorkspacePage}
                  removeWorkspacePage={removeWorkspacePage}
                  handleSaveWorkspacePages={handleSaveWorkspacePages}
                  settingsMessage={settingsMessage}
                  isSavingSettings={isSavingSettings}
                />
              )}

              {!isLoading && activeTab === "settings" && (
                <SettingsPage
                  currentSettingsStatus={currentSettingsStatus}
                  SettingsStatusIcon={SettingsStatusIcon}
                  settingsMessage={settingsMessage}
                  SettingsField={SettingsField}
                  settings={settings}
                  updateSettingsField={updateSettingsField}
                  envSnapshot={envSnapshot}
                  handleSaveSettings={handleSaveSettings}
                  isSavingSettings={isSavingSettings}
                />
              )}

              {!isLoading && activeTab === "scheduler" && (
                <SchedulerPage
                  settings={settings}
                  remotePosts={remotePosts}
                  schedulerStatus={schedulerStatus}
                  handleUnschedulePost={handleUnschedulePost}
                  isUnschedulingPostId={isUnschedulingPostId}
                />
              )}

              {!isLoading && activeTab === "library" && <LibraryPage />}

              {!isLoading && activeTab === "logs" && <LogsPage logs={operationLogs} logsMode={logsMode} />}

              {!isLoading && activeTab === "status" && (
                <StatusPage
                  allPendingPosts={allPendingPosts}
                  remotePosts={remotePosts}
                  localDrafts={localDrafts}
                  formatDate={formatDate}
                  handleDeleteLocalDraft={handleDeleteLocalDraft}
                  handleLoadDraftToEditor={handleLoadDraftToEditor}
                  handlePublishPost={handlePublishPost}
                  handleSchedulePost={handleSchedulePost}
                  handleUnschedulePost={handleUnschedulePost}
                  isSchedulingPostId={isSchedulingPostId}
                  isUnschedulingPostId={isUnschedulingPostId}
                  settings={settings}
                  workspacePages={workspacePages}
                  schedulerStatus={schedulerStatus}
                  statusNotice={statusNotice}
                />
              )}
            </div>
          </main>
        </div>

        <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      </div>
    </div>
  );
}

export default App;
