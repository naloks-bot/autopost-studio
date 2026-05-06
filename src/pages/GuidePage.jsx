import React from "react";
import { ChevronRight } from "lucide-react";

function GuidePage({ guideSections }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 p-5 text-sm text-cyan-50">
        คู่มือนี้เขียนให้ใช้ตามลำดับจริง เริ่มจากแท็บ ตั้งค่า แล้วค่อยกลับไปสร้าง draft และเช็กสถานะงาน
      </div>
      {guideSections.map((section) => (
        <details
          key={section.title}
          className="group rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-5"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
            <span>{section.title}</span>
            <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
          </summary>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            {section.items.map((item) => (
              <li key={item} className="rounded-xl bg-white/5 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

export default GuidePage;
