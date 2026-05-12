import React, { useState } from "react";
import { Smartphone, Monitor, Facebook, Info } from "lucide-react";
import { getProviderLabel } from "../services/ai-generation.js";

export default function PreviewStudioCard({ form, settings, metadata, imageForm, textProviderRuntime, activeWorkspacePage }) {
  const [device, setDevice] = useState("mobile");
  const activePage = activeWorkspacePage;

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl overflow-hidden">
      <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Facebook className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Preview Studio</h3>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-950/50 p-1 border border-white/5">
          <button 
            onClick={() => setDevice("mobile")}
            className={`p-1.5 rounded-md transition ${device === 'mobile' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={() => setDevice("desktop")}
            className={`p-1.5 rounded-md transition ${device === 'desktop' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-950/20 p-6 flex justify-center">
        <div className={`transition-all duration-300 ${device === 'mobile' ? 'w-[320px]' : 'w-full max-w-2xl'}`}>
           <div className="bg-[#242526] rounded-xl overflow-hidden shadow-2xl border border-white/5">
              {/* FB Header */}
              <div className="p-3 flex items-center gap-2">
                 <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center border border-white/10">
                    <Facebook className="h-5 w-5 text-blue-500" />
                 </div>
                 <div>
                    <p className="text-[13px] font-bold text-white leading-tight">{activePage?.label || "Default Page"}</p>
                    <p className="text-[11px] text-slate-400">Just now · 🌎</p>
                 </div>
              </div>

              {/* Content */}
              <div className="px-3 pb-3">
                 <p className="text-[14px] text-white whitespace-pre-wrap leading-relaxed">
                   {form.content || "Content preview will appear here..."}
                 </p>
              </div>

              {/* Image Area */}
              {(form.imageUrl) && (
                <div className={`w-full bg-slate-800 flex items-center justify-center overflow-hidden border-y border-white/5 ${
                  imageForm.aspectRatio === '1:1' ? 'aspect-square' : 
                  imageForm.aspectRatio === '4:5' ? 'aspect-[4/5]' : 
                  imageForm.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
                }`}>
                   <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              {/* FB Interactions */}
              <div className="px-3 py-2 border-t border-white/5 flex items-center justify-between text-slate-400">
                 <div className="flex items-center gap-1 text-xs">👍 24</div>
                 <div className="flex items-center gap-3 text-xs">
                    <span>1 comment</span>
                    <span>2 shares</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="border-t border-white/5 bg-white/5 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
           <span className="text-[8px] font-bold text-slate-500 uppercase px-1.5 py-0.5 rounded border border-white/5">TYPE: {metadata.type}</span>
           <span className="text-[8px] font-bold text-slate-500 uppercase px-1.5 py-0.5 rounded border border-white/5">TONE: {metadata.tone}</span>
           <span className="text-[8px] font-bold text-slate-500 uppercase px-1.5 py-0.5 rounded border border-white/5">CTA: {metadata.cta}</span>
           <span className="text-[8px] font-bold text-sky-500 uppercase px-1.5 py-0.5 rounded border border-sky-500/20 bg-sky-500/5">RATIO: {imageForm.aspectRatio}</span>
           <span className="text-[8px] font-bold text-violet-400 uppercase px-1.5 py-0.5 rounded border border-violet-500/20 bg-violet-500/5">
             TEXT: {getProviderLabel(textProviderRuntime?.activeProvider || settings.textProvider)}
           </span>
           <span className="text-[8px] font-bold text-emerald-400 uppercase px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5">
             PUBLISH: {settings.facebookPublishMode === "live" ? "LIVE" : "MOCK SAFE"}
           </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
           <Info className="h-3 w-3" />
           <p className="text-[9px] italic">Preview Studio is for visualization. Real publishing preserves stable logic.</p>
        </div>
      </div>
    </div>
  );
}
