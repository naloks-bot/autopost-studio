import React from "react";
import { ShieldCheck, Zap } from "lucide-react";
import { IMAGE_PROVIDERS, TEXT_PROVIDERS } from "../constants/appConstants";
import { getProviderLabel, getTextProviderRuntime } from "../services/ai-generation.js";

function Pill({ label, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-400"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-400"
        : tone === "danger"
          ? "bg-rose-500/10 text-rose-400"
          : "bg-white/5 text-slate-400";

  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${toneClass}`}>{label}</span>;
}

export default function ProviderStatusCard({ settings, textProviderRuntime: runtimeOverride = null, className = "" }) {
  const textProvider = TEXT_PROVIDERS.find((item) => item.id === settings.textProvider) || TEXT_PROVIDERS[0];
  const imageProvider = IMAGE_PROVIDERS.find((item) => item.id === settings.imageProvider) || IMAGE_PROVIDERS[0];
  const textRuntime = runtimeOverride || getTextProviderRuntime(settings);
  const isLive = settings.facebookPublishMode === "live";

  const imageReady =
    settings.imageProvider === "mock" ||
    ((settings.imageProvider === "gpt-image" || settings.imageProvider === "dalle") && Boolean(settings.openaiApiKey));

  return (
    <div className={`h-full rounded-2xl border border-white/5 bg-slate-900/40 p-3 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-400" />
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white">AI</h3>
        </div>
        <Pill label={textRuntime.tone === "warning" ? "พร้อมสำรอง" : "พร้อม"} tone={textRuntime.tone === "warning" ? "warning" : "success"} />
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-white/5 bg-slate-950/35 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ข้อความ</span>
            <Pill label={textRuntime.statusLabel} tone={textRuntime.tone === "warning" ? "warning" : "success"} />
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-200">
            {textProvider.label}
            {textRuntime.activeProvider !== settings.textProvider ? ` → ${getProviderLabel(textRuntime.activeProvider)}` : ""}
          </p>
          {settings.textProvider === "gemini" ? (
            <p className="mt-1 text-[11px] text-slate-500">Model: {settings.geminiModel || "gemini-2.5-flash"}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-950/35 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ภาพ</span>
            <Pill label={imageReady ? "พร้อม" : "รอ key"} tone={imageReady ? "success" : "warning"} />
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-200">{imageProvider.label}</p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/35 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`h-3.5 w-3.5 ${isLive ? "text-rose-400" : "text-emerald-400"}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">โหมด</span>
          </div>
          <Pill label={isLive ? "จริง" : "ทดสอบ"} tone={isLive ? "danger" : "success"} />
        </div>
      </div>
    </div>
  );
}
