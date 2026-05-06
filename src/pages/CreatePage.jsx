import React from "react";
import { CheckCircle2, Image as ImageIcon, RefreshCw, Sparkles } from "lucide-react";
import ActionButton from "../components/ActionButton.jsx";

function CreatePage({
  form,
  settings,
  updateForm,
  handleGenerateContent,
  handleGenerateImagePrompt,
  handleGenerateImagePreview,
  handleSaveDraft,
  isGenerating,
  isGeneratingImagePrompt,
  isGeneratingImage,
  isSavingDraft,
  generationError,
}) {
  return (
    <div className="space-y-6">
      {generationError && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {generationError}
        </div>
      )}
      <div>
        <label className="mb-2 block text-sm text-slate-300">หัวข้อโพสต์</label>
        <textarea
          value={form.topic}
          onChange={(event) => updateForm("topic", event.target.value)}
          placeholder={
            settings.defaultTopicHint || "เช่น โปรโมตบริการออกแบบเว็บไซต์สำหรับธุรกิจขนาดเล็ก"
          }
          className="h-32 w-full rounded-[1.5rem] border border-white/10 bg-slate-900/80 px-5 py-4 outline-none transition focus:border-cyan-400"
        />
      </div>

      <ActionButton
        label={isGenerating ? "กำลังสร้าง..." : "สร้างข้อความตัวอย่าง"}
        icon={Sparkles}
        isLoading={isGenerating}
        onClick={handleGenerateContent}
        fullWidth
      />

      <div>
        <label className="mb-2 block text-sm text-slate-300">เนื้อหาโพสต์</label>
        <textarea
          value={form.content}
          onChange={(event) => updateForm("content", event.target.value)}
          placeholder="ข้อความโพสต์ที่จะบันทึกลงระบบ"
          className="h-64 w-full rounded-[1.5rem] border border-white/10 bg-slate-900/80 px-5 py-4 outline-none transition focus:border-cyan-400"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm text-slate-300">Prompt รูป</label>
          <button
            type="button"
            onClick={handleGenerateImagePrompt}
            disabled={isGeneratingImagePrompt}
            className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 transition hover:text-cyan-300 disabled:opacity-50"
          >
            {isGeneratingImagePrompt ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            AI ช่วยคิด Prompt
          </button>
        </div>
        <textarea
          value={form.imagePrompt}
          onChange={(event) => updateForm("imagePrompt", event.target.value)}
          placeholder="Prompt สำหรับ image generation"
          className="h-32 w-full rounded-[1.5rem] border border-white/10 bg-slate-900/80 px-5 py-4 outline-none transition focus:border-cyan-400"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <ActionButton
          label="สร้างตัวอย่างรูป"
          icon={ImageIcon}
          isLoading={isGeneratingImage}
          onClick={handleGenerateImagePreview}
          variant="amber"
        />
        <ActionButton
          label="บันทึก Draft"
          icon={CheckCircle2}
          isLoading={isSavingDraft}
          onClick={handleSaveDraft}
          variant="emerald"
        />
      </div>

      {form.imageUrl && (
        <img
          src={form.imageUrl}
          alt="Draft preview"
          className="max-h-[28rem] w-full rounded-[1.5rem] border border-white/10 object-cover"
        />
      )}
    </div>
  );
}

export default CreatePage;
