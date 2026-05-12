import React from "react";
import { Terminal, Download, Copy, Info, History, ShieldAlert, Cpu, Share2 } from "lucide-react";

function formatLogTime(value) {
  if (!value) return "--:--:--";
  return new Date(value).toLocaleTimeString("en-GB", { hour12: false });
}

function getCategory(log) {
  if (log.source === "scheduler" || log.source === "scheduler_edge") return "scheduler";
  if (log.source === "manual_publish") return "publishing";
  if (log.source === "ai") return "ai";
  if (log.level === "error") return "errors";
  return "system";
}

function getCounts(logs) {
  return {
    all: logs.length,
    ai: logs.filter((log) => getCategory(log) === "ai").length,
    scheduler: logs.filter((log) => getCategory(log) === "scheduler").length,
    publishing: logs.filter((log) => getCategory(log) === "publishing").length,
    errors: logs.filter((log) => log.level === "error").length,
  };
}

export default function LogsPage({ logs = [], logsMode = "offline" }) {
  const counts = getCounts(logs);
  const hasPersistentLogs = logsMode === "connected";
  const infoMessage =
    logsMode === "connected"
      ? "Persistent operation logs are active. High-value publish and routing events are stored in Supabase when they occur."
      : logsMode === "missing-table"
        ? "Operation log storage is not ready yet. Run the latest Supabase SQL to enable persistent logs."
        : "Persistent logs are unavailable right now. The publish and scheduler flows still continue safely.";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                 <Terminal className="h-6 w-6" />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-white tracking-tight">System Logs</h2>
                 <p className="text-xs text-slate-400">Monitor publish, scheduler, and routing activity</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button disabled className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-500 uppercase tracking-tight opacity-60 cursor-not-allowed">
                 <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button disabled className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-500 uppercase tracking-tight opacity-60 cursor-not-allowed">
                 <Copy className="h-3.5 w-3.5" /> Copy
              </button>
           </div>
        </div>

        <div className="mt-6 flex items-start gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
           <Info className="h-5 w-5 text-rose-400 mt-0.5" />
           <div>
              <p className="text-xs font-semibold text-rose-300">
                {hasPersistentLogs ? "Persistent Logs Ready" : "Foundation Mode Active"}
              </p>
              <p className="text-[10px] text-rose-400/80 leading-relaxed">
                {infoMessage}
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-4">
           <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Log Categories</h3>
              <div className="space-y-1">
                 {[
                   { label: "All Logs", icon: History, count: counts.all, active: true },
                   { label: "AI Engines", icon: Cpu, count: counts.ai, active: false },
                   { label: "Scheduler", icon: History, count: counts.scheduler, active: false },
                   { label: "Publishing", icon: Share2, count: counts.publishing, active: false },
                   { label: "Errors", icon: ShieldAlert, count: counts.errors, active: false },
                 ].map((cat) => (
                    <button key={cat.label} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${cat.active ? "bg-rose-500/10 text-rose-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
                       <div className="flex items-center gap-2">
                          <cat.icon className="h-3.5 w-3.5" />
                          <span>{cat.label}</span>
                       </div>
                       <span className="text-[10px] font-bold opacity-50">{cat.count}</span>
                    </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="lg:col-span-3">
           <div className="rounded-2xl border border-white/5 bg-slate-950/80 shadow-inner overflow-hidden">
              <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                 <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Operation Log Stream</span>
                 </div>
                 <span className="text-[9px] text-slate-600">Latest first</span>
              </div>
              <div className="p-4 font-mono text-[11px] leading-relaxed space-y-2 h-[400px] overflow-y-auto">
                 {logs.length === 0 ? (
                   <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-slate-400">
                     {logsMode === "connected"
                       ? "No operation logs have been recorded yet. Publish, scheduler, and routing events will appear here as the system runs."
                       : logsMode === "missing-table"
                         ? "Persistent log storage is not installed yet. Apply the latest Supabase SQL to start recording logs."
                         : "Log storage is unavailable right now, but publish and scheduler flows continue safely."}
                   </div>
                 ) : (
                   logs.map((log) => (
                     <div key={log.id} className="flex gap-4 group">
                       <span className="text-slate-600 shrink-0">[{formatLogTime(log.created_at)}]</span>
                       <span className={`shrink-0 uppercase font-bold ${
                          log.level === "error" ? "text-rose-400" :
                          log.source === "scheduler" || log.source === "scheduler_edge" ? "text-cyan-400" :
                          log.source === "manual_publish" ? "text-emerald-400" :
                          "text-slate-400"
                       }`}>[{log.source}]</span>
                       <span className="text-slate-300 group-hover:text-white transition">{log.message}</span>
                     </div>
                   ))
                 )}
                 <div className="flex gap-4">
                    <span className="text-rose-500 animate-pulse">_</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
