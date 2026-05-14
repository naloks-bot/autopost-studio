import React, { useMemo, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, ChevronDown, Clock, Facebook, Info, Pencil, RotateCcw, Send, Trash2 } from "lucide-react";
import ActionButton from "../components/ActionButton.jsx";
import { getPagePublishReadiness, resolveEffectivePublishConfig, runPerPagePublishDryRun } from "../services/page-context.js";

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function getMinDateTimeLocalValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localNow = new Date(now.getTime() - offset * 60 * 1000);
  return localNow.toISOString().slice(0, 16);
}

function CompactMetaPill({ children, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-400"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-400"
        : tone === "danger"
          ? "bg-rose-500/10 text-rose-300"
          : tone === "accent"
            ? "bg-cyan-500/10 text-cyan-400"
            : "border border-white/5 bg-slate-950/40 text-slate-400";

  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${toneClass}`}>{children}</span>;
}

function StatusPage({
  allPendingPosts,
  remotePosts,
  localDrafts,
  formatDate,
  handleDeleteLocalDraft,
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

  const pageAware = useMemo(() => {
    const pendingForPage = allPendingPosts.filter((post) => (post.page_id || "default") === activePageId);
    const queuedForPage = pendingForPage.filter((post) => ["draft", "scheduled"].includes(post.status || "draft"));
    const failedForPage = pendingForPage
      .filter((post) => post.status === "failed")
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
    const postedForPage = remotePosts
      .filter((post) => post.status === "posted" && (post.page_id || "default") === activePageId)
      .sort((a, b) => new Date(b.posted_at || b.created_at || 0).getTime() - new Date(a.posted_at || a.created_at || 0).getTime());

    return {
      total: queuedForPage.length + failedForPage.length + postedForPage.length,
      queued: queuedForPage.length,
      failed: failedForPage.length,
      success: postedForPage.length,
      list: pendingForPage,
      recentFailed: failedForPage.slice(0, 5),
      recentPosted: postedForPage.slice(0, 5),
    };
  }, [activePageId, allPendingPosts, remotePosts]);

  const handleOpenSchedule = (post) => {
    setOpenSchedulePostId(post.id);
    setScheduleValue(toDateTimeLocalValue(post.scheduled_at) || getMinDateTimeLocalValue());
  };

  const handleCloseSchedule = () => {
    setOpenSchedulePostId(null);
    setScheduleValue("");
  };

  const handleSubmitSchedule = async (postId) => {
    const success = await handleSchedulePost(postId, scheduleValue);
    if (success) handleCloseSchedule();
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

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10">
            <Facebook className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">สถานะการโพสต์ของเพจปัจจุบัน</p>
            <p className="mt-0.5 text-xs text-cyan-100/80">
              โหมด {settings.facebookPublishMode === "live" ? "โพสต์จริง" : "ทดสอบ"} ยังคงใช้ publish flow เดิมที่เสถียร
              และหน้านี้เน้นคิวปัจจุบันแบบสแกนได้เร็ว
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">ทั้งหมด</span>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">{pageAware.total}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">รอคิวโพสต์</span>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">{pageAware.queued}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">โพสต์สำเร็จ</span>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">{pageAware.success}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">ล้มเหลว</span>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">{pageAware.failed}</p>
        </div>
      </div>

      {schedulerStatus ? (
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-xs text-cyan-300 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold uppercase tracking-tight">ระบบโพสต์อัตโนมัติ</p>
            <p className="mt-0.5 opacity-80">
              ล่าสุด {formatDate(schedulerStatus.lastRun)} • สำเร็จ {schedulerStatus.published} • ไม่สำเร็จ {schedulerStatus.failed}
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between pl-1">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">คิวปัจจุบัน</h3>
          <span className="text-[11px] text-slate-500">posted ถูกซ่อนไว้โดยค่าเริ่มต้น</span>
        </div>

        {pageAware.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 p-12 text-center">
            <Info className="mb-3 h-10 w-10 text-slate-700" />
            <p className="text-lg font-medium text-slate-500">ยังไม่มีร่างในเพจนี้</p>
            <p className="mt-1 text-sm text-slate-600">เริ่มสร้างโพสต์ใหม่หรือสลับเพจจากแถบด้านบนเพื่อดูข้อมูลของเพจอื่น</p>
          </div>
        ) : (
          pageAware.list.map((post) => {
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

            return (
              <article
                key={post.id}
                className="group relative flex flex-col gap-3 overflow-hidden rounded-[1.65rem] border border-white/5 bg-slate-900/60 p-4 transition-all hover:bg-slate-900/80 lg:flex-row"
              >
                {post.image_url ? (
                  <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl lg:h-24 lg:w-32">
                    <img src={post.image_url} alt="Preview" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white">{post.topic || "ยังไม่ได้ตั้งหัวข้อ"}</h3>
                      <CompactMetaPill tone={post.source === "local" ? "warning" : "accent"}>
                        {post.source === "local" ? "ในเครื่อง" : "Supabase"}
                      </CompactMetaPill>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-400">{post.content}</p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <CompactMetaPill>เพจ: {pageReadiness.label}</CompactMetaPill>
                      <CompactMetaPill tone={pageReadiness.pageConfigReady ? "success" : "warning"}>
                        {pageReadiness.pageConfigReady ? "พร้อมใช้ค่าของเพจ" : "ใช้ค่ากลาง"}
                      </CompactMetaPill>
                      <CompactMetaPill tone="accent">เส้นทาง: {effectivePublish.effectivePublishLabel}</CompactMetaPill>
                      <CompactMetaPill tone={post.status === "failed" ? "danger" : isScheduled ? "warning" : "neutral"}>
                        สถานะ: {post.status || "draft"}
                      </CompactMetaPill>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-tight text-slate-500">
                      <Calendar className="h-3 w-3" />
                      <span>สร้างเมื่อ {formatDate(post.created_at)}</span>
                    </div>
                    {post.scheduled_at && isScheduled ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-amber-400">
                        <Clock className="h-3 w-3" />
                        <span>ตั้งเวลา {formatDate(post.scheduled_at)}</span>
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
                          จะไปที่ {pageDryRun.resolvedPageLabel} • Page ID {pageDryRun.pageSpecificPageIdReady ? "พร้อม" : "ไม่มี"} • Token{" "}
                          {pageDryRun.pageSpecificTokenReady ? "พร้อม" : "ไม่มี"}
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

                <div className="flex shrink-0 flex-col justify-center gap-2 lg:w-44 lg:border-l lg:border-white/5 lg:pl-4">
                  {post.source === "local" ? (
                    <>
                      <ActionButton
                        label="แก้ไขร่าง"
                        icon={Pencil}
                        onClick={() => handleLoadDraftToEditor(post)}
                        variant="outline"
                        className="px-3 py-2 text-xs"
                        fullWidth
                      />
                      <ActionButton
                        label="ลบในเครื่อง"
                        icon={Trash2}
                        onClick={() => handleDeleteLocalDraft(post.id)}
                        variant="danger"
                        className="px-3 py-2 text-xs"
                        fullWidth
                      />
                    </>
                  ) : (
                    <>
                      <ActionButton
                        label="แก้ไขร่าง"
                        icon={Pencil}
                        onClick={() => handleLoadDraftToEditor(post)}
                        variant="outline"
                        className="px-3 py-2 text-xs"
                        fullWidth
                      />
                      <ActionButton
                        label={isScheduled ? "เปลี่ยนเวลา" : "ตั้งเวลาโพสต์"}
                        icon={Calendar}
                        onClick={() => handleOpenSchedule(post)}
                        variant="amber"
                        className="px-3 py-2 text-xs"
                        fullWidth
                      />
                      {isScheduled ? (
                        <ActionButton
                          label="ยกเลิกเวลาโพสต์"
                          icon={RotateCcw}
                          onClick={() => void handleUnschedulePost(post.id)}
                          variant="outline"
                          isLoading={isUnschedulingPostId === post.id}
                          className="px-3 py-2 text-xs"
                          fullWidth
                        />
                      ) : null}
                      <ActionButton
                        label={settings.facebookPublishMode === "live" ? "โพสต์ตอนนี้" : "ทดสอบโพสต์"}
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
                          {effectivePublish.livePerPagePublishStatus === "Blocked" ? "ยังโพสต์ไม่ได้" : "ข้อมูลไม่ครบ"}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                {isRemotePost && isScheduleOpen ? (
                  <div className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 lg:ml-[calc(8rem+1rem)]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                      <label className="block flex-1">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-amber-300">Schedule Post</span>
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
                          label="บันทึกเวลา"
                          icon={CheckCircle2}
                          onClick={() => void handleSubmitSchedule(post.id)}
                          variant="amber"
                          isLoading={isSchedulingPostId === post.id}
                        />
                        <ActionButton label="ยกเลิก" icon={Trash2} onClick={handleCloseSchedule} variant="outline" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <details className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">โพสต์สำเร็จล่าสุด</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>{pageAware.recentPosted.length} items</span>
            <ChevronDown className="h-4 w-4" />
          </div>
        </summary>
        <div className="mt-4">
          {pageAware.recentPosted.length === 0 ? (
            <p className="text-sm text-slate-500">ยังไม่มีรายการโพสต์สำเร็จล่าสุดในเพจนี้</p>
          ) : (
            <div className="space-y-2">
              {pageAware.recentPosted.map((post) => (
                <div key={post.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{post.topic || "ยังไม่ได้ตั้งหัวข้อ"}</p>
                    <p className="mt-1 text-[11px] text-slate-500">โพสต์เมื่อ {formatDate(post.posted_at || post.created_at)}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    posted
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      {pageAware.recentFailed.length > 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">โพสต์ล่าสุดที่ล้มเหลว</h3>
          </div>
          <div className="space-y-2">
            {pageAware.recentFailed.map((post) => (
              <div key={post.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{post.topic || "ยังไม่ได้ตั้งหัวข้อ"}</p>
                  <p className="mt-1 text-[11px] text-slate-500">อัปเดตล่าสุด {formatDate(post.updated_at || post.created_at)}</p>
                </div>
                <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                  failed
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StatusPage;
