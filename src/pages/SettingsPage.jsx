import React from "react";
import { CheckCircle2, KeyRound, Palette, Settings as SettingsIcon, ShieldCheck, Zap } from "lucide-react";
import ActionButton from "../components/ActionButton.jsx";
import { getTextProviderRuntime } from "../services/ai-generation.js";

function maskSecret(value) {
  if (!value) return "ยังไม่ได้ตั้งค่า";
  if (value.length <= 10) return "ตั้งค่าแล้ว";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
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
  const textRuntime = getTextProviderRuntime(settings);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
            <SettingsIcon className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">ข้อมูลระบบ</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SettingsField
              label="ชื่อระบบ"
              value={settings.workspaceName}
              onChange={(event) => updateSettingsField("workspaceName", event.target.value)}
              placeholder="AutoPost Studio"
            />
            <SettingsField
              label="ชื่อธุรกิจ"
              value={settings.businessName}
              onChange={(event) => updateSettingsField("businessName", event.target.value)}
              placeholder="ชื่อแบรนด์หรือทีมงาน"
            />
          </div>

          <div className="mt-4">
            <SettingsField
              label="โทนหลักของแบรนด์"
              value={settings.brandVoice}
              onChange={(event) => updateSettingsField("brandVoice", event.target.value)}
              placeholder="เช่น ชัดเจน เป็นกันเอง ดูมืออาชีพ"
            />
          </div>

          <div className="mt-4">
            <SettingsField
              label="คำใบ้หัวข้อเริ่มต้น"
              value={settings.defaultTopicHint}
              onChange={(event) => updateSettingsField("defaultTopicHint", event.target.value)}
              placeholder="ช่วยกำหนดแนวหัวข้อที่ทีมใช้บ่อย"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
            <Zap className="h-5 w-5 text-violet-400" />
            <h3 className="text-base font-semibold text-white">ผู้ช่วย AI</h3>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingsField
                label="ผู้ให้บริการข้อความ"
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
              <SettingsField
                label="ผู้ให้บริการภาพ"
                value={settings.imageProvider}
                onChange={(event) => updateSettingsField("imageProvider", event.target.value)}
                type="select"
                options={[
                  { value: "mock", label: "โหมดทดสอบ" },
                  { value: "gpt-image", label: "GPT Image" },
                  { value: "dalle", label: "DALL-E" },
                ]}
              />
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300">
              ข้อความ: {textRuntime.statusLabel} • {textRuntime.detail}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
            <Palette className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">หน้าตาและธีม</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <p className="text-xs font-semibold text-white">ธีมเข้ม</p>
              <p className="mt-1 text-xs text-slate-400">เหมาะกับการทำงานต่อเนื่องและเป็นค่าเริ่มต้นของระบบ</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <p className="text-xs font-semibold text-white">ธีมสว่าง</p>
              <p className="mt-1 text-xs text-slate-400">โทนครีมอุ่นตา เหมาะกับงานรีวิวและปรับข้อความยาว</p>
            </div>
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
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300">
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
            <h3 className="text-base font-semibold text-white">ความปลอดภัยการโพสต์</h3>
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
            </div>

            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-tight text-slate-500">ระบบโพสต์อัตโนมัติ</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateSettingsField("schedulerEnabled", !settings.schedulerEnabled)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    settings.schedulerEnabled ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                      settings.schedulerEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-xs font-medium text-slate-300">
                  {settings.schedulerEnabled ? "เปิดใช้งาน" : "ปิดไว้"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              หน้า Settings เหลือเฉพาะค่าระดับระบบ ส่วนการตั้งค่าเพจและ memory ย้ายไปที่เมนู “จัดการเพจ” แล้ว
            </div>
          </div>
        </div>

        <details className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-300">
            <KeyRound className="h-4 w-4 text-slate-500" />
            ข้อมูลเพิ่มเติม
          </summary>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-950/40 p-3">
              <span className="text-[11px] text-slate-500">OpenAI Key</span>
              <span className="text-[11px] text-slate-300">{maskSecret(settings.openaiApiKey)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-950/40 p-3">
              <span className="text-[11px] text-slate-500">Gemini Key</span>
              <span className="text-[11px] text-slate-300">{maskSecret(settings.geminiApiKey)}</span>
            </div>
            <div className="rounded-lg border border-white/5 bg-slate-950/40 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Supabase Endpoint</p>
              <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{envSnapshot.url || "MISSING"}</p>
            </div>
            <div className={`rounded-lg border p-3 text-sm ${currentSettingsStatus.tone}`}>
              <div className="flex items-center gap-2">
                <SettingsStatusIcon className="h-4 w-4" />
                <span className="font-semibold">{currentSettingsStatus.label}</span>
              </div>
              <p className="mt-1 text-xs opacity-80">{currentSettingsStatus.detail}</p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

export default SettingsPage;
