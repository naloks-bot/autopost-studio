import React from "react";
import { RefreshCw } from "lucide-react";

function ActionButton({
  label,
  icon: Icon,
  loadingIcon: LoadingIcon = RefreshCw,
  isLoading,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  fullWidth = false,
  type = "button",
}) {
  const variants = {
    primary: "bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 px-6 py-4 text-lg",
    secondary: "bg-cyan-400 text-slate-950 px-6 py-3 font-semibold",
    amber: "bg-amber-400 text-slate-950 px-5 py-3 font-semibold",
    emerald: "bg-emerald-400 text-slate-950 px-5 py-3 font-semibold",
    outline: "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 px-3 py-2",
    danger: "border border-rose-400/20 bg-rose-500/10 text-rose-200 px-3 py-2",
  };

  const baseClass = "inline-flex items-center justify-center gap-2 rounded-[1.5rem] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70";
  const variantClass = variants[variant] || variants.primary;
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClass} ${variantClass} ${widthClass} ${className}`}
    >
      {isLoading ? (
        <LoadingIcon className={`h-5 w-5 animate-spin ${variant === 'primary' ? 'h-5 w-5' : 'h-4 w-4'}`} />
      ) : (
        Icon && <Icon className={variant === 'primary' ? 'h-5 w-5' : 'h-4 w-4'} />
      )}
      {label}
    </button>
  );
}

export default ActionButton;
