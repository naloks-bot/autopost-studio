import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import StatusCard from "../components/StatusCard.jsx";
import SectionCard from "../components/SectionCard.jsx";
import ActionButton from "../components/ActionButton.jsx";
import { validateFacebookConfig } from "../services/facebook.js";

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
    <div className="space-y-6">
      <StatusCard
        status={{ ...currentSettingsStatus, icon: SettingsStatusIcon }}
        errorMessage={settingsMessage}
      />

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
          placeholder="ชื่อแบรนด์หรือธุรกิจของคุณ"
        />
      </div>

      <SettingsField
        label="โทนการเขียนหลัก"
        value={settings.brandVoice}
        onChange={(event) => updateSettingsField("brandVoice", event.target.value)}
        placeholder="เช่น เป็นกันเอง น่าเชื่อถือ ชัดเจน"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <SettingsField
          label="AI Provider (openai, gemini, mock)"
          value={settings.aiProvider}
          onChange={(event) => updateSettingsField("aiProvider", event.target.value)}
          placeholder="openai"
        />
        <div className="hidden md:block"></div>
      </div>

      <SettingsField
        label="หัวข้อแนะนำเริ่มต้น"
        value={settings.defaultTopicHint}
        onChange={(event) => updateSettingsField("defaultTopicHint", event.target.value)}
        placeholder="เช่น โปรโมตคอร์สออนไลน์สำหรับเจ้าของธุรกิจ"
        multiline
      />

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
        <SettingsField
          label="Facebook App ID"
          value={settings.facebookAppId}
          onChange={(event) => updateSettingsField("facebookAppId", event.target.value)}
          placeholder="App ID"
        />
        <SettingsField
          label="Facebook App Secret"
          value={settings.facebookAppSecret}
          onChange={(event) => updateSettingsField("facebookAppSecret", event.target.value)}
          placeholder="App Secret"
          secret
        />
        <SettingsField
          label="Facebook Page ID"
          value={settings.facebookPageId}
          onChange={(event) => updateSettingsField("facebookPageId", event.target.value)}
          placeholder="Page ID"
        />
        <SettingsField
          label="Facebook Page Access Token"
          value={settings.facebookPageAccessToken}
          onChange={(event) => updateSettingsField("facebookPageAccessToken", event.target.value)}
          placeholder="EAAG..."
          secret
        />
      </div>

      <SectionCard noPadding className="border-cyan-500/10 p-5 bg-cyan-500/5">
        <h3 className="mb-4 text-sm font-semibold text-cyan-400">การควบคุมความปลอดภัย (Production Safety)</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Facebook Publish Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="publishMode"
                  value="mock"
                  checked={settings.facebookPublishMode === "mock"}
                  onChange={() => updateSettingsField("facebookPublishMode", "mock")}
                  className="accent-cyan-400"
                />
                <span className="text-sm">Mock (ทดสอบ)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="publishMode"
                  value="live"
                  checked={settings.facebookPublishMode === "live"}
                  onChange={() => updateSettingsField("facebookPublishMode", "live")}
                  className="accent-rose-500"
                />
                <span className="text-sm">Live (โพสต์จริง)</span>
              </label>
            </div>
            {settings.facebookPublishMode === "live" && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                <p className="text-[11px] font-bold text-rose-400">
                  ⚠️ ระวัง: โหมด Live จะส่งข้อมูลไปที่ Facebook จริงเมื่อกดยืนยันหรือถึงเวลาที่ตั้งไว้
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Auto Scheduler</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateSettingsField("schedulerEnabled", !settings.schedulerEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.schedulerEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.schedulerEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm">
                {settings.schedulerEnabled ? 'เปิดใช้งานตัวช่วยโพสต์อัตโนมัติ' : 'ปิดใช้งานตัวช่วยโพสต์อัตโนมัติ'}
              </span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500 italic">
              * Scheduler จะทำงานเฉพาะเมื่อเปิดหน้าเว็บแอปนี้ทิ้งไว้เท่านั้น
            </p>
          </div>
        </div>
      </SectionCard>

      <div className={`rounded-xl border p-4 ${isFbConfigured ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
        <div className="flex items-center gap-3">
          {isFbConfigured ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-400" />
          )}
          <div>
            <p className={`text-sm font-medium ${isFbConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isFbConfigured ? 'Facebook ตั้งค่าครบแล้ว' : 'Facebook ยังตั้งค่าไม่ครบ'}
            </p>
            <p className="text-xs text-slate-500">
              {isFbConfigured ? 'พร้อมสำหรับการโพสต์ลง Page' : 'กรุณากรอก Page ID และ Access Token เพื่อใช้งานการโพสต์'}
            </p>
          </div>
        </div>
      </div>

      <SectionCard noPadding className="p-5">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <KeyRound className="h-4 w-4" />
          ค่า Supabase จาก .env
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Supabase URL</p>
            <p className="mt-1 break-all text-sm text-slate-200">
              {envSnapshot.url || "ยังไม่พบค่าใน .env"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Anon Key</p>
            <p className="mt-1 text-sm text-slate-200">
              {envSnapshot.hasAnonKey ? "โหลดจาก .env แล้ว" : "ยังไม่พบค่าใน .env"}
            </p>
          </div>
        </div>
      </SectionCard>

      <ActionButton
        label="บันทึกการตั้งค่า"
        icon={CheckCircle2}
        isLoading={isSavingSettings}
        onClick={handleSaveSettings}
        variant="secondary"
      />
    </div>
  );
}

export default SettingsPage;
