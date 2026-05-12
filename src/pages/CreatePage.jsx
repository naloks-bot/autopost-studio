import React, { useState } from "react";
import { CheckCircle2, Image as ImageIcon, RefreshCw, Sparkles, X, FileText, Info } from "lucide-react";
import { CONTENT_TYPES, CONTENT_TONES, CONTENT_LENGTHS, CONTENT_CTAS } from "../constants/appConstants";
import { generateImage } from "../services/ai-image-generation.js";
import { uploadImageFromUrl } from "../services/storage.js";
import ActionButton from "../components/ActionButton.jsx";
import ProviderStatusCard from "../components/ProviderStatusCard.jsx";
import WorkspaceContextCard from "../components/WorkspaceContextCard.jsx";
import PromptAssistCard from "../components/PromptAssistCard.jsx";
import ImageStudioCard from "../components/ImageStudioCard.jsx";
import PreviewStudioCard from "../components/PreviewStudioCard.jsx";
import { getProviderLabel } from "../services/ai-generation.js";

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
  textProviderRuntime,
  createNotice,
}) {
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState(null);

  const [metadata, setMetadata] = useState({
    type: "general",
    tone: "friendly",
    length: "medium",
    cta: "none",
  });

  const [imageForm, setImageForm] = useState({
    aspectRatio: "1:1",
    style: "realistic",
    prompt: "",
  });

  const updateMetadata = (key, value) => setMetadata(prev => ({ ...prev, [key]: value }));
  const updateImageForm = (key, value) => setImageForm(prev => ({ ...prev, [key]: value }));

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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-1">
          <ProviderStatusCard settings={settings} textProviderRuntime={textProviderRuntime} />
          <WorkspaceContextCard settings={settings} />
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
            <FileText className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Content Metadata</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
              <select 
                value={metadata.type}
                onChange={(e) => updateMetadata("type", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
              >
                {CONTENT_TYPES.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tone</label>
              <select 
                value={metadata.tone}
                onChange={(e) => updateMetadata("tone", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
              >
                {CONTENT_TONES.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Length</label>
              <select 
                value={metadata.length}
                onChange={(e) => updateMetadata("length", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
              >
                {CONTENT_LENGTHS.map(l => <option key={l.id} value={l.id} className="bg-slate-900">{l.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">CTA</label>
              <select 
                value={metadata.cta}
                onChange={(e) => updateMetadata("cta", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
              >
                {CONTENT_CTAS.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <PromptAssistCard settings={settings} metadata={metadata} />

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Topic & Content</h3>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-bold text-slate-500 uppercase">
                 Provider: {getProviderLabel(textProviderRuntime?.activeProvider || settings.textProvider)}
               </span>
            </div>
          </div>
          <textarea
            value={form.topic}
            onChange={(event) => updateForm("topic", event.target.value)}
            placeholder={settings.defaultTopicHint || "Describe what you want to write about..."}
            className="h-28 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 resize-none"
          />
          <div className="mt-4">
            <ActionButton
              label={isGenerating ? "Generating Content..." : "AI Generate Text"}
              icon={Sparkles}
              isLoading={isGenerating}
              onClick={handleGenerateContent}
              fullWidth
            />
          </div>
          {createNotice && (
            <div
              className={`mt-3 rounded border p-2 text-xs italic ${
                createNotice.tone === "danger"
                  ? "border-rose-400/20 bg-rose-400/10 text-rose-400"
                  : createNotice.tone === "warning"
                    ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                    : createNotice.tone === "success"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                      : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
              }`}
            >
              {createNotice.message}
            </div>
          )}
          {generationError && (
            <p className="mt-3 text-xs text-rose-400 bg-rose-400/10 p-2 rounded border border-rose-400/20 italic">{generationError}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-tight text-slate-500">
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1">
              Text Runtime: {getProviderLabel(textProviderRuntime?.activeProvider || "mock")}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1">
              Preview: Live
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1">
              Publish: {settings.facebookPublishMode === "live" ? "Live" : "Mock Safe"}
            </span>
          </div>
        </div>

        <ImageStudioCard settings={settings} imageForm={imageForm} updateImageForm={updateImageForm} />
      </div>

      {/* Right Panel: Preview & Studio */}
      <div className="flex flex-col space-y-6 lg:h-[calc(100vh-10rem)]">
         <PreviewStudioCard form={form} settings={settings} metadata={metadata} imageForm={imageForm} />
         
         <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-sm">
            <ActionButton
              label="Save Draft to Supabase"
              icon={CheckCircle2}
              isLoading={isSavingDraft}
              onClick={handleInternalSave}
              variant="emerald"
              fullWidth
            />
         </div>
      </div>
    </div>
  );
}

export default CreatePage;
