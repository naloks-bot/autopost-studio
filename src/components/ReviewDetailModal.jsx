import React, { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Calendar,
  CheckCircle2,
  Copy,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import ActionButton from "./ActionButton.jsx";
import { canPublishPost, canSchedulePost, deriveHookFromContent } from "../services/content-stock.js";
import { uploadImageBlob } from "../services/storage.js";

function CompactMetaPill({ children, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-300"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-300"
        : tone === "danger"
          ? "bg-rose-500/10 text-rose-300"
          : tone === "accent"
            ? "bg-cyan-500/10 text-cyan-300"
            : "border border-white/5 bg-slate-950/40 text-slate-400";

  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${toneClass}`}>{children}</span>;
}

function getReviewStatusTone(postStatus = "") {
  if (postStatus === "approved") return "success";
  if (postStatus === "review") return "warning";
  return "neutral";
}

function getReviewCardTone(review) {
  if (!review) return "border-white/5 bg-slate-950/35 text-slate-300";
  if (review.type === "success") {
    return review.score >= 7
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }
  if (review.type === "warning") return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  return "border-cyan-500/20 bg-cyan-500/10 text-cyan-100";
}

function getAIReviewSummary(review) {
  if (!review) return "ยังไม่ได้เช็ก AI";
  if (review.type === "warning") {
    const message = review.message || "";
    if (/quota|rate limit/i.test(message)) return "AI quota เต็ม / เช็กไม่สำเร็จ";
    return "AI quota เต็ม / เช็กไม่สำเร็จ";
  }
  if (typeof review.score === "number" && review.score < 7) return "ควรปรับปรุง";
  if (review.verdict) return "AI เช็กแล้ว";
  return review.verdict || review.message || "มีผลตรวจ AI แล้ว";
}

function isDisplayableImageUrl(value = "") {
  const imageUrl = String(value || "").trim();
  return Boolean(imageUrl && /^(https?:|data:image\/|blob:)/i.test(imageUrl));
}

function getReviewDisplayHook(post = {}) {
  const item = post || {};
  return String(item?.hook || deriveHookFromContent(item?.content, item?.topic) || item?.topic || "").trim();
}

function buildReviewImageState(post = {}) {
  const item = post || {};
  const imageUrl = String(item?.image_url || item?.imageUrl || "").trim();
  return {
    imageUrl,
    previewUrl: imageUrl,
    thumbnailUrl: String(item?.thumbnail_url || item?.thumbnailUrl || "").trim(),
    provider: item?.image_provider || item?.imageProvider || null,
    revisedPrompt: item?.image_revised_prompt || item?.imageRevisedPrompt || null,
    storagePath: item?.image_storage_path || item?.imageStoragePath || null,
    storageMode: item?.image_storage_mode || item?.imageStorageMode || null,
    thumbnailStoragePath: item?.thumbnail_storage_path || item?.thumbnailStoragePath || null,
  };
}

function hasImageStateChanged(post = {}, imageState = {}) {
  const item = post || {};
  const nextImageState = imageState || {};
  return (
    String(item?.image_url || item?.imageUrl || "").trim() !== String(nextImageState?.imageUrl || "").trim() ||
    String(item?.thumbnail_url || item?.thumbnailUrl || "").trim() !== String(nextImageState?.thumbnailUrl || "").trim() ||
    (item?.image_provider || item?.imageProvider || null) !== (nextImageState?.provider || null) ||
    (item?.image_revised_prompt || item?.imageRevisedPrompt || null) !== (nextImageState?.revisedPrompt || null) ||
    (item?.image_storage_path || item?.imageStoragePath || null) !== (nextImageState?.storagePath || null) ||
    (item?.image_storage_mode || item?.imageStorageMode || null) !== (nextImageState?.storageMode || null) ||
    (item?.thumbnail_storage_path || item?.thumbnailStoragePath || null) !== (nextImageState?.thumbnailStoragePath || null)
  );
}

function canUndoApproval(post) {
  if (!post) return false;
  return post.status === "approved" && !["scheduled", "publishing", "posted"].includes(post.status);
}

export default function ReviewDetailModal({
  post,
  aiReview,
  completion,
  publishActionState,
  aiReviewLoadingPostId,
  aiImproveLoadingPostId,
  onClose,
  onSaveEdits,
  onRunAIQualityCheck,
  onImproveReviewPost,
  onLoadDraftToEditor,
  onApprove,
  onUndoApproval,
  onMoveToDraft,
  onSchedule,
  onPublish,
  onDelete,
}) {
  const [copyState, setCopyState] = useState("idle");
  const [draftHook, setDraftHook] = useState("");
  const [draftCaption, setDraftCaption] = useState("");
  const [draftImage, setDraftImage] = useState(() => buildReviewImageState(post));
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isExpandedImageOpen, setIsExpandedImageOpen] = useState(false);

  const imagePrompt = String(post?.image_prompt || "").trim();
  const hasImagePrompt = Boolean(imagePrompt);
  const aiStatusSummary = getAIReviewSummary(aiReview);
  const currentHook = useMemo(() => getReviewDisplayHook(post || {}), [post?.hook, post?.content, post?.topic]);
  const currentCaption = String(post?.content || "").trim();
  const displayImageUrl = String(draftImage?.previewUrl || draftImage?.imageUrl || "").trim();
  const canExpandImage = isDisplayableImageUrl(displayImageUrl);
  const hasUnsavedChanges = Boolean(
    post &&
      (draftHook.trim() !== currentHook ||
        draftCaption.trim() !== currentCaption ||
        hasImageStateChanged(post, draftImage))
  );
  const shouldWarnApprovalReset = post?.status === "approved" && hasUnsavedChanges;
  const isApproved = post?.status === "approved";
  const canUndo = canUndoApproval(post);
  const canSendToSchedule = canSchedulePost(post);
  const canSendToPublish = canPublishPost(post);

  useEffect(() => {
    if (!post) {
      setDraftHook("");
      setDraftCaption("");
      setDraftImage(buildReviewImageState({}));
      setSaveFeedback(null);
      setIsExpandedImageOpen(false);
      return;
    }

    setDraftHook(getReviewDisplayHook(post));
    setDraftCaption(String(post.content || "").trim());
    setDraftImage(buildReviewImageState(post));
    setSaveFeedback(null);
    setIsExpandedImageOpen(false);
  }, [
    post?.id,
    post?.hook,
    post?.content,
    post?.topic,
    post?.image_url,
    post?.thumbnail_url,
    post?.image_provider,
    post?.image_revised_prompt,
    post?.image_storage_path,
    post?.image_storage_mode,
    post?.thumbnail_storage_path,
  ]);

  const handleCopyImagePrompt = async () => {
    if (!hasImagePrompt) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(imagePrompt);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = imagePrompt;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const persistEdits = async ({ imageStateOverride = null, successMessage = "", silentIfUnchanged = false } = {}) => {
    if (!post || !onSaveEdits) {
      return { ok: false, post: null, unchanged: false, approvalReset: false };
    }

    const nextHook = draftHook.trim();
    const nextCaption = draftCaption.trim();
    const nextImageState = imageStateOverride || draftImage;
    const hasChanges =
      nextHook !== currentHook ||
      nextCaption !== currentCaption ||
      hasImageStateChanged(post, nextImageState);

    if (!nextCaption) {
      setSaveFeedback({ tone: "warning", message: "กรุณาใส่ caption ก่อนบันทึก" });
      return { ok: false, post, unchanged: false, approvalReset: false };
    }

    if (!nextHook) {
      setSaveFeedback({ tone: "warning", message: "กรุณาใส่ hook ก่อนบันทึก" });
      return { ok: false, post, unchanged: false, approvalReset: false };
    }

    if (!hasChanges) {
      if (!silentIfUnchanged) {
        setSaveFeedback({ tone: "info", message: "ยังไม่มีการเปลี่ยนแปลงให้บันทึก" });
      }
      return { ok: true, post, unchanged: true, approvalReset: false };
    }

    setIsSavingEdits(true);
    setSaveFeedback(null);

    try {
      const result = await onSaveEdits(post.id, {
        hook: nextHook,
        content: nextCaption,
        image_url: nextImageState.imageUrl,
        thumbnail_url: nextImageState.thumbnailUrl,
        image_provider: nextImageState.provider,
        image_revised_prompt: nextImageState.revisedPrompt,
        image_storage_path: nextImageState.storagePath,
        image_storage_mode: nextImageState.storageMode,
        thumbnail_storage_path: nextImageState.thumbnailStoragePath,
      });

      if (!result?.ok) {
        setSaveFeedback({
          tone: "danger",
          message: result?.error?.message || "บันทึกการแก้ไขไม่สำเร็จ",
        });
        return { ok: false, post, unchanged: false, approvalReset: false };
      }

      const savedPost = result.post || post;
      setDraftHook(getReviewDisplayHook(savedPost));
      setDraftCaption(String(savedPost.content || "").trim());
      setDraftImage(buildReviewImageState(savedPost));
      setSaveFeedback({
        tone: result.approvalReset ? "warning" : "success",
        message:
          successMessage ||
          result.message ||
          (result.approvalReset
            ? "บันทึกแล้ว และส่งกลับไปรอตรวจเพื่ออนุมัติใหม่"
            : "บันทึกการแก้ไขแล้ว"),
      });
      return {
        ok: true,
        post: savedPost,
        unchanged: false,
        approvalReset: Boolean(result.approvalReset),
      };
    } finally {
      setIsSavingEdits(false);
    }
  };

  const runWithLatestDraft = async (callback, { requireApproved = false } = {}) => {
    if (!post) return;

    const result = await persistEdits({ silentIfUnchanged: true });
    if (!result?.ok) return;

    const latestPost = result.post || post;
    if (requireApproved && latestPost.status !== "approved") {
      setSaveFeedback({
        tone: "warning",
        message: "บันทึกการแก้ไขแล้ว กรุณาอนุมัติใหม่ก่อนตั้งเวลาหรือโพสต์",
      });
      return;
    }

    await callback(latestPost);
  };

  const handleUploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !post) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setSaveFeedback({ tone: "warning", message: "รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP" });
      return;
    }

    setIsUploadingImage(true);
    setSaveFeedback(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      const filePath = `uploads/${today}/review-${post?.id || "draft"}-${Date.now()}.jpg`;
      const uploadResult = await uploadImageBlob(filePath, file);

      if (!uploadResult.data) {
        setSaveFeedback({
          tone: "danger",
          message: uploadResult.error || "อัปโหลดรูปไม่สำเร็จ",
        });
        return;
      }

      const nextImageState = {
        imageUrl: uploadResult.data,
        previewUrl: uploadResult.data,
        thumbnailUrl: uploadResult.thumbnailUrl || "",
        provider: "upload",
        revisedPrompt: post?.image_revised_prompt || null,
        storagePath: uploadResult.path || filePath,
        storageMode: "supabase",
        thumbnailStoragePath: uploadResult.thumbnailPath || null,
      };

      setDraftImage(nextImageState);
      await persistEdits({
        imageStateOverride: nextImageState,
        successMessage: post?.status === "approved" ? "เปลี่ยนรูปแล้ว และต้องอนุมัติใหม่ก่อนไปต่อ" : "เปลี่ยนรูปแล้ว",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-[1.5rem] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-slate-950/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Review Detail</p>
            <h3 className="mt-2 text-xl font-bold text-white">{post.topic || "Untitled post"}</h3>
            <p className="mt-1 text-sm text-slate-500">ดูรายละเอียดเต็ม แก้ข้อความ เปลี่ยนรูป และอนุมัติได้จาก modal เดียว</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close review detail modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/80">
              <button
                type="button"
                onClick={() => {
                  if (canExpandImage) setIsExpandedImageOpen(true);
                }}
                disabled={!canExpandImage}
                className="flex h-72 w-full items-center justify-center bg-slate-950/80 p-3 transition hover:bg-slate-950 disabled:cursor-default md:h-[28rem]"
              >
                {canExpandImage ? (
                  <img
                    src={displayImageUrl}
                    alt={post.topic || post.hook || "Review image"}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm font-semibold text-slate-500">
                    ยังไม่มีรูป
                  </div>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CompactMetaPill tone={post.source === "local" ? "warning" : "accent"}>
                {post.source === "local" ? "Local" : "Supabase"}
              </CompactMetaPill>
              <CompactMetaPill tone={getReviewStatusTone(post.status)}>{post.status || "draft"}</CompactMetaPill>
              {post.content_pillar ? <CompactMetaPill tone="accent">Pillar: {post.content_pillar}</CompactMetaPill> : null}
              {completion ? (
                <CompactMetaPill tone={completion.isComplete ? "success" : "warning"}>
                  Checklist {completion.completed}/{completion.total}
                </CompactMetaPill>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsExpandedImageOpen(true)}
                disabled={!canExpandImage}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ดูรูปใหญ่
              </button>
              <label className="cursor-pointer rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/15">
                {isUploadingImage ? "กำลังอัปโหลด..." : "เปลี่ยนรูป / อัปโหลดรูป"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    void handleUploadImage(event);
                  }}
                  disabled={isUploadingImage || isSavingEdits}
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.25rem] border border-white/5 bg-slate-900/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Hook</p>
                  <p className="mt-1 text-xs text-slate-500">แก้ hook ได้โดยตรง ไม่ต้องออกไปหน้า Create</p>
                </div>
                <button
                  type="button"
                  onClick={() => void persistEdits({ successMessage: "บันทึกการแก้ไขแล้ว" })}
                  disabled={isSavingEdits || isUploadingImage || !hasUnsavedChanges}
                  className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingEdits ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
              <input
                type="text"
                value={draftHook}
                onChange={(event) => {
                  setDraftHook(event.target.value);
                  setSaveFeedback(null);
                }}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-semibold text-cyan-100 outline-none transition focus:border-cyan-400"
                placeholder="ใส่ hook"
              />
            </div>

            <div className="rounded-[1.25rem] border border-white/5 bg-slate-900/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Caption</p>
              <textarea
                value={draftCaption}
                onChange={(event) => {
                  setDraftCaption(event.target.value);
                  setSaveFeedback(null);
                }}
                rows={9}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-7 text-slate-200 outline-none transition focus:border-cyan-400"
                placeholder="ใส่ caption"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{draftCaption.trim().length} ตัวอักษร</span>
                {hasUnsavedChanges ? <span className="text-amber-300">มีการเปลี่ยนที่ยังไม่บันทึก</span> : <span>ข้อมูลใน modal ตรงกับ draft ปัจจุบัน</span>}
              </div>
            </div>

            {shouldWarnApprovalReset ? (
              <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                ถ้าบันทึกการแก้ไขนี้ draft ที่เคยอนุมัติแล้วจะถูกส่งกลับไปรอตรวจ เพื่อรักษา approval safety
              </div>
            ) : null}

            {saveFeedback ? (
              <div
                className={`rounded-[1.25rem] border px-4 py-3 text-sm ${
                  saveFeedback.tone === "danger"
                    ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
                    : saveFeedback.tone === "warning"
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                      : saveFeedback.tone === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                        : "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
                }`}
              >
                {saveFeedback.message}
              </div>
            ) : null}

            <div className="rounded-[1.25rem] border border-white/5 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Image Prompt</p>
                <button
                  type="button"
                  onClick={() => void handleCopyImagePrompt()}
                  disabled={!hasImagePrompt}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  คัดลอก
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{hasImagePrompt ? imagePrompt : "ยังไม่มี image prompt"}</p>
              {copyState === "copied" ? <p className="mt-2 text-xs text-emerald-300">คัดลอก image prompt แล้ว</p> : null}
              {copyState === "error" ? <p className="mt-2 text-xs text-rose-300">คัดลอกไม่สำเร็จ ลองใหม่อีกครั้ง</p> : null}
            </div>

            <div className={`rounded-[1.25rem] border p-4 ${getReviewCardTone(aiReview)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em]">AI Review</span>
                  {typeof aiReview?.score === "number" ? (
                    <span className="rounded-full border border-black/10 bg-black/10 px-2 py-1 text-[10px] font-bold">
                      คะแนน {aiReview.score.toFixed(1)}/10
                    </span>
                  ) : null}
                </div>
                <CompactMetaPill tone={aiReview?.type === "warning" || (typeof aiReview?.score === "number" && aiReview.score < 7) ? "warning" : "success"}>
                  {aiStatusSummary}
                </CompactMetaPill>
              </div>
              <p className="mt-2 text-xs opacity-90">กดเช็กเมื่ออยากใช้ AI review และ quota เพิ่มเติม</p>
              {aiReview?.feedback ? <p className="mt-2 text-sm leading-relaxed">{aiReview.feedback}</p> : null}
              {aiReview?.improvementDirection ? <p className="mt-2 text-xs opacity-90">แนวปรับ: {aiReview.improvementDirection}</p> : null}
              {aiReview?.message && !aiReview?.feedback ? <p className="mt-2 text-xs opacity-90">{aiReview.message}</p> : null}
            </div>

            <div className="rounded-[1.25rem] border border-white/5 bg-slate-900/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Actions</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <ActionButton
                  label="เช็ก"
                  icon={Bot}
                  onClick={() =>
                    void runWithLatestDraft(async (latestPost) => {
                      await onRunAIQualityCheck(latestPost.id);
                    })
                  }
                  variant="secondary"
                  isLoading={aiReviewLoadingPostId === post.id}
                  disabled={isSavingEdits || isUploadingImage}
                  className="px-3 py-2 text-xs"
                  fullWidth
                />
                <ActionButton
                  label="ปรับปรุงใหม่"
                  icon={Pencil}
                  onClick={() =>
                    void runWithLatestDraft(async (latestPost) => {
                      await onImproveReviewPost(latestPost.id);
                    })
                  }
                  variant="outline"
                  isLoading={aiImproveLoadingPostId === post.id}
                  disabled={isSavingEdits || isUploadingImage}
                  className="px-3 py-2 text-xs"
                  fullWidth
                />
                <ActionButton
                  label="แก้ใน Create"
                  icon={Pencil}
                  onClick={() =>
                    void runWithLatestDraft(async (latestPost) => {
                      onClose();
                      onLoadDraftToEditor(latestPost);
                    })
                  }
                  variant="outline"
                  disabled={isSavingEdits || isUploadingImage}
                  className="px-3 py-2 text-xs"
                  fullWidth
                />
                <ActionButton
                  label={canUndo ? "ยกเลิกอนุมัติ" : "อนุมัติ"}
                  icon={CheckCircle2}
                  onClick={() =>
                    void runWithLatestDraft(async (latestPost) => {
                      if (canUndo) {
                        await onUndoApproval(latestPost.id);
                        return;
                      }
                      await onApprove(latestPost.id);
                    })
                  }
                  variant={canUndo ? "outline" : isApproved ? "secondary" : "emerald"}
                  disabled={isSavingEdits || isUploadingImage || (isApproved && !canUndo)}
                  className="px-3 py-2 text-xs"
                  fullWidth
                />
                {!canUndo ? (
                  <ActionButton
                    label="Draft"
                    icon={RotateCcw}
                    onClick={() =>
                      void runWithLatestDraft(async (latestPost) => {
                        await onMoveToDraft(latestPost.id);
                      })
                    }
                    variant="outline"
                    disabled={isSavingEdits || isUploadingImage}
                    className="px-3 py-2 text-xs"
                    fullWidth
                  />
                ) : null}
                <ActionButton
                  label="ตั้งเวลา"
                  icon={Calendar}
                  onClick={() =>
                    void runWithLatestDraft(async (latestPost) => {
                      onSchedule(latestPost);
                    }, { requireApproved: true })
                  }
                  variant="amber"
                  disabled={isSavingEdits || isUploadingImage || !canSendToSchedule}
                  className="px-3 py-2 text-xs"
                  fullWidth
                />
                {canSendToPublish ? (
                  <div className="sm:col-span-2 xl:col-span-1">
                    <ActionButton
                      label="โพสต์"
                      icon={Send}
                      onClick={() =>
                        void runWithLatestDraft(async (latestPost) => {
                          await onPublish(latestPost);
                        }, { requireApproved: true })
                      }
                      variant="secondary"
                      disabled={isSavingEdits || isUploadingImage}
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    {publishActionState?.blockedReason ? <p className="mt-1 text-[10px] text-amber-300">{publishActionState.blockedReason}</p> : null}
                  </div>
                ) : null}
                <ActionButton
                  label="ลบ"
                  icon={Trash2}
                  onClick={() => void onDelete(post)}
                  variant="danger"
                  disabled={isSavingEdits || isUploadingImage}
                  className="px-3 py-2 text-xs"
                  fullWidth
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isExpandedImageOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm"
          onClick={() => setIsExpandedImageOpen(false)}
        >
          <div
            className="w-full max-w-6xl rounded-[1.5rem] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-slate-950/70"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Image Preview</p>
                <h4 className="mt-2 text-lg font-bold text-white">{post.topic || post.hook || "Review image"}</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsExpandedImageOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close full image preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex h-[72vh] items-center justify-center rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-4">
              {canExpandImage ? (
                <img
                  src={displayImageUrl}
                  alt={post.topic || post.hook || "Review image"}
                  className="max-h-full w-full object-contain"
                />
              ) : (
                <div className="text-sm font-semibold text-slate-500">ยังไม่มีรูป</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
