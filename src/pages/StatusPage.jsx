import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
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
import {
  buildStockSummary,
  canPublishPost,
  canSchedulePost,
  getChecklistCompletion,
  LOW_STOCK_THRESHOLD,
  REVIEW_CHECKLIST_FIELDS,
} from "../services/content-stock.js";
import { getPagePublishReadiness, resolveEffectivePublishConfig, runPerPagePublishDryRun } from "../services/page-context.js";
import { getFastReschedulePresets, getQuickSchedulePresets, toLocalDateTimeValue } from "../services/schedule-presets.js";

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
      {checked ? "Passed" : "Check"} {label}
    </button>
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
  handleUpdateQualityChecklist,
  handleUnschedulePost,
  isSchedulingPostId,
  isUnschedulingPostId,
  settings,
  workspacePages,
  schedulerStatus,
  statusNotice,
}) {
  const activePageId = settings.activePageId || "default";
  const [scheduleModalPost, setScheduleModalPost] = useState(null);
  const [scheduleValue, setScheduleValue] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("scheduled");

  const stockSummary = useMemo(
    () => buildStockSummary([...remotePosts, ...(localDrafts || [])], workspacePages, LOW_STOCK_THRESHOLD),
    [localDrafts, remotePosts, workspacePages]
  );
  const activePageStock = stockSummary.byPage.find((page) => page.pageId === activePageId) || stockSummary.byPage[0];

  const reviewQueue = useMemo(
    () =>
      sortQueuePosts(
        allPendingPosts.filter((post) => {
          const status = post.status || "draft";
          return (post.page_id || "default") === activePageId && ["draft", "review", "approved"].includes(status);
        })
      ),
    [activePageId, allPendingPosts]
  );

  const operationalView = useMemo(() => {
    const pageRemotePosts = remotePosts.filter((post) => (post.page_id || "default") === activePageId);
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
      return;
    }

    await handleDeletePost(post);
  };

  return (
    <div className="space-y-5">
      {statusNotice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            statusNotice.tone === "danger"
              ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
              : statusNotice.tone === "warning"
                ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {statusNotice.message}
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
            <p className="mt-1 text-xs text-slate-500">Drafts stay unscheduled here until approval. Approve first, then pick a future time.</p>
          </div>
          <span className="text-[11px] text-slate-500">{reviewQueue.length} items</span>
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
            const isApproved = post.status === "approved";
            const canSendToSchedule = canSchedulePost(post);

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

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span>Checklist: {completion.completed}/{completion.total}</span>
                      <span>Created {formatDate(post.created_at)}</span>
                      {post.image_prompt ? <span>Image prompt ready</span> : <span>No image prompt yet</span>}
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-2 lg:w-52">
                    <ActionButton
                      label="Edit"
                      icon={Pencil}
                      onClick={() => handleLoadDraftToEditor(post)}
                      variant="outline"
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    <ActionButton
                      label={isApproved ? "Approved" : "Approve"}
                      icon={CheckCircle2}
                      onClick={() => void handleSetDraftReviewStatus(post.id, "approved")}
                      variant={isApproved ? "secondary" : "emerald"}
                      disabled={isApproved}
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    <ActionButton
                      label="Keep Draft"
                      icon={RotateCcw}
                      onClick={() => void handleSetDraftReviewStatus(post.id, "draft")}
                      variant="outline"
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    <ActionButton
                      label={canSendToSchedule ? "Pick Schedule Time" : "Approve First"}
                      icon={Calendar}
                      onClick={() => handleOpenSchedule(post)}
                      variant="amber"
                      disabled={!canSendToSchedule}
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                    <ActionButton
                      label="Delete"
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
                {post.image_url ? (
                  <div className="h-20 w-full shrink-0 overflow-hidden rounded-xl lg:h-24 lg:w-32">
                    <img src={post.image_url} alt="Preview" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
