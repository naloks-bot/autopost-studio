import { Moon, Sun, Database, Share2, BrainCircuit, HelpCircle, Layers } from "lucide-react";
import { WORKSPACE_PAGES } from "../constants/appConstants";

function Header({ 
  isDark, 
  onToggleTheme, 
  connectionMode, 
  fbMode, 
  textProviderRuntime,
  onOpenGuide,
  settings,
  onPageChange
}) {
  
  // Status Chip Component
  const StatusChip = ({ icon: Icon, label, colorClass }) => (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );

  const getSupabaseConfig = () => {
    switch (connectionMode) {
      case "connected": return { label: "Supabase Live", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case "offline": return { label: "Offline Mode", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
      case "read-only": return { label: "Read-Only", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      default: return { label: "Error", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
    }
  };

  const getFbConfig = () => {
    if (fbMode === "live") return { label: "FB: Live", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
    if (fbMode === "mock") return { label: "FB: Mock", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
    return { label: "FB: Missing", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  };

  const getAiConfig = () => {
    const activeProvider = textProviderRuntime?.activeProvider || "mock";
    const statusLabel = textProviderRuntime?.statusLabel || "Ready";
    const label = activeProvider === "openai"
      ? "AI: OpenAI"
      : activeProvider === "gemini"
        ? "AI: Gemini"
        : "AI: Mock";
    const color = textProviderRuntime?.tone === "warning"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-violet-500/10 text-violet-400 border-violet-500/20";
    return { label: `${label} · ${statusLabel}`, color };
  };

  const db = getSupabaseConfig();
  const fb = getFbConfig();
  const ai = getAiConfig();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 backdrop-blur-md lg:pl-6">
      {/* Mobile Branding */}
      <div className="flex items-center gap-2 lg:hidden">
         <span className="text-sm font-bold text-white tracking-tight">AutoPost Studio</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Page Selector (Foundation) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5">
           <Layers className="h-3 w-3 text-slate-500" />
           <select 
             value={settings?.activePageId || "default"}
             onChange={(e) => onPageChange(e.target.value)}
             className="bg-transparent text-[11px] font-bold text-slate-300 outline-none cursor-pointer uppercase tracking-tight"
           >
             {WORKSPACE_PAGES.map(p => (
               <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.label}</option>
             ))}
           </select>
        </div>

        {/* Connection Indicators (Desktop) */}
        <div className="hidden items-center gap-2 md:flex border-l border-white/10 pl-4">
          <StatusChip icon={Database} label={db.label} colorClass={db.color} />
          <StatusChip icon={Share2} label={fb.label} colorClass={fb.color} />
          <StatusChip icon={BrainCircuit} label={ai.label} colorClass={ai.color} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenGuide}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Help Guide"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

export default Header;
