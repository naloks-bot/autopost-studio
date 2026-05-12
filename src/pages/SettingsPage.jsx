import React from "react";
import { AlertCircle, CheckCircle2, KeyRound, ShieldCheck, Zap, Database, Facebook as FbIcon, Settings as SettingsIcon, Layers } from "lucide-react";
import SectionCard from "../components/SectionCard.jsx";
import ActionButton from "../components/ActionButton.jsx";
import { validateFacebookConfig } from "../services/facebook.js";
import { getTextProviderRuntime } from "../services/ai-generation.js";

function maskSecret(value) {
  if (!value) return "ยังไม่ได้กรอก";
  if (value.length <= 10) return "ตั้งค่าแล้ว";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function ProviderBadge({ provider, settings }) {
  const textRuntime = provider === "mock" || provider === "openai" || provider === "gemini" || provider === "codex"
    ? getTextProviderRuntime({ ...settings, textProvider: provider })
    : null;
  let status = { label: "Unknown", color: "text-slate-400 bg-slate-400/10" };
  
  if (textRuntime) {
    status = textRuntime.tone === "warning"
      ? { label: textRuntime.statusLabel, color: "text-amber-400 bg-amber-400/10" }
      : { label: textRuntime.statusLabel, color: "text-emerald-400 bg-emerald-400/10" };
  } else {
    const hasKey = (provider === "openai" || provider === "gpt-image" || provider === "dalle") 
      ? settings.openaiApiKey 
      : (provider === "gemini" ? settings.geminiApiKey : false);
      
    if (hasKey) {
      status = { label: "Ready", color: "text-emerald-400 bg-emerald-400/10" };
    } else {
      status = { label: "Requires API key", color: "text-rose-400 bg-rose-400/10" };
    }
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${status.color}`}>
      {status.label}
    </span>
  );
}

function ProviderHelper({ provider }) {
  let text = "";
  if (provider === "mock") text = "Mock is safe and free (recommended for testing)";
  else if (provider === "codex") text = "Codex CLI is planned for local/ChatGPT Plus workflow";
  else text = "API providers may cost money per generation";

  return <p className="text-[10px] text-slate-500 italic px-1">{text}</p>;
}

function SettingsPage({
  currentSettingsStatus,
  SettingsStatusIcon,
  settingsMessage,
  SettingsField,
  settings,
  updateSettingsField,
  envSnapshot,
  handleSaveSettings,
  isSavingSettings,
}) {
  const isFbConfigured = validateFacebookConfig(settings);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
      {/* Left Panel: Configuration Form */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
             <SettingsIcon className="h-5 w-5 text-cyan-400" />
             <h3 className="text-sm font-semibold text-white uppercase tracking-wider">General Configuration</h3>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingsField
                label="ชื่อ Workspace"
                value={settings.workspaceName}
                onChange={(event) => updateSettingsField("workspaceName", event.target.value)}
                placeholder="AutoPost Studio"
              />
              <SettingsField
                label="ชื่อธุรกิจ"
                value={settings.businessName}
                onChange={(event) => updateSettingsField("businessName", event.target.value)}
                placeholder="ชื่อแบรนด์ของคุณ"
              />
            </div>
            <SettingsField
              label="โทนการเขียนหลัก"
              value={settings.brandVoice}
              onChange={(event) => updateSettingsField("brandVoice", event.target.value)}
              placeholder="เช่น เป็นกันเอง น่าเชื่อถือ"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
             <Zap className="h-5 w-5 text-violet-400" />
             <h3 className="text-sm font-semibold text-white uppercase tracking-wider">AI Provider System V2</h3>
          </div>
          <div className="space-y-6">
             <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Text Generation Provider</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          const runtime = getTextProviderRuntime(settings);
                          const status = runtime.tone === "warning"
                            ? `Warning: ${runtime.detail}`
                            : `Success: ${runtime.detail}`;
                          window.alert(status);
                        }}
                        className="text-[9px] font-bold text-cyan-500 uppercase hover:underline"
                      >
                        Test
                      </button>
                      <ProviderBadge provider={settings.textProvider} settings={settings} />
                    </div>
                  </div>
                  <SettingsField
                    value={settings.textProvider}
                    onChange={(event) => updateSettingsField("textProvider", event.target.value)}
                    type="select"
                    options={[
                      { value: "mock", label: "Mock Mode (Default)" },
                      { value: "gemini", label: "Gemini API" },
                      { value: "openai", label: "OpenAI API" },
                      { value: "codex", label: "Codex CLI (Local)" },
                    ]}
                  />
                  <ProviderHelper provider={settings.textProvider} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Image Generation Provider</span>
                    <div className="flex items-center gap-2">
                      <button 
                         onClick={() => {
                           const status = settings.imageProvider === 'mock' ? 'Success: Mock is ready' :
                                          settings.openaiApiKey ? 'Success: OpenAI API Key found' : 
                                          'Error: Missing OpenAI API Key';
                           window.alert(status);
                         }}
                         className="text-[9px] font-bold text-cyan-500 uppercase hover:underline"
                      >
                        Test
                      </button>
                      <ProviderBadge provider={settings.imageProvider} settings={settings} />
                    </div>
                  </div>
                  <SettingsField
                    value={settings.imageProvider}
                    onChange={(event) => updateSettingsField("imageProvider", event.target.value)}
                    type="select"
                    options={[
                      { value: "mock", label: "Mock Mode (Default)" },
                      { value: "gpt-image", label: "GPT Image" },
                      { value: "dalle", label: "DALL·E" },
                    ]}
                  />
                  <ProviderHelper provider={settings.imageProvider} />
                </div>
             </div>

             <div className="grid gap-4 md:grid-cols-2 border-t border-white/5 pt-6">
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

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
             <Layers className="h-5 w-5 text-emerald-400" />
             <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Workspace / Page Settings</h3>
          </div>
          <div className="space-y-4">
             <div className="grid gap-4 md:grid-cols-2">
                <SettingsField
                  label="Active Workspace Page"
                  value={settings.activePageId}
                  onChange={(event) => updateSettingsField("activePageId", event.target.value)}
                  type="select"
                  options={[
                    { value: "default", label: "Default Page (Stable)" },
                    { value: "demo-mock", label: "Demo / Mock Page" },
                  ]}
                />
                <SettingsField
                  label="Page Display Name"
                  value={settings.activePageId === 'default' ? settings.workspaceName : "Demo Page"}
                  placeholder="Page Name"
                  onChange={() => {}} // UI only
                />
             </div>
             <div className="grid gap-4 md:grid-cols-2 border-t border-white/5 pt-4">
                <div className="flex flex-col gap-1">
                   <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Token Context</span>
                   <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/50 border border-white/5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-slate-400">Using Global FB Settings</span>
                   </div>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Workspace Mode</span>
                   <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/50 border border-white/5">
                      <span className="text-xs text-slate-400">Single-Page Compatibility</span>
                   </div>
                </div>
             </div>
             <p className="text-[10px] text-slate-500 italic">
               Note: Publishing currently uses the stable Facebook configuration. Multi-page routing is in foundation stage.
             </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
             <FbIcon className="h-5 w-5 text-blue-500" />
             <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Facebook API Integration</h3>
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
               label="Page ID"
               value={settings.facebookPageId}
               onChange={(event) => updateSettingsField("facebookPageId", event.target.value)}
               placeholder="Page ID"
             />
             <SettingsField
               label="Page Access Token"
               value={settings.facebookPageAccessToken}
               onChange={(event) => updateSettingsField("facebookPageAccessToken", event.target.value)}
               placeholder="EAAG..."
               secret
             />
          </div>
        </div>

        <div className="pt-2">
          <ActionButton
            label="บันทึกการตั้งค่า (Save Settings)"
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

      {/* Right Panel: Summary & Status */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
             <ShieldCheck className="h-5 w-5 text-cyan-400" />
             <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Safety Controls</h3>
          </div>
          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-xs font-bold text-slate-500 uppercase tracking-tight">Facebook Publish Mode</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer rounded-lg bg-slate-950/50 px-3 py-2 border border-white/5">
                  <input
                    type="radio"
                    name="publishMode"
                    value="mock"
                    checked={settings.facebookPublishMode === "mock"}
                    onChange={() => updateSettingsField("facebookPublishMode", "mock")}
                    className="accent-cyan-400"
                  />
                  <span className="text-xs font-medium text-slate-300">Mock Mode</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer rounded-lg bg-slate-950/50 px-3 py-2 border border-white/5">
                  <input
                    type="radio"
                    name="publishMode"
                    value="live"
                    checked={settings.facebookPublishMode === "live"}
                    onChange={() => updateSettingsField("facebookPublishMode", "live")}
                    className="accent-rose-500"
                  />
                  <span className="text-xs font-medium text-slate-300">Live Mode</span>
                </label>
              </div>
              {settings.facebookPublishMode === "live" && (
                <p className="mt-3 text-[10px] text-rose-400 bg-rose-400/10 p-2 rounded border border-rose-400/20 italic">
                  ⚠️ ระวัง: การโพสต์จะส่งข้อมูลไปที่ Facebook จริง
                </p>
              )}
            </div>

            <div>
              <label className="mb-3 block text-xs font-bold text-slate-500 uppercase tracking-tight">Auto Scheduler Status</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateSettingsField("schedulerEnabled", !settings.schedulerEnabled)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.schedulerEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.schedulerEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
                <span className="text-xs font-medium text-slate-300">
                  {settings.schedulerEnabled ? 'เปิดใช้งานอยู่' : 'ปิดใช้งานอยู่'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-sm">
           <div className="mb-4 flex items-center gap-2">
             <SettingsIcon className="h-4 w-4 text-slate-500" />
             <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Current Config</h3>
           </div>
           <div className="space-y-3">
              <div className="flex justify-between items-center rounded-lg bg-slate-950/40 p-3">
                <span className="text-[11px] text-slate-500">OpenAI Key</span>
                <span className="text-[11px] text-slate-300">{maskSecret(settings.openaiApiKey)}</span>
              </div>
              <div className="flex justify-between items-center rounded-lg bg-slate-950/40 p-3">
                <span className="text-[11px] text-slate-500">Gemini Key</span>
                <span className="text-[11px] text-slate-300">{maskSecret(settings.geminiApiKey)}</span>
              </div>
              <div className="flex justify-between items-center rounded-lg bg-slate-950/40 p-3">
                <span className="text-[11px] text-slate-500">FB Page ID</span>
                <span className="text-[11px] text-slate-300">{settings.facebookPageId || "-"}</span>
              </div>
              <div className="flex flex-col rounded-lg border border-white/5 bg-slate-950/40 p-3">
                <div className="flex items-center gap-2">
                   {isFbConfigured ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <AlertCircle className="h-3 w-3 text-amber-500" />}
                   <span className={`text-[11px] font-bold ${isFbConfigured ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {isFbConfigured ? 'Facebook: Configured' : 'Facebook: Incomplete'}
                   </span>
                </div>
              </div>
           </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-300">
            <KeyRound className="h-4 w-4 text-slate-500" />
            <span className="uppercase text-[10px] font-bold tracking-widest text-slate-500">Environment Snapshot</span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Supabase Endpoint</p>
              <p className="mt-1 break-all text-[11px] text-slate-400 font-mono">
                {envSnapshot.url || "MISSING"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Anon Key Protection</p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                 <div className={`h-1.5 w-1.5 rounded-full ${envSnapshot.hasAnonKey ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                 {envSnapshot.hasAnonKey ? "Loaded securely from .env" : "Missing environment config"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
