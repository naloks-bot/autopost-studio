import { BrainCircuit, Database, HelpCircle, Layers, Moon, Share2, Sun } from "lucide-react";

function Header({
  isDark,
  onToggleTheme,
  connectionMode,
  fbMode,
  textProviderRuntime,
  onOpenGuide,
  settings,
  workspacePages,
  onPageChange,
}) {
  const StatusChip = ({ icon: Icon, label, colorClass }) => (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );

  const getSupabaseConfig = () => {
    switch (connectionMode) {
      case "connected":
        return { label: "Supabase พร้อม", color: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" };
      case "offline":
        return { label: "ออฟไลน์", color: "border-slate-500/20 bg-slate-500/10 text-slate-400" };
      case "read-only":
        return { label: "อ่านอย่างเดียว", color: "border-amber-500/20 bg-amber-500/10 text-amber-400" };
      default:
        return { label: "มีปัญหา", color: "border-rose-500/20 bg-rose-500/10 text-rose-400" };
    }
  };

  const getFbConfig = () => {
    if (fbMode === "live") return { label: "โพสต์จริง", color: "border-rose-500/20 bg-rose-500/10 text-rose-400" };
    if (fbMode === "mock") return { label: "โหมดทดสอบ", color: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400" };
    return { label: "ยังไม่พร้อม", color: "border-amber-500/20 bg-amber-500/10 text-amber-400" };
  };

  const getAiConfig = () => {
    const selectedProvider = textProviderRuntime?.selectedProvider || "mock";
    const providerLabel = selectedProvider === "openai" ? "OpenAI" : selectedProvider === "gemini" ? "Gemini" : "Mock";
    const label = `ข้อความ: ${providerLabel} • ${textProviderRuntime?.statusLabel || "พร้อม"}`;
    const color =
      textProviderRuntime?.tone === "warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
        : "border-violet-500/20 bg-violet-500/10 text-violet-400";
    return { label, color };
  };

  const db = getSupabaseConfig();
  const fb = getFbConfig();
  const ai = getAiConfig();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 backdrop-blur-md lg:pl-6">
      <div className="flex items-center gap-2 lg:hidden">
        <span className="text-sm font-bold tracking-tight text-white">AutoPost Studio</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 lg:flex">
          <Layers className="h-3 w-3 text-slate-500" />
          <select
            value={settings?.activePageId || "default"}
            onChange={(event) => onPageChange(event.target.value)}
            className="cursor-pointer bg-transparent text-[11px] font-bold tracking-tight text-slate-300 outline-none"
          >
            {workspacePages.map((page) => (
              <option key={page.id} value={page.id} className="bg-slate-900 text-white">
                {page.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden items-center gap-2 border-l border-white/10 pl-4 md:flex">
          <StatusChip icon={Database} label={db.label} colorClass={db.color} />
          <StatusChip icon={Share2} label={fb.label} colorClass={fb.color} />
          <StatusChip icon={BrainCircuit} label={ai.label} colorClass={ai.color} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenGuide}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="คู่มือ"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="เปลี่ยนธีม"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

export default Header;
