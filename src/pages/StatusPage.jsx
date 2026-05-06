import { Trash2 } from "lucide-react";
import SectionCard from "../components/SectionCard.jsx";
import ActionButton from "../components/ActionButton.jsx";

function StatusPage({
  allPendingPosts,
  remotePosts,
  localDrafts,
  formatDate,
  handleDeleteLocalDraft,
}) {
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
                  <p className="mt-2 text-sm text-slate-300">{post.content}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    สร้างเมื่อ {formatDate(post.created_at)}
                  </p>
                </div>
                {post.source === "local" && (
                  <ActionButton
                    label="ลบ local draft"
                    icon={Trash2}
                    onClick={() => handleDeleteLocalDraft(post.id)}
                    variant="danger"
                  />
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
