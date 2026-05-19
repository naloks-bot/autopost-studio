import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, CheckCircle2, FileText, Send, Sparkles } from "lucide-react";
import { CONTENT_CTAS, CONTENT_LENGTHS, CONTENT_TONES, CONTENT_TYPES } from "../constants/appConstants";
import { generateImage } from "../services/ai-image-generation.js";
import { uploadImageBlob, uploadImageFromUrl } from "../services/storage.js";
import { getProviderLabel, sanitizeGeneratedCaption } from "../services/ai-generation.js";
import { getQuickSchedulePresets } from "../services/schedule-presets.js";
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
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    reader.readAsDataURL(file);
  });
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
  scheduledPostsForPage,
  updateForm,
  handleGenerateContent,
  handleGenerateBatchDrafts,
  handleGenerateImagePrompt,
  handleSaveDraft,
  handleSchedulePost,
  handleSetDraftReviewStatus,
  isGenerating,
  isGeneratingBatch,
  isGeneratingImagePrompt,
  isGeneratingImage: isGeneratingImageProp,
  isSavingDraft,
  batchProgress,
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
  const [quickScheduleId, setQuickScheduleId] = useState("");
  const [batchCount, setBatchCount] = useState(5);
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
      const currentMatchesFormImage = current?.imageUrl === form.imageUrl || current?.previewUrl === form.imageUrl;
      const currentHasStoredMetadata = Boolean(current?.storagePath || current?.thumbnailStoragePath || current?.thumbnailUrl);

      if (currentMatchesFormImage && current?.source !== "existing" && currentHasStoredMetadata) {
        return current;
      }

      if (
        currentMatchesFormImage &&
        String(current?.thumbnailUrl || "") === String(editingDraft?.thumbnail_url || "") &&
        (current?.thumbnailStoragePath || null) === (editingDraft?.thumbnail_storage_path || null)
      ) {
        return current;
      }

      return {
        imageUrl: form.imageUrl,
        previewUrl: form.imageUrl,
        thumbnailUrl: editingDraft?.thumbnail_url || "",
        provider: editingDraft?.image_provider || null,
        revisedPrompt: editingDraft?.image_revised_prompt || null,
        storagePath: editingDraft?.image_storage_path || null,
        storageMode: editingDraft?.image_storage_mode || null,
        thumbnailStoragePath: editingDraft?.thumbnail_storage_path || null,
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
      pagePurpose: usePageGuidance ? activeWorkspacePage?.purpose || "" : "",
      pageTargetAudience: usePageGuidance ? activeWorkspacePage?.targetAudience || "" : "",
      pageWritingDirection: usePageGuidance ? activeWorkspacePage?.writingDirection || "" : "",
      pageImageDirection: usePageGuidance ? activeWorkspacePage?.imageDirection || "" : "",
      pageReadme: usePageGuidance ? activeWorkspacePage?.readme || "" : "",
      pageTone: usePageGuidance ? activeWorkspacePage?.tone || "" : "",
      pageContentPillars: usePageGuidance ? activeWorkspacePage?.contentPillars || "" : "",
      pageAvoidList: usePageGuidance ? activeWorkspacePage?.avoidList || "" : "",
      pageDefaultCta: usePageGuidance ? activeWorkspacePage?.defaultCta || "" : "",
    }),
    [activeWorkspacePage, usePageGuidance]
  );
  const previewCaption = useMemo(() => sanitizeGeneratedCaption(form.content || ""), [form.content]);
  const previewImageUrl = imageAsset?.previewUrl || form.imageUrl || "";
  const quickSchedulePresets = useMemo(
    () => getQuickSchedulePresets(scheduledPostsForPage || []),
    [scheduledPostsForPage]
  );

  async function handleGenerateImage() {
    if (isGeneratingImage) return;
    if (!form.imagePrompt || form.imagePrompt.trim().length < 5) {
      setImageGenerationError("กรุณาใส่คำอธิบายภาพอย่างน้อย 5 ตัวอักษร");
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
        const filename = `gen-${Date.now()}.jpg`;
        const filePath = `generated/${today}/${filename}`;
        const uploadResult = await uploadImageFromUrl(filePath, rawUrl);

        if (uploadResult.data) {
          finalUrl = uploadResult.data;
          storagePath = uploadResult.path || filePath;
          storageMode = "supabase";
        }

        console.info("[AutoPost Storage] upload result", {
          source: "ai",
          hasImageStoragePath: Boolean(storagePath),
          hasThumbnailStoragePath: Boolean(uploadResult.thumbnailPath),
          imageStoragePath: storagePath || null,
          thumbnailStoragePath: uploadResult.thumbnailPath || null,
        });

        const nextImage = {
          imageUrl: finalUrl,
          previewUrl: finalUrl,
          thumbnailUrl: uploadResult.thumbnailUrl || "",
          revisedPrompt: result.data.revisedPrompt,
          provider: result.mode,
          storagePath,
          storageMode,
          thumbnailStoragePath: uploadResult.thumbnailPath || null,
          source: "ai",
        };

        setImageAsset(nextImage);
        updateForm("imageUrl", finalUrl);
      }
    } catch (error) {
      setImageGenerationError(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function handleUploadImage(file) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setImageGenerationError("รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP");
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
      thumbnailUrl: "",
      provider: "upload",
      storagePath: null,
      storageMode: "local",
      thumbnailStoragePath: null,
      source: "upload",
      fileName: file.name,
    });

    try {
      const today = new Date().toISOString().split("T")[0];
      const filePath = `uploads/${today}/upload-${Date.now()}.jpg`;
      const uploadResult = await uploadImageBlob(filePath, file);

      if (uploadResult.data) {
        console.info("[AutoPost Storage] upload result", {
          source: "upload",
          hasImageStoragePath: Boolean(uploadResult.path || filePath),
          hasThumbnailStoragePath: Boolean(uploadResult.thumbnailPath),
          imageStoragePath: uploadResult.path || filePath,
          thumbnailStoragePath: uploadResult.thumbnailPath || null,
        });

        setImageAsset({
          imageUrl: uploadResult.data,
          previewUrl,
          thumbnailUrl: uploadResult.thumbnailUrl || "",
          provider: "upload",
          storagePath: uploadResult.path || filePath,
          storageMode: "supabase",
          thumbnailStoragePath: uploadResult.thumbnailPath || null,
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
        thumbnailUrl: "",
        provider: "upload",
        storagePath: null,
        storageMode: "local",
        thumbnailStoragePath: null,
        source: "upload",
        fileName: file.name,
      });
      updateForm("imageUrl", dataUrl);
      if (uploadResult.error) {
        setImageGenerationError("อัปโหลดขึ้นคลาวด์ยังไม่พร้อม จึงใช้ไฟล์จากเครื่องสำหรับ preview และ draft แทน");
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
          thumbnailUrl: "",
          provider: "upload",
          storagePath: null,
          storageMode: "local",
          thumbnailStoragePath: null,
          source: "upload",
          fileName: file.name,
        });
        updateForm("imageUrl", dataUrl);
        setImageGenerationError("อัปโหลดขึ้นคลาวด์ไม่สำเร็จ แต่ยังใช้ไฟล์นี้กับ preview และ draft ได้");
      } catch {
        setImageGenerationError(`อัปโหลดรูปภาพไม่สำเร็จ: ${error.message}`);
      }
    }
  }

  function buildDraftExtraData() {
    const resolvedImageUrl = imageAsset?.imageUrl || form.imageUrl;
    const safePersistedImageUrl = isUnsafeDraftImageUrl(resolvedImageUrl) ? "" : resolvedImageUrl;
    const extraData = {
      image_url: safePersistedImageUrl,
      thumbnail_url: safePersistedImageUrl ? imageAsset?.thumbnailUrl || editingDraft?.thumbnail_url || "" : "",
      image_prompt: form.imagePrompt,
      image_provider: imageAsset?.provider || null,
      image_revised_prompt: imageAsset?.revisedPrompt || null,
      image_storage_path: safePersistedImageUrl ? imageAsset?.storagePath || null : null,
      image_storage_mode: safePersistedImageUrl ? imageAsset?.storageMode || null : null,
      thumbnail_storage_path: safePersistedImageUrl ? imageAsset?.thumbnailStoragePath || editingDraft?.thumbnail_storage_path || null : null,
    };

    if (resolvedImageUrl && !safePersistedImageUrl) {
      setImageGenerationError("ยังไม่มี URL รูปภาพสาธารณะ จึงบันทึกร่างแบบไม่แนบรูปสำหรับโพสต์จริง");
    }

    console.info("[AutoPost Storage] draft payload prepared", {
      draftId: editingDraft?.id || null,
      hasImageStoragePath: Boolean(extraData.image_storage_path),
      hasThumbnailStoragePath: Boolean(extraData.thumbnail_storage_path),
      imageStoragePath: extraData.image_storage_path || null,
      thumbnailStoragePath: extraData.thumbnail_storage_path || null,
    });

    return extraData;
  }

  function handleInternalSave() {
    handleSaveDraft(buildDraftExtraData());
  }

  async function handleQuickSchedule(preset) {
    if (!preset?.value || !handleSchedulePost) return;

    setQuickScheduleId(preset.id);
    try {
      const saveResult = await handleSaveDraft(buildDraftExtraData());
      if (!saveResult?.ok || saveResult.storage !== "remote" || !saveResult.post?.id) {
        return;
      }

      if (handleSetDraftReviewStatus) {
        const approved = await handleSetDraftReviewStatus(saveResult.post.id, "approved");
        if (!approved) return;
      }

      const scheduled = await handleSchedulePost(saveResult.post.id, preset.value);
      if (scheduled) {
        onOpenStatusTab?.();
      }
    } finally {
      setQuickScheduleId("");
    }
  }

  async function handleBatchCreate() {
    if (!handleGenerateBatchDrafts) return;
    const result = await handleGenerateBatchDrafts({
      count: batchCount,
      overrides: pageGuidanceContext,
    });
    if (result?.ok) {
      onOpenStatusTab?.();
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/90 p-3 shadow-lg shadow-slate-950/40 backdrop-blur">
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
        <div className="mt-3 border-t border-white/5 pt-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Quick Schedule</p>
            <p className="mt-1 text-xs text-slate-500">Save the current post as a new draft, then send it into the queue with one preset click.</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickSchedulePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => void handleQuickSchedule(preset)}
                disabled={isSavingDraft || quickScheduleId === preset.id}
                className="min-w-[8.75rem] rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {quickScheduleId === preset.id ? "Scheduling..." : preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 border-t border-white/5 pt-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Batch Create</p>
              <p className="mt-1 text-xs text-slate-500">Generate multiple Facebook drafts at once and save them straight into the review queue.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[5, 10, 20].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setBatchCount(count)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    batchCount === count
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {count}
                </button>
              ))}
              <ActionButton
                label={isGeneratingBatch ? "Generating Batch..." : `Generate ${batchCount} Drafts`}
                icon={Sparkles}
                isLoading={isGeneratingBatch}
                onClick={() => void handleBatchCreate()}
                className="px-4 py-2 text-sm"
              />
            </div>
          </div>
          {batchProgress ? (
            <p className="mt-3 text-xs text-slate-500">
              Progress: {batchProgress.current}/{batchProgress.total} drafts processed, {batchProgress.saved} saved.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
              <FileText className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">รายละเอียดโพสต์</h3>
            </div>

            <label className="mb-4 flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
              <input
                type="checkbox"
                checked={usePageGuidance}
                onChange={(event) => setUsePageGuidance(event.target.checked)}
                className="mt-0.5 accent-cyan-400"
              />
              <span>
                <span className="font-semibold">ใช้แนวทางจากเพจ</span>
                <span className="mt-1 block text-xs text-cyan-100/80">
                  ระบบจะใช้ข้อมูลทิศทางการเขียนและแนวภาพจากเมนูจัดการเพจเพื่อช่วยกำหนดข้อความและ prompt รูปภาพ
                </span>
              </span>
            </label>

            {!usePageGuidance ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500">ประเภท</label>
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
                  <label className="text-[10px] font-bold uppercase text-slate-500">โทน</label>
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
                  <label className="text-[10px] font-bold uppercase text-slate-500">ความยาว</label>
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
                  <label className="text-[10px] font-bold uppercase text-slate-500">การปิดท้าย</label>
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
                <p className="font-semibold text-white">{activeWorkspacePage?.label || "เพจปัจจุบัน"}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {hasPageGuidance
                    ? "โพสต์นี้จะอ้างอิงแนวการเขียนและแนว prompt ภาพจากโปรไฟล์เพจ เพื่อลดการเลือกค่าซ้ำ"
                    : "เพจนี้ยังไม่มีแนวทางเฉพาะ ระบบจะใช้ค่าหลักของระบบร่วมกับหัวข้อที่กรอก"}
                </p>
              </div>
            )}
          </div>

          <PromptAssistCard settings={settings} metadata={effectiveMetadata} activeWorkspacePage={activeWorkspacePage} />

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">หัวข้อและข้อความ</h3>
              <span className="text-[9px] font-bold uppercase text-slate-500">
                ผู้ให้บริการ: {getProviderLabel(textProviderRuntime?.selectedProvider || settings.textProvider)}
              </span>
            </div>

            <textarea
              value={form.topic}
              onChange={(event) => updateForm("topic", event.target.value)}
              placeholder={settings.defaultTopicHint || "พิมพ์หัวข้อหรือสิ่งที่ต้องการโพสต์"}
              className="h-28 w-full resize-none rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
            />

            <div className="mt-4">
              <ActionButton
                label={isGenerating ? "กำลังสร้างข้อความ..." : "สร้างข้อความ"}
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
                ข้อความ: {getProviderLabel(textProviderRuntime?.selectedProvider || settings.textProvider || "mock")}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1">
                โหมดโพสต์: {settings.facebookPublishMode === "live" ? "จริง" : "ทดสอบ"}
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

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">เขียนข้อความเอง / Manual Draft</h3>
                <p className="mt-2 text-xs text-slate-400">พิมพ์ข้อความโพสต์เอง แล้วบันทึกเป็นร่างได้โดยไม่เรียกใช้ Gemini/API</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                Manual mode: ไม่ใช้ API
              </span>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">ข้อความโพสต์</span>
              <textarea
                value={form.content}
                onChange={(event) => updateForm("content", event.target.value)}
                placeholder="พิมพ์ข้อความโพสต์ที่ต้องการบันทึกเป็นร่างได้ที่นี่"
                className="h-40 w-full resize-y rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
              />
            </label>

            <p className="mt-3 text-[11px] text-slate-500">ข้อความด้านบนจะแสดงในตัวอย่างโพสต์ทันที และใช้เป็นเนื้อหาหลักตอนบันทึกร่าง</p>
          </div>

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
