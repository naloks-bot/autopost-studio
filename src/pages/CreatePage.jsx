import React, { useState } from "react";
import { CheckCircle2, Image as ImageIcon, RefreshCw, Sparkles } from "lucide-react";
import { generateImage } from "../services/ai-image-generation.js";
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
  isGeneratingImage: isGeneratingImageProp,
  isSavingDraft,
  generationError,
}) {
  // Local state for real image generation
  const [generatedImage, setGeneratedImage] = useState(null); // { imageUrl, revisedPrompt, mode }
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState(null);

  // Handler for real image generation via OpenAI or mock
  async function handleGenerateImage() {
    // Prevent duplicate clicks or generation while loading
    if (isGeneratingImage) return;

    // Validate prompt input (use imagePrompt field)
    if (!form.imagePrompt || form.imagePrompt.trim().length < 5) {
      setImageGenerationError("กรุณาใส่ Prompt อย่างน้อย 5 ตัวอักษรเพื่อสร้างรูป");
      return;
    }

    setIsGeneratingImage(true);
    setImageGenerationError(null); // Clear error on retry

    try {
      const result = await generateImage(form.imagePrompt, settings);
      if (result.error) {
        setImageGenerationError(result.error);
        // Keep previous image if error, or clear it? Usually better to keep it unless user clears.
      } else {
        setGeneratedImage({
          imageUrl: result.data.imageUrl,
          revisedPrompt: result.data.revisedPrompt,
          mode: result.mode
        });
      }
    } catch (err) {
      setImageGenerationError(`Unexpected error: ${err.message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  }

  function handleClearImage() {
    setGeneratedImage(null);
    setImageGenerationError(null);
  }

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
          isLoading={isGeneratingImageProp}
          onClick={handleGenerateImagePreview}
          variant="amber"
        />
        <ActionButton
          label="Generate Image"
          icon={ImageIcon}
          isLoading={isGeneratingImage}
          onClick={handleGenerateImage}
          variant="sky"
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
        {generatedImage?.imageUrl && (
          <div className="relative mt-4 space-y-2">
            <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/40">
              <img
                src={generatedImage.imageUrl}
                alt="Generated image preview"
                className="max-h-[28rem] w-full object-cover"
              />
              <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={handleClearImage}
                  className="rounded-full bg-rose-500/80 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm transition hover:bg-rose-600"
                >
                  CLEAR IMAGE
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-1 px-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Provider:</span>
                <span className="text-[10px] font-medium text-cyan-400 uppercase">{generatedImage.mode}</span>
              </div>
              {generatedImage.revisedPrompt && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Revised Prompt:</span>
                  <p className="text-[11px] leading-relaxed text-slate-400 italic">
                    "{generatedImage.revisedPrompt}"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {imageGenerationError && (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 mt-2">
            {imageGenerationError}
          </div>
        )}
    </div>
  );
}

export default CreatePage;
