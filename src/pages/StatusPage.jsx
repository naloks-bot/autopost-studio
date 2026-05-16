import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Copy,
  Clock,
  Facebook,
  Info,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import ActionButton from "../components/ActionButton.jsx";
import ReviewDetailModalPanel from "../components/ReviewDetailModal.jsx";
import {
  buildStockSummary,
  canPublishPost,
  canSchedulePost,
  deriveHookFromContent,
  getChecklistCompletion,
  LOW_STOCK_THRESHOLD,
  REVIEW_CHECKLIST_FIELDS,
} from "../services/content-stock.js";
import { getPagePublishReadiness, resolveEffectivePublishConfig, runPerPagePublishDryRun } from "../services/page-context.js";
import { getFastReschedulePresets, getQuickSchedulePresets, toLocalDateTimeValue } from "../services/schedule-presets.js";
import { uploadImageBlob } from "../services/storage.js";

function getMinDateTimeLocalValue() {
  return toLocalDateTimeValue(new Date());
}

function isSameLocalDay(value, compareDate = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === compareDate.getFullYear() &&
    date.getMonth() === compareDate.getMonth() &&
    date.getDate() === compareDate.getDate()
  );
}

function sortQueuePosts(posts = []) {
  return [...posts].sort((a, b) => {
    const aTime = new Date(a.scheduled_at || a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.scheduled_at || b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });
}

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

function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
        active ? "bg-cyan-400 text-slate-950" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryCard({ label, value, tone = "neutral" }) {
  const valueClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "warning"
        ? "text-amber-300"
        : tone === "danger"
          ? "text-rose-300"
          : "text-white";

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-3 shadow-sm">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <p className={`mt-1.5 text-2xl font-bold tracking-tight ${valueClass}`}>{value}</p>
    </div>
  );
}

function ScheduleModal({ post, value, onChange, presets, onSave, onCancel, isSaving }) {
  if (!post) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 shadow-2xl shadow-slate-950/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Schedule Post</p>
            <h3 className="mt-2 text-lg font-bold text-white">{post.topic || "Untitled post"}</h3>
            <p className="mt-1 text-sm text-slate-500">Pick a preset or set an exact time. Existing scheduler logic stays unchanged.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close schedule modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={`${post.id}-${preset.id}`}
              type="button"
              onClick={() => onChange(preset.value)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-amber-300">Schedule Time</span>
          <input
            type="datetime-local"
            value={value}
            min={getMinDateTimeLocalValue()}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-amber-400"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <ActionButton label="Cancel" icon={X} onClick={onCancel} variant="outline" />
          <ActionButton label="Save Time" icon={CheckCircle2} onClick={onSave} variant="amber" isLoading={isSaving} />
        </div>
      </div>
    </div>
  );
}

