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
          label="AI Provider (openai, xai, mock)"
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
          label="xAI API Key"
          value={settings.xaiApiKey}
          onChange={(event) => updateSettingsField("xaiApiKey", event.target.value)}
          placeholder="xai-..."
          secret
        />
        <SettingsField
          label="xAI Model"
          value={settings.xaiModel}
          onChange={(event) => updateSettingsField("xaiModel", event.target.value)}
          placeholder="grok-3-mini"
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
