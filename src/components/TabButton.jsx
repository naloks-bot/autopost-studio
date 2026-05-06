import React from "react";

function TabButton({ id, label, icon: Icon, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
        isActive
          ? "bg-cyan-400 text-slate-950"
          : "text-slate-300 hover:bg-white/10"
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}

export default TabButton;
