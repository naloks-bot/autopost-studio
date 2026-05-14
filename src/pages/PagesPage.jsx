import React from "react";
import { BookOpenText, CheckCircle2, FileText, Layers3, Plus, Settings2, Trash2 } from "lucide-react";
import ActionButton from "../components/ActionButton.jsx";

function PagesPage({
  settings,
  workspacePages,
  activeWorkspacePage,
  updateSettingsField,
  updateWorkspacePage,
  addWorkspacePage,
  removeWorkspacePage,
  handleSaveWorkspacePages,
  settingsMessage,
  isSavingSettings,
}) {
  const selectedPage = activeWorkspacePage || workspacePages[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">à¸ˆà¸±à¸”à¸à¸²à¸£à¹€à¸žà¸ˆ</h2>
            </div>
            <ActionButton label="à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸žà¸ˆ" icon={Plus} onClick={addWorkspacePage} variant="outline" />
          </div>

          <div className="space-y-3">
            {workspacePages.map((page) => {
              const isActive = page.id === settings.activePageId;
              const isDefault = page.id === "default";

              return (
                <div
                  key={page.id}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    isActive
                      ? "border-cyan-500/30 bg-cyan-500/10"
                      : "border-white/5 bg-slate-950/40 hover:border-white/10 hover:bg-slate-950/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => updateSettingsField("activePageId", page.id)} className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white">{page.label}</p>
                      <p className="mt-1 text-xs text-slate-400">{page.description || "à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¹€à¸žà¸´à¹ˆà¸¡à¸„à¸³à¸­à¸˜à¸´à¸šà¸²à¸¢à¹€à¸žà¸ˆ"}</p>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {page.status === "active" ? "à¸žà¸£à¹‰à¸­à¸¡à¹ƒà¸Šà¹‰à¸‡à¸²à¸™" : page.status === "mock" ? "à¸—à¸”à¸ªà¸­à¸š" : "à¸£à¹ˆà¸²à¸‡"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWorkspacePage(page.id)}
                        disabled={isDefault}
                        className={`rounded-xl border p-2 transition ${
                          isDefault
                            ? "cursor-not-allowed border-white/5 bg-white/5 text-slate-600"
                            : "border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                        }`}
                        title={isDefault ? "à¸¥à¸šà¹€à¸žà¸ˆà¸«à¸¥à¸±à¸à¹„à¸¡à¹ˆà¹„à¸”à¹‰" : "à¸¥à¸šà¹€à¸žà¸ˆ"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-semibold text-white">à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸žà¸ˆà¸—à¸µà¹ˆà¸à¸³à¸¥à¸±à¸‡à¹ƒà¸Šà¹‰à¸‡à¸²à¸™</h3>
            </div>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {selectedPage?.id === "default" ? "à¹€à¸žà¸ˆà¸«à¸¥à¸±à¸" : "à¹€à¸žà¸ˆà¸‡à¸²à¸™"}
            </span>
          </div>

          {selectedPage ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">à¸Šà¸·à¹ˆà¸­à¹€à¸žà¸ˆ</span>
                  <input
                    value={selectedPage.label}
                    onChange={(event) => updateWorkspacePage(selectedPage.id, { label: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    placeholder="à¸Šà¸·à¹ˆà¸­à¹€à¸žà¸ˆ"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">à¸«à¸¡à¸§à¸”à¹€à¸žà¸ˆ</span>
                  <input
                    value={selectedPage.category || ""}
                    onChange={(event) => updateWorkspacePage(selectedPage.id, { category: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    placeholder="à¹€à¸Šà¹ˆà¸™ à¹à¸šà¸£à¸™à¸”à¹Œà¸«à¸¥à¸±à¸ / à¹‚à¸›à¸£à¹€à¸ˆà¸à¸•à¹Œ / à¸—à¸”à¸ªà¸­à¸š"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">à¸„à¸³à¸­à¸˜à¸´à¸šà¸²à¸¢à¹€à¸žà¸ˆ</span>
                <textarea
                  value={selectedPage.description}
                  onChange={(event) => updateWorkspacePage(selectedPage.id, { description: event.target.value })}
                  className="h-24 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  placeholder="à¸ªà¸£à¸¸à¸›à¸ªà¸±à¹‰à¸™ à¹† à¸§à¹ˆà¸²à¹€à¸žà¸ˆà¸™à¸µà¹‰à¹ƒà¸Šà¹‰à¸—à¸³à¸­à¸°à¹„à¸£"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Page Purpose</span>
                <textarea
                  value={selectedPage.purpose || ""}
                  onChange={(event) => updateWorkspacePage(selectedPage.id, { purpose: event.target.value })}
                  className="h-20 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  placeholder="à¸ªà¸£à¸¸à¸›à¸šà¸—à¸šà¸²à¸—à¸«à¸¥à¸±à¸à¸‚à¸­à¸‡à¹€à¸žà¸ˆà¸™à¸µà¹‰à¹à¸šà¸šà¸ªà¸±à¹‰à¸™ à¹†"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Facebook Page ID</span>
                  <input
                    value={selectedPage.facebookPageId || ""}
                    onChange={(event) => updateWorkspacePage(selectedPage.id, { facebookPageId: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    placeholder="Page ID"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Page Access Token</span>
                  <input
                    value={selectedPage.facebookPageAccessToken || ""}
                    onChange={(event) => updateWorkspacePage(selectedPage.id, { facebookPageAccessToken: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    placeholder="EAAG..."
                    type="password"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">à¸ªà¸–à¸²à¸™à¸°à¹€à¸žà¸ˆ</span>
                  <select
                    value={selectedPage.status || "draft"}
                    onChange={(event) => updateWorkspacePage(selectedPage.id, { status: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  >
                    <option value="active">à¸žà¸£à¹‰à¸­à¸¡à¹ƒà¸Šà¹‰à¸‡à¸²à¸™</option>
                    <option value="draft">à¸£à¹ˆà¸²à¸‡ / à¹€à¸•à¸£à¸µà¸¢à¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</option>
                    <option value="mock">à¸—à¸”à¸ªà¸­à¸š</option>
                  </select>
                </label>
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">à¹€à¸žà¸ˆà¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedPage.label}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {selectedPage.id === "default"
                      ? "à¸£à¸°à¸šà¸šà¸ˆà¸° fallback à¸¡à¸²à¸—à¸µà¹ˆà¹€à¸žà¸ˆà¸™à¸µà¹‰à¹€à¸¡à¸·à¹ˆà¸­à¸¢à¸±à¸‡à¸«à¸² page context à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹„à¸¡à¹ˆà¹€à¸ˆà¸­"
                      : "à¹€à¸¥à¸·à¸­à¸à¹€à¸žà¸ˆà¸™à¸µà¹‰à¸ˆà¸²à¸à¹€à¸¡à¸™à¸¹à¸”à¹‰à¸²à¸™à¸šà¸™à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸Šà¹‰à¹€à¸›à¹‡à¸™ workspace à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selectedPage ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <BookOpenText className="h-5 w-5 text-violet-400" />
              <h3 className="text-base font-semibold text-white">README / AI Memory</h3>
            </div>
            <textarea
              value={selectedPage.readme || ""}
              onChange={(event) => updateWorkspacePage(selectedPage.id, { readme: event.target.value })}
              className="h-48 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-violet-400"
              placeholder="à¸šà¸±à¸™à¸—à¸¶à¸à¸ªà¸´à¹ˆà¸‡à¸—à¸µà¹ˆ AI à¸„à¸§à¸£à¸ˆà¸³à¹€à¸à¸µà¹ˆà¸¢à¸§à¸à¸±à¸šà¹€à¸žà¸ˆà¸™à¸µà¹‰ à¹€à¸Šà¹ˆà¸™ à¸ªà¸´à¸™à¸„à¹‰à¸²à¸«à¸¥à¸±à¸ à¸‚à¹‰à¸­à¸«à¹‰à¸²à¸¡ à¸„à¸³à¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¸šà¹ˆà¸­à¸¢ à¸«à¸£à¸·à¸­à¸šà¸¸à¸„à¸¥à¸´à¸à¸‚à¸­à¸‡à¹à¸šà¸£à¸™à¸”à¹Œ"
            />
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <FileText className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">à¸—à¸´à¸¨à¸—à¸²à¸‡à¸à¸²à¸£à¹€à¸‚à¸µà¸¢à¸™à¹à¸¥à¸°à¸ à¸²à¸ž</h3>
            </div>
            <div className="space-y-4">
              <textarea
                value={selectedPage.writingDirection || ""}
                onChange={(event) => updateWorkspacePage(selectedPage.id, { writingDirection: event.target.value })}
                className="h-24 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                placeholder="à¹à¸™à¸§à¸—à¸²à¸‡à¸à¸²à¸£à¹€à¸‚à¸µà¸¢à¸™ à¹€à¸Šà¹ˆà¸™ à¸ªà¸±à¹‰à¸™ à¸Šà¸±à¸” à¸Šà¸§à¸™à¸‹à¸·à¹‰à¸­ à¸«à¸£à¸·à¸­à¹ƒà¸«à¹‰à¸„à¸§à¸²à¸¡à¸£à¸¹à¹‰à¹à¸šà¸šà¹€à¸›à¹‡à¸™à¸à¸±à¸™à¹€à¸­à¸‡"
              />
              <textarea
                value={selectedPage.imageDirection || ""}
                onChange={(event) => updateWorkspacePage(selectedPage.id, { imageDirection: event.target.value })}
                className="h-24 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                placeholder="à¹à¸™à¸§ prompt à¸ à¸²à¸ž à¹€à¸Šà¹ˆà¸™ à¸¡à¸¸à¸¡à¸à¸¥à¹‰à¸­à¸‡ à¸ªà¹„à¸•à¸¥à¹Œà¸ªà¸´à¸™à¸„à¹‰à¸² à¹‚à¸—à¸™à¸ªà¸µ à¸«à¸£à¸·à¸­à¸­à¸‡à¸„à¹Œà¸›à¸£à¸°à¸à¸­à¸šà¸«à¸¥à¸±à¸"
              />
              <div className="grid gap-4 md:grid-cols-3">
                <input
                  value={selectedPage.visualStyle || ""}
                  onChange={(event) => updateWorkspacePage(selectedPage.id, { visualStyle: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                  placeholder="à¸ à¸²à¸žà¸£à¸§à¸¡à¸ªà¹„à¸•à¸¥à¹Œ"
                />
                <input
                  value={selectedPage.targetAudience || ""}
                  onChange={(event) => updateWorkspacePage(selectedPage.id, { targetAudience: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                  placeholder="à¸à¸¥à¸¸à¹ˆà¸¡à¹€à¸›à¹‰à¸²à¸«à¸¡à¸²à¸¢"
                />
                <input
                  value={selectedPage.tone || ""}
                  onChange={(event) => updateWorkspacePage(selectedPage.id, { tone: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                  placeholder="à¸™à¹‰à¸³à¹€à¸ªà¸µà¸¢à¸‡à¸à¸²à¸£à¹€à¸‚à¸µà¸¢à¸™"
                />
              </div>
              <textarea
                value={selectedPage.contentPillars || ""}
                onChange={(event) => updateWorkspacePage(selectedPage.id, { contentPillars: event.target.value })}
                className="h-24 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                placeholder="Content pillars (à¹à¸¢à¸à¸šà¸£à¸£à¸—à¸±à¸”à¸«à¸£à¸·à¸­à¸„à¸­à¸¡à¸¡à¹ˆà¸²)"
              />
              <textarea
                value={selectedPage.avoidList || ""}
                onChange={(event) => updateWorkspacePage(selectedPage.id, { avoidList: event.target.value })}
                className="h-20 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                placeholder="Avoid list à¸«à¸£à¸·à¸­à¸„à¸³/à¹à¸™à¸§à¸—à¸µà¹ˆà¹„à¸¡à¹ˆà¸„à¸§à¸£à¹ƒà¸Šà¹‰"
              />
              <input
                value={selectedPage.defaultCta || ""}
                onChange={(event) => updateWorkspacePage(selectedPage.id, { defaultCta: event.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                placeholder="Default CTA"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸žà¸ˆ</p>
            <p className="mt-1 text-xs text-slate-400">
              à¸£à¸°à¸šà¸šà¸ˆà¸°à¹€à¸à¹‡à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸—à¸±à¸™à¸—à¸µà¹ƒà¸™à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡ à¹à¸¥à¸° sync à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸žà¸ˆà¸žà¸·à¹‰à¸™à¸à¸²à¸™à¸‚à¸¶à¹‰à¸™ Supabase à¹€à¸—à¹ˆà¸²à¸—à¸µà¹ˆà¹‚à¸„à¸£à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™à¸£à¸­à¸‡à¸£à¸±à¸š
            </p>
          </div>
          <ActionButton
            label="à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸žà¸ˆ"
            icon={CheckCircle2}
            isLoading={isSavingSettings}
            onClick={handleSaveWorkspacePages}
            variant="secondary"
          />
        </div>
        {settingsMessage ? (
          <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-300">
            {settingsMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PagesPage;
