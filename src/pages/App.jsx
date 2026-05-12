import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CreatePage from "./CreatePage.jsx";
import StatusPage from "./StatusPage.jsx";
import SchedulerPage from "./SchedulerPage.jsx";
import LibraryPage from "./LibraryPage.jsx";
import LogsPage from "./LogsPage.jsx";
import SettingsPage from "./SettingsPage.jsx";
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
  fetchRemotePosts,
  fetchRemotePages,
  fetchRemoteSettings,
  getSupabaseEnvSnapshot,
  hasSupabaseConfig,
  insertRemoteDraft,
  saveRemoteSettings,
  updateRemoteDraft,
  updateRemotePostStatus,
} from "../services/supabase.js";
import { generateImagePrompt, generatePostContent, getTextProviderRuntime } from "../services/ai-generation.js";
import { publishFacebookPost, validateFacebookConfig } from "../services/facebook.js";
import { createOperationLog, fetchOperationLogs } from "../services/operation-logs.js";
import { resolveEffectivePublishConfig } from "../services/page-context.js";
import { runSchedulerTick } from "../services/scheduler.js";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toUserSafeMessage(error, fallback = "Something went wrong. Please try again.") {
  const raw = typeof error === "string" ? error : error?.message;
  const next = String(raw || fallback).replace(/\s+/g, " ").trim();
  if (!next) return fallback;
  return next.length <= 160 ? next : `${next.slice(0, 157)}...`;
}

