import React, { useState } from "react";
import { Smartphone, Monitor, Facebook, Info, X } from "lucide-react";
import { getProviderLabel } from "../services/ai-generation.js";

function getAspectRatioClass(aspectRatio) {
  if (aspectRatio === "1:1") return "aspect-square";
  if (aspectRatio === "4:5") return "aspect-[4/5]";
  if (aspectRatio === "9:16") return "aspect-[9/16]";
  return "aspect-video";
}

function guardPreviewCaption(caption = "") {
  return String(caption || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^IMAGE[_\s-]*PROMPT(?:\s*:|\s*$)/i.test(trimmed)) return false;
      if (/^ภาพประกอบ(?:\s*:|\s*$)/i.test(trimmed)) return false;
      if (/^สไตล์ภาพ(?:\s*:|\s*$)/i.test(trimmed)) return false;
      if (/^โทนสีหลัก(?:\s*:|\s*$)/i.test(trimmed)) return false;
      if (/^ข้อความ(?:\s*Caption)?(?:\s*:|\s*$)/i.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function FacebookPostCard({ caption, imageUrl, activePage, imageForm, compact = false, onOpen = null }) {
  const finalCaption = guardPreviewCaption(caption);

  return (
    <button
      type="button"
      onClick={onOpen || undefined}
      aria-label={onOpen ? "Open preview modal" : undefined}
      className={`w-full overflow-hidden rounded-xl border border-white/5 bg-[#242526] shadow-2xl ${
        onOpen ? "cursor-pointer text-left transition hover:border-cyan-400/30" : "cursor-default text-left"
      }`}
    >
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
        <p className={`whitespace-pre-wrap text-white ${compact ? "text-[14px] leading-relaxed" : "text-[15px] leading-7"}`}>
          {finalCaption || "ข้อความตัวอย่างจะแสดงตรงนี้"}
        </p>
      </div>

      {imageUrl ? (
        <div className={`flex w-full items-center justify-center overflow-hidden border-y border-white/5 bg-slate-800 ${getAspectRatioClass(imageForm.aspectRatio)}`}>
          <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-white/5 px-3 py-2 text-slate-400">
        <div className="flex items-center gap-1 text-xs">ถูกใจ 24</div>
        <div className="flex items-center gap-3 text-xs">
          <span>1 ความคิดเห็น</span>
          <span>2 แชร์</span>
        </div>
      </div>
    </button>
  );
}

export default function PreviewStudioCard({
  caption,
  imageUrl,
  settings,
  metadata,
  imageForm,
  textProviderRuntime,
  activeWorkspacePage,
  isModalOpen,
  onOpenModal,
  onCloseModal,
}) {
  const [device, setDevice] = useState("desktop");
  const activePage = activeWorkspacePage;

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">ตัวอย่างโพสต์</h3>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-950/50 p-1">
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`rounded-md p-1.5 transition ${device === "mobile" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`rounded-md p-1.5 transition ${device === "desktop" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 justify-center overflow-y-auto bg-slate-950/20 p-6">
          <div className={`transition-all duration-300 ${device === "mobile" ? "w-[320px]" : "w-full max-w-2xl"}`}>
            <FacebookPostCard
              caption={caption}
              imageUrl={imageUrl}
              activePage={activePage}
              imageForm={imageForm}
              compact
              onOpen={onOpenModal}
            />
          </div>
        </div>

        <div className="space-y-3 border-t border-white/5 bg-white/5 p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded border border-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500">ประเภท: {metadata.type}</span>
            <span className="rounded border border-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500">โทน: {metadata.tone}</span>
            <span className="rounded border border-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500">ปิดท้าย: {metadata.cta}</span>
            <span className="rounded border border-sky-500/20 bg-sky-500/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-sky-500">ภาพ: {imageForm.aspectRatio}</span>
            <span className="rounded border border-violet-500/20 bg-violet-500/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-violet-400">
              ข้อความ: {getProviderLabel(textProviderRuntime?.selectedProvider || settings.textProvider)}
            </span>
            <span className="rounded border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-400">
              โหมดโพสต์: {settings.facebookPublishMode === "live" ? "จริง" : "ทดสอบ"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Info className="h-3 w-3" />
            <p className="text-[9px] italic">คลิกที่กรอบตัวอย่างโพสต์เพื่อเปิดดูแบบขยาย</p>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">ตัวอย่างโพสต์แบบขยาย</p>
                <p className="mt-1 text-xs text-slate-400">อ่านข้อความก่อนบันทึกหรือโพสต์จริงได้ชัดขึ้น</p>
              </div>
              <button
                type="button"
                onClick={onCloseModal}
                className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto bg-slate-950/30 p-4 sm:p-6">
              <div className="mx-auto max-w-2xl">
                <FacebookPostCard caption={caption} imageUrl={imageUrl} activePage={activePage} imageForm={imageForm} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
