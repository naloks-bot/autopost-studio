import { CheckCircle2, KeyRound, RefreshCw } from "lucide-react";
import StatusCard from "../components/StatusCard.jsx";
import SectionCard from "../components/SectionCard.jsx";
import ActionButton from "../components/ActionButton.jsx";

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
          label="xAI API Key"
          value={settings.xaiApiKey}
          onChange={(event) => updateSettingsField("xaiApiKey", event.target.value)}
          placeholder="xai-..."
          secret
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
