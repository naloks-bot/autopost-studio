import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Facebook,
  Info,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import ActionButton from "../components/ActionButton.jsx";
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
    <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${valueClass}`}>{value}</p>
    </div>
  );
}

function StatusPage({
  allPendingPosts,
  remotePosts,
  localDrafts,
  formatDate,
  handleDeleteLocalDraft,
  handleDuplicatePost,
  handleLoadDraftToEditor,
  handlePublishPost,
  handleSchedulePost,
  handleUnschedulePost,
  isSchedulingPostId,
  isUnschedulingPostId,
  settings,
  workspacePages,
  schedulerStatus,
  statusNotice,
}) {
  const activePageId = settings.activePageId || "default";
  const [openSchedulePostId, setOpenSchedulePostId] = useState(null);
  const [scheduleValue, setScheduleValue] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const pageAware = useMemo(() => {
    const pendingForPage = allPendingPosts.filter((post) => (post.page_id || "default") === activePageId);
    const draftPosts = sortQueuePosts(pendingForPage.filter((post) => (post.status || "draft") === "draft"));
    const scheduledPosts = sortQueuePosts(pendingForPage.filter((post) => post.status === "scheduled"));
    const failedPosts = sortQueuePosts(pendingForPage.filter((post) => post.status === "failed"));
    const postedPosts = sortQueuePosts(
      remotePosts.filter((post) => post.status === "posted" && (post.page_id || "default") === activePageId)
    );
    const activePosts = sortQueuePosts([...draftPosts, ...scheduledPosts, ...failedPosts]);

    const filteredList =
      selectedFilter === "draft"
        ? draftPosts
        : selectedFilter === "scheduled"
          ? scheduledPosts
          : selectedFilter === "failed"
            ? failedPosts
            : selectedFilter === "posted"
              ? postedPosts
              : activePosts;

    return {
      draftPosts,
      scheduledPosts,
      failedPosts,
      postedPosts,
      activePosts,
      filteredList,
      postedToday: postedPosts.filter((post) => isSameLocalDay(post.posted_at || post.created_at)).length,
    };
  }, [activePageId, allPendingPosts, remotePosts, selectedFilter]);

  const quickSchedulePresets = useMemo(
    () => getQuickSchedulePresets(pageAware.scheduledPosts),
    [pageAware.scheduledPosts]
  );

  const fastReschedulePresets = useMemo(
    () => getFastReschedulePresets(pageAware.scheduledPosts),
    [pageAware.scheduledPosts]
  );

  const queueTitle =
    selectedFilter === "draft"
      ? "Draft Queue"
      : selectedFilter === "scheduled"
        ? "Scheduled Queue"
        : selectedFilter === "failed"
          ? "Failed Queue"
          : selectedFilter === "posted"
            ? "Posted Items"
            : "Active Queue";

  const queueHint =
    selectedFilter === "posted"
      ? "Posted items are shown directly here."
      : "Posted items stay collapsed by default so active work stays on top.";

  const handleOpenSchedule = (post) => {
    setOpenSchedulePostId(post.id);
    setScheduleValue(toLocalDateTimeValue(post.scheduled_at) || getMinDateTimeLocalValue());
  };

  const handleCloseSchedule = () => {
    setOpenSchedulePostId(null);
    setScheduleValue("");
  };

  const handleSubmitSchedule = async (postId) => {
    const success = await handleSchedulePost(postId, scheduleValue);
    if (success) handleCloseSchedule();
  };

  const handleApplyQuickSchedule = async (postId, nextValue) => {
    if (!nextValue) return;
    await handleSchedulePost(postId, nextValue);
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

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10">
            <Facebook className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-cyan-100">Operator Queue</p>
            <p className="mt-0.5 text-xs text-cyan-100/80">
              Publish mode: {settings.facebookPublishMode === "live" ? "Live" : "Mock"}.
              This page keeps content scanning, scheduling, and recovery fast without changing the stable publish flow.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Drafts" value={pageAware.draftPosts.length} />
        <SummaryCard label="Scheduled" value={pageAware.scheduledPosts.length} tone="warning" />
        <SummaryCard label="Posted Today" value={pageAware.postedToday} tone="success" />
        <SummaryCard label="Failed" value={pageAware.failedPosts.length} tone="danger" />
      </div>

      {schedulerStatus ? (
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-xs text-cyan-300 shadow-sm">
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

      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Queue Filters</p>
            <p className="mt-1 text-xs text-slate-500">Focus on one content state at a time without changing queue behavior.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterButton active={selectedFilter === "all"} onClick={() => setSelectedFilter("all")}>
              All
            </FilterButton>
            <FilterButton active={selectedFilter === "draft"} onClick={() => setSelectedFilter("draft")}>
              Draft
            </FilterButton>
            <FilterButton active={selectedFilter === "scheduled"} onClick={() => setSelectedFilter("scheduled")}>
              Scheduled
            </FilterButton>
            <FilterButton active={selectedFilter === "posted"} onClick={() => setSelectedFilter("posted")}>
              Posted
            </FilterButton>
            <FilterButton active={selectedFilter === "failed"} onClick={() => setSelectedFilter("failed")}>
              Failed
            </FilterButton>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between pl-1">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">{queueTitle}</h3>
          <span className="text-[11px] text-slate-500">{queueHint}</span>
        </div>

        {pageAware.filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 p-12 text-center">
            <Info className="mb-3 h-10 w-10 text-slate-700" />
            <p className="text-lg font-medium text-slate-500">No items in this view</p>
            <p className="mt-1 text-sm text-slate-600">Switch filters or save new content from the Create page.</p>
          </div>
        ) : (
          pageAware.filteredList.map((post) => {
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
            const isScheduleOpen = openSchedulePostId === post.id;
            const isRemotePost = post.source !== "local";
            const isScheduled = post.status === "scheduled";
            const isPosted = post.status === "posted";
            const fastActions = fastReschedulePresets;

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
                      <CompactMetaPill tone={post.source === "local" ? "warning" : "accent"}>
                        {post.source === "local" ? "Local" : "Supabase"}
                      </CompactMetaPill>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-400">{post.content}</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <CompactMetaPill>Page: {pageReadiness.label}</CompactMetaPill>
                      <CompactMetaPill tone={pageReadiness.pageConfigReady ? "success" : "warning"}>
                        {pageReadiness.pageConfigReady ? "Page Config Ready" : "Using Fallback Config"}
                      </CompactMetaPill>
                      <CompactMetaPill tone="accent">Route: {effectivePublish.effectivePublishLabel}</CompactMetaPill>
                      <CompactMetaPill tone={post.status === "failed" ? "danger" : isScheduled ? "warning" : isPosted ? "success" : "neutral"}>
                        Status: {post.status || "draft"}
                      </CompactMetaPill>
                    </div>
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

                  <ActionButton
                    label="Duplicate"
                    icon={Copy}
                    onClick={() => void handleDuplicatePost(post)}
                    variant="outline"
                    className="px-3 py-2 text-xs"
                    fullWidth
                  />

                  {post.source === "local" ? (
                    <ActionButton
                      label="Delete Local"
                      icon={Trash2}
                      onClick={() => handleDeleteLocalDraft(post.id)}
                      variant="danger"
                      className="px-3 py-2 text-xs"
                      fullWidth
                    />
                  ) : null}

                  {isRemotePost && !isPosted ? (
                    <>
                      <ActionButton
                        label={isScheduled ? "Change Time" : "Schedule"}
                        icon={Calendar}
                        onClick={() => handleOpenSchedule(post)}
                        variant="amber"
                        className="px-3 py-2 text-xs"
                        fullWidth
                      />

                      {isScheduled ? (
                        <div className="grid grid-cols-3 gap-1">
                          {fastActions.map((preset) => (
                            <button
                              key={`${post.id}-${preset.id}`}
                              type="button"
                              onClick={() => void handleApplyQuickSchedule(post.id, preset.value)}
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

                      <ActionButton
                        label={settings.facebookPublishMode === "live" ? "Post Now" : "Mock Publish"}
                        icon={Send}
                        onClick={() => handlePublishPost(post.id)}
                        variant={settings.facebookPublishMode === "live" ? "emerald" : "secondary"}
                        disabled={!effectivePublish.canAttemptPublish}
                        className="px-3 py-2 text-xs"
                        fullWidth
                      />

                      {!effectivePublish.canAttemptPublish ? (
                        <div className="flex items-center justify-center gap-1 text-center text-[9px] font-bold uppercase text-rose-400">
                          <AlertCircle className="h-3 w-3" />
                          {effectivePublish.livePerPagePublishStatus === "Blocked" ? "Publish Blocked" : "Missing Config"}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>

                {isRemotePost && !isPosted && isScheduleOpen ? (
                  <div className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 lg:ml-[calc(8rem+1rem)]">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {quickSchedulePresets.map((preset) => (
                          <button
                            key={`${post.id}-preset-${preset.id}`}
                            type="button"
                            onClick={() => setScheduleValue(preset.value)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <label className="block flex-1">
                          <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-amber-300">Schedule Time</span>
                          <input
                            type="datetime-local"
                            value={scheduleValue}
                            min={getMinDateTimeLocalValue()}
                            onChange={(event) => setScheduleValue(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-amber-400"
                          />
                        </label>
                        <div className="flex gap-2">
                          <ActionButton
                            label="Save Time"
                            icon={CheckCircle2}
                            onClick={() => void handleSubmitSchedule(post.id)}
                            variant="amber"
                            isLoading={isSchedulingPostId === post.id}
                          />
                          <ActionButton label="Cancel" icon={Trash2} onClick={handleCloseSchedule} variant="outline" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {selectedFilter !== "posted" ? (
        <details className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Recent Posted</h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span>{pageAware.postedPosts.slice(0, 5).length} items</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          </summary>
          <div className="mt-4">
            {pageAware.postedPosts.length === 0 ? (
              <p className="text-sm text-slate-500">No recently posted items for this page yet.</p>
            ) : (
              <div className="space-y-2">
                {pageAware.postedPosts.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{post.topic || "Untitled post"}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Posted {formatDate(post.posted_at || post.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDuplicatePost(post)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10"
                      >
                        Duplicate
                      </button>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        posted
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export default StatusPage;
