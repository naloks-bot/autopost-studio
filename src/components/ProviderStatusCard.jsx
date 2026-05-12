import React from "react";
import { Zap, ShieldCheck, Info } from "lucide-react";
import { TEXT_PROVIDERS, IMAGE_PROVIDERS } from "../constants/appConstants";
import { getProviderLabel, getTextProviderRuntime } from "../services/ai-generation.js";

export default function ProviderStatusCard({ settings, textProviderRuntime: runtimeOverride = null }) {
  const textProv = TEXT_PROVIDERS.find(p => p.id === settings.textProvider) || TEXT_PROVIDERS[0];
  const imageProv = IMAGE_PROVIDERS.find(p => p.id === settings.imageProvider) || IMAGE_PROVIDERS[0];
  const isFbLive = settings.facebookPublishMode === "live";
  const textRuntime = getTextProviderRuntime(settings, runtimeOverride);

  function getStatus(providerId, settings) {
    if (providerId === "mock") return { label: "Ready", color: "text-emerald-400 bg-emerald-400/10" };
    if (providerId === "codex") return { label: "Local workflow", color: "text-amber-400 bg-amber-400/10" };
    
    const hasKey = (providerId === "openai" || providerId === "gpt-image" || providerId === "dalle") 
      ? settings.openaiApiKey 
      : (providerId === "gemini" ? settings.geminiApiKey : false);
      
    return hasKey 
      ? { label: "Ready", color: "text-emerald-400 bg-emerald-400/10" }
      : { label: "Requires API Key", color: "text-rose-400 bg-rose-400/10" };
  }

  const textStatus = textRuntime.tone === "warning"
    ? { label: textRuntime.statusLabel, color: "text-amber-400 bg-amber-400/10" }
    : { label: textRuntime.statusLabel, color: "text-emerald-400 bg-emerald-400/10" };
  const imageStatus = getStatus(settings.imageProvider, settings);

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
        <Zap className="h-4 w-4 text-violet-400" />
        <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">AI Runtime Status</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Text Generation</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200">
              {textProv.label}
              {textRuntime.activeProvider !== settings.textProvider ? ` -> ${getProviderLabel(textRuntime.activeProvider)}` : ""}
            </span>
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${textStatus.color}`}>
              {textStatus.label}
            </span>
          </div>
          <p className="text-[9px] text-slate-500 italic">{textRuntime.detail}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Image Generation</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200">{imageProv.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${imageStatus.color}`}>
              {imageStatus.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className={`h-3 w-3 ${isFbLive ? 'text-rose-500' : 'text-emerald-500'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-tight ${isFbLive ? 'text-rose-500' : 'text-emerald-500'}`}>
            Publish Mode: {isFbLive ? 'LIVE' : 'MOCK'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <Info className="h-3 w-3" />
          <span className="text-[9px] italic">Routing logic: V1 Stable</span>
        </div>
      </div>
    </div>
  );
}
