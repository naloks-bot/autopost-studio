import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, CheckCircle2, FileText, Send, Sparkles } from "lucide-react";
import { CONTENT_CTAS, CONTENT_LENGTHS, CONTENT_TONES, CONTENT_TYPES } from "../constants/appConstants";
import { generateImage } from "../services/ai-image-generation.js";
import { uploadImageBlob, uploadImageFromUrl } from "../services/storage.js";
import { getProviderLabel, sanitizeGeneratedCaption } from "../services/ai-generation.js";
import ActionButton from "../components/ActionButton.jsx";
import PromptAssistCard from "../components/PromptAssistCard.jsx";
import ImageStudioCard from "../components/ImageStudioCard.jsx";
import PreviewStudioCard from "../components/PreviewStudioCard.jsx";
import ProviderStatusCard from "../components/ProviderStatusCard.jsx";
import WorkspaceContextCard from "../components/WorkspaceContextCard.jsx";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸­à¹ˆà¸²à¸™à¹„à¸Ÿà¸¥à¹Œà¸£à¸¹à¸›à¸ à¸²à¸žà¹„à¸”à¹‰"));
    reader.readAsDataURL(file);
  });
}

function getFileExtension(file) {
  const original = file?.name?.split(".").pop()?.toLowerCase();
  if (original && ["jpg", "jpeg", "png", "webp"].includes(original)) {
    return original === "jpeg" ? "jpg" : original;
  }

  if (file?.type === "image/png") return "png";
  if (file?.type === "image/webp") return "webp";
  return "jpg";
}

function isUnsafeDraftImageUrl(value = "") {
  const next = String(value || "").trim();
  if (!next) return false;
  return (
    next.startsWith("blob:") ||
    next.startsWith("data:") ||
    next.startsWith("file:") ||
    next.startsWith("http://localhost") ||
    next.startsWith("https://localhost") ||
    next.startsWith("http://127.0.0.1") ||
    next.startsWith("https://127.0.0.1")
  );
}

