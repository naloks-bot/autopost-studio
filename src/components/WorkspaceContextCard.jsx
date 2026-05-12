import React from "react";
import { Layers, ShieldCheck, Info } from "lucide-react";

export default function WorkspaceContextCard({ settings, activeWorkspacePage }) {
  const activePage = activeWorkspacePage;
  const isDefault = settings.activePageId === "default";
  const usesGlobalConfig = !activePage?.facebookPageId || !activePage?.facebookPageAccessToken;

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
        <Layers className="h-4 w-4 text-cyan-400" />
        <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Workspace Context</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Active Facebook Page</p>
            <p className="text-xs font-semibold text-slate-200">{activePage?.label || "Default Page"}</p>
          </div>
          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${isDefault ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
            {isDefault ? 'Compatible' : 'Sandbox / Demo'}
          </span>
        </div>

        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-slate-500" />
            <span className="text-[9px] text-slate-400 uppercase tracking-tight">
              Token Status: {usesGlobalConfig ? "Using Global Facebook Settings" : "Page-Specific Foundation Ready"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Info className="h-3 w-3" />
            <span className="text-[9px] italic">The active page controls draft context and safe publish routing.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
