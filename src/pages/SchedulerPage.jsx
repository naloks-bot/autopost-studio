import React, { useMemo } from "react";
import { Calendar, CheckCircle2, Clock3, Info, Layers3, Timer } from "lucide-react";

function formatDate(value) {
  if (!value) return "ยังไม่ตั้งเวลา";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SchedulerPage({ settings, remotePosts = [], schedulerStatus = null }) {
  const scheduledPosts = useMemo(
    () =>
      (remotePosts || [])
        .filter((post) => post.status === "scheduled")
        .sort((a, b) => new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime()),
    [remotePosts]
  );

  const postedCount = (remotePosts || []).filter((post) => post.status === "posted").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">ระบบโพสต์อัตโนมัติ</h2>
              <p className="text-xs text-slate-400">ดูคิวที่ตั้งเวลาไว้และสถานะการทำงานล่าสุด</p>
            </div>
          </div>
          <div className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
            settings.schedulerEnabled
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-slate-700 bg-slate-900/60 text-slate-400"
          }`}>
            ระบบ: {settings.schedulerEnabled ? "เปิดใช้งาน" : "ปิดไว้"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ร่างที่ตั้งเวลาไว้</p>
            <p className="mt-2 text-3xl font-bold text-white">{scheduledPosts.length}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">โพสต์ที่ส่งแล้ว</p>
            <p className="mt-2 text-3xl font-bold text-white">{postedCount}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">รอบล่าสุด</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {schedulerStatus?.lastRun ? formatDate(schedulerStatus.lastRun) : "ยังไม่มีรอบทำงานล่าสุด"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 shadow-sm">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">คิวที่ตั้งเวลาไว้</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              ข้อมูลจริง
            </span>
          </div>

          {scheduledPosts.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">
              ตอนนี้ยังไม่มีร่างที่รอเวลาโพสต์ รายการใหม่จะแสดงที่นี่อัตโนมัติ
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {scheduledPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{post.topic || "ยังไม่ได้ตั้งหัวข้อ"}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      เพจ: {post.page_id || "default"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-300">{formatDate(post.scheduled_at)}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-amber-400">ตั้งเวลาไว้</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">สถานะปัจจุบัน</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              โพสต์ที่ตั้งเวลายังทำงานผ่านตัวประมวลผลเดิมที่เสถียร หน้านี้แสดงสถานะคิวจริงของวันนี้ ไม่ได้จำลอง Queue V2
            </p>
            {schedulerStatus && (
              <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/40 p-3 text-[11px] text-slate-300">
                รอบล่าสุด: สำเร็จ {schedulerStatus.published || 0} • ไม่สำเร็จ {schedulerStatus.failed || 0} • รอเวลา {schedulerStatus.due || 0}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-slate-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Queue V2</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Queue V2 ยังถูกเลื่อนไว้ก่อน ฟีเจอร์ retry ขั้นสูงหรือ analytics ของคิวยังไม่อยู่ในรอบใช้งานปัจจุบัน
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-slate-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">หมายเหตุ</h3>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <p>
                โหมดทดสอบ ความถี่การทำงาน และสถานะการโพสต์ยังใช้พฤติกรรมเดิมที่เสถียร
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