function SettingsField({ label, value, onChange, placeholder, multiline = false, secret = false, type = "text", options = [] }) {
  const sharedClassName =
    "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 appearance-none";

  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {type === "select" ? (
        <div className="relative">
          <select
            value={value}
            onChange={onChange}
            className={sharedClassName}
          >
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
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${sharedClassName} h-28`}
        />
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
  const [isDark, setIsDark] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [settings, setSettings] = useState(defaultSettings);
  const [remotePosts, setRemotePosts] = useState([]);
  const [localDrafts, setLocalDrafts] = useState([]);
  const [connectionMode, setConnectionMode] = useState(
    hasSupabaseConfig ? "connected" : "offline"
  );
  const [connectionError, setConnectionError] = useState("");
  const [settingsSyncMode, setSettingsSyncMode] = useState(
    hasSupabaseConfig ? "connected" : "offline"
  );
  const [settingsMessage, setSettingsMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [lastTextGeneration, setLastTextGeneration] = useState(null);
  const [createNotice, setCreateNotice] = useState(null);
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
    void loadAllData(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void handleSchedulerTick();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const envSnapshot = getSupabaseEnvSnapshot();

  const allPendingPosts = useMemo(() => {
    const remotePending = remotePosts.filter((post) => post.status !== "posted");
    return [...localDrafts, ...remotePending].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [localDrafts, remotePosts]);

  async function loadAllData(showSpinner = false) {
    if (dataLock.current) return;
    dataLock.current = true;
    if (showSpinner) setIsLoading(true);
    setConnectionError("");
    setSettingsMessage("");
    try {
      const localSettings = getAppSettings();
      setLocalDrafts(getLocalDrafts());
      const [postsResult, settingsResult, pagesResult] = await Promise.all([
        fetchRemotePosts(),
        fetchRemoteSettings(),
        fetchRemotePages(),
      ]);
      const logsResult = await fetchOperationLogs();
      if (postsResult.data) {
        setRemotePosts(postsResult.data);
      }
      setOperationLogs(logsResult.data || []);
      if (logsResult.mode) setLogsMode(logsResult.mode);
      if (postsResult.mode) setConnectionMode(postsResult.mode);
      if (postsResult.error && postsResult.mode !== "offline") {
        setConnectionError(toUserSafeMessage(postsResult.error, "Failed to fetch posts from Supabase."));
      }
      if (settingsResult.mode) setSettingsSyncMode(settingsResult.mode);
      const workspacePages = pagesResult.data?.length
        ? pagesResult.data
        : localSettings.workspacePages;
      if (settingsResult.data) {
        setSettings(sanitizeSettings({ ...localSettings, ...settingsResult.data, workspacePages }));
      } else {
        setSettings(sanitizeSettings({ ...localSettings, workspacePages }));
      }
    } catch (err) {
      console.error("Critical error loading data:", err);
      setConnectionError("Failed to fetch data from server");
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
      const activePageId = workspacePages.some((page) => page.id === nextPageId)
        ? nextPageId
        : current.activePageId;
      return sanitizeSettings({ ...current, activePageId });
    });
    setGenerationError("");
    setEditingDraft({
      id: draft.id,
      source: draft.source === "local" ? "local" : "remote",
      created_at: draft.created_at || null,
    });
    setCreateNotice({ tone: "info", message: "โหลดร่างงานกลับมาแก้ไขแล้ว" });
    setActiveTab("create");
  }, []);

  async function handleGenerateContent() {
    if (!form.topic.trim()) return window.alert("กรุณาใส่หัวข้อก่อน");
    setIsGenerating(true);
    setGenerationError("");
    setCreateNotice({ tone: "info", message: "กำลังสร้างข้อความ..." });
    try {
      const result = await generatePostContent({ formData: form, settings });
      if (result.data) updateForm("content", result.data);
      setLastTextGeneration(result);
      setGenerationError(result.status === "blocked" ? result.error || "" : "");
      setCreateNotice(
        result.noticeMessage
          ? { tone: result.noticeTone || "info", message: result.noticeMessage }
          : null
      );
    } catch (error) {
      const message = toUserSafeMessage(error, "ยังสร้างข้อความไม่ได้");
      setGenerationError(message);
      setCreateNotice({ tone: "danger", message });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateImagePrompt() {
    if (!form.topic.trim()) return window.alert("กรุณาใส่หัวข้อก่อน");
    setIsGeneratingImagePrompt(true);
    setGenerationError("");
    setCreateNotice({ tone: "info", message: "กำลังช่วยคิดคำอธิบายภาพ..." });
    try {
      const result = await generateImagePrompt({ formData: form, settings });
      if (result.data) {
        updateForm("imagePrompt", result.data);
        setCreateNotice({
          tone: "success",
          message: `เตรียมคำอธิบายภาพด้วย ${result.mode === "mock" ? "Mock" : result.mode} แล้ว`,
        });
      } else if (result.error) {
        const message = toUserSafeMessage(result.error, "ยังสร้างคำอธิบายภาพไม่ได้");
        setGenerationError(message);
        setCreateNotice({ tone: "danger", message });
      }
    } catch (error) {
      const message = toUserSafeMessage(error, "ยังสร้างคำอธิบายภาพไม่ได้");
      setGenerationError(message);
      setCreateNotice({ tone: "danger", message });
    } finally {
      setIsGeneratingImagePrompt(false);
    }
  }

  function handleGenerateImagePreview() {
    if (!form.imagePrompt.trim()) return window.alert("กรุณาสร้างคำอธิบายภาพก่อน");
    setIsGeneratingImage(true);
    window.setTimeout(() => {
      updateForm("imageUrl", `https://picsum.photos/seed/${encodeURIComponent(form.topic || "autopost")}/1200/1200`);
      setIsGeneratingImage(false);
    }, 900);
  }

  async function handleSaveDraft(extraData = {}) {
    if (!form.topic.trim() || !form.content.trim()) {
      return window.alert("กรุณาใส่หัวข้อและข้อความก่อนบันทึก");
    }

    setIsSavingDraft(true);
    setCreateNotice({ tone: "info", message: "กำลังบันทึกร่าง..." });

    try {
      const draft = {
        page_id: settings.activePageId || "default",
        topic: form.topic.trim(),
        content: form.content.trim(),
        image_prompt: extraData.image_prompt || form.imagePrompt.trim(),
        image_url: extraData.image_url || form.imageUrl.trim(),
        image_provider: extraData.image_provider || null,
        image_revised_prompt: extraData.image_revised_prompt || null,
        image_storage_path: extraData.image_storage_path || null,
        image_storage_mode: extraData.image_storage_mode || null,
        status: "draft",
        created_at: editingDraft?.created_at || new Date().toISOString(),
      };

      const remote = editingDraft?.source === "remote"
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
          message: editingDraft?.source ? "อัปเดตร่างงานบน Supabase แล้ว" : "บันทึกร่างลง Supabase แล้ว",
        });
        window.alert(editingDraft?.source ? "อัปเดตร่างงานบน Supabase แล้ว" : "บันทึกร่างลง Supabase แล้ว");
        return;
      }

      if (["read-only", "offline", "missing-table"].includes(remote.mode)) {
        const localEntry = editingDraft?.source === "local"
          ? updateLocalDraft(editingDraft.id, draft)
          : saveLocalDraft(draft);
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
          message: editingDraft?.source === "local"
            ? "บันทึกขึ้นคลาวด์ไม่ได้ตอนนี้ แต่ร่างในเครื่องอัปเดตแล้ว"
            : "Supabase ยังเขียนข้อมูลไม่ได้ จึงบันทึกไว้ในเครื่องแทน",
        });
        window.alert(
          editingDraft?.source === "local"
            ? "บันทึกขึ้นคลาวด์ไม่ได้ตอนนี้ แต่ร่างในเครื่องอัปเดตแล้ว"
            : "Supabase ยังเขียนข้อมูลไม่ได้ จึงบันทึกไว้ในเครื่องแทน"
        );
        return;
      }

      const message = toUserSafeMessage(remote.error, "บันทึกร่างไม่สำเร็จ");
      setCreateNotice({ tone: "danger", message });
      window.alert(`บันทึกร่างไม่สำเร็จ: ${message}`);
    } catch (error) {
      const message = toUserSafeMessage(error, "บันทึกร่างไม่สำเร็จ");
      setCreateNotice({ tone: "danger", message });
      window.alert(`บันทึกร่างไม่สำเร็จ: ${message}`);
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    try {
      const stored = saveAppSettings(settings);
      const remote = await saveRemoteSettings(stored);
      if (remote.data) {
        setSettings(sanitizeSettings({ ...stored, ...remote.data }));
        setSettingsSyncMode(remote.mode);
        setSettingsMessage("บันทึกการตั้งค่าลง Supabase แล้ว");
      } else {
        setSettingsSyncMode(remote.mode);
        setSettingsMessage(toUserSafeMessage(remote.error, "บันทึกไว้ในเครื่องแล้ว แต่ยังซิงก์ขึ้น Supabase ไม่ได้"));
      }
    } catch (error) {
      setSettingsSyncMode("error");
      setSettingsMessage(toUserSafeMessage(error, "บันทึกการตั้งค่าไม่สำเร็จ"));
    } finally {
      setIsSavingSettings(false);
    }
  }

  const handlePublishPost = useCallback(async (postId) => {
    try {
      const post = remotePosts.find((p) => p.id === postId);
      if (!post) return window.alert("ไม่พบโพสต์นี้");
      const effectivePublish = resolveEffectivePublishConfig({
        post,
        settings,
        pages: settings.workspacePages,
      });
      if (!effectivePublish.canAttemptPublish) {
        await createOperationLog({
          level: "warn",
          source: "manual_publish",
          event: "publish_blocked",
          message: effectivePublish.blockedReason || effectivePublish.fallbackReason || "Manual publish was blocked.",
          page_id: effectivePublish.resolvedPageId,
          post_id: post.id,
          metadata: {
            topic: post.topic,
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
          },
        });
        return window.alert(effectivePublish.blockedReason || effectivePublish.fallbackReason || "โพสต์นี้ยังไม่พร้อมสำหรับการโพสต์");
      }
      if (effectivePublish.fallbackReason) {
        await createOperationLog({
          level: "info",
          source: "manual_publish",
          event: "publish_fallback",
          message: effectivePublish.fallbackReason,
          page_id: effectivePublish.resolvedPageId,
          post_id: post.id,
          metadata: {
            topic: post.topic,
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
            effective_page_id: effectivePublish.effectivePageId,
          },
        });
      }
      if (effectivePublish.effectiveSettings.facebookPublishMode === "live") {
        const targetLabel =
          effectivePublish.effectivePublishSource === "page-specific"
            ? `${effectivePublish.label} (page-specific)`
            : effectivePublish.effectivePublishLabel;
        if (!window.confirm(`ต้องการโพสต์ "${post.topic}" ไปที่ Facebook ตอนนี้หรือไม่? (${targetLabel})`)) return;
      }
      const result = await publishFacebookPost(post, effectivePublish.effectiveSettings);
      if (result.error) {
        await createOperationLog({
          level: "error",
          source: "manual_publish",
          event: "publish_failure",
          message: result.error || `Manual publish failed for "${post.topic}".`,
          page_id: effectivePublish.resolvedPageId,
          post_id: post.id,
          metadata: {
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
          },
        });
        return window.alert(`โพสต์ไม่สำเร็จ: ${toUserSafeMessage(result.error, "โพสต์ไม่สำเร็จ")}`);
      }
      const update = await updateRemotePostStatus(postId, "posted", { posted_at: new Date().toISOString() });
      if (update.data) {
        setRemotePosts((current) => current.map((p) => (p.id === postId ? update.data : p)));
        await createOperationLog({
          level: "info",
          source: "manual_publish",
          event: "publish_success",
          message: `Manual publish succeeded for "${post.topic}".`,
          page_id: effectivePublish.resolvedPageId,
          post_id: post.id,
          metadata: {
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
            effective_page_id: effectivePublish.effectivePageId,
          },
        });
        const logsResult = await fetchOperationLogs();
        setOperationLogs(logsResult.data || []);
        if (logsResult.mode) setLogsMode(logsResult.mode);
        window.alert("โพสต์ไปที่ Facebook แล้ว");
      } else {
        await createOperationLog({
          level: "error",
          source: "manual_publish",
          event: "publish_partial_failure",
          message: `Manual publish succeeded but status update failed for "${post.topic}".`,
          page_id: effectivePublish.resolvedPageId,
          post_id: post.id,
          metadata: {
            publish_source: effectivePublish.effectivePublishSource,
            live_page_publish_status: effectivePublish.livePerPagePublishStatus,
          },
        });
        window.alert("โพสต์ไปที่ Facebook แล้ว แต่ยังอัปเดตสถานะในระบบไม่ได้");
      }
    } catch (error) {
      await createOperationLog({
        level: "error",
        source: "manual_publish",
        event: "publish_error",
        message: error?.message || "Unexpected manual publish error.",
        metadata: {},
      });
      window.alert(`โพสต์ไม่สำเร็จ: ${toUserSafeMessage(error, "โพสต์ไม่สำเร็จ")}`);
    }
  }, [remotePosts, settings]);

  async function handleSchedulerTick() {
    if (schedulerLock.current) return;
    const { remotePosts: currentPosts, settings: currentSettings } = stateRef.current;
    if (!currentSettings.schedulerEnabled || !currentPosts?.length) return;
    schedulerLock.current = true;
    try {
      const summary = await runSchedulerTick(currentPosts, currentSettings, {
        onPostPublished: (updatedPost) => {
          setRemotePosts((current) => current.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
        },
      });
      if (summary.due > 0 || summary.published > 0 || summary.failed > 0) {
        setSchedulerStatus({ lastRun: new Date().toISOString(), ...summary });
      }
    } catch (err) {
      console.error("Scheduler tick error:", err);
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
          onToggleTheme={() => setIsDark(!isDark)}
          connectionMode={connectionMode}
          fbMode={validateFacebookConfig(settings) ? settings.facebookPublishMode : "missing"}
          textProviderRuntime={textProviderRuntime}
          onOpenGuide={() => setIsGuideOpen(true)}
          settings={settings}
          workspacePages={workspacePages}
          onPageChange={(val) => updateSettingsField("activePageId", val)}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            {activeTab === "create" && (
              <CreatePage
                form={form}
                settings={settings}
                workspacePages={workspacePages}
                activeWorkspacePage={activeWorkspacePage}
                updateForm={updateForm}
                handleGenerateContent={handleGenerateContent}
                handleGenerateImagePrompt={handleGenerateImagePrompt}
                handleGenerateImagePreview={handleGenerateImagePreview}
                handleSaveDraft={handleSaveDraft}
                isGenerating={isGenerating}
                isGeneratingImagePrompt={isGeneratingImagePrompt}
                isGeneratingImage={isGeneratingImage}
                isSavingDraft={isSavingDraft}
                generationError={generationError}
                textProviderRuntime={textProviderRuntime}
                createNotice={createNotice}
                editingDraft={editingDraft}
              />
            )}
            {activeTab === "settings" && (
              <SettingsPage
                currentSettingsStatus={currentSettingsStatus}
                SettingsStatusIcon={SettingsStatusIcon}
                settingsMessage={settingsMessage}
                SettingsField={SettingsField}
                settings={settings}
                workspacePages={workspacePages}
                activeWorkspacePage={activeWorkspacePage}
                updateSettingsField={updateSettingsField}
                envSnapshot={envSnapshot}
                handleSaveSettings={handleSaveSettings}
                isSavingSettings={isSavingSettings}
              />
            )}
            {activeTab === "scheduler" && (
              <SchedulerPage
                settings={settings}
                remotePosts={remotePosts}
                schedulerStatus={schedulerStatus}
              />
            )}
            {activeTab === "library" && (
              <LibraryPage />
            )}
            {activeTab === "logs" && (
              <LogsPage logs={operationLogs} logsMode={logsMode} />
            )}
            {activeTab === "status" && (
              <StatusPage
                allPendingPosts={allPendingPosts}
                remotePosts={remotePosts}
                localDrafts={localDrafts}
                formatDate={formatDate}
                handleDeleteLocalDraft={handleDeleteLocalDraft}
                handleLoadDraftToEditor={handleLoadDraftToEditor}
                handlePublishPost={handlePublishPost}
                settings={settings}
                workspacePages={workspacePages}
                schedulerStatus={schedulerStatus}
              />
            )}
          </div>
        </main>
      </div>

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}

export default App;
