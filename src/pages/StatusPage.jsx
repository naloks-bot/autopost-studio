import React, { useMemo } from "react";
import { AlertCircle, Calendar, CheckCircle2, Clock, Facebook, Info, Pencil, Send, Trash2 } from "lucide-react";
import ActionButton from "../components/ActionButton.jsx";
import { getPagePublishReadiness, resolveEffectivePublishConfig, runPerPagePublishDryRun } from "../services/page-context.js";

function StatusPage({
  allPendingPosts,
  remotePosts,
  localDrafts,
  formatDate,
  handleDeleteLocalDraft,
  handleLoadDraftToEditor,
  handlePublishPost,
  settings,
  workspacePages,
  schedulerStatus,
  statusNotice,
}) {
  const activePageId = settings.activePageId || "default";

  const pageAware = useMemo(() => {
    const pendingForPage = allPendingPosts.filter((post) => (post.page_id || "default") === activePageId);
    const postedForPage = remotePosts.filter(
      (post) => post.status === "posted" && (post.page_id || "default") === activePageId
    );

    return {
      total: pendingForPage.length + postedForPage.length,
      queued: pendingForPage.length,
      success: postedForPage.length,
      list: pendingForPage,
    };
  }, [activePageId, allPendingPosts, remotePosts]);

  return (
    <div className="space-y-6">
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
              โหมด {settings.facebookPublishMode === "live" ? "โพสต์จริง" : "ทดสอบ"} ยังทำงานบน flow เดิมที่เสถียร และสถิติด้านล่างอิงจากร่าง/โพสต์ที่มีอยู่ในระบบตอนนี้
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">ทั้งหมด</span>
          <p className="mt-3 text-4xl font-bold tracking-tight text-white">{pageAware.total}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">รอคิวโพสต์</span>
          <p className="mt-3 text-4xl font-bold tracking-tight text-white">{pageAware.queued}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">โพสต์สำเร็จ</span>
          <p className="mt-3 text-4xl font-bold tracking-tight text-white">{pageAware.success}</p>
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

      <div className="space-y-4">
        <h3 className="pl-1 text-sm font-semibold uppercase tracking-widest text-slate-300">รายการของเพจปัจจุบัน</h3>

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

            return (
              <article
                key={post.id}
                className="group relative flex flex-col gap-5 overflow-hidden rounded-[2rem] border border-white/5 bg-slate-900/60 p-5 transition-all hover:bg-slate-900/80 lg:flex-row"
              >
                {post.image_url ? (
                  <div className="h-32 w-full shrink-0 overflow-hidden rounded-2xl lg:h-32 lg:w-44">
                    <img src={post.image_url} alt="Preview" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{post.topic || "ยังไม่ได้ตั้งหัวข้อ"}</h3>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          post.source === "local"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                            : "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
                        }`}
                      >
                        {post.source === "local" ? "ในเครื่อง" : "Supabase"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">{post.content}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/5 bg-slate-950/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        เพจ: {pageReadiness.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          pageReadiness.pageConfigReady ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {pageReadiness.pageConfigReady ? "พร้อมใช้ค่าของเพจ" : "ใช้ค่ากลาง"}
                      </span>
                      <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        เส้นทางโพสต์: {effectivePublish.effectivePublishLabel}
                      </span>
                    </div>

                    <div className="mt-2 rounded-lg border border-cyan-500/10 bg-cyan-500/5 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">{pageDryRun.dryRunLabel}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        จะไปที่ {pageDryRun.resolvedPageLabel} • Page ID {pageDryRun.pageSpecificPageIdReady ? "พร้อม" : "ไม่มี"} • Token{" "}
                        {pageDryRun.pageSpecificTokenReady ? "พร้อม" : "ไม่มี"}
                      </p>
                    </div>

                    {effectivePublish.fallbackReason || effectivePublish.blockedReason ? (
                      <p className="mt-2 text-[10px] italic text-slate-500">
                        {effectivePublish.blockedReason || effectivePublish.fallbackReason}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/5 pt-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-tight text-slate-500">
                      <Calendar className="h-3 w-3" />
                      <span>สร้างเมื่อ {formatDate(post.created_at)}</span>
                    </div>
                    {post.scheduled_at && post.status === "scheduled" ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-amber-400">
                        <Clock className="h-3 w-3" />
                        <span>ตั้งเวลา {formatDate(post.scheduled_at)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col justify-center gap-2 lg:w-44 lg:border-l lg:border-white/5 lg:pl-5">
                  {post.source === "local" ? (
                    <>
                      <ActionButton label="แก้ไขร่าง" icon={Pencil} onClick={() => handleLoadDraftToEditor(post)} variant="outline" fullWidth />
                      <ActionButton label="ลบในเครื่อง" icon={Trash2} onClick={() => handleDeleteLocalDraft(post.id)} variant="danger" fullWidth />
                    </>
                  ) : (
                    <>
                      <ActionButton label="แก้ไขร่าง" icon={Pencil} onClick={() => handleLoadDraftToEditor(post)} variant="outline" fullWidth />
                      <ActionButton
                        label={settings.facebookPublishMode === "live" ? "โพสต์ตอนนี้" : "ทดสอบโพสต์"}
                        icon={Send}
                        onClick={() => handlePublishPost(post.id)}
                        variant={settings.facebookPublishMode === "live" ? "emerald" : "secondary"}
                        disabled={!effectivePublish.canAttemptPublish}
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
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

export default StatusPage;
