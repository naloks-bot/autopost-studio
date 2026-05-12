import React, { useState } from "react";
import { Smartphone, Monitor, Facebook, Info } from "lucide-react";
import { getProviderLabel } from "../services/ai-generation.js";

export default function PreviewStudioCard({ form, settings, metadata, imageForm, textProviderRuntime, activeWorkspacePage }) {
  const [device, setDevice] = useState("mobile");
  const activePage = activeWorkspacePage;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
        <div className="flex items-center gap-2">
          <Facebook className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">ตัวอย่างโพสต์</h3>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-950/50 p-1">
          <button
            onClick={() => setDevice("mobile")}
            className={`rounded-md p-1.5 transition ${device === "mobile" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDevice("desktop")}
            className={`rounded-md p-1.5 transition ${device === "desktop" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 justify-center overflow-y-auto bg-slate-950/20 p-6">
        <div className={`transition-all duration-300 ${device === "mobile" ? "w-[320px]" : "w-full max-w-2xl"}`}>
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#242526] shadow-2xl">
            <div className="flex items-center gap-2 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-700">
                <Facebook className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[13px] font-bold leading-tight text-white">{activePage?.label || "หน้าหลัก"}</p>
                <p className="text-[11px] text-slate-400">เมื่อสักครู่ · สาธารณะ</p>
              </div>
            </div>

            <div className="px-3 pb-3">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white">
                {form.content || "ข้อความตัวอย่างจะแสดงตรงนี้"}
              </p>
            </div>

            {form.imageUrl && (
              <div
                className={`flex w-full items-center justify-center overflow-hidden border-y border-white/5 bg-slate-800 ${
                  imageForm.aspectRatio === "1:1"
                    ? "aspect-square"
                    : imageForm.aspectRatio === "4:5"
                      ? "aspect-[4/5]"
                      : imageForm.aspectRatio === "9:16"
                        ? "aspect-[9/16]"
                        : "aspect-video"
                }`}
              >
                <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/5 px-3 py-2 text-slate-400">
              <div className="flex items-center gap-1 text-xs">ถูกใจ 24</div>
              <div className="flex items-center gap-3 text-xs">
                <span>1 ความคิดเห็น</span>
                <span>2 แชร์</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-white/5 bg-white/5 p-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded border border-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500">ประเภท: {metadata.type}</span>
          <span className="rounded border border-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500">โทน: {metadata.tone}</span>
          <span className="rounded border border-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500">ปิดท้าย: {metadata.cta}</span>
          <span className="rounded border border-sky-500/20 bg-sky-500/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-sky-500">ภาพ: {imageForm.aspectRatio}</span>
          <span className="rounded border border-violet-500/20 bg-violet-500/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-violet-400">
            ข้อความ: {getProviderLabel(textProviderRuntime?.activeProvider || settings.textProvider)}
          </span>
          <span className="rounded border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-400">
            โหมดโพสต์: {settings.facebookPublishMode === "live" ? "จริง" : "ทดสอบ"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Info className="h-3 w-3" />
          <p className="text-[9px] italic">หน้านี้ใช้ดูตัวอย่างก่อนบันทึกหรือโพสต์จริง</p>
        </div>
      </div>
    </div>
  );
}
