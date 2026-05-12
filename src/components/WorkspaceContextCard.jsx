import React from "react";
import { Layers, ShieldCheck } from "lucide-react";

function Pill({ label, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-400"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-400"
        : "bg-white/5 text-slate-400";

  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${toneClass}`}>{label}</span>;
}

export default function WorkspaceContextCard({ settings, activeWorkspacePage, className = "" }) {
  const activePage = activeWorkspacePage;
  const isDefault = settings.activePageId === "default";
  const pageReady = Boolean(activePage?.facebookPageId && activePage?.facebookPageAccessToken);

  return (
    <div className={`h-full rounded-2xl border border-white/5 bg-slate-900/40 p-3 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white">เพจที่ใช้งาน</h3>
        </div>
        <Pill label={isDefault ? "หลัก" : "กำลังใช้"} tone={isDefault ? "success" : "neutral"} />
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-white/5 bg-slate-950/35 px-3 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">เพจ</span>
          <p className="mt-1 text-sm font-semibold text-slate-200">{activePage?.label || "หน้าหลัก"}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/5 bg-slate-950/35 px-3 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">เขียน</span>
            <p className="mt-1 truncate text-xs text-slate-300">{activePage?.writingDirection || "ใช้ค่ารวม"}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/35 px-3 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ภาพ</span>
            <p className="mt-1 truncate text-xs text-slate-300">{activePage?.imageDirection || "ใช้ค่ารวม"}</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/35 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`h-3.5 w-3.5 ${pageReady ? "text-emerald-400" : "text-amber-400"}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">พร้อมโพสต์</span>
          </div>
          <Pill label={pageReady ? "ใช้ค่าเพจ" : "ใช้ค่ากลาง"} tone={pageReady ? "success" : "warning"} />
        </div>
      </div>
    </div>
  );
}
