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
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState(null);

  // Handler for real image generation via OpenAI or mock
  async function handleGenerateImage() {
    // Validate prompt input (use imagePrompt field)
    if (!form.imagePrompt || form.imagePrompt.trim().length < 5) {
      setImageGenerationError("กรุณาใส่ Prompt อย่างน้อย 5 ตัวอักษรเพื่อสร้างรูป");
      return;
    }
    setIsGeneratingImage(true);
    setImageGenerationError(null);
    const result = await generateImage(form.imagePrompt, settings);
    if (result.error) {
      setImageGenerationError(result.error);
      setGeneratedImage(null);
    } else {
      setGeneratedImage(result.data.imageUrl);
    }
    setIsGeneratingImage(false);
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
        {generatedImage && (
          <img
            src={generatedImage}
            alt="Generated image preview"
            className="max-h-[28rem] w-full rounded-[1.5rem] border border-white/10 object-cover mt-4"
          />
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
