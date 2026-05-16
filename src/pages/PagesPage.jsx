import React from "react";
import { BookOpenText, CheckCircle2, ChevronDown, FileText, Layers3, Plus, Settings2, Trash2 } from "lucide-react";
import ActionButton from "../components/ActionButton.jsx";

const TONE_OPTIONS = [
  "เป็นกันเอง",
  "เหมือนเพื่อนเล่าให้ฟัง",
  "ง่าย ไม่เทคนิค",
  "กระชับ",
  "ไม่ขายฝัน",
  "ใช้คำหลากหลาย",
];

const POST_LENGTH_OPTIONS = [
  { value: "micro", label: "สั้นมาก: 80–120 คำ" },
  { value: "short", label: "สั้น: 120–180 คำ" },
  { value: "medium", label: "กลาง: 180–280 คำ" },
  { value: "long", label: "ยาว: 300–450 คำ" },
];

function getPageStatusLabel(status = "draft") {
  if (status === "active") return "พร้อมใช้งาน";
  if (status === "mock") return "ทดสอบ";
  return "ร่าง";
}

function getPageSummary(page = {}) {
  return (
    page.description ||
    page.brandMemory ||
    page.purpose ||
    page.readme ||
    "ยังไม่ได้เพิ่ม brief ของเพจ"
  );
}