function CreatePage({
  form,
  settings,
  activeWorkspacePage,
  updateForm,
  handleGenerateContent,
  handleGenerateImagePrompt,
  handleSaveDraft,
  isGenerating,
  isGeneratingImagePrompt,
  isGeneratingImage: isGeneratingImageProp,
  isSavingDraft,
  generationError,
  textProviderRuntime,
  createNotice,
  editingDraft,
  onOpenStatusTab,
}) {
  const [imageAsset, setImageAsset] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState(null);
  const [usePageGuidance, setUsePageGuidance] = useState(true);
  const [metadata, setMetadata] = useState({
    type: "general",
    tone: "friendly",
    length: "medium",
    cta: "none",
  });
  const [imageForm, setImageForm] = useState({
    aspectRatio: "4:5",
    style: "realistic",
  });
  const previewObjectUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!form.imageUrl) {
      if (previewObjectUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
      previewObjectUrlRef.current = null;
      setImageAsset(null);
      return;
    }

    setImageAsset((current) => {
      if (current?.imageUrl === form.imageUrl || current?.previewUrl === form.imageUrl) {
        return current;
      }

      return {
        imageUrl: form.imageUrl,
        previewUrl: form.imageUrl,
        provider: editingDraft?.image_provider || null,
        revisedPrompt: editingDraft?.image_revised_prompt || null,
        storagePath: editingDraft?.image_storage_path || null,
        storageMode: editingDraft?.image_storage_mode || null,
        source: "existing",
      };
    });
  }, [editingDraft, form.imageUrl]);

  const hasPageGuidance = useMemo(
    () =>
      Boolean(
        activeWorkspacePage?.writingDirection ||
          activeWorkspacePage?.imageDirection ||
          activeWorkspacePage?.tone ||
          activeWorkspacePage?.visualStyle
      ),
    [activeWorkspacePage]
  );

  const effectiveMetadata = useMemo(() => {
    if (!usePageGuidance) return metadata;

    return {
      ...metadata,
      tone: activeWorkspacePage?.tone ? "professional" : metadata.tone,
    };
  }, [activeWorkspacePage, metadata, usePageGuidance]);

  const updateMetadata = (key, value) => setMetadata((prev) => ({ ...prev, [key]: value }));
  const updateImageForm = (key, value) => setImageForm((prev) => ({ ...prev, [key]: value }));
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const pageGuidanceContext = useMemo(
    () => ({
      pageLabel: activeWorkspacePage?.label || "",
      pageWritingDirection: usePageGuidance ? activeWorkspacePage?.writingDirection || "" : "",
      pageImageDirection: usePageGuidance ? activeWorkspacePage?.imageDirection || "" : "",
      pageReadme: usePageGuidance ? activeWorkspacePage?.readme || "" : "",
      pageTone: usePageGuidance ? activeWorkspacePage?.tone || "" : "",
    }),
    [activeWorkspacePage, usePageGuidance]
  );
  const previewCaption = useMemo(() => sanitizeGeneratedCaption(form.content || ""), [form.content]);
  const previewImageUrl = imageAsset?.previewUrl || form.imageUrl || "";

  async function handleGenerateImage() {
    if (isGeneratingImage) return;
    if (!form.imagePrompt || form.imagePrompt.trim().length < 5) {
      setImageGenerationError("à¸à¸£à¸¸à¸“à¸²à¹ƒà¸ªà¹ˆà¸„à¸³à¸­à¸˜à¸´à¸šà¸²à¸¢à¸ à¸²à¸žà¸­à¸¢à¹ˆà¸²à¸‡à¸™à¹‰à¸­à¸¢ 5 à¸•à¸±à¸§à¸­à¸±à¸à¸©à¸£");
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

        const nextImage = {
          imageUrl: finalUrl,
          previewUrl: finalUrl,
          revisedPrompt: result.data.revisedPrompt,
          provider: result.mode,
          storagePath,
          storageMode,
          source: "ai",
        };

        setImageAsset(nextImage);
        updateForm("imageUrl", finalUrl);
      }
    } catch (error) {
      setImageGenerationError(`à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ${error.message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function handleUploadImage(file) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageGenerationError("à¸£à¸­à¸‡à¸£à¸±à¸šà¹€à¸‰à¸žà¸²à¸°à¹„à¸Ÿà¸¥à¹Œ JPG, PNG à¸«à¸£à¸·à¸­ WEBP");
      return;
    }

    setImageGenerationError(null);

    if (previewObjectUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = previewUrl;
    setImageAsset({
      imageUrl: previewUrl,
      previewUrl,
      provider: "upload",
      storagePath: null,
      storageMode: "local",
      source: "upload",
      fileName: file.name,
    });

    try {
      const today = new Date().toISOString().split("T")[0];
      const extension = getFileExtension(file);
      const filePath = `uploads/${today}/upload-${Date.now()}.${extension}`;
      const uploadResult = await uploadImageBlob(filePath, file);

      if (uploadResult.data) {
        setImageAsset({
          imageUrl: uploadResult.data,
          previewUrl,
          provider: "upload",
          storagePath: filePath,
          storageMode: "supabase",
          source: "upload",
          fileName: file.name,
        });
        updateForm("imageUrl", uploadResult.data);
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      if (previewObjectUrlRef.current === previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewObjectUrlRef.current = null;
      }
      setImageAsset({
        imageUrl: dataUrl,
        previewUrl: dataUrl,
        provider: "upload",
        storagePath: null,
        storageMode: "local",
        source: "upload",
        fileName: file.name,
      });
      updateForm("imageUrl", dataUrl);
      if (uploadResult.error) {
        setImageGenerationError("à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸‚à¸¶à¹‰à¸™à¸„à¸¥à¸²à¸§à¸”à¹Œà¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸žà¸£à¹‰à¸­à¸¡ à¸ˆà¸¶à¸‡à¹ƒà¸Šà¹‰à¹„à¸Ÿà¸¥à¹Œà¸ˆà¸²à¸à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸ªà¸³à¸«à¸£à¸±à¸š preview à¹à¸¥à¸° draft à¹à¸—à¸™");
      }
    } catch (error) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        if (previewObjectUrlRef.current === previewUrl) {
          URL.revokeObjectURL(previewUrl);
          previewObjectUrlRef.current = null;
        }
        setImageAsset({
          imageUrl: dataUrl,
          previewUrl: dataUrl,
          provider: "upload",
          storagePath: null,
          storageMode: "local",
          source: "upload",
          fileName: file.name,
        });
        updateForm("imageUrl", dataUrl);
        setImageGenerationError("à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸‚à¸¶à¹‰à¸™à¸„à¸¥à¸²à¸§à¸”à¹Œà¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ à¹à¸•à¹ˆà¸¢à¸±à¸‡à¹ƒà¸Šà¹‰à¹„à¸Ÿà¸¥à¹Œà¸™à¸µà¹‰à¸à¸±à¸š preview à¹à¸¥à¸° draft à¹„à¸”à¹‰");
      } catch {
        setImageGenerationError(`à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸£à¸¹à¸›à¸ à¸²à¸žà¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ${error.message}`);
      }
    }
  }

  function handleInternalSave() {
    const resolvedImageUrl = imageAsset?.imageUrl || form.imageUrl;
    const safePersistedImageUrl = isUnsafeDraftImageUrl(resolvedImageUrl) ? "" : resolvedImageUrl;
    const extraData = {
      image_url: safePersistedImageUrl,
      image_prompt: form.imagePrompt,
      image_provider: imageAsset?.provider || null,
      image_revised_prompt: imageAsset?.revisedPrompt || null,
      image_storage_path: safePersistedImageUrl ? imageAsset?.storagePath || null : null,
      image_storage_mode: safePersistedImageUrl ? imageAsset?.storageMode || null : null,
    };

    if (resolvedImageUrl && !safePersistedImageUrl) {
      setImageGenerationError("à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µ URL à¸£à¸¹à¸›à¸ à¸²à¸žà¸ªà¸²à¸˜à¸²à¸£à¸“à¸° à¸ˆà¸¶à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸£à¹ˆà¸²à¸‡à¹à¸šà¸šà¹„à¸¡à¹ˆà¹à¸™à¸šà¸£à¸¹à¸›à¸ªà¸³à¸«à¸£à¸±à¸šà¹‚à¸žà¸ªà¸•à¹Œà¸ˆà¸£à¸´à¸‡");
    }

    handleSaveDraft(extraData);
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-3 z-20 rounded-2xl border border-cyan-500/20 bg-slate-950/90 p-3 shadow-lg shadow-slate-950/40 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Operator Actions</p>
            <p className="mt-1 text-xs text-slate-400">บันทึกร่างหรือเปิดคิวไปจัดเวลาและโพสต์ได้ตลอดระหว่างเลื่อนหน้าจอ</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[32rem]">
            <ActionButton
              label={editingDraft ? "บันทึกการแก้ไข" : "บันทึกร่าง"}
              icon={CheckCircle2}
              isLoading={isSavingDraft}
              onClick={handleInternalSave}
              variant="emerald"
              className="px-4 py-2.5 text-sm"
              fullWidth
            />
            <ActionButton
              label="Schedule"
              icon={Calendar}
              onClick={onOpenStatusTab}
              variant="outline"
              className="px-4 py-2.5 text-sm"
              fullWidth
            />
            <ActionButton
              label="Publish"
              icon={Send}
              onClick={onOpenStatusTab}
              variant="outline"
              className="px-4 py-2.5 text-sm"
              fullWidth
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
              <FileText className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¹‚à¸žà¸ªà¸•à¹Œ</h3>
            </div>

            <label className="mb-4 flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
              <input
                type="checkbox"
                checked={usePageGuidance}
                onChange={(event) => setUsePageGuidance(event.target.checked)}
                className="mt-0.5 accent-cyan-400"
              />
              <span>
                <span className="font-semibold">à¹ƒà¸Šà¹‰à¹à¸™à¸§à¸—à¸²à¸‡à¸ˆà¸²à¸à¹€à¸žà¸ˆ</span>
                <span className="mt-1 block text-xs text-cyan-100/80">
                  à¸£à¸°à¸šà¸šà¸ˆà¸°à¹ƒà¸Šà¹‰à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸´à¸¨à¸—à¸²à¸‡à¸à¸²à¸£à¹€à¸‚à¸µà¸¢à¸™à¹à¸¥à¸°à¹à¸™à¸§à¸ à¸²à¸žà¸ˆà¸²à¸à¹€à¸¡à¸™à¸¹à¸ˆà¸±à¸”à¸à¸²à¸£à¹€à¸žà¸ˆà¹€à¸žà¸·à¹ˆà¸­à¸Šà¹ˆà¸§à¸¢à¸à¸³à¸«à¸™à¸”à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¹à¸¥à¸° prompt à¸£à¸¹à¸›à¸ à¸²à¸ž
                </span>
              </span>
            </label>

            {!usePageGuidance ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500">à¸›à¸£à¸°à¹€à¸ à¸—</label>
                  <select
                    value={metadata.type}
                    onChange={(event) => updateMetadata("type", event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
                  >
                    {CONTENT_TYPES.map((item) => (
                      <option key={item.id} value={item.id} className="bg-slate-900">
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500">à¹‚à¸—à¸™</label>
                  <select
                    value={metadata.tone}
                    onChange={(event) => updateMetadata("tone", event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
                  >
                    {CONTENT_TONES.map((item) => (
                      <option key={item.id} value={item.id} className="bg-slate-900">
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500">à¸„à¸§à¸²à¸¡à¸¢à¸²à¸§</label>
                  <select
                    value={metadata.length}
                    onChange={(event) => updateMetadata("length", event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
                  >
                    {CONTENT_LENGTHS.map((item) => (
                      <option key={item.id} value={item.id} className="bg-slate-900">
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500">à¸à¸²à¸£à¸›à¸´à¸”à¸—à¹‰à¸²à¸¢</label>
                  <select
                    value={metadata.cta}
                    onChange={(event) => updateMetadata("cta", event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
                  >
                    {CONTENT_CTAS.map((item) => (
                      <option key={item.id} value={item.id} className="bg-slate-900">
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-4 text-sm text-slate-300">
                <p className="font-semibold text-white">{activeWorkspacePage?.label || "à¹€à¸žà¸ˆà¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™"}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {hasPageGuidance
                    ? "à¹‚à¸žà¸ªà¸•à¹Œà¸™à¸µà¹‰à¸ˆà¸°à¸­à¹‰à¸²à¸‡à¸­à¸´à¸‡à¹à¸™à¸§à¸à¸²à¸£à¹€à¸‚à¸µà¸¢à¸™à¹à¸¥à¸°à¹à¸™à¸§ prompt à¸ à¸²à¸žà¸ˆà¸²à¸à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œà¹€à¸žà¸ˆ à¹€à¸žà¸·à¹ˆà¸­à¸¥à¸”à¸à¸²à¸£à¹€à¸¥à¸·à¸­à¸à¸„à¹ˆà¸²à¸‹à¹‰à¸³"
                    : "à¹€à¸žà¸ˆà¸™à¸µà¹‰à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¹à¸™à¸§à¸—à¸²à¸‡à¹€à¸‰à¸žà¸²à¸° à¸£à¸°à¸šà¸šà¸ˆà¸°à¹ƒà¸Šà¹‰à¸„à¹ˆà¸²à¸«à¸¥à¸±à¸à¸‚à¸­à¸‡à¸£à¸°à¸šà¸šà¸£à¹ˆà¸§à¸¡à¸à¸±à¸šà¸«à¸±à¸§à¸‚à¹‰à¸­à¸—à¸µà¹ˆà¸à¸£à¸­à¸"}
                </p>
              </div>
            )}
          </div>

          <PromptAssistCard settings={settings} metadata={effectiveMetadata} activeWorkspacePage={activeWorkspacePage} />

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">à¸«à¸±à¸§à¸‚à¹‰à¸­à¹à¸¥à¸°à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡</h3>
              <span className="text-[9px] font-bold uppercase text-slate-500">
                à¸œà¸¹à¹‰à¹ƒà¸«à¹‰à¸šà¸£à¸´à¸à¸²à¸£: {getProviderLabel(textProviderRuntime?.selectedProvider || settings.textProvider)}
              </span>
            </div>

            <textarea
              value={form.topic}
              onChange={(event) => updateForm("topic", event.target.value)}
              placeholder={settings.defaultTopicHint || "à¸žà¸´à¸¡à¸žà¹Œà¸«à¸±à¸§à¸‚à¹‰à¸­à¸«à¸£à¸·à¸­à¸ªà¸´à¹ˆà¸‡à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹‚à¸žà¸ªà¸•à¹Œ"}
              className="h-28 w-full resize-none rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
            />

            <div className="mt-4">
              <ActionButton
                label={isGenerating ? "à¸à¸³à¸¥à¸±à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡..." : "à¸ªà¸£à¹‰à¸²à¸‡à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡"}
                icon={Sparkles}
                isLoading={isGenerating}
                onClick={() => handleGenerateContent(pageGuidanceContext)}
                fullWidth
              />
            </div>

            {createNotice ? (
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
            ) : null}

            {generationError ? (
              <p className="mt-3 rounded border border-rose-400/20 bg-rose-400/10 p-2 text-xs italic text-rose-400">
                {generationError}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-tight text-slate-500">
              <span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1">
                à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡: {getProviderLabel(textProviderRuntime?.selectedProvider || settings.textProvider || "mock")}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1">
                à¹‚à¸«à¸¡à¸”à¹‚à¸žà¸ªà¸•à¹Œ: {settings.facebookPublishMode === "live" ? "à¸ˆà¸£à¸´à¸‡" : "à¸—à¸”à¸ªà¸­à¸š"}
              </span>
            </div>
          </div>

          <ImageStudioCard
            settings={settings}
            imageForm={imageForm}
            updateImageForm={updateImageForm}
            imagePrompt={form.imagePrompt}
            updateImagePrompt={(value) => updateForm("imagePrompt", value)}
            handleGenerateImagePrompt={() => handleGenerateImagePrompt(pageGuidanceContext)}
            handleGenerateImage={handleGenerateImage}
            handleUploadImage={handleUploadImage}
            isGeneratingImagePrompt={isGeneratingImagePrompt}
            isGeneratingImage={isGeneratingImage || isGeneratingImageProp}
            imageGenerationError={imageGenerationError}
            generatedImage={imageAsset}
            currentImageUrl={previewImageUrl}
          />
        </div>

        <div className="flex min-w-0 flex-col space-y-4 lg:h-[calc(100vh-10rem)]">
          <details className="rounded-2xl border border-white/5 bg-slate-900/35 p-3">
            <summary className="cursor-pointer list-none text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Advanced Diagnostics
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <ProviderStatusCard
                settings={settings}
                textProviderRuntime={textProviderRuntime}
                className="min-w-0"
              />
              <WorkspaceContextCard
                settings={settings}
                activeWorkspacePage={activeWorkspacePage}
                className="min-w-0"
              />
            </div>
          </details>

          <PreviewStudioCard
            caption={previewCaption}
            imageUrl={previewImageUrl}
            settings={settings}
            metadata={effectiveMetadata}
            imageForm={imageForm}
            textProviderRuntime={textProviderRuntime}
            activeWorkspacePage={activeWorkspacePage}
            isModalOpen={isPreviewModalOpen}
            onOpenModal={() => setIsPreviewModalOpen(true)}
            onCloseModal={() => setIsPreviewModalOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}

export default CreatePage;
