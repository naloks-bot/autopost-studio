import React from "react";
import { AlertCircle, CheckCircle2, KeyRound, ShieldCheck, Zap, Facebook as FbIcon, Settings as SettingsIcon, Layers } from "lucide-react";
import ActionButton from "../components/ActionButton.jsx";
import { validateFacebookConfig } from "../services/facebook.js";
import { getTextProviderRuntime } from "../services/ai-generation.js";
import {
  getPagePublishReadiness,
  resolveEffectivePublishConfig,
  runPerPagePublishDryRun,
} from "../services/page-context.js";

function maskSecret(value) {
  if (!value) return "ยังไม่ได้ตั้ง";
  if (value.length <= 10) return "ตั้งค่าแล้ว";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function ProviderBadge({ provider, settings }) {
  const textRuntime = provider === "mock" || provider === "openai" || provider === "gemini" || provider === "codex"
    ? getTextProviderRuntime({ ...settings, textProvider: provider })
    : null;
  let status = { label: "ไม่ทราบสถานะ", color: "text-slate-400 bg-slate-400/10" };

  if (textRuntime) {
    status = textRuntime.tone === "warning"
      ? { label: textRuntime.statusLabel, color: "text-amber-400 bg-amber-400/10" }
      : { label: textRuntime.statusLabel, color: "text-emerald-400 bg-emerald-400/10" };
  } else {
    const hasKey = (provider === "openai" || provider === "gpt-image" || provider === "dalle")
      ? settings.openaiApiKey
      : provider === "gemini"
        ? settings.geminiApiKey
        : false;

    status = hasKey
      ? { label: "พร้อม", color: "text-emerald-400 bg-emerald-400/10" }
      : { label: "ต้องมี API key", color: "text-rose-400 bg-rose-400/10" };
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${status.color}`}>
      {status.label}
    </span>
  );
}

function ProviderHelper({ provider }) {
  let text = "";
  if (provider === "mock") text = "ใช้ทดสอบได้ทันที ปลอดภัยที่สุด";
  else if (provider === "codex") text = "ยังไม่เปิดใช้ในรอบนี้";
  else text = "ผู้ให้บริการจริงอาจมีค่าใช้จ่ายตามการใช้งาน";

  return <p className="px-1 text-[10px] italic text-slate-500">{text}</p>;
}

function SettingsPage({
  currentSettingsStatus,
  SettingsStatusIcon,
  settingsMessage,
  SettingsField,
  settings,
  workspacePages,
  activeWorkspacePage,
  updateSettingsField,
  envSnapshot,
  handleSaveSettings,
  isSavingSettings,
}) {
  const isFbConfigured = validateFacebookConfig(settings);
  const currentTextRuntime = getTextProviderRuntime(settings);
  const activePageReadiness = getPagePublishReadiness({
    pageId: settings.activePageId,
    settings,
    pages: workspacePages,
  });
  const activePageDryRun = runPerPagePublishDryRun({
    pageId: settings.activePageId,
    settings,
    pages: workspacePages,
  });
  const activePageEffectivePublish = resolveEffectivePublishConfig({
    pageId: settings.activePageId,
    settings,
    pages: workspacePages,
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_0.95fr]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
            <SettingsIcon className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">ข้อมูลทั่วไป</h3>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingsField
                label="ชื่อเวิร์กสเปซ"
                value={settings.workspaceName}
                onChange={(event) => updateSettingsField("workspaceName", event.target.value)}
                placeholder="AutoPost Studio"
              />
              <SettingsField
                label="ชื่อธุรกิจ"
                value={settings.businessName}
                onChange={(event) => updateSettingsField("businessName", event.target.value)}
                placeholder="ชื่อแบรนด์หรือธุรกิจ"
              />
            </div>
            <SettingsField
              label="โทนแบรนด์"
              value={settings.brandVoice}
              onChange={(event) => updateSettingsField("brandVoice", event.target.value)}
              placeholder="เช่น เป็นกันเอง ชัดเจน มืออาชีพ"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
            <Zap className="h-5 w-5 text-violet-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">ตั้งค่า AI</h3>
          </div>

          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">สร้างข้อความ</span>
                  <ProviderBadge provider={settings.textProvider} settings={settings} />
                </div>
                <SettingsField
                  value={settings.textProvider}
                  onChange={(event) => updateSettingsField("textProvider", event.target.value)}
                  type="select"
                  options={[
                    { value: "mock", label: "โหมดทดสอบ" },
                    { value: "gemini", label: "Gemini API" },
                    { value: "openai", label: "OpenAI API" },
                    { value: "codex", label: "Codex CLI" },
                  ]}
                />
                <ProviderHelper provider={settings.textProvider} />
                <p className={`px-1 text-[10px] italic ${currentTextRuntime.tone === "warning" ? "text-amber-400" : "text-emerald-400"}`}>
                  {currentTextRuntime.detail}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">สร้างภาพ</span>
                  <ProviderBadge provider={settings.imageProvider} settings={settings} />
                </div>
                <SettingsField
                  value={settings.imageProvider}
                  onChange={(event) => updateSettingsField("imageProvider", event.target.value)}
                  type="select"
                  options={[
                    { value: "mock", label: "โหมดทดสอบ" },
                    { value: "gpt-image", label: "GPT Image" },
                    { value: "dalle", label: "DALL-E" },
                  ]}
                />
                <ProviderHelper provider={settings.imageProvider} />
              </div>
            </div>

            <div className="grid gap-4 border-t border-white/5 pt-5 md:grid-cols-2">
              <SettingsField
                label="OpenAI API Key"
                value={settings.openaiApiKey}
                onChange={(event) => updateSettingsField("openaiApiKey", event.target.value)}
                placeholder="sk-..."
                secret
              />
              <SettingsField
                label="OpenAI Model"
                value={settings.openaiModel}
                onChange={(event) => updateSettingsField("openaiModel", event.target.value)}
                placeholder="gpt-4o-mini"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SettingsField
                label="Gemini API Key"
                value={settings.geminiApiKey}
                onChange={(event) => updateSettingsField("geminiApiKey", event.target.value)}
                placeholder="AI..."
                secret
              />
              <SettingsField
                label="Gemini Model"
                value={settings.geminiModel}
                onChange={(event) => updateSettingsField("geminiModel", event.target.value)}
                placeholder="gemini-2.5-flash"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
            <Layers className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">เพจและการโพสต์</h3>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingsField
                label="เพจที่กำลังใช้งาน"
                value={settings.activePageId}
                onChange={(event) => updateSettingsField("activePageId", event.target.value)}
                type="select"
                options={workspacePages.map((page) => ({
                  value: page.id,
                  label: page.label,
                }))}
              />
              <SettingsField
                label="ชื่อเพจ"
                value={activeWorkspacePage?.label || settings.workspaceName}
                placeholder="ชื่อเพจ"
                onChange={() => {}}
              />
            </div>

            <div className="grid gap-4 border-t border-white/5 pt-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">การตั้งค่าที่ใช้</span>
                <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs text-slate-400">
                    {activePageReadiness.pageConfigReady ? "ใช้ค่าของเพจนี้" : "ใช้ค่ากลางของระบบ"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">โหมดการทำงาน</span>
                <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2">
                  <span className="text-xs text-slate-400">ยังรองรับการใช้งานแบบเพจเดียวได้</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3 text-[10px]">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${
                    activePageReadiness.pageConfigReady ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {activePageReadiness.pageConfigReady ? "พร้อมใช้ของเพจ" : "ใช้ค่ากลาง"}
                </span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 font-bold uppercase tracking-wider text-cyan-400">
                  โหมดจริง: {activePageEffectivePublish.livePerPagePublishStatus}
                </span>
              </div>
              <p className="mt-2 text-slate-400">
                Page ID: {activePageReadiness.hasPageSpecificPageId ? "มี" : "ไม่มี"} • Token: {activePageReadiness.hasPageSpecificToken ? "มี" : "ไม่มี"}
              </p>
              {(activePageEffectivePublish.fallbackReason || activePageEffectivePublish.blockedReason) && (
                <p className="mt-1 italic text-slate-500">
                  {activePageEffectivePublish.blockedReason || activePageEffectivePublish.fallbackReason}
                </p>
              )}
              <div className="mt-3 rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-2">
                <p className="font-bold uppercase tracking-wider text-cyan-400">{activePageDryRun.dryRunLabel}</p>
                <p className="mt-1 text-slate-400">
                  ถ้าลองโพสต์ตอนนี้ ระบบจะใช้ {activePageEffectivePublish.effectivePublishLabel} ที่เพจ {activePageDryRun.resolvedPageLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
            <FbIcon className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Facebook</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsField
              label="App ID"
              value={settings.facebookAppId}
              onChange={(event) => updateSettingsField("facebookAppId", event.target.value)}
              placeholder="App ID"
            />
            <SettingsField
              label="App Secret"
              value={settings.facebookAppSecret}
              onChange={(event) => updateSettingsField("facebookAppSecret", event.target.value)}
              placeholder="App Secret"
              secret
            />
            <SettingsField
              label="Page ID กลาง"
              value={settings.facebookPageId}
              onChange={(event) => updateSettingsField("facebookPageId", event.target.value)}
              placeholder="Page ID"
            />
            <SettingsField
              label="Page Access Token กลาง"
              value={settings.facebookPageAccessToken}
              onChange={(event) => updateSettingsField("facebookPageAccessToken", event.target.value)}
              placeholder="EAAG..."
              secret
            />
          </div>
        </div>

        <div className="pt-1">
          <ActionButton
            label="บันทึกการตั้งค่า"
            icon={CheckCircle2}
            isLoading={isSavingSettings}
            onClick={handleSaveSettings}
            variant="secondary"
            fullWidth
          />
          {settingsMessage && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-cyan-500/10 px-4 py-2 text-xs text-cyan-400">
              <SettingsStatusIcon className="h-4 w-4" />
              <span>{settingsMessage}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">ความปลอดภัย</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-tight text-slate-500">โหมดโพสต์</label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2">
                  <input
                    type="radio"
                    name="publishMode"
                    value="mock"
                    checked={settings.facebookPublishMode === "mock"}
                    onChange={() => updateSettingsField("facebookPublishMode", "mock")}
                    className="accent-cyan-400"
                  />
                  <span className="text-xs font-medium text-slate-300">โหมดทดสอบ</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2">
                  <input
                    type="radio"
                    name="publishMode"
                    value="live"
                    checked={settings.facebookPublishMode === "live"}
                    onChange={() => updateSettingsField("facebookPublishMode", "live")}
                    className="accent-rose-500"
                  />
                  <span className="text-xs font-medium text-slate-300">โพสต์จริง</span>
                </label>
              </div>
              {settings.facebookPublishMode === "live" && (
                <p className="mt-3 rounded border border-rose-400/20 bg-rose-400/10 p-2 text-[10px] italic text-rose-400">
                  โหมดจริงเปิดอยู่ ระบบจะใช้ค่าของเพจเมื่อข้อมูลครบ และยังคงบล็อกอย่างปลอดภัยถ้าข้อมูลไม่พร้อม
                </p>
              )}
            </div>

            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-tight text-slate-500">ระบบโพสต์อัตโนมัติ</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateSettingsField("schedulerEnabled", !settings.schedulerEnabled)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.schedulerEnabled ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.schedulerEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-xs font-medium text-slate-300">{settings.schedulerEnabled ? "เปิดใช้งาน" : "ปิดไว้"}</span>
              </div>
            </div>
          </div>
        </div>

        <details className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
            <SettingsIcon className="h-4 w-4 text-slate-500" />
            ข้อมูลเพิ่มเติม
          </summary>

          <div className="mt-4 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-950/40 p-3">
                <span className="text-[11px] text-slate-500">OpenAI Key</span>
                <span className="text-[11px] text-slate-300">{maskSecret(settings.openaiApiKey)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/40 p-3">
                <span className="text-[11px] text-slate-500">Gemini Key</span>
                <span className="text-[11px] text-slate-300">{maskSecret(settings.geminiApiKey)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-950/40 p-3">
                <span className="text-[11px] text-slate-500">Page ID กลาง</span>
                <span className="text-[11px] text-slate-300">{settings.facebookPageId || "-"}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-950/40 p-3">
                <div className="flex items-center gap-2">
                  {isFbConfigured ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <AlertCircle className="h-3 w-3 text-amber-500" />}
                  <span className={`text-[11px] font-bold ${isFbConfigured ? "text-emerald-500" : "text-amber-500"}`}>
                    {isFbConfigured ? "Facebook ค่ากลางพร้อมใช้งาน" : "Facebook ค่ากลางยังไม่ครบ"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-300">
                <KeyRound className="h-4 w-4 text-slate-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Environment Snapshot</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Supabase Endpoint</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{envSnapshot.url || "MISSING"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Anon Key Protection</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <div className={`h-1.5 w-1.5 rounded-full ${envSnapshot.hasAnonKey ? "bg-emerald-500" : "bg-rose-500"}`}></div>
                    {envSnapshot.hasAnonKey ? "โหลดจาก .env แล้ว" : "ยังไม่พบค่า environment"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

export default SettingsPage;
