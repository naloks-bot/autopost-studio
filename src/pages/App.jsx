import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CreatePage from "./CreatePage.jsx";
import StatusPage from "./StatusPage.jsx";
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
import { generateImagePrompt, generatePostContent } from "../services/ai-generation.js";
import { publishFacebookPost, validateFacebookConfig } from "../services/facebook.js";
import { runSchedulerTick } from "../services/scheduler.js";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function maskSecret(value) {
  if (!value) return "ยังไม่ได้กรอก";
  if (value.length <= 10) return "ตั้งค่าแล้ว";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function SettingsField({ label, value, onChange, placeholder, multiline = false, secret = false }) {
  const sharedClassName =
    "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm outline-none transition focus:border-cyan-400";

  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {multiline ? (
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
      if (postsResult.error && postsResult.mode !== "offline") setConnectionError(postsResult.error.message);
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
  }, []);

  const updateSettingsField = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  async function handleGenerateContent() {
    if (!form.topic.trim()) return window.alert("กรุณาใส่หัวข้อก่อน");
    setIsGenerating(true);
    setGenerationError("");
    const result = await generatePostContent({ formData: form, settings });
    if (result.data) updateForm("content", result.data);
    else if (result.error) setGenerationError(result.error);
    setIsGenerating(false);
  }

  async function handleGenerateImagePrompt() {
    if (!form.topic.trim()) return window.alert("กรุณาใส่หัวข้อก่อน");
    setIsGeneratingImagePrompt(true);
    setGenerationError("");
    const result = await generateImagePrompt({ formData: form, settings });
    if (result.data) updateForm("imagePrompt", result.data);
    else if (result.error) setGenerationError(result.error);
    setIsGeneratingImagePrompt(false);
  }

  function handleGenerateImagePreview() {
    if (!form.imagePrompt.trim()) return window.alert("กรุณาสร้าง prompt รูปก่อน");
    setIsGeneratingImage(true);
    window.setTimeout(() => {
      updateForm("imageUrl", `https://picsum.photos/seed/${encodeURIComponent(form.topic || "autopost")}/1200/1200`);
      setIsGeneratingImage(false);
    }, 900);
  }

  async function handleSaveDraft(extraData = {}) {
    if (!form.topic.trim() || !form.content.trim()) return window.alert("ต้องมีทั้งหัวข้อและเนื้อหาก่อนบันทึก");
    setIsSavingDraft(true);
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
      setIsSavingDraft(false);
      window.alert("บันทึก draft ลง Supabase สำเร็จ");
      return;
    }
    if (["read-only", "offline", "missing-table"].includes(remote.mode)) {
      const localEntry = saveLocalDraft(draft);
      setLocalDrafts((current) => localEntry ? [localEntry, ...current] : current);
      resetForm();
      setIsSavingDraft(false);
      window.alert("บันทึกลง Supabase ไม่ได้ จึงเก็บ draft ไว้ในเครื่องก่อน");
      return;
    }
    setIsSavingDraft(false);
    window.alert(`บันทึกไม่สำเร็จ: ${remote.error?.message ?? "Unknown error"}`);
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    const stored = saveAppSettings(settings);
    const remote = await saveRemoteSettings(stored);
    if (remote.data) {
      setSettings(remote.data);
      setSettingsSyncMode(remote.mode);
      setSettingsMessage("บันทึกการตั้งค่าลง Supabase สำเร็จ");
    } else {
      setSettingsSyncMode(remote.mode);
      setSettingsMessage(remote.error?.message ?? "บันทึกลง local สำเร็จ แต่ sync ไป Supabase ไม่ได้");
    }
    setIsSavingSettings(false);
  }

  const handlePublishPost = useCallback(async (postId) => {
    const post = remotePosts.find((p) => p.id === postId);
    if (!post) return window.alert("ไม่พบโพสต์ที่ต้องการเผยแพร่");
    if (!validateFacebookConfig(settings)) return window.alert("กรุณาตั้งค่า Facebook Page ID และ Access Token ก่อน");
    if (settings.facebookPublishMode === "live") {
      if (!window.confirm(`ยืนยันการโพสต์ "${post.topic}" ลง Facebook จริง? (โหมด LIVE)`)) return;
    }
    const result = await publishFacebookPost(post, settings);
    if (result.error) return window.alert(`เผยแพร่ไม่สำเร็จ: ${result.error}`);
    const update = await updateRemotePostStatus(postId, "posted", { posted_at: new Date().toISOString() });
    if (update.data) {
      setRemotePosts((current) => current.map((p) => (p.id === postId ? update.data : p)));
      window.alert("เผยแพร่ลง Facebook สำเร็จ!");
    } else {
      window.alert("เผยแพร่สำเร็จแล้ว แต่ไม่สามารถอัปเดตสถานะในระบบได้");
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
          aiProvider={settings.aiProvider}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            {activeTab === "create" && (
              <CreatePage
                form={form} settings={settings} updateForm={updateForm}
                handleGenerateContent={handleGenerateContent} handleGenerateImagePrompt={handleGenerateImagePrompt}
                handleGenerateImagePreview={handleGenerateImagePreview} handleSaveDraft={handleSaveDraft}
                isGenerating={isGenerating} isGeneratingImagePrompt={isGeneratingImagePrompt}
                isGeneratingImage={isGeneratingImage} isSavingDraft={isSavingDraft} generationError={generationError}
              />
            )}
            {activeTab === "settings" && (
              <SettingsPage
                currentSettingsStatus={currentSettingsStatus} SettingsStatusIcon={SettingsStatusIcon}
                settingsMessage={settingsMessage} SettingsField={SettingsField} settings={settings}
                updateSettingsField={updateSettingsField} envSnapshot={envSnapshot}
                handleSaveSettings={handleSaveSettings} isSavingSettings={isSavingSettings}
              />
            )}
            {activeTab === "status" && (
              <StatusPage
                allPendingPosts={allPendingPosts} remotePosts={remotePosts} localDrafts={localDrafts}
                formatDate={formatDate} handleDeleteLocalDraft={handleDeleteLocalDraft}
                handlePublishPost={handlePublishPost} settings={settings} schedulerStatus={schedulerStatus}
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
