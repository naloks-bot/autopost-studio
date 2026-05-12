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
import { defaultSettings, getAppSettings, saveAppSettings } from "../services/app-settings.js";
import { getLocalDrafts, removeLocalDraft, saveLocalDraft } from "../services/local-drafts.js";
import {
  fetchRemotePosts,
  fetchRemoteSettings,
  getSupabaseEnvSnapshot,
  hasSupabaseConfig,
  insertRemoteDraft,
  saveRemoteSettings,
  updateRemotePostStatus,
} from "../services/supabase.js";
import { generateImagePrompt, generatePostContent, getTextProviderRuntime } from "../services/ai-generation.js";
import { publishFacebookPost, validateFacebookConfig } from "../services/facebook.js";
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
      const [postsResult, settingsResult] = await Promise.all([
        fetchRemotePosts(),
        fetchRemoteSettings(),
      ]);
      if (postsResult.data) {
        setRemotePosts(postsResult.data);
      }
      if (postsResult.mode) setConnectionMode(postsResult.mode);
      if (postsResult.error && postsResult.mode !== "offline") {
        setConnectionError(toUserSafeMessage(postsResult.error, "Failed to fetch posts from Supabase."));
      }
      if (settingsResult.mode) setSettingsSyncMode(settingsResult.mode);
      if (settingsResult.data) {
        setSettings({ ...localSettings, ...settingsResult.data });
      } else {
        setSettings(localSettings);
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
  }, []);

  const updateSettingsField = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const handleLoadDraftToEditor = useCallback((draft) => {
    setForm({
      topic: draft.topic || "",
      content: draft.content || "",
      imagePrompt: draft.image_prompt || "",
      imageUrl: draft.image_url || "",
    });
    setGenerationError("");
    setCreateNotice({ tone: "info", message: "Draft loaded into the editor." });
    setActiveTab("create");
  }, []);

  async function handleGenerateContent() {
    if (!form.topic.trim()) return window.alert("Please enter a topic first.");
    setIsGenerating(true);
    setGenerationError("");
    setCreateNotice({ tone: "info", message: "Generating content..." });
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
      const message = toUserSafeMessage(error, "Unable to generate content safely.");
      setGenerationError(message);
      setCreateNotice({ tone: "danger", message });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateImagePrompt() {
    if (!form.topic.trim()) return window.alert("Please enter a topic first.");
    setIsGeneratingImagePrompt(true);
    setGenerationError("");
    setCreateNotice({ tone: "info", message: "Generating image prompt..." });
    try {
      const result = await generateImagePrompt({ formData: form, settings });
      if (result.data) {
        updateForm("imagePrompt", result.data);
        setCreateNotice({
          tone: "success",
          message: `Image prompt prepared with ${result.mode === "mock" ? "Mock" : result.mode}.`,
        });
      } else if (result.error) {
        const message = toUserSafeMessage(result.error, "Unable to generate an image prompt.");
        setGenerationError(message);
        setCreateNotice({ tone: "danger", message });
      }
    } catch (error) {
      const message = toUserSafeMessage(error, "Unable to generate an image prompt safely.");
      setGenerationError(message);
      setCreateNotice({ tone: "danger", message });
    } finally {
      setIsGeneratingImagePrompt(false);
    }
  }

  function handleGenerateImagePreview() {
    if (!form.imagePrompt.trim()) return window.alert("Please generate an image prompt first.");
    setIsGeneratingImage(true);
    window.setTimeout(() => {
      updateForm("imageUrl", `https://picsum.photos/seed/${encodeURIComponent(form.topic || "autopost")}/1200/1200`);
      setIsGeneratingImage(false);
    }, 900);
  }

  async function handleSaveDraft(extraData = {}) {
    if (!form.topic.trim() || !form.content.trim()) {
      return window.alert("Topic and content are required before saving.");
    }

    setIsSavingDraft(true);
    setCreateNotice({ tone: "info", message: "Saving draft..." });

    try {
      const draft = {
        topic: form.topic.trim(),
        content: form.content.trim(),
        image_prompt: extraData.image_prompt || form.imagePrompt.trim(),
        image_url: extraData.image_url || form.imageUrl.trim(),
        image_provider: extraData.image_provider || null,
        status: "draft",
        created_at: new Date().toISOString(),
      };

      const remote = await insertRemoteDraft(draft);
      if (remote.data) {
        setRemotePosts((current) => [remote.data, ...current]);
        resetForm();
        setCreateNotice({ tone: "success", message: "Draft saved to Supabase." });
        window.alert("Draft saved to Supabase.");
        return;
      }

      if (["read-only", "offline", "missing-table"].includes(remote.mode)) {
        const localEntry = saveLocalDraft(draft);
        setLocalDrafts((current) => localEntry ? [localEntry, ...current] : current);
        resetForm();
        setCreateNotice({ tone: "warning", message: "Supabase is not writable right now. Draft was saved locally instead." });
        window.alert("Supabase is unavailable for write access. Draft saved locally instead.");
        return;
      }

      const message = toUserSafeMessage(remote.error, "Draft save failed.");
      setCreateNotice({ tone: "danger", message });
      window.alert(`Draft save failed: ${message}`);
    } catch (error) {
      const message = toUserSafeMessage(error, "Draft save failed.");
      setCreateNotice({ tone: "danger", message });
      window.alert(`Draft save failed: ${message}`);
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
        setSettings(remote.data);
        setSettingsSyncMode(remote.mode);
        setSettingsMessage("Settings saved to Supabase.");
      } else {
        setSettingsSyncMode(remote.mode);
        setSettingsMessage(toUserSafeMessage(remote.error, "Settings were saved locally, but Supabase sync is unavailable."));
      }
    } catch (error) {
      setSettingsSyncMode("error");
      setSettingsMessage(toUserSafeMessage(error, "Settings save failed."));
    } finally {
      setIsSavingSettings(false);
    }
  }

  const handlePublishPost = useCallback(async (postId) => {
    try {
      const post = remotePosts.find((p) => p.id === postId);
      if (!post) return window.alert("Post not found.");
      if (!validateFacebookConfig(settings)) return window.alert("Facebook Page ID and Access Token are required before publishing.");
      if (settings.facebookPublishMode === "live") {
        if (!window.confirm(`Publish "${post.topic}" to Facebook now? (LIVE mode)`)) return;
      }
      const result = await publishFacebookPost(post, settings);
      if (result.error) return window.alert(`Publish failed: ${toUserSafeMessage(result.error, "Publish failed.")}`);
      const update = await updateRemotePostStatus(postId, "posted", { posted_at: new Date().toISOString() });
      if (update.data) {
        setRemotePosts((current) => current.map((p) => (p.id === postId ? update.data : p)));
        window.alert("Facebook publish completed.");
      } else {
        window.alert("Facebook publish completed, but the local status could not be updated.");
      }
    } catch (error) {
      window.alert(`Publish failed: ${toUserSafeMessage(error, "Publish failed.")}`);
    }
  }, [remotePosts, settings]);

  async function handleSchedulerTick() {
    if (schedulerLock.current) return;
    const { remotePosts: currentPosts, settings: currentSettings } = stateRef.current;
    if (!currentSettings.schedulerEnabled || !validateFacebookConfig(currentSettings) || !currentPosts?.length) return;
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
          onPageChange={(val) => updateSettingsField("activePageId", val)}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            {activeTab === "create" && (
              <CreatePage
                form={form}
                settings={settings}
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
              />
            )}
            {activeTab === "settings" && (
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
            {activeTab === "scheduler" && (
              <SchedulerPage settings={settings} />
            )}
            {activeTab === "library" && (
              <LibraryPage />
            )}
            {activeTab === "logs" && (
              <LogsPage />
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
