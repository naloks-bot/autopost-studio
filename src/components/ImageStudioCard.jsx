import React, { useRef } from "react";
import { ImageIcon, Info, Sparkles, Upload, Wand2 } from "lucide-react";
import { IMAGE_ASPECT_RATIOS, IMAGE_STYLE_PRESETS } from "../constants/appConstants";

export default function ImageStudioCard({
  settings,
  imageForm,
  updateImageForm,
  imagePrompt,
  updateImagePrompt,
  handleGenerateImagePrompt,
  handleGenerateImage,
  handleUploadImage,
  isGeneratingImagePrompt,
  isGeneratingImage,
  imageGenerationError,
  generatedImage,
  currentImageUrl,
}) {
  const fileInputRef = useRef(null);

  const handleOpenFilePicker = () => {
    if (typeof fileInputRef.current?.showPicker === "function") {
      fileInputRef.current.showPicker();
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">ภาพประกอบ</h3>
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
          <label className="text-[10px] font-bold uppercase tracking-tight text-slate-500">PROMPT รูปภาพ</label>
          <textarea
            value={imagePrompt}
            onChange={(event) => updateImagePrompt(event.target.value)}
            placeholder="ระบบจะเติม prompt รูปภาพให้อัตโนมัติหลังจากกดสร้างข้อความ และยังแก้เองได้"
            className="h-24 w-full resize-none rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleUploadImage(file);
            }
            event.target.value = "";
          }}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleOpenFilePicker}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 py-3 text-xs font-bold text-violet-200 transition shadow-sm hover:bg-violet-500/20"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>อัปโหลดรูป</span>
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">ตัวเลือกเสริม</p>
            <p className="mt-1 text-[10px] text-slate-500">ถ้าต้องการ prompt ใหม่แบบ manual ยังใช้ flow เดิมได้</p>
          </div>
          <button
            type="button"
            onClick={handleGenerateImagePrompt}
            disabled={isGeneratingImagePrompt}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-slate-300 transition hover:border-violet-400/30 hover:bg-white/5 disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span>{isGeneratingImagePrompt ? "กำลังสร้าง prompt รูปภาพ..." : "สร้าง prompt รูปภาพ"}</span>
          </button>
        </div>

        {currentImageUrl ? (
          <div className="overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="aspect-[4/3] w-full bg-slate-950/50">
              <img src={currentImageUrl} alt="Image preview" className="h-full w-full object-cover" />
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                {generatedImage?.source === "upload" ? "รูปภาพที่อัปโหลดแล้ว" : "ภาพพร้อมใช้งาน"}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {generatedImage?.source === "upload"
                  ? generatedImage?.storageMode === "supabase"
                    ? "รูปนี้ถูกอัปโหลดขึ้นคลาวด์แล้ว และพร้อมใช้กับ preview กับ draft"
                    : "รูปนี้กำลังใช้ไฟล์จากเครื่องสำหรับ preview และ draft"
                  : "ภาพล่าสุดถูกเชื่อมกับตัวอย่างโพสต์และพร้อมบันทึกเป็นร่าง"}
              </p>
            </div>
          </div>
        ) : null}

        {imageGenerationError ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-[10px] text-rose-300">
            {imageGenerationError}
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 text-slate-500">
          <Info className="h-3 w-3" />
          <p className="text-[9px] italic">ระบบจะใช้หัวข้อ ข้อความ และแนวภาพของเพจเพื่อช่วยสร้างหรือเตรียมรูปให้พร้อมกับโพสต์</p>
        </div>
      </div>
    </div>
  );
}
