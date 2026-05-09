import React from "react";
import { Terminal, Filter, Download, Copy, Info, History, ShieldAlert, Cpu, Share2 } from "lucide-react";

export default function LogsPage() {
  // Mock logs for display
  const mockLogs = [
    { id: 1, type: "system", message: "Application initialized in Production mode", time: "19:44:30" },
    { id: 2, type: "ai", message: "Text provider set to Mock (Safe)", time: "19:44:31" },
    { id: 3, type: "scheduler", message: "V1 Processor heartbeat detected", time: "19:45:00" },
    { id: 4, type: "error", message: "Facebook API: Invalid token context (Preview only)", time: "19:50:12" },
    { id: 5, type: "publish", message: "Mock post simulation successful", time: "20:00:05" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                 <Terminal className="h-6 w-6" />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-white tracking-tight">System Logs</h2>
                 <p className="text-xs text-slate-400">Monitor application activity and AI routing</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition uppercase tracking-tight">
                 <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white transition uppercase tracking-tight">
                 <Copy className="h-3.5 w-3.5" /> Copy
              </button>
           </div>
        </div>

        <div className="mt-6 flex items-start gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
           <Info className="h-5 w-5 text-rose-400 mt-0.5" />
           <div>
              <p className="text-xs font-semibold text-rose-300">Foundation Mode Active</p>
              <p className="text-[10px] text-rose-400/80 leading-relaxed">
                Logs shown below are session-based mock data for UI demonstration. Persistent system logging is planned for the next architectural phase.
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="space-y-4">
           <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Log Categories</h3>
              <div className="space-y-1">
                 {[
                   { label: "All Logs", icon: History, count: 5, active: true },
                   { label: "AI Engines", icon: Cpu, count: 1, active: false },
                   { label: "Scheduler", icon: History, count: 1, active: false },
                   { label: "Publishing", icon: Share2, count: 1, active: false },
                   { label: "Errors", icon: ShieldAlert, count: 1, active: false },
                 ].map((cat, i) => (
                    <button key={i} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${cat.active ? 'bg-rose-500/10 text-rose-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
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

        {/* Log Viewer */}
        <div className="lg:col-span-3">
           <div className="rounded-2xl border border-white/5 bg-slate-950/80 shadow-inner overflow-hidden">
              <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                 <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Live Terminal Output</span>
                 </div>
                 <span className="text-[9px] text-slate-600">UTC: 2026-05-09 13:02:15</span>
              </div>
              <div className="p-4 font-mono text-[11px] leading-relaxed space-y-2 h-[400px] overflow-y-auto">
                 {mockLogs.map(log => (
                    <div key={log.id} className="flex gap-4 group">
                       <span className="text-slate-600 shrink-0">[{log.time}]</span>
                       <span className={`shrink-0 uppercase font-bold ${
                          log.type === 'error' ? 'text-rose-400' : 
                          log.type === 'ai' ? 'text-violet-400' :
                          log.type === 'publish' ? 'text-emerald-400' : 'text-slate-400'
                       }`}>[{log.type}]</span>
                       <span className="text-slate-300 group-hover:text-white transition">{log.message}</span>
                    </div>
                 ))}
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
