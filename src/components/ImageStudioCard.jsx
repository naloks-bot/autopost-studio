import React from "react";
import { ImageIcon, Wand2, Info } from "lucide-react";
import { IMAGE_ASPECT_RATIOS, IMAGE_STYLE_PRESETS } from "../constants/appConstants";

export default function ImageStudioCard({ settings, imageForm, updateImageForm }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">AI Image Studio</h3>
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 rounded bg-white/5">
          Provider: {settings.imageProvider}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Aspect Ratio</label>
            <select 
              value={imageForm.aspectRatio}
              onChange={(e) => updateImageForm("aspectRatio", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 outline-none focus:border-sky-400"
            >
              {IMAGE_ASPECT_RATIOS.map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Style Preset</label>
            <select 
              value={imageForm.style}
              onChange={(e) => updateImageForm("style", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 outline-none focus:border-sky-400"
            >
              {IMAGE_STYLE_PRESETS.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Custom Prompt Assist</label>
          <textarea
            value={imageForm.prompt}
            onChange={(e) => updateImageForm("prompt", e.target.value)}
            placeholder="Describe your visual concept..."
            className="h-20 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 resize-none"
          />
        </div>

        <button 
          type="button"
          onClick={() => window.alert("Image generation routing will be connected in a later phase.")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500/10 py-3 text-xs font-bold text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition shadow-sm"
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span>GENERATE IMAGE (PLANNING ONLY)</span>
        </button>

        <div className="flex items-center gap-1.5 text-slate-500">
           <Info className="h-3 w-3" />
           <p className="text-[9px] italic">Studio controls are for workflow planning. AI API integration comes later.</p>
        </div>
      </div>
    </div>
  );
}
