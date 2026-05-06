import React from "react";
import { RefreshCw } from "lucide-react";

function StatusCard({ status, onRefresh, errorMessage }) {
  if (!status) return null;

  const Icon = status.icon;

  return (
    <section className={`rounded-[2rem] border px-6 py-5 ${status.tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && <Icon className="mt-1 h-5 w-5 shrink-0" />}
          <div>
            <p className="font-semibold">{status.label}</p>
            <p className="text-sm opacity-90">{status.detail}</p>
            {errorMessage && <p className="mt-2 text-sm opacity-90">{errorMessage}</p>}
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-2xl border border-current/20 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            รีเฟรชสถานะ
          </button>
        )}
      </div>
    </section>
  );
}

export default StatusCard;
