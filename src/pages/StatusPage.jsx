import React from "react";
import { Calendar, Clock, Facebook, Globe, Send, Trash2, Database, Laptop, Info, AlertCircle, Pencil } from "lucide-react";
import SectionCard from "../components/SectionCard.jsx";
import ActionButton from "../components/ActionButton.jsx";
import { validateFacebookConfig } from "../services/facebook.js";

function StatusPage({
  allPendingPosts,
  remotePosts,
  localDrafts,
  formatDate,
  handleDeleteLocalDraft,
  handleLoadDraftToEditor,
  handlePublishPost,
  settings,
  schedulerStatus,
}) {
  const isFbConfigured = validateFacebookConfig(settings);

  return (
    <div className="space-y-6">
      <div className={`flex items-center gap-3 rounded-2xl border p-4 text-xs shadow-sm ${
        settings.facebookPublishMode === "live"
          ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      }`}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10">
          <Facebook className="h-4 w-4" />
        </div>
        <div>
          <p className="font-bold uppercase tracking-tight">
            Publish Mode: {settings.facebookPublishMode === "live" ? "Live" : "Mock Safe"}
          </p>
          <p className="mt-0.5 opacity-80">
            {settings.facebookPublishMode === "live"
              ? "Posts will publish to Facebook for real when you confirm."
              : "Posts stay in safe simulation, which preserves scheduler and publish compatibility."}
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Drafts</span>
            <div className="rounded-full bg-cyan-500/10 p-1.5 text-cyan-400">
               <Database className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight text-white">{allPendingPosts.length}</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supabase Drafts</span>
            <div className="rounded-full bg-violet-500/10 p-1.5 text-violet-400">
               <Globe className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight text-white">
            {remotePosts.filter((post) => post.status !== "posted").length}
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Local Only</span>
            <div className="rounded-full bg-amber-500/10 p-1.5 text-amber-400">
               <Laptop className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight text-white">{localDrafts.length}</p>
        </div>
      </div>

      {/* Scheduler Info */}
      {schedulerStatus && (
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-xs text-cyan-400 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold uppercase tracking-tight">Active Scheduler Service</p>
            <p className="mt-0.5 opacity-80">
              Last sync: {formatDate(schedulerStatus.lastRun)} — Processed: {schedulerStatus.published} OK, {schedulerStatus.failed} Failed
            </p>
          </div>
        </div>
      )}

      {/* Content List */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest pl-1">Active Drafts Queue</h3>
        
        {allPendingPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 p-12 text-center">
            <Info className="mb-3 h-10 w-10 text-slate-700" />
            <p className="text-lg font-medium text-slate-500">No active drafts found</p>
            <p className="mt-1 text-sm text-slate-600">Start by creating a new post in the Create section.</p>
          </div>
        ) : (
          allPendingPosts.map((post) => (
            <article
              key={post.id}
              className="group relative flex flex-col gap-6 overflow-hidden rounded-[2rem] border border-white/5 bg-slate-900/60 p-6 transition-all hover:bg-slate-900/80 lg:flex-row"
            >
              {/* Thumbnail */}
              {(post.image_url) && (
                <div className="h-32 w-full shrink-0 overflow-hidden rounded-2xl lg:h-32 lg:w-48">
                   <img
                    src={post.image_url}
                    alt="Preview"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                </div>
              )}

              {/* Details */}
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">{post.topic || "Untitled Post"}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      post.source === "local" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    }`}>
                      {post.source === "local" ? "Local" : "Supabase"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400 line-clamp-2">{post.content}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                    <Calendar className="h-3 w-3" />
                    <span>Created: {formatDate(post.created_at)}</span>
                  </div>
                  {post.scheduled_at && post.status === "scheduled" && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-tight">
                      <Clock className="h-3 w-3" />
                      <span>Scheduled: {formatDate(post.scheduled_at)}</span>
                    </div>
                  )}
                  {post.image_provider && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                      <ImageIcon className="h-3 w-3" />
                      <span>{post.image_provider}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-col justify-center gap-2 lg:w-48 lg:border-l lg:border-white/5 lg:pl-6">
                {post.source === "local" ? (
                  <>
                    <ActionButton
                      label="Edit Draft"
                      icon={Pencil}
                      onClick={() => handleLoadDraftToEditor(post)}
                      variant="outline"
                      fullWidth
                    />
                    <ActionButton
                      label="Delete Local"
                      icon={Trash2}
                      onClick={() => handleDeleteLocalDraft(post.id)}
                      variant="danger"
                      fullWidth
                    />
                  </>
                ) : (
                  <>
                    <ActionButton
                      label="Edit Draft"
                      icon={Pencil}
                      onClick={() => handleLoadDraftToEditor(post)}
                      variant="outline"
                      fullWidth
                    />
                    <ActionButton
                      label={settings.facebookPublishMode === "live" ? "Publish Live" : "Test Post"}
                      icon={Send}
                      onClick={() => handlePublishPost(post.id)}
                      variant={settings.facebookPublishMode === "live" ? "emerald" : "secondary"}
                      disabled={!isFbConfigured}
                      fullWidth
                    />
                    {!isFbConfigured && (
                      <div className="flex items-center gap-1 justify-center text-[9px] font-bold text-rose-400 uppercase">
                         <AlertCircle className="h-3 w-3" />
                         Missing Config
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

// Helper icon component for StatusPage
function ImageIcon({ className }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

export default StatusPage;
