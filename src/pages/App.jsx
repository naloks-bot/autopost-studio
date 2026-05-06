import React, { useEffect, useMemo, useRef, useState } from "react";
import { Moon, RefreshCw, Sparkles, Sun } from "lucide-react";
import CreatePage from "./CreatePage.jsx";
import GuidePage from "./GuidePage.jsx";
import SettingsPage from "./SettingsPage.jsx";
import StatusPage from "./StatusPage.jsx";
import { appTabs, guideSections, initialForm, statusCopy } from "../constants/appConstants.js";
import { defaultSettings, getAppSettings, saveAppSettings } from "../services/app-settings.js";
import { getLocalDrafts, removeLocalDraft, saveLocalDraft } from "../services/local-drafts.js";
import {
  fetchRemotePosts,
  fetchRemoteSettings,
  getSupabaseEnvSnapshot,
  hasSupabaseConfig,
  insertRemoteDraft,
  saveRemoteSettings,
} from "../services/supabase.js";
import Header from "../components/Header.jsx";
import StatusCard from "../components/StatusCard.jsx";
import SectionCard from "../components/SectionCard.jsx";
import TabButton from "../components/TabButton.jsx";
import { generateImagePrompt, generatePostContent } from "../services/ai-generation.js";
import { publishFacebookPost, validateFacebookConfig } from "../services/facebook.js";
import { updateRemotePostStatus } from "../services/supabase.js";
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
    "w-full rounded-[1.25rem] border border-white/10 bg-slate-900/80 px-4 py-3 outline-none transition focus:border-cyan-400";

  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
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

  // 1. Load data once on mount
  useEffect(() => {
    void loadAllData();
  }, []);

  // 2. Setup scheduler interval (60 seconds)
  // Separated from loadAllData to prevent infinite loop
  useEffect(() => {
    const interval = setInterval(() => {
      void handleSchedulerTick();
    }, 60000);

    return () => clearInterval(interval);
  }, [remotePosts, settings]);

  const envSnapshot = getSupabaseEnvSnapshot();

  const allPendingPosts = useMemo(() => {
    const remotePending = remotePosts.filter((post) => post.status !== "posted");
    return [...localDrafts, ...remotePending].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [localDrafts, remotePosts]);

  const completedPosts = useMemo(
    () => remotePosts.filter((post) => post.status === "posted"),
    [remotePosts]
  );

  async function loadAllData() {
    setIsLoading(true);
    setConnectionError("");
    setSettingsMessage("");

    const localSettings = getAppSettings();
    setSettings(localSettings);
    setLocalDrafts(getLocalDrafts());

    const [postsResult, settingsResult] = await Promise.all([
      fetchRemotePosts(),
      fetchRemoteSettings(),
    ]);

    setRemotePosts(postsResult.data);
    setConnectionMode(postsResult.mode);

    if (postsResult.error && postsResult.mode !== "offline") {
      setConnectionError(postsResult.error.message);
    }

    setSettingsSyncMode(settingsResult.mode);

    if (settingsResult.data) {
      setSettings((current) => ({ ...current, ...settingsResult.data }));
    } else if (settingsResult.error && settingsResult.mode !== "offline") {
      setSettingsMessage(settingsResult.error.message);
    }

    setIsLoading(false);
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setGenerationError("");
  }

  function updateSettingsField(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleGenerateContent() {
    if (!form.topic.trim()) {
      window.alert("กรุณาใส่หัวข้อก่อน");
      return;
    }

    setIsGenerating(true);
    setGenerationError("");

    const result = await generatePostContent({ formData: form, settings });

    if (result.data) {
      updateForm("content", result.data);
    } else if (result.error) {
      console.error("Content generation error:", result.error);
      setGenerationError(result.error);
    }

    setIsGenerating(false);
  }

  async function handleGenerateImagePrompt() {
    if (!form.topic.trim()) {
      window.alert("กรุณาใส่หัวข้อก่อน");
      return;
    }

    setIsGeneratingImagePrompt(true);
    setGenerationError("");

    const result = await generateImagePrompt({ formData: form, settings });

    if (result.data) {
      updateForm("imagePrompt", result.data);
    } else if (result.error) {
      console.error("Image prompt generation error:", result.error);
      setGenerationError(result.error);
    }

    setIsGeneratingImagePrompt(false);
  }

  function handleGenerateImagePreview() {
    if (!form.imagePrompt.trim()) {
      window.alert("กรุณาสร้าง prompt รูปก่อน");
      return;
    }

    setIsGeneratingImage(true);

    window.setTimeout(() => {
      updateForm(
        "imageUrl",
        `https://picsum.photos/seed/${encodeURIComponent(form.topic || "autopost")}/1200/1200`
      );
      setIsGeneratingImage(false);
    }, 900);
  }

  async function handleSaveDraft(extraData = {}) {
    if (!form.topic.trim() || !form.content.trim()) {
      window.alert("ต้องมีทั้งหัวข้อและเนื้อหาก่อนบันทึก");
      return;
    }

    setIsSavingDraft(true);

    const draft = {
      topic: form.topic.trim(),
      content: form.content.trim(),
      image_prompt: extraData.image_prompt || form.imagePrompt.trim(),
      image_url: extraData.image_url || form.imageUrl.trim(),
      image_provider: extraData.image_provider || null,
      image_revised_prompt: extraData.image_revised_prompt || null,
      image_storage_path: extraData.image_storage_path || null,
      image_storage_mode: extraData.image_storage_mode || null,
      status: "draft",
      created_at: new Date().toISOString(),
    };

    const remote = await insertRemoteDraft(draft);

    if (remote.data) {
      setRemotePosts((current) => [remote.data, ...current]);
      setConnectionMode(remote.mode);
      setConnectionError("");
      resetForm();
      setIsSavingDraft(false);
      window.alert("บันทึก draft ลง Supabase สำเร็จ");
      return;
    }

    if (
      remote.mode === "read-only" ||
      remote.mode === "offline" ||
      remote.mode === "missing-table"
    ) {
      const localEntry = saveLocalDraft(draft);
      setLocalDrafts((current) => (localEntry ? [localEntry, ...current] : current));
      setConnectionMode(remote.mode);
      setConnectionError(remote.error?.message ?? "");
      resetForm();
      setIsSavingDraft(false);
      window.alert("บันทึกลง Supabase ไม่ได้ จึงเก็บ draft ไว้ในเครื่องก่อน");
      return;
    }

    setConnectionMode(remote.mode);
    setConnectionError(remote.error?.message ?? "Unknown error");
    setIsSavingDraft(false);
    window.alert(`บันทึกไม่สำเร็จ: ${remote.error?.message ?? "Unknown error"}`);
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    const stored = saveAppSettings(settings);
    setSettings(stored);

    const remote = await saveRemoteSettings(stored);

    if (remote.data) {
      setSettings(remote.data);
      setSettingsSyncMode(remote.mode);
      setSettingsMessage("บันทึกการตั้งค่าลง Supabase สำเร็จ");
      setIsSavingSettings(false);
      return;
    }

    setSettingsSyncMode(remote.mode);
    setSettingsMessage(
      remote.mode === "read-only"
        ? "บันทึกลงเว็บแอปแล้ว แต่ Supabase ยังเขียนไม่ได้เพราะ RLS"
        : remote.mode === "missing-table"
          ? "บันทึกลงเว็บแอปแล้ว แต่ยังไม่มีตาราง app_settings ใน Supabase"
          : remote.error?.message ?? "บันทึกลง local สำเร็จ แต่ sync ไป Supabase ไม่ได้"
    );
    setIsSavingSettings(false);
  }

  async function handlePublishPost(postId) {
    const post = remotePosts.find((p) => p.id === postId);
    if (!post) {
      window.alert("ไม่พบโพสต์ที่ต้องการเผยแพร่");
      return;
    }

    if (!validateFacebookConfig(settings)) {
      window.alert("กรุณาตั้งค่า Facebook Page ID และ Access Token ก่อน");
      return;
    }

    const confirm = window.confirm(`ยืนยันการโพสต์ "${post.topic}" ลง Facebook?`);
    if (!confirm) return;

    const result = await publishFacebookPost(post, settings);

    if (result.error) {
      window.alert(`เผยแพร่ไม่สำเร็จ: ${result.error}`);
      return;
    }

    // Update status in Supabase
    const update = await updateRemotePostStatus(postId, "posted", {
      posted_at: new Date().toISOString(),
    });

    if (update.data) {
      setRemotePosts((current) =>
        current.map((p) => (p.id === postId ? update.data : p))
      );
      window.alert("เผยแพร่ลง Facebook สำเร็จ!");
    } else {
      window.alert("เผยแพร่สำเร็จแล้ว แต่ไม่สามารถอัปเดตสถานะในระบบได้");
    }
  }

  async function handleSchedulerTick() {
    if (schedulerLock.current) return;
    if (!validateFacebookConfig(settings)) return;
    if (remotePosts.length === 0) return;

    schedulerLock.current = true;
    try {
      const summary = await runSchedulerTick(remotePosts, settings, {
        onPostPublished: (updatedPost) => {
          setRemotePosts((current) =>
            current.map((p) => (p.id === updatedPost.id ? updatedPost : p))
          );
        },
      });

      if (summary.due > 0) {
        setSchedulerStatus((prev) => {
          const hasChanged =
            !prev ||
            prev.due !== summary.due ||
            prev.published !== summary.published ||
            prev.failed !== summary.failed;

          if (!hasChanged) return prev;

          return {
            lastRun: new Date().toISOString(),
            ...summary,
          };
        });
      }
    } catch (err) {
      console.error("Scheduler tick error:", err);
    } finally {
      schedulerLock.current = false;
    }
  }

  function handleDeleteLocalDraft(id) {
    removeLocalDraft(id);
    setLocalDrafts((current) => current.filter((draft) => draft.id !== id));
  }

  const currentStatus = statusCopy[connectionMode] ?? statusCopy.error;
  const StatusIcon = currentStatus.icon;
  const currentSettingsStatus = statusCopy[settingsSyncMode] ?? statusCopy.error;
  const SettingsStatusIcon = currentSettingsStatus.icon;

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-[radial-gradient(circle_at_top,_#17314f,_#020617_55%)] text-white"
          : "bg-[linear-gradient(180deg,_#f7f4ed,_#e7ecf3)] text-slate-900"
      }`}
    >
      <Header
        workspaceName={settings.workspaceName}
        isDark={isDark}
        onToggleTheme={() => setIsDark((current) => !current)}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <StatusCard
          status={currentStatus}
          onRefresh={() => void loadAllData()}
          errorMessage={connectionError}
        />

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <SectionCard className="p-8">
            <div className="mb-8 grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 sm:grid-cols-4">
              {appTabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  id={tab.id}
                  label={tab.label}
                  icon={tab.icon}
                  isActive={activeTab === tab.id}
                  onClick={setActiveTab}
                />
              ))}
            </div>

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

            {activeTab === "status" && (
              <StatusPage
                allPendingPosts={allPendingPosts}
                remotePosts={remotePosts}
                localDrafts={localDrafts}
                formatDate={formatDate}
                handleDeleteLocalDraft={handleDeleteLocalDraft}
                handlePublishPost={handlePublishPost}
                settings={settings}
                schedulerStatus={schedulerStatus}
              />
            )}

            {activeTab === "guide" && <GuidePage guideSections={guideSections} />}
          </SectionCard>

          <aside className="space-y-6">
            <SectionCard title="สถานะสิทธิ์จริงของโปรเจกต์">
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>ตาราง `posts` อ่านได้จริงผ่าน anon key</li>
                <li>การเขียน `posts` ยังติด RLS จึงยังไม่สมบูรณ์จากฝั่ง Supabase</li>
                <li>
                  ตาราง `app_settings` จะพร้อมเมื่อรัน [supabase-setup.sql](D:/WebApp/Autopost%20Studio/supabase-setup.sql)
                </li>
                <li>ตั้งค่าในเว็บแอปได้ทันที และจะ sync ไป Supabase เมื่อสิทธิ์พร้อม</li>
              </ul>
            </SectionCard>

            <SectionCard title="ข้อมูลตั้งค่าปัจจุบัน">
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-slate-500">OpenAI API Key</p>
                  <p className="mt-1">{maskSecret(settings.openaiApiKey)}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-slate-500">xAI API Key</p>
                  <p className="mt-1">{maskSecret(settings.xaiApiKey)}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-slate-500">Facebook Page ID</p>
                  <p className="mt-1">{settings.facebookPageId || "ยังไม่ได้กรอก"}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-slate-500">Facebook Page Access Token</p>
                  <p className="mt-1">{maskSecret(settings.facebookPageAccessToken)}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="โพสต์ที่สำเร็จแล้ว">
              <div className="mt-4 space-y-3">
                {isLoading ? (
                  <p className="text-sm text-slate-400">กำลังโหลด...</p>
                ) : completedPosts.length === 0 ? (
                  <p className="text-sm text-slate-400">ยังไม่มีโพสต์สถานะ posted</p>
                ) : (
                  completedPosts.map((post) => (
                    <article key={post.id} className="rounded-2xl bg-slate-900/80 p-4">
                      <h3 className="font-medium">{post.topic || "ไม่มีหัวข้อ"}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        โพสต์เมื่อ {formatDate(post.posted_at || post.created_at)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </SectionCard>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default App;
