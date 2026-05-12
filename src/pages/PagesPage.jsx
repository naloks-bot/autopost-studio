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
              <h2 className="text-base font-semibold text-white">จัดการเพจ</h2>
            </div>
            <ActionButton label="เพิ่มเพจ" icon={Plus} onClick={addWorkspacePage} variant="outline" />
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
                      <p className="mt-1 text-xs text-slate-400">{page.description || "ยังไม่ได้เพิ่มคำอธิบายเพจ"}</p>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {page.status === "active" ? "พร้อมใช้งาน" : page.status === "mock" ? "ทดสอบ" : "ร่าง"}
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
                        title={isDefault ? "ลบเพจหลักไม่ได้" : "ลบเพจ"}
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
              <h3 className="text-base font-semibold text-white">ข้อมูลเพจที่กำลังใช้งาน</h3>
            </div>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {selectedPage?.id === "default" ? "เพจหลัก" : "เพจงาน"}
            </span>
          </div>

          {selectedPage ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">ชื่อเพจ</span>
                  <input
                    value={selectedPage.label}
                    onChange={(event) => updateWorkspacePage(selectedPage.id, { label: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    placeholder="ชื่อเพจ"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">หมวดเพจ</span>
                  <input
                    value={selectedPage.category || ""}
                    onChange={(event) => updateWorkspacePage(selectedPage.id, { category: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                    placeholder="เช่น แบรนด์หลัก / โปรเจกต์ / ทดสอบ"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">คำอธิบายเพจ</span>
                <textarea
                  value={selectedPage.description}
                  onChange={(event) => updateWorkspacePage(selectedPage.id, { description: event.target.value })}
                  className="h-24 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  placeholder="สรุปสั้น ๆ ว่าเพจนี้ใช้ทำอะไร"
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
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">สถานะเพจ</span>
                  <select
                    value={selectedPage.status || "draft"}
                    onChange={(event) => updateWorkspacePage(selectedPage.id, { status: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  >
                    <option value="active">พร้อมใช้งาน</option>
                    <option value="draft">ร่าง / เตรียมข้อมูล</option>
                    <option value="mock">ทดสอบ</option>
                  </select>
                </label>
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">เพจเริ่มต้นปัจจุบัน</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedPage.label}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {selectedPage.id === "default"
                      ? "ระบบจะ fallback มาที่เพจนี้เมื่อยังหา page context ที่ต้องการไม่เจอ"
                      : "เลือกเพจนี้จากเมนูด้านบนเพื่อใช้เป็น workspace ปัจจุบัน"}
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
              placeholder="บันทึกสิ่งที่ AI ควรจำเกี่ยวกับเพจนี้ เช่น สินค้าหลัก ข้อห้าม คำที่ใช้บ่อย หรือบุคลิกของแบรนด์"
            />
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <FileText className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">ทิศทางการเขียนและภาพ</h3>
            </div>
            <div className="space-y-4">
              <textarea
                value={selectedPage.writingDirection || ""}
                onChange={(event) => updateWorkspacePage(selectedPage.id, { writingDirection: event.target.value })}
                className="h-24 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                placeholder="แนวทางการเขียน เช่น สั้น ชัด ชวนซื้อ หรือให้ความรู้แบบเป็นกันเอง"
              />
              <textarea
                value={selectedPage.imageDirection || ""}
                onChange={(event) => updateWorkspacePage(selectedPage.id, { imageDirection: event.target.value })}
                className="h-24 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                placeholder="แนว prompt ภาพ เช่น มุมกล้อง สไตล์สินค้า โทนสี หรือองค์ประกอบหลัก"
              />
              <div className="grid gap-4 md:grid-cols-3">
                <input
                  value={selectedPage.visualStyle || ""}
                  onChange={(event) => updateWorkspacePage(selectedPage.id, { visualStyle: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                  placeholder="ภาพรวมสไตล์"
                />
                <input
                  value={selectedPage.targetAudience || ""}
                  onChange={(event) => updateWorkspacePage(selectedPage.id, { targetAudience: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                  placeholder="กลุ่มเป้าหมาย"
                />
                <input
                  value={selectedPage.tone || ""}
                  onChange={(event) => updateWorkspacePage(selectedPage.id, { tone: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm outline-none focus:border-emerald-400"
                  placeholder="น้ำเสียงหลัก"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">บันทึกข้อมูลเพจ</p>
            <p className="mt-1 text-xs text-slate-400">
              ระบบจะเก็บข้อมูลใช้งานทันทีในเครื่อง และ sync ข้อมูลเพจพื้นฐานขึ้น Supabase เท่าที่โครงสร้างปัจจุบันรองรับ
            </p>
          </div>
          <ActionButton
            label="บันทึกข้อมูลเพจ"
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