function normalizeToneList(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleToneValue(currentValue, tone) {
  const currentItems = normalizeToneList(currentValue);
  const nextItems = currentItems.includes(tone)
    ? currentItems.filter((item) => item !== tone)
    : [...currentItems, tone];
  return nextItems.join(", ");
}

function FieldBlock({ label, helper, children }) {
  return (
    <label className="block space-y-2">
      <div className="space-y-1">
        <span className="block text-xs font-semibold text-white">{label}</span>
        {helper ? <p className="text-[11px] leading-relaxed text-slate-400">{helper}</p> : null}
      </div>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 ${
        props.className || ""
      }`}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 ${
        props.className || ""
      }`}
    />
  );
}

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3 border-b border-white/5 pb-3">
        <div className="rounded-2xl bg-white/5 p-2 text-slate-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs leading-relaxed text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

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
  const selectedTones = normalizeToneList(selectedPage?.tone || "");

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.45fr]">
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
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-400">{getPageSummary(page)}</p>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {getPageStatusLabel(page.status)}
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

        <div className="space-y-5">
          <SectionCard
            icon={Settings2}
            title="ข้อมูลเพจที่กำลังใช้งาน"
            subtitle="เก็บข้อมูลเชื่อมต่อและสรุปสั้นของเพจ โดย token ยังถูกซ่อนเหมือนเดิม"
          >
            {selectedPage ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldBlock label="ชื่อเพจ" helper="ชื่อที่ใช้แยก workspace เพจนี้ในระบบ">
                    <TextInput
                      value={selectedPage.label}
                      onChange={(event) => updateWorkspacePage(selectedPage.id, { label: event.target.value })}
                      placeholder="เช่น AI ทำกิน"
                    />
                  </FieldBlock>
                  <FieldBlock label="หมวดเพจ" helper="ช่วยให้ operator แยกเพจหลัก เพจย่อย หรือเพจทดสอบได้ง่ายขึ้น">
                    <TextInput
                      value={selectedPage.category || ""}
                      onChange={(event) => updateWorkspacePage(selectedPage.id, { category: event.target.value })}
                      placeholder="เช่น แบรนด์หลัก / โปรเจกต์ / ทดสอบ"
                    />
                  </FieldBlock>
                </div>

                <FieldBlock label="คำอธิบายสั้นของเพจ" helper="ข้อความสั้นสำหรับสรุปเพจในรายการด้านซ้าย">
                  <TextArea
                    value={selectedPage.description || ""}
                    onChange={(event) => updateWorkspacePage(selectedPage.id, { description: event.target.value })}
                    className="h-20"
                    placeholder="สรุปสั้น ๆ ว่าเพจนี้ทำอะไร"
                  />
                </FieldBlock>

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldBlock label="Facebook Page ID" helper="ใช้กับ flow เชื่อมต่อเพจเดิม">
                    <TextInput
                      value={selectedPage.facebookPageId || ""}
                      onChange={(event) => updateWorkspacePage(selectedPage.id, { facebookPageId: event.target.value })}
                      placeholder="Page ID"
                    />
                  </FieldBlock>
                  <FieldBlock label="Page Access Token" helper="ระบบยังซ่อน token ไว้ ไม่แสดงค่าแบบดิบใน UI">
                    <TextInput
                      value={selectedPage.facebookPageAccessToken || ""}
                      onChange={(event) => updateWorkspacePage(selectedPage.id, { facebookPageAccessToken: event.target.value })}
                      placeholder="EAAG..."
                      type="password"
                    />
                  </FieldBlock>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <FieldBlock label="สถานะเพจ" helper="คง behavior เดิมของ active / draft / mock">
                    <select
                      value={selectedPage.status || "draft"}
                      onChange={(event) => updateWorkspacePage(selectedPage.id, { status: event.target.value })}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                    >
                      <option value="active">พร้อมใช้งาน</option>
                      <option value="draft">ร่าง / เตรียมข้อมูล</option>
                      <option value="mock">ทดสอบ</option>
                    </select>
                  </FieldBlock>

                  <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">เพจเริ่มต้นปัจจุบัน</p>
                    <p className="mt-2 text-sm font-semibold text-white">{selectedPage.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {selectedPage.id === "default"
                        ? "ระบบจะใช้เพจนี้เป็น fallback เมื่อยังหา page context ที่ตรงไม่เจอ"
                        : "เลือกเพจนี้จากเมนูด้านบนเพื่อใช้เป็น workspace ปัจจุบัน"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </SectionCard>

          {selectedPage ? (
            <>
              <SectionCard
                icon={BookOpenText}
                title="Core Brief"
                subtitle="บรีฟส่วนนี้คือแกนหลักที่ AI ใช้จับตัวตนเพจ โทนภาษา รูปแบบโพสต์ และแนวภาพก่อนเสมอ"
              >
                <div className="space-y-5">
                  <FieldBlock
                    label="ตัวตนเพจ / Brand Memory"
                    helper="บอกว่าเพจนี้คือใคร ทำเพื่อใคร และอยากให้คนอ่านรู้สึกอะไร"
                  >
                    <TextArea
                      value={selectedPage.brandMemory || ""}
                      onChange={(event) => updateWorkspacePage(selectedPage.id, { brandMemory: event.target.value })}
                      className="h-32"
                      placeholder="เล่าแก่นของเพจแบบสั้น กระชับ แต่พอให้ AI เข้าใจตัวตน"
                    />
                  </FieldBlock>

                  <FieldBlock
                    label="กลุ่มคนอ่านหลัก"
                    helper="ระบุว่าคนอ่านคือใคร ระดับความรู้แบบไหน และเขากำลังอยากแก้ปัญหาอะไร"
                  >
                    <TextArea
                      value={selectedPage.targetAudience || ""}
                      onChange={(event) => updateWorkspacePage(selectedPage.id, { targetAudience: event.target.value })}
                      className="h-24"
                      placeholder="เช่น คนไทยที่อยากเริ่มใช้ AI กับงานจริงแบบไม่เทคนิคเกินไป"
                    />
                  </FieldBlock>

                  <FieldBlock
                    label="น้ำเสียง / ภาษา"
                    helper="เลือกโทนหลักให้ชัด แล้วเติมรายละเอียดเพิ่มได้ถ้าจำเป็น"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {TONE_OPTIONS.map((tone) => {
                          const isActive = selectedTones.includes(tone);
                          return (
                            <button
                              key={tone}
                              type="button"
                              onClick={() => updateWorkspacePage(selectedPage.id, { tone: toggleToneValue(selectedPage.tone || "", tone) })}
                              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                isActive
                                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                              }`}
                            >
                              {tone}
                            </button>
                          );
                        })}
                      </div>
                      <TextArea
                        value={selectedPage.tone || ""}
                        onChange={(event) => updateWorkspacePage(selectedPage.id, { tone: event.target.value })}
                        className="h-20"
                        placeholder="เติมคำอธิบายน้ำเสียงเพิ่มเติมได้ เช่น ควรนุ่มนวล ตรงไปตรงมา หรือเล่าแบบ practical"
                      />
                    </div>
                  </FieldBlock>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <FieldBlock
                      label="รูปแบบโพสต์"
                      helper="กำหนดกติกาการเขียน เช่น hook, ช่องไฟ, หลีกเลี่ยง markdown และสลับมุมเล่าเรื่องให้ไม่น่าเบื่อ"
                    >
                      <TextArea
                        value={selectedPage.writingDirection || ""}
                        onChange={(event) => updateWorkspacePage(selectedPage.id, { writingDirection: event.target.value })}
                        className="h-36"
                        placeholder="เช่น เปิดด้วย hook สั้น ชัด เว้นบรรทัด อ่านง่าย ไม่ใช้ markdown หนัก และสลับมุมเล่าเรื่องตามหัวข้อ"
                      />
                    </FieldBlock>

                    <FieldBlock
                      label="ความยาวโพสต์"
                      helper="ตั้งกรอบความยาวเพื่อคุมให้โพสต์ไม่ยาวแน่นหรือสั้นเกินไป"
                    >
                      <select
                        value={selectedPage.postLength || "short"}
                        onChange={(event) => updateWorkspacePage(selectedPage.id, { postLength: event.target.value })}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
                      >
                        {POST_LENGTH_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FieldBlock>
                  </div>

                  <FieldBlock
                    label="ตัวอย่างโพสต์ที่อยากให้เขียนตาม"
                    helper="ใส่ตัวอย่างสไตล์โพสต์ที่ชอบ เพื่อให้ AI จับจังหวะภาษา ช่องไฟ และความยาว"
                  >
                    <TextArea
                      value={selectedPage.examplePost || ""}
                      onChange={(event) => updateWorkspacePage(selectedPage.id, { examplePost: event.target.value })}
                      className="h-28"
                      placeholder="วางตัวอย่าง caption ที่ชอบหรือเขียนตัวอย่างสั้น ๆ ได้"
                    />
                  </FieldBlock>

                  <FieldBlock
                    label="แนวทางภาพ / Visual Direction"
                    helper="รวมแนว visual style, mascot, ภาพที่อยากได้ และสิ่งที่ควรหลีกเลี่ยงให้ชัดในช่องเดียว"
                  >
                    <TextArea
                      value={selectedPage.visualDirection || selectedPage.imageDirection || ""}
                      onChange={(event) =>
                        updateWorkspacePage(selectedPage.id, {
                          visualDirection: event.target.value,
                          imageDirection: event.target.value,
                        })
                      }
                      className="h-28"
                      placeholder="เช่น modern, friendly, practical, whitespace เยอะ มี hook ไทยสั้นบนภาพ และหลีกเลี่ยงภาพมืดแน่น"
                    />
                  </FieldBlock>
                </div>
              </SectionCard>

              <details className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/5 p-2 text-slate-200">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Advanced Brief</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        รายละเอียดเสริมที่ช่วยคุม output แต่ไม่ต้องเห็นตลอดเวลา
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </summary>

                <div className="mt-5 space-y-5 border-t border-white/5 pt-5">
                  <div className="grid gap-5 lg:grid-cols-2">
                    <FieldBlock label="Content Pillars" helper="หัวข้อหรือเสาหลักของคอนเทนต์ที่ควรเวียนใช้">
                      <TextArea
                        value={selectedPage.contentPillars || ""}
                        onChange={(event) => updateWorkspacePage(selectedPage.id, { contentPillars: event.target.value })}
                        className="h-24"
                        placeholder="เช่น use case, quick win, mistake, tool review"
                      />
                    </FieldBlock>

                    <FieldBlock label="Avoid List" helper="คำ มุมขาย หรือรูปแบบที่ไม่อยากให้โพสต์ออกไปทางนั้น">
                      <TextArea
                        value={selectedPage.avoidList || ""}
                        onChange={(event) => updateWorkspacePage(selectedPage.id, { avoidList: event.target.value })}
                        className="h-24"
                        placeholder="เช่น ขายฝันเกินจริง อ้างผลลัพธ์เวอร์ หรือ jargon หนาเกินไป"
                      />
                    </FieldBlock>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <FieldBlock label="Default CTA" helper="ถ้าต้องมี CTA ให้เริ่มจากแนวนี้ แต่ไม่ควรจบซ้ำทุกโพสต์">
                      <TextInput
                        value={selectedPage.defaultCta || ""}
                        onChange={(event) => updateWorkspacePage(selectedPage.id, { defaultCta: event.target.value })}
                        placeholder="เช่น ถ้าอยากให้ช่วยแตก use case เพิ่ม บอกมาได้เลย"
                      />
                    </FieldBlock>

                    <FieldBlock label="Image Negative Prompt" helper="คำหรือภาพที่ไม่อยากให้ generator ตีความไปทางนั้น">
                      <TextInput
                        value={selectedPage.imageNegativePrompt || ""}
                        onChange={(event) => updateWorkspacePage(selectedPage.id, { imageNegativePrompt: event.target.value })}
                        placeholder="เช่น cyberpunk, dark scene, robot face, cluttered layout"
                      />
                    </FieldBlock>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <FieldBlock label="คำที่ชอบ" helper="คำหรือ phrase ที่อยากให้ AI หยิบใช้ได้บ่อยขึ้น">
                      <TextArea
                        value={selectedPage.preferredWords || ""}
                        onChange={(event) => updateWorkspacePage(selectedPage.id, { preferredWords: event.target.value })}
                        className="h-20"
                        placeholder="เช่น ใช้ได้เลย, ทำงานจริง, ลองแบบง่าย ๆ"
                      />
                    </FieldBlock>

                    <FieldBlock label="คำที่ไม่ชอบ" helper="คำหรือ phrase ที่อยากหลีกเลี่ยง">
                      <TextArea
                        value={selectedPage.dislikedWords || ""}
                        onChange={(event) => updateWorkspacePage(selectedPage.id, { dislikedWords: event.target.value })}
                        className="h-20"
                        placeholder="เช่น game changer, พลิกชีวิต, passive income"
                      />
                    </FieldBlock>
                  </div>

                  <FieldBlock label="หมายเหตุเดิม / README" helper="เก็บโน้ตเดิมของเพจไว้ได้โดยไม่รบกวน Core Brief">
                    <TextArea
                      value={selectedPage.readme || ""}
                      onChange={(event) => updateWorkspacePage(selectedPage.id, { readme: event.target.value })}
                      className="h-24"
                      placeholder="โน้ตภายในเพิ่มเติมที่อยากเก็บไว้กับเพจนี้"
                    />
                  </FieldBlock>
                </div>
              </details>
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">บันทึกข้อมูลเพจ</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              ระบบยังเก็บข้อมูลในเครื่องและ sync เฉพาะ field พื้นฐานขึ้น Supabase ตามโครงสร้างเดิมที่รองรับอยู่
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
