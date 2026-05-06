import React from "react";

function SectionCard({ title, children, className = "", noPadding = false }) {
  return (
    <section
      className={`rounded-[2rem] border border-white/10 bg-slate-950/55 shadow-2xl shadow-slate-950/30 ${
        noPadding ? "" : "p-6 sm:p-8"
      } ${className}`}
    >
      {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export default SectionCard;
