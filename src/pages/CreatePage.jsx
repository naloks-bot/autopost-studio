import React, { useState } from "react";
import { CheckCircle2, Image as ImageIcon, RefreshCw, Sparkles, X } from "lucide-react";
import { generateImage } from "../services/ai-image-generation.js";
import { uploadImageFromUrl } from "../services/storage.js";
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
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState(null);

  async function handleGenerateImage() {
    if (isGeneratingImage) return;
    if (!form.imagePrompt || form.imagePrompt.trim().length < 5) {
      setImageGenerationError("กรุณาใส่ Prompt อย่างน้อย 5 ตัวอักษรเพื่อสร้างรูป");
      return;
    }
    setIsGeneratingImage(true);
    setImageGenerationError(null);
    try {
      const result = await generateImage(form.imagePrompt, settings);
      if (result.error) {
        setImageGenerationError(result.error);
      } else {
        const rawUrl = result.data.imageUrl;
        let finalUrl = rawUrl;
        let storagePath = null;
        let storageMode = "external";
        const today = new Date().toISOString().split("T")[0];
        const filename = `gen-${Date.now()}.webp`;
        const filePath = `generated/${today}/${filename}`;
        const uploadResult = await uploadImageFromUrl(filePath, rawUrl);
        if (uploadResult.data) {
          finalUrl = uploadResult.data;
          storagePath = filePath;
          storageMode = "supabase";
        }
        setGeneratedImage({
          imageUrl: finalUrl,
          revisedPrompt: result.data.revisedPrompt,
          mode: result.mode,
          storagePath,
          storageMode,
        });
      }
    } catch (err) {
      setImageGenerationError(`Unexpected error: ${err.message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  }

  function handleInternalSave() {
    const extraData = generatedImage?.imageUrl
      ? {
          image_url: generatedImage.imageUrl,
          image_prompt: form.imagePrompt,
          image_provider: generatedImage.mode,
          image_revised_prompt: generatedImage.revisedPrompt,
          image_storage_path: generatedImage.storagePath || null,
          image_storage_mode: generatedImage.storageMode || null,
        }
      : {};
    handleSaveDraft(extraData);
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Left Panel: Inputs & Controls */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-cyan-400 uppercase tracking-wider">1. Input Topic</h3>
          <textarea
            value={form.topic}
            onChange={(event) => updateForm("topic", event.target.value)}
            placeholder={settings.defaultTopicHint || "เช่น โปรโมตบริการออกแบบเว็บไซต์สำหรับธุรกิจขนาดเล็ก"}
            className="h-28 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
          />
          <div className="mt-4">
            <ActionButton
              label={isGenerating ? "กำลังสร้างข้อความ..." : "AI ช่วยสร้างข้อความ"}
              icon={Sparkles}
              isLoading={isGenerating}
              onClick={handleGenerateContent}
              fullWidth
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">2. Image Concept</h3>
            <button
              type="button"
              onClick={handleGenerateImagePrompt}
              disabled={isGeneratingImagePrompt}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-cyan-400 disabled:opacity-50"
            >
              {isGeneratingImagePrompt ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI ช่วยคิด Prompt
            </button>
          </div>
          <textarea
            value={form.imagePrompt}
            onChange={(event) => updateForm("imagePrompt", event.target.value)}
            placeholder="Prompt สำหรับสร้างรูปภาพประกอบ"
            className="h-28 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ActionButton
              label="Preview รูป"
              icon={ImageIcon}
              isLoading={isGeneratingImageProp}
              onClick={handleGenerateImagePreview}
              variant="amber"
            />
            <ActionButton
              label="Generate Real"
              icon={ImageIcon}
              isLoading={isGeneratingImage}
              onClick={handleGenerateImage}
              variant="sky"
            />
          </div>
          {imageGenerationError && (
            <p className="mt-3 text-xs text-rose-400">{imageGenerationError}</p>
          )}
        </div>
      </div>

      {/* Right Panel: Preview & Actions */}
      <div className="flex flex-col space-y-6 lg:h-[calc(100vh-10rem)]">
        <div className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl overflow-hidden">
           <div className="border-b border-white/5 bg-white/5 px-6 py-3">
             <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Draft Preview</h3>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {generationError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {generationError}
                </div>
              )}

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase text-slate-500 tracking-widest">Generated Content</label>
                <textarea
                  value={form.content}
                  onChange={(event) => updateForm("content", event.target.value)}
                  placeholder="ข้อความที่ AI สร้างจะปรากฏที่นี่..."
                  className="min-h-[200px] w-full bg-transparent text-sm leading-relaxed outline-none border-none resize-none"
                />
              </div>

              {(form.imageUrl || generatedImage?.imageUrl) && (
                <div className="relative group">
                  <img
                    src={generatedImage?.imageUrl || form.imageUrl}
                    alt="Preview"
                    className="w-full rounded-xl border border-white/10 object-cover shadow-2xl"
                  />
                  {(generatedImage?.imageUrl || form.imageUrl) && (
                    <button 
                      onClick={() => {
                        setGeneratedImage(null);
                        updateForm("imageUrl", "");
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/60 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {generatedImage?.mode && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">AI Mode:</span>
                      <span className="text-[10px] font-bold text-cyan-500 uppercase">{generatedImage.mode}</span>
                    </div>
                  )}
                </div>
              )}
           </div>

           <div className="border-t border-white/5 bg-white/5 p-6">
              <ActionButton
                label="บันทึกโพสต์ (Save Draft)"
                icon={CheckCircle2}
                isLoading={isSavingDraft}
                onClick={handleInternalSave}
                variant="emerald"
                fullWidth
              />
           </div>
        </div>
      </div>
    </div>
  );
}

export default CreatePage;
