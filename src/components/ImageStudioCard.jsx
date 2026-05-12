import React from "react";
import { ImageIcon, Info, Sparkles, Wand2 } from "lucide-react";
import { IMAGE_ASPECT_RATIOS, IMAGE_STYLE_PRESETS } from "../constants/appConstants";

export default function ImageStudioCard({
  settings,
  imageForm,
  updateImageForm,
  imagePrompt,
  updateImagePrompt,
  handleGenerateImagePrompt,
  handleGenerateImage,
  isGeneratingImagePrompt,
  isGeneratingImage,
  imageGenerationError,
  generatedImage,
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">สร้างภาพ</h3>
        </div>
        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
          ผู้ให้บริการ: {settings.imageProvider}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-tight text-slate-500">สัดส่วนภาพ</label>
            <select
              value={imageForm.aspectRatio}
              onChange={(event) => updateImageForm("aspectRatio", event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 outline-none focus:border-sky-400"
            >
              {IMAGE_ASPECT_RATIOS.map((item) => (
                <option key={item.id} value={item.id} className="bg-slate-900">
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-tight text-slate-500">สไตล์ภาพ</label>
            <select
              value={imageForm.style}
              onChange={(event) => updateImageForm("style", event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 outline-none focus:border-sky-400"
            >
              {IMAGE_STYLE_PRESETS.map((item) => (
                <option key={item.id} value={item.id} className="bg-slate-900">
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-tight text-slate-500">Prompt รูปภาพ</label>
          <textarea
            value={imagePrompt}
            onChange={(event) => updateImagePrompt(event.target.value)}
            placeholder="คำอธิบายภาพจะถูกเติมที่นี่หลังจากกดสร้าง prompt รูปภาพ"
            className="h-24 w-full resize-none rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleGenerateImagePrompt}
            disabled={isGeneratingImagePrompt}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 py-3 text-xs font-bold text-violet-300 transition shadow-sm hover:bg-violet-500/20 disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isGeneratingImagePrompt ? "กำลังสร้าง prompt รูปภาพ..." : "สร้าง prompt รูปภาพ"}</span>
          </button>
          <button
            type="button"
            onClick={handleGenerateImage}
            disabled={isGeneratingImage || !imagePrompt.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 py-3 text-xs font-bold text-sky-400 transition shadow-sm hover:bg-sky-500/20 disabled:opacity-60"
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>{isGeneratingImage ? "กำลังสร้างภาพ..." : "สร้างภาพ"}</span>
          </button>
        </div>

        {generatedImage?.imageUrl ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">ภาพพร้อมแล้ว</p>
            <p className="mt-1 text-[10px] text-slate-400">ภาพล่าสุดถูกเชื่อมกับตัวอย่างโพสต์และพร้อมบันทึกเป็นร่าง</p>
          </div>
        ) : null}

        {imageGenerationError ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-[10px] text-rose-300">
            {imageGenerationError}
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 text-slate-500">
          <Info className="h-3 w-3" />
          <p className="text-[9px] italic">ระบบจะใช้หัวข้อ ข้อความ และแนวภาพของเพจเพื่อช่วยสร้าง prompt ก่อนส่งไปยังผู้ให้บริการภาพ</p>
        </div>
      </div>
    </div>
  );
}
