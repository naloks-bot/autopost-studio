import { Calendar, Clock, Facebook, Globe, Send, Trash2 } from "lucide-react";
import SectionCard from "../components/SectionCard.jsx";
import ActionButton from "../components/ActionButton.jsx";
import { validateFacebookConfig } from "../services/facebook.js";

function StatusPage({
  allPendingPosts,
  remotePosts,
  localDrafts,
  formatDate,
  handleDeleteLocalDraft,
  handlePublishPost,
  settings,
  schedulerStatus,
}) {
  const isFbConfigured = validateFacebookConfig(settings);
  return (
    <div className="space-y-6">
      <SectionCard noPadding className="p-5">
        <p className="text-sm text-slate-300">ภาพรวมสถานะ</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-slate-900/80 p-4">
            <p className="text-sm text-slate-400">Draft ทั้งหมด</p>
            <p className="mt-2 text-3xl font-bold">{allPendingPosts.length}</p>
          </article>
          <article className="rounded-2xl bg-slate-900/80 p-4">
            <p className="text-sm text-slate-400">Remote Draft</p>
            <p className="mt-2 text-3xl font-bold">
              {remotePosts.filter((post) => post.status !== "posted").length}
            </p>
          </article>
          <article className="rounded-2xl bg-slate-900/80 p-4">
            <p className="text-sm text-slate-400">Local Draft</p>
            <p className="mt-2 text-3xl font-bold">{localDrafts.length}</p>
          </article>
        </div>

        {schedulerStatus && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-400">
            <Clock className="h-4 w-4" />
            <span>
              ตัวช่วยโพสต์อัตโนมัติทำงานล่าสุดเมื่อ {formatDate(schedulerStatus.lastRun)}: 
              สำเร็จ {schedulerStatus.published}, ล้มเหลว {schedulerStatus.failed}
            </span>
          </div>
        )}
      </SectionCard>

      <div className="space-y-4">
        {allPendingPosts.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-white/15 p-6 text-slate-400">
            ยังไม่มี draft ในระบบ
          </div>
        ) : (
          allPendingPosts.map((post) => (
            <article
              key={post.id}
              className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{post.topic || "ไม่มีหัวข้อ"}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        post.source === "local"
                          ? "bg-amber-400/15 text-amber-200"
                          : "bg-cyan-400/15 text-cyan-200"
                      }`}
                    >
                      {post.source === "local" ? "local draft" : "supabase"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300 line-clamp-3">{post.content}</p>
                  
                  {post.image_url && (
                    <div className="mt-4 flex items-center gap-4">
                      <img
                        src={post.image_url}
                        alt="Preview"
                        className="h-16 w-16 rounded-xl border border-white/10 object-cover"
                      />
                      <div className="space-y-1 text-[10px] text-slate-400">
                        <p>
                          <span className="text-slate-500">Provider:</span>{" "}
                          {post.image_provider || "mock"}
                        </p>
                        <p>
                          <span className="text-slate-500">Storage:</span>{" "}
                          {post.image_storage_mode || "external"}
                        </p>
                        {post.image_storage_path && (
                          <p className="max-w-[150px] truncate">
                            <span className="text-slate-500">Path:</span>{" "}
                            {post.image_storage_path}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-3">
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      สร้างเมื่อ {formatDate(post.created_at)}
                    </p>
                    {post.scheduled_at && post.status === "scheduled" && (
                      <p className="flex items-center gap-1 text-xs text-amber-400">
                        <Clock className="h-3 w-3" />
                        กำหนดโพสต์ {formatDate(post.scheduled_at)}
                      </p>
                    )}
                    {post.posted_at && (
                      <p className="flex items-center gap-1 text-xs text-emerald-400">
                        <Globe className="h-3 w-3" />
                        โพสต์แล้วเมื่อ {formatDate(post.posted_at)}
                      </p>
                    )}
                  </div>
                </div>
                {post.source === "local" && (
                  <ActionButton
                    label="ลบ local draft"
                    icon={Trash2}
                    onClick={() => handleDeleteLocalDraft(post.id)}
                    variant="danger"
                  />
                )}
                {post.source === "remote" && post.status === "draft" && (
                  <div className="flex flex-col gap-2">
                    <ActionButton
                      label={settings.facebookPublishMode === "live" ? "Live Publish" : "Mock Publish"}
                      icon={Send}
                      onClick={() => handlePublishPost(post.id)}
                      variant={settings.facebookPublishMode === "live" ? "emerald" : "outline"}
                      disabled={!isFbConfigured}
                    />
                    {!isFbConfigured && (
                      <p className="text-right text-[10px] text-rose-400">
                        ยังไม่ได้ตั้งค่า Facebook
                      </p>
                    )}
                    {settings.facebookPublishMode === "live" && isFbConfigured && (
                      <p className="text-right text-[10px] text-rose-400 font-bold">
                        โหมดโพสต์จริง
                      </p>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export default StatusPage;