function ChecklistPill({ checked, label, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
        checked
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
          : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
      }`}
    >
      {checked ? "ผ่าน" : "เช็ก"} {label}
    </button>
  );
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
    provider: item?.image_provider || item?.imageProvider || null,
    revisedPrompt: item?.image_revised_prompt || item?.imageRevisedPrompt || null,
    storagePath: item?.image_storage_path || item?.imageStoragePath || null,
    storageMode: item?.image_storage_mode || item?.imageStorageMode || null,
  };
}

function getUploadFileExtension(file) {
  const original = file?.name?.split(".").pop()?.toLowerCase();
  if (original && ["jpg", "jpeg", "png", "webp"].includes(original)) {
    return original === "jpeg" ? "jpg" : original;
  }

  if (file?.type === "image/png") return "png";
  if (file?.type === "image/webp") return "webp";
  return "jpg";
}

function hasImageStateChanged(post = {}, imageState = {}) {
  const item = post || {};
  const nextImageState = imageState || {};
  return (
    String(item?.image_url || item?.imageUrl || "").trim() !== String(nextImageState?.imageUrl || "").trim() ||
    (item?.image_provider || item?.imageProvider || null) !== (nextImageState?.provider || null) ||
    (item?.image_revised_prompt || item?.imageRevisedPrompt || null) !== (nextImageState?.revisedPrompt || null) ||
    (item?.image_storage_path || item?.imageStoragePath || null) !== (nextImageState?.storagePath || null) ||
    (item?.image_storage_mode || item?.imageStorageMode || null) !== (nextImageState?.storageMode || null)
  );
}

function ReviewThumbnail({ imageUrl, title, large = false }) {
  const sizeClass = large ? "h-56 w-full md:h-64" : "h-24 w-24 sm:h-28 sm:w-28";
  const [hasImageError, setHasImageError] = useState(false);
  const safeImageUrl = isDisplayableImageUrl(imageUrl) ? String(imageUrl).trim() : "";

  useEffect(() => {
    setHasImageError(false);
  }, [safeImageUrl]);

  return (
    <div
      className={`overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-950/70 ${sizeClass} ${
        large ? "" : "shrink-0"
      }`}
    >
      {safeImageUrl && !hasImageError ? (
        <img
          src={safeImageUrl}
          alt={title || "Review image"}
          className="h-full w-full object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-semibold text-slate-500">
          ยังไม่มีรูป
        </div>
      )}
    </div>
  );
}

function SafeQueueImage({ imageUrl, alt = "Preview" }) {
  const [hasImageError, setHasImageError] = useState(false);
  const safeImageUrl = isDisplayableImageUrl(imageUrl) ? String(imageUrl).trim() : "";

  useEffect(() => {
    setHasImageError(false);
  }, [safeImageUrl]);

  if (!safeImageUrl || hasImageError) {
    return (
      <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-semibold text-slate-500">
        ยังไม่มีรูป
      </div>
    );
  }

  return (
    <img
      src={safeImageUrl}
      alt={alt}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      onError={() => setHasImageError(true)}
    />
  );
}

function getReviewStatusTone(postStatus = "") {
  if (postStatus === "approved") return "success";
  if (postStatus === "review") return "warning";
  return "neutral";
}

function getAIReviewSummary(review) {
  if (!review) return "ยังไม่ได้เช็ค AI";
  if (review.type === "warning") {
    const message = review.message || "";
    if (/quota|rate limit/i.test(message)) return "AI quota เต็ม / เช็คไม่สำเร็จ";
    return "AI quota เต็ม / เช็คไม่สำเร็จ";
  }
  if (typeof review.score === "number" && review.score < 7) return "ควรปรับปรุง";
  if (review.verdict) return "AI เช็คแล้ว";
  return review.verdict || review.message || "มีผลตรวจ AI แล้ว";
}

function canUndoApproval(post) {
  if (!post) return false;
  return post.status === "approved" && !["scheduled", "publishing", "posted"].includes(post.status);
}

function getReviewQueuePublishState(post, settings, workspacePages) {
  const eligible = canPublishPost(post);
  const effectivePublish = post
    ? resolveEffectivePublishConfig({
        post,
        settings,
        pages: workspacePages,
      })
    : null;
  const blockedReason =
    eligible && effectivePublish && !effectivePublish.canAttemptPublish
      ? effectivePublish.blockedReason || effectivePublish.fallbackReason || "โพสต์นี้ยังไม่พร้อมสำหรับการโพสต์"
      : "";

  return {
    eligible,
    canAttemptPublish: Boolean(eligible && effectivePublish?.canAttemptPublish),
    blockedReason,
    effectivePublish,
  };
}

function ReviewQueueActions({
  post,
  aiReviewLoadingPostId,
  aiImproveLoadingPostId,
  fullWidth = false,
  className = "",
  disabled = false,
  onRunAIQualityCheck,
  onImproveReviewPost,
  onLoadDraftToEditor,
  onApprove,
  onUndoApproval,
  onMoveToDraft,
  onSchedule,
  onPublish,
  publishActionState,
  onDelete,
}) {
  if (!post) return null;

  const isApproved = post.status === "approved";
  const canSendToSchedule = canSchedulePost(post);
  const canSendToPublish = canPublishPost(post);
  const canUndo = canUndoApproval(post);
  const publishBlockedReason = publishActionState?.blockedReason || "";

  return (
    <div className={className}>
      <ActionButton
        label="เช็ค"
        icon={Bot}
        onClick={() => void onRunAIQualityCheck(post.id)}
        variant="secondary"
        isLoading={aiReviewLoadingPostId === post.id}
        disabled={disabled}
        className="px-3 py-2 text-xs"
        fullWidth={fullWidth}
      />
      <ActionButton
        label="ปรับปรุง"
        icon={Pencil}
        onClick={() => void onImproveReviewPost(post.id)}
        variant="outline"
        isLoading={aiImproveLoadingPostId === post.id}
        disabled={disabled}
        className="px-3 py-2 text-xs"
        fullWidth={fullWidth}
      />
      <ActionButton
        label="แก้ไข"
        icon={Pencil}
        onClick={() => onLoadDraftToEditor(post)}
        variant="outline"
        disabled={disabled}
        className="px-3 py-2 text-xs"
        fullWidth={fullWidth}
      />
      <ActionButton
        label={canUndo ? "ยกเลิกอนุมัติ" : "อนุมัติ"}
        icon={CheckCircle2}
        onClick={() => void (canUndo ? onUndoApproval(post.id) : onApprove(post.id))}
        variant={canUndo ? "outline" : isApproved ? "secondary" : "emerald"}
        disabled={disabled || (isApproved && !canUndo)}
        className="px-3 py-2 text-xs"
        fullWidth={fullWidth}
      />
      {!canUndo ? (
        <ActionButton
          label="Draft"
          icon={RotateCcw}
          onClick={() => void onMoveToDraft(post.id)}
          variant="outline"
          disabled={disabled}
          className="px-3 py-2 text-xs"
          fullWidth={fullWidth}
        />
      ) : null}
      <ActionButton
        label="ตั้งเวลา"
        icon={Calendar}
        onClick={() => onSchedule(post)}
        variant="amber"
        disabled={disabled || !canSendToSchedule}
        className="px-3 py-2 text-xs"
        fullWidth={fullWidth}
      />
      {canSendToPublish ? (
        <div className={fullWidth ? "w-full" : ""}>
          <ActionButton
            label="โพสต์"
            icon={Send}
            onClick={(event) => {
              event.stopPropagation();
              void onPublish(post);
            }}
            variant="secondary"
            disabled={disabled}
            className="px-3 py-2 text-xs"
            fullWidth={fullWidth}
          />
          {publishBlockedReason ? <p className="mt-1 text-[10px] text-amber-300">{publishBlockedReason}</p> : null}
        </div>
      ) : null}
      <ActionButton
        label="ลบ"
        icon={Trash2}
        onClick={() => void onDelete(post)}
        variant="danger"
        disabled={disabled}
        className="px-3 py-2 text-xs"
        fullWidth={fullWidth}
      />
    </div>
  );
}

function ReviewDetailModal({
  post,
  aiReview,
  completion,
  publishActionState,
  aiReviewLoadingPostId,
  aiImproveLoadingPostId,
  onClose,
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
  if (!post) return null;
  const [copyState, setCopyState] = useState("idle");
  const imagePrompt = String(post.image_prompt || "").trim();
  const hasImagePrompt = Boolean(imagePrompt);
  const aiStatusSummary = getAIReviewSummary(aiReview);

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
            <p className="mt-1 text-sm text-slate-500">ดูรายละเอียดเต็มก่อนอนุมัติหรือส่งไปตั้งเวลาโพสต์</p>
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
            <ReviewThumbnail imageUrl={post.image_url} title={post.topic || post.hook} large />
            <div className="flex flex-wrap items-center gap-2">
              <CompactMetaPill tone={post.source === "local" ? "warning" : "accent"}>
                {post.source === "local" ? "Local" : "Supabase"}
              </CompactMetaPill>
              <CompactMetaPill tone={getReviewStatusTone(post.status)}>{post.status || "draft"}</CompactMetaPill>
              {post.content_pillar ? <CompactMetaPill tone="accent">Pillar: {post.content_pillar}</CompactMetaPill> : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.25rem] border border-white/5 bg-slate-900/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Hook</p>
              <p className="mt-2 text-base font-semibold leading-relaxed text-cyan-200">{post.hook || post.topic || "ยังไม่มี hook"}</p>
            </div>

            <div className="rounded-[1.25rem] border border-white/5 bg-slate-900/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Caption</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">{post.content || "-"}</p>
            </div>

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
              <p className="mt-2 text-xs opacity-90">กดเช็คเมื่ออยากใช้ AI review และ quota เพิ่มเติม</p>
              {aiReview?.feedback ? <p className="mt-2 text-sm leading-relaxed">{aiReview.feedback}</p> : null}
              {aiReview?.improvementDirection ? <p className="mt-2 text-xs opacity-90">แนวปรับ: {aiReview.improvementDirection}</p> : null}
              {aiReview?.message && !aiReview?.feedback ? <p className="mt-2 text-xs opacity-90">{aiReview.message}</p> : null}
            </div>

            <div className="rounded-[1.25rem] border border-white/5 bg-slate-900/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Actions</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <ReviewQueueActions
                  post={post}
                  aiReviewLoadingPostId={aiReviewLoadingPostId}
                  aiImproveLoadingPostId={aiImproveLoadingPostId}
                  publishActionState={publishActionState}
                  className="contents"
                  onRunAIQualityCheck={onRunAIQualityCheck}
                  onImproveReviewPost={onImproveReviewPost}
                  onLoadDraftToEditor={onLoadDraftToEditor}
                  onApprove={onApprove}
                  onUndoApproval={onUndoApproval}
                  onMoveToDraft={onMoveToDraft}
                  onSchedule={onSchedule}
                  onPublish={onPublish}
                  onDelete={onDelete}
                />
              </div>
            </div>

            {aiReview ? null : (
              <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
                Manual checklist ไม่ได้เป็นตัวหลักใน modal นี้แล้ว ถ้าต้องการคุณภาพเชิงลึก ให้ใช้ปุ่มเช็ค AI จากด้านบน
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StockTable({ summary }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/40">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Page</th>
            <th className="px-4 py-3">Draft</th>
            <th className="px-4 py-3">Review</th>
            <th className="px-4 py-3">Approved</th>
            <th className="px-4 py-3">Scheduled</th>
            <th className="px-4 py-3">Posted</th>
            <th className="px-4 py-3">Failed</th>
            <th className="px-4 py-3">Available</th>
          </tr>
        </thead>
        <tbody>
          {summary.byPage.map((page) => (
            <tr key={page.pageId} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{page.pageLabel}</span>
                  {page.isLowStock ? (
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Low
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-300">{page.counts.draft}</td>
              <td className="px-4 py-3 text-slate-300">{page.counts.review}</td>
              <td className="px-4 py-3 text-slate-300">{page.counts.approved}</td>
              <td className="px-4 py-3 text-slate-300">{page.counts.scheduled}</td>
              <td className="px-4 py-3 text-slate-300">{page.counts.posted}</td>
              <td className="px-4 py-3 text-slate-300">{page.counts.failed}</td>
              <td className={`px-4 py-3 font-semibold ${page.isLowStock ? "text-amber-300" : "text-emerald-300"}`}>{page.available}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPage({
  allPendingPosts,
  remotePosts,
  localDrafts,
  formatDate,
  handleDeletePost,
  handleDuplicatePost,
  handleLoadDraftToEditor,
  handlePublishPost,
  handleSchedulePost,
  handleSetDraftReviewStatus,
  handleSaveReviewDetailEdits,
  handleRunAIQualityCheck,
  handleImproveReviewPost,
  handleUpdateQualityChecklist,
  handleUnschedulePost,
  aiReviewByPostId,
  aiReviewLoadingPostId,
  aiImproveLoadingPostId,
  isSchedulingPostId,
  isUnschedulingPostId,
  settings,
  workspacePages,
  schedulerStatus,
  statusNotice,
}) {
  const activePageId = settings.activePageId || "default";
  const [scheduleModalPost, setScheduleModalPost] = useState(null);
  const [reviewDetailPostId, setReviewDetailPostId] = useState(null);
  const [scheduleValue, setScheduleValue] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("scheduled");
  const [publishActionNotice, setPublishActionNotice] = useState(null);

  const stockSummary = useMemo(
    () => buildStockSummary([...(remotePosts || []), ...(localDrafts || [])].filter(Boolean), workspacePages, LOW_STOCK_THRESHOLD),
    [localDrafts, remotePosts, workspacePages]
  );
  const activePageStock = stockSummary.byPage.find((page) => page.pageId === activePageId) || stockSummary.byPage[0];

  const reviewQueue = useMemo(
    () =>
      sortQueuePosts(
        (allPendingPosts || []).filter((post) => {
          if (!post) return false;
          const status = post.status || "draft";
          return (post.page_id || "default") === activePageId && ["draft", "review", "approved"].includes(status);
        })
      ),
    [activePageId, allPendingPosts]
  );

  const operationalView = useMemo(() => {
    const pageRemotePosts = (remotePosts || []).filter((post) => post && (post.page_id || "default") === activePageId);
    const scheduledPosts = sortQueuePosts(pageRemotePosts.filter((post) => post.status === "scheduled"));
    const failedPosts = sortQueuePosts(pageRemotePosts.filter((post) => post.status === "failed"));
    const postedPosts = sortQueuePosts(pageRemotePosts.filter((post) => post.status === "posted"));
    const approvedPosts = sortQueuePosts(pageRemotePosts.filter((post) => post.status === "approved"));

    const filteredPosts =
      selectedFilter === "failed"
        ? failedPosts
        : selectedFilter === "posted"
          ? postedPosts
          : selectedFilter === "approved"
            ? approvedPosts
            : selectedFilter === "all"
              ? sortQueuePosts([...approvedPosts, ...scheduledPosts, ...failedPosts])
              : scheduledPosts;

    return {
      scheduledPosts,
      failedPosts,
      postedPosts,
      approvedPosts,
      filteredPosts,
      postedToday: postedPosts.filter((post) => isSameLocalDay(post.posted_at || post.created_at)).length,
    };
  }, [activePageId, remotePosts, selectedFilter]);

  const reviewDetailPost = useMemo(
    () => (allPendingPosts || []).find((post) => post?.id === reviewDetailPostId) || null,
    [allPendingPosts, reviewDetailPostId]
  );
  const reviewDetailAIReview = reviewDetailPost ? aiReviewByPostId?.[reviewDetailPost.id] || null : null;
  const reviewDetailCompletion = getChecklistCompletion(reviewDetailPost?.quality_checklist);
  const reviewDetailPublishActionState = useMemo(
    () => getReviewQueuePublishState(reviewDetailPost, settings, workspacePages),
    [reviewDetailPost, settings, workspacePages]
  );

  useEffect(() => {
    if (statusNotice) {
      setPublishActionNotice(null);
    }
  }, [statusNotice]);

  const quickSchedulePresets = useMemo(
    () => getQuickSchedulePresets(operationalView.scheduledPosts),
    [operationalView.scheduledPosts]
  );

  const fastReschedulePresets = useMemo(
    () => getFastReschedulePresets(operationalView.scheduledPosts),
    [operationalView.scheduledPosts]
  );

  const handleOpenSchedule = (post) => {
    setScheduleModalPost(post);
    setScheduleValue(toLocalDateTimeValue(post.scheduled_at) || getMinDateTimeLocalValue());
  };

  const handleCloseSchedule = () => {
    setScheduleModalPost(null);
    setScheduleValue("");
  };

  const handleSubmitSchedule = async () => {
    if (!scheduleModalPost) return;
    const success = await handleSchedulePost(scheduleModalPost.id, scheduleValue);
    if (success) handleCloseSchedule();
  };

  const handleDeleteRequest = async (post) => {
    if (!post) return;

    const isPosted = post.status === "posted";
    const confirmationMessage = isPosted
      ? `Remove "${post.topic || "this post"}" from the app only? This will not delete the Facebook post.`
      : `Delete "${post.topic || "this queue item"}" from the app queue?`;

    if (!window.confirm(confirmationMessage)) {
      return false;
    }

    await handleDeletePost(post);
    return true;
  };

  const handleReviewQueuePublish = useCallback(
    async (post) => {
      const publishActionState = getReviewQueuePublishState(post, settings, workspacePages);
      const effectivePublish = publishActionState.effectivePublish;

      if (import.meta.env.DEV) {
        console.info("[ReviewQueue] publish button clicked", {
          postId: post?.id || null,
          postStatus: post?.status || null,
          canPublishPost: publishActionState.eligible,
          publishMode: effectivePublish?.effectiveSettings?.facebookPublishMode || null,
          publishSource: effectivePublish?.effectivePublishSource || null,
          livePagePublishStatus: effectivePublish?.livePerPagePublishStatus || null,
          blockedReason: publishActionState.blockedReason || "",
          willCallHandlePublishPost: publishActionState.eligible,
        });
      }

      if (!publishActionState.eligible) {
        setPublishActionNotice({ tone: "warning", message: "กรุณาอนุมัติ draft นี้ก่อนโพสต์" });
        return;
      }

      setPublishActionNotice(null);

      try {
        await handlePublishPost(post.id);
      } catch (error) {
        setPublishActionNotice({
          tone: "danger",
          message: `โพสต์ไม่สำเร็จ: ${error?.message || "Unexpected publish error"}`,
        });
      }
    },
    [handlePublishPost, settings, workspacePages]
  );

  return (
    <div className="space-y-5">
      {publishActionNotice || statusNotice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            (publishActionNotice || statusNotice).tone === "danger"
              ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
              : (publishActionNotice || statusNotice).tone === "warning"
                ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {(publishActionNotice || statusNotice).message}
        </div>
      ) : null}

      <div className="space-y-3 rounded-[1.75rem] border border-cyan-500/15 bg-slate-950/92 p-4 shadow-lg shadow-slate-950/40 backdrop-blur">
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10">
              <Facebook className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-cyan-100">Content Stock OS</p>
              <p className="mt-0.5 text-xs text-cyan-100/80">
                Publish mode: {settings.facebookPublishMode === "live" ? "Live" : "Mock Safe"}.
                {settings.facebookPublishMode === "live"
                  ? " Review first, approve next, then schedule carefully for the real page."
                  : " No real Facebook publish happens until you switch out of Mock."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard label="Draft" value={activePageStock?.counts.draft || 0} />
          <SummaryCard label="Review" value={activePageStock?.counts.review || 0} tone="warning" />
          <SummaryCard label="Approved" value={activePageStock?.counts.approved || 0} tone="success" />
          <SummaryCard label="Scheduled" value={activePageStock?.counts.scheduled || 0} tone="warning" />
          <SummaryCard label="Posted" value={activePageStock?.counts.posted || 0} tone="success" />
          <SummaryCard label="Failed" value={activePageStock?.counts.failed || 0} tone="danger" />
        </div>

        {stockSummary.lowStockPages.length > 0 ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Low stock warning</p>
            <p className="mt-1 text-xs text-amber-100/80">
              Available stock means `approved + scheduled`. Threshold is {LOW_STOCK_THRESHOLD}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {stockSummary.lowStockPages.map((page) => (
                <span
                  key={page.pageId}
                  className="rounded-full border border-amber-400/20 bg-black/10 px-3 py-1 text-[11px] font-semibold text-amber-100"
                >
                  {page.pageLabel}: {page.available}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {schedulerStatus ? (
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-300 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold uppercase tracking-tight">Automation Status</p>
              <p className="mt-0.5 opacity-80">
                Last run {formatDate(schedulerStatus.lastRun)} | Published {schedulerStatus.published} | Failed {schedulerStatus.failed}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Stock Dashboard</h3>
            <p className="mt-1 text-xs text-slate-500">Track active-page counts first, then use the workspace table to spot where approved stock is running low.</p>
          </div>
          <CompactMetaPill tone={activePageStock?.isLowStock ? "warning" : "success"}>
            Available Stock: {activePageStock?.available || 0}
          </CompactMetaPill>
        </div>
        <StockTable summary={stockSummary} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Review Queue</h3>
            <p className="mt-1 text-xs text-slate-500">AI ช่วยตรวจคุณภาพได้ แต่การอนุมัติยังต้องกดเองก่อนเลือกเวลาโพสต์</p>
          </div>
          <span className="text-[11px] text-slate-500">{reviewQueue.length} รายการ</span>
        </div>

        {reviewQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 p-10 text-center">
            <CheckCircle2 className="mb-3 h-10 w-10 text-slate-700" />
            <p className="text-lg font-medium text-slate-500">No drafts waiting for review</p>
            <p className="mt-1 text-sm text-slate-600">Generate a batch from the Create page or save a new draft to start stocking content.</p>
          </div>
        ) : (
          reviewQueue.map((post) => {
            const completion = getChecklistCompletion(post.quality_checklist);
            const aiReview = aiReviewByPostId?.[post.id] || null;
            const publishActionState = getReviewQueuePublishState(post, settings, workspacePages);

            return (
              <article
                key={post.id}
                className="rounded-[1.5rem] border border-white/5 bg-slate-900/60 p-4 transition-all hover:bg-slate-900/80"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
                  <button
                    type="button"
                    onClick={() => setReviewDetailPostId(post.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <ReviewThumbnail imageUrl={post.image_url} title={post.topic || post.hook} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CompactMetaPill tone={post.source === "local" ? "warning" : "accent"}>
                          {post.source === "local" ? "Local" : "Supabase"}
                        </CompactMetaPill>
                        <CompactMetaPill tone={getReviewStatusTone(post.status)}>{post.status || "draft"}</CompactMetaPill>
                        {typeof aiReview?.score === "number" ? (
                          <CompactMetaPill tone={aiReview.score >= 7 ? "success" : "warning"}>AI {aiReview.score.toFixed(1)}/10</CompactMetaPill>
                        ) : null}
                      </div>

                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{post.topic || "Untitled post"}</p>
                      <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-cyan-200">
                        {post.hook || post.topic || "ยังไม่มี hook"}
                      </h4>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{post.content || "-"}</p>

                      <div className="mt-3">
                        <div className={`rounded-xl border px-3 py-2 text-sm ${getReviewCardTone(aiReview)}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em]">AI Status</span>
                            {typeof aiReview?.score === "number" ? (
                              <span className="rounded-full border border-black/10 bg-black/10 px-2 py-0.5 text-[10px] font-bold">
                                {aiReview.score.toFixed(1)}/10
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold">{getAIReviewSummary(aiReview)}</p>
                        </div>

                        <div className="hidden rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Checklist</span>
                            <CompactMetaPill tone={completion.isComplete ? "success" : "warning"}>
                              {completion.completed}/{completion.total}
                            </CompactMetaPill>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {completion.isComplete ? "พร้อมรีวิวต่อ" : "สรุปผลแบบย่อ เปิด modal เพื่อดูรายละเอียด"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span>สร้างเมื่อ {formatDate(post.created_at)}</span>
                        {post.image_prompt ? <span>มี image prompt</span> : <span>ยังไม่มี image prompt</span>}
                      </div>
                    </div>
                  </button>

                  <ReviewQueueActions
                    post={post}
                    aiReviewLoadingPostId={aiReviewLoadingPostId}
                    aiImproveLoadingPostId={aiImproveLoadingPostId}
                    publishActionState={publishActionState}
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[18rem] xl:grid-cols-2"
                    onRunAIQualityCheck={handleRunAIQualityCheck}
                    onImproveReviewPost={handleImproveReviewPost}
                    onLoadDraftToEditor={handleLoadDraftToEditor}
                    onApprove={(postId) => handleSetDraftReviewStatus(postId, "approved")}
                    onUndoApproval={(postId) => handleSetDraftReviewStatus(postId, "review")}
                    onMoveToDraft={(postId) => handleSetDraftReviewStatus(postId, "draft")}
                    onSchedule={(nextPost) => {
                      setReviewDetailPostId(null);
                      handleOpenSchedule(nextPost);
                    }}
                    onPublish={handleReviewQueuePublish}
                    onDelete={handleDeleteRequest}
                  />
                </div>
              </article>
            );

            return (
              <article
                key={post.id}
                className="rounded-[1.5rem] border border-white/5 bg-slate-900/60 p-4 transition-all hover:bg-slate-900/80"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-white">{post.topic || "Untitled post"}</h4>
                      <CompactMetaPill tone={post.source === "local" ? "warning" : "accent"}>
                        {post.source === "local" ? "Local" : "Supabase"}
                      </CompactMetaPill>
                      <CompactMetaPill tone={isApproved ? "success" : post.status === "review" ? "warning" : "neutral"}>
                        {post.status || "draft"}
                      </CompactMetaPill>
                      {post.content_pillar ? <CompactMetaPill tone="accent">Pillar: {post.content_pillar}</CompactMetaPill> : null}
                    </div>

                    {post.hook ? <p className="mt-2 text-sm font-semibold text-cyan-200">Hook: {post.hook}</p> : null}
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{post.content}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {REVIEW_CHECKLIST_FIELDS.map((field) => (
                        <ChecklistPill
                          key={`${post.id}-${field.id}`}
                          checked={Boolean(post.quality_checklist?.[field.id])}
                          label={field.label}
                          onToggle={() =>
                            void handleUpdateQualityChecklist(post.id, {
                              [field.id]: !post.quality_checklist?.[field.id],
                            })
                          }
                        />
                      ))}
                    </div>

                    <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-3 py-2 text-[11px] text-slate-400">
                      เช็กลิสต์นี้เป็นตัวช่วยดูเร็ว ๆ จะติ๊กหรือไม่ก็ยังอนุมัติได้
                    </div>

                    {aiReview ? (
                      <div className={`mt-3 rounded-xl border px-3 py-3 text-sm ${getReviewCardTone(aiReview)}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider">AI Review</span>
                          {typeof aiReview.score === "number" ? (
                            <span className="rounded-full border border-black/10 bg-black/10 px-2 py-1 text-[10px] font-bold">
                              คะแนน {aiReview.score.toFixed(1)}/10
                            </span>
                          ) : null}
                        </div>

                        {aiReview.verdict ? <p className="mt-2 font-semibold">{aiReview.verdict}</p> : null}
                        {aiReview.feedback ? <p className="mt-1 leading-relaxed">{aiReview.feedback}</p> : null}
                        {aiReview.improvementDirection ? (
                          <p className="mt-2 text-xs opacity-90">แนวปรับ: {aiReview.improvementDirection}</p>
                        ) : null}
                        {aiReview.message ? <p className="mt-2 text-xs opacity-90">{aiReview.message}</p> : null}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span>เช็กลิสต์เสริม: {completion.completed}/{completion.total}</span>
                      <span>สร้างเมื่อ {formatDate(post.created_at)}</span>
                      {post.image_prompt ? <span>มี image prompt แล้ว</span> : <span>ยังไม่มี image prompt</span>}
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-2 lg:w-52">
                    <ActionButton
                      label="ให้ AI ตรวจคุณภาพ"
                      icon={Bot}
                      onClick={() => void handleRunAIQualityCheck(post.id)}
                      variant="secondary"
                      isLoading={aiReviewLoadingPostId === post.id}
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    <ActionButton
                      label="ให้ AI ปรับปรุงโพสต์"
                      icon={Pencil}
                      onClick={() => void handleImproveReviewPost(post.id)}
                      variant="outline"
                      isLoading={aiImproveLoadingPostId === post.id}
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    <ActionButton
                      label="แก้ไข"
                      icon={Pencil}
                      onClick={() => handleLoadDraftToEditor(post)}
                      variant="outline"
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    <ActionButton
                      label={isApproved ? "อนุมัติแล้ว" : "อนุมัติ"}
                      icon={CheckCircle2}
                      onClick={() => void handleSetDraftReviewStatus(post.id, "approved")}
                      variant={isApproved ? "secondary" : "emerald"}
                      disabled={isApproved}
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    <ActionButton
                      label="เก็บเป็น Draft"
                      icon={RotateCcw}
                      onClick={() => void handleSetDraftReviewStatus(post.id, "draft")}
                      variant="outline"
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    <ActionButton
                      label={canSendToSchedule ? "เลือกเวลาโพสต์" : "อนุมัติก่อน"}
                      icon={Calendar}
                      onClick={() => handleOpenSchedule(post)}
                      variant="amber"
                      disabled={!canSendToSchedule}
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    <ActionButton
                      label="ลบ"
                      icon={Trash2}
                      onClick={() => void handleDeleteRequest(post)}
                      variant="danger"
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Publishing Queue</h3>
            <p className="mt-1 text-xs text-slate-500">Approved content moves here once scheduled or once a publish attempt has happened.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterButton active={selectedFilter === "scheduled"} onClick={() => setSelectedFilter("scheduled")}>
              Scheduled
            </FilterButton>
            <FilterButton active={selectedFilter === "approved"} onClick={() => setSelectedFilter("approved")}>
              Approved
            </FilterButton>
            <FilterButton active={selectedFilter === "failed"} onClick={() => setSelectedFilter("failed")}>
              Failed
            </FilterButton>
            <FilterButton active={selectedFilter === "posted"} onClick={() => setSelectedFilter("posted")}>
              Posted
            </FilterButton>
            <FilterButton active={selectedFilter === "all"} onClick={() => setSelectedFilter("all")}>
              All
            </FilterButton>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Approved" value={operationalView.approvedPosts.length} tone="success" />
          <SummaryCard label="Scheduled" value={operationalView.scheduledPosts.length} tone="warning" />
          <SummaryCard label="Posted Today" value={operationalView.postedToday} tone="success" />
          <SummaryCard label="Failed" value={operationalView.failedPosts.length} tone="danger" />
        </div>

        {operationalView.filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 p-10 text-center">
            <Info className="mb-3 h-10 w-10 text-slate-700" />
            <p className="text-lg font-medium text-slate-500">No items in this view</p>
            <p className="mt-1 text-sm text-slate-600">Approve something in the review queue or switch to another filter.</p>
          </div>
        ) : (
          operationalView.filteredPosts.map((post) => {
            const pageReadiness = getPagePublishReadiness({
              pageId: post.page_id,
              settings,
              pages: workspacePages,
            });
            const pageDryRun = runPerPagePublishDryRun({
              post,
              settings,
              pages: workspacePages,
            });
            const effectivePublish = resolveEffectivePublishConfig({
              post,
              settings,
              pages: workspacePages,
            });
            const isScheduled = post.status === "scheduled";
            const isPosted = post.status === "posted";

            return (
              <article
                key={post.id}
                className="group relative flex flex-col gap-3 overflow-hidden rounded-[1.5rem] border border-white/5 bg-slate-900/60 p-4 transition-all hover:bg-slate-900/80 lg:flex-row"
              >
                {isDisplayableImageUrl(post.image_url) ? (
                  <div className="h-20 w-full shrink-0 overflow-hidden rounded-xl lg:h-24 lg:w-32">
                    <SafeQueueImage imageUrl={post.image_url} />
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white">{post.topic || "Untitled post"}</h3>
                      <CompactMetaPill>Page: {pageReadiness.label}</CompactMetaPill>
                      {post.content_pillar ? <CompactMetaPill tone="accent">Pillar: {post.content_pillar}</CompactMetaPill> : null}
                      <CompactMetaPill tone={post.status === "failed" ? "danger" : isScheduled ? "warning" : isPosted ? "success" : "neutral"}>
                        Status: {post.status || "draft"}
                      </CompactMetaPill>
                    </div>

                    {post.hook ? <p className="mt-2 text-sm font-semibold text-cyan-200">Hook: {post.hook}</p> : null}
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-400">{post.content}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-tight text-slate-500">
                      <Calendar className="h-3 w-3" />
                      <span>Created {formatDate(post.created_at)}</span>
                    </div>
                    {post.scheduled_at && isScheduled ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-amber-400">
                        <Clock className="h-3 w-3" />
                        <span>Scheduled {formatDate(post.scheduled_at)}</span>
                      </div>
                    ) : null}
                    {isPosted ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Posted {formatDate(post.posted_at || post.created_at)}</span>
                      </div>
                    ) : null}
                  </div>

                  <details className="mt-3 rounded-xl border border-white/5 bg-slate-950/35 px-3 py-2">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Advanced
                      <ChevronDown className="h-3.5 w-3.5" />
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">{pageDryRun.dryRunLabel}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Target {pageDryRun.resolvedPageLabel} | Page ID {pageDryRun.pageSpecificPageIdReady ? "Ready" : "Missing"} | Token{" "}
                          {pageDryRun.pageSpecificTokenReady ? "Ready" : "Missing"}
                        </p>
                      </div>
                      {effectivePublish.fallbackReason || effectivePublish.blockedReason ? (
                        <p className="text-[10px] italic text-slate-500">
                          {effectivePublish.blockedReason || effectivePublish.fallbackReason}
                        </p>
                      ) : null}
                    </div>
                  </details>
                </div>

                <div className="flex shrink-0 flex-col gap-2 lg:w-52 lg:border-l lg:border-white/5 lg:pl-4">
                  {!isPosted ? (
                    <ActionButton
                      label="Edit"
                      icon={Pencil}
                      onClick={() => handleLoadDraftToEditor(post)}
                      variant="outline"
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                  ) : null}

                  {!isPosted ? (
                    <ActionButton
                      label="Delete"
                      icon={Trash2}
                      onClick={() => void handleDeleteRequest(post)}
                      variant="danger"
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                  ) : null}

                  {!isPosted ? (
                    <ActionButton
                      label={isScheduled ? "Change Time" : "Schedule"}
                      icon={Calendar}
                      onClick={() => handleOpenSchedule(post)}
                      variant="amber"
                      disabled={!canSchedulePost(post)}
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                  ) : null}

                  {isScheduled ? (
                    <div className="grid grid-cols-3 gap-1">
                      {fastReschedulePresets.map((preset) => (
                        <button
                          key={`${post.id}-${preset.id}`}
                          type="button"
                          onClick={() => void handleSchedulePost(post.id, preset.value)}
                          className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200 transition hover:bg-amber-500/15"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {isScheduled ? (
                    <ActionButton
                      label="Unschedule"
                      icon={RotateCcw}
                      onClick={() => void handleUnschedulePost(post.id)}
                      variant="outline"
                      isLoading={isUnschedulingPostId === post.id}
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                  ) : null}

                  {!isPosted ? (
                    <ActionButton
                      label={settings.facebookPublishMode === "live" ? "Post Now" : "Mock Publish"}
                      icon={Send}
                      onClick={() => handlePublishPost(post.id)}
                      variant={settings.facebookPublishMode === "live" ? "emerald" : "secondary"}
                      disabled={!effectivePublish.canAttemptPublish || !canPublishPost(post)}
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                  ) : null}

                  {isPosted ? (
                    <button
                      type="button"
                      onClick={() => void handleDuplicatePost(post)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10"
                    >
                      Duplicate
                    </button>
                  ) : null}

                  {!effectivePublish.canAttemptPublish && !isPosted ? (
                    <div className="flex items-center justify-center gap-1 text-center text-[9px] font-bold uppercase text-rose-400">
                      <AlertCircle className="h-3 w-3" />
                      {effectivePublish.livePerPagePublishStatus === "Blocked" ? "Publish Blocked" : "Missing Config"}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </section>

      <ReviewDetailModalPanel
        post={reviewDetailPost}
        aiReview={reviewDetailAIReview}
        completion={reviewDetailCompletion}
        publishActionState={reviewDetailPublishActionState}
        aiReviewLoadingPostId={aiReviewLoadingPostId}
        aiImproveLoadingPostId={aiImproveLoadingPostId}
        onClose={() => setReviewDetailPostId(null)}
        onSaveEdits={handleSaveReviewDetailEdits}
        onRunAIQualityCheck={handleRunAIQualityCheck}
        onImproveReviewPost={handleImproveReviewPost}
        onLoadDraftToEditor={handleLoadDraftToEditor}
        onApprove={(postId) => handleSetDraftReviewStatus(postId, "approved")}
        onUndoApproval={(postId) => handleSetDraftReviewStatus(postId, "review")}
        onMoveToDraft={(postId) => handleSetDraftReviewStatus(postId, "draft")}
        onSchedule={(post) => {
          setReviewDetailPostId(null);
          handleOpenSchedule(post);
        }}
        onPublish={handleReviewQueuePublish}
        onDelete={async (post) => {
          const didDelete = await handleDeleteRequest(post);
          if (didDelete) setReviewDetailPostId(null);
        }}
      />

      <ScheduleModal
        post={scheduleModalPost}
        value={scheduleValue}
        onChange={setScheduleValue}
        presets={quickSchedulePresets}
        onSave={() => void handleSubmitSchedule()}
        onCancel={handleCloseSchedule}
        isSaving={isSchedulingPostId === scheduleModalPost?.id}
      />
    </div>
  );
}

export default StatusPage;
