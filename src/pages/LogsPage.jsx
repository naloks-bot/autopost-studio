import React, { useMemo, useState } from "react";
import { Terminal, Download, Copy, Info, History, ShieldAlert, Cpu, Share2 } from "lucide-react";

function formatLogTime(value) {
  if (!value) return "--:--:--";
  return new Date(value).toLocaleTimeString("en-GB", { hour12: false });
}

function formatLogDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getCategory(log) {
  if (log.category) return log.category;
  if (log.source === "scheduler" || log.source === "scheduler_edge") return "scheduler";
  if (log.source === "manual_publish") return "publishing";
  if (log.source === "ai") return "ai";
  if (log.level === "error") return "errors";
  return "system";
}

function getCounts(logs) {
  return {
    all: logs.length,
    ai: logs.filter((log) => getCategory(log) === "ai").length,
    scheduler: logs.filter((log) => getCategory(log) === "scheduler").length,
    publishing: logs.filter((log) => getCategory(log) === "publishing").length,
    errors: logs.filter((log) => log.level === "error").length,
  };
}

function getResultTone(result = "", level = "info") {
  if (result === "success") return "text-emerald-300";
  if (result === "mock" || result === "mock_attempt") return "text-cyan-300";
  if (result === "skipped" || result === "fallback" || result === "cancelled" || result === "scheduled") return "text-amber-300";
  if (result === "claimed") return "text-violet-300";
  if (result === "failed") return "text-rose-300";
  if (result === "started" || result === "due" || result === "live_attempt") return "text-slate-200";
  if (level === "error") return "text-rose-300";
  return "text-slate-300";
}

function getSourceTone(log) {
  if (log.level === "error") return "text-rose-400";
  if (log.source === "scheduler" || log.source === "scheduler_edge") return "text-cyan-400";
  if (log.source === "manual_publish") return "text-emerald-400";
  return "text-slate-400";
}

function formatResultLabel(result = "") {
  const labels = {
    success: "success",
    failed: "failed",
    mock: "mock",
    skipped: "skipped",
    fallback: "fallback",
    cancelled: "cancelled",
    scheduled: "scheduled",
    claimed: "claimed",
    started: "started",
    due: "due",
    live_attempt: "live attempt",
    mock_attempt: "mock attempt",
  };
  return labels[result] || result || "-";
}

export default function LogsPage({ logs = [], logsMode = "offline" }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const counts = useMemo(() => getCounts(logs), [logs]);
  const filteredLogs = useMemo(() => {
    if (activeCategory === "all") return logs;
    if (activeCategory === "errors") return logs.filter((log) => log.level === "error");
    return logs.filter((log) => getCategory(log) === activeCategory);
  }, [activeCategory, logs]);

  const hasPersistentLogs = logsMode === "connected";
  const infoMessage =
    logsMode === "connected"
      ? "Persistent operation logs are active. High-value publish and routing events are stored in Supabase when they occur."
      : logsMode === "missing-table"
        ? "Operation log storage is not ready yet. Run the latest Supabase SQL to enable persistent logs."
        : "Persistent logs are unavailable right now. The publish and scheduler flows still continue safely.";

  const categories = [
    { id: "all", label: "à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”", icon: History, count: counts.all },
    { id: "ai", label: "AI", icon: Cpu, count: counts.ai },
    { id: "scheduler", label: "à¸£à¸°à¸šà¸šà¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´", icon: History, count: counts.scheduler },
    { id: "publishing", label: "à¸à¸²à¸£à¹‚à¸žà¸ªà¸•à¹Œ", icon: Share2, count: counts.publishing },
    { id: "errors", label: "à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”", icon: ShieldAlert, count: counts.errors },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-300">
              <Terminal className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">à¸›à¸£à¸°à¸§à¸±à¸•à¸´à¸£à¸°à¸šà¸š</h2>
              <p className="text-xs text-slate-400">à¸¥à¸³à¸”à¸±à¸šà¹€à¸«à¸•à¸¸à¸à¸²à¸£à¸“à¹Œà¸‚à¸­à¸‡ scheduler, publish à¹à¸¥à¸°à¸ªà¸–à¸²à¸™à¸°à¸£à¸°à¸šà¸šà¹à¸šà¸šà¸­à¹ˆà¸²à¸™à¸‡à¹ˆà¸²à¸¢</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button disabled className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-tight text-slate-500 opacity-60">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button disabled className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-tight text-slate-500 opacity-60">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-3">
          <Info className="mt-0.5 h-5 w-5 text-cyan-300" />
          <div>
            <p className="text-xs font-semibold text-cyan-200">
              {hasPersistentLogs ? "à¸šà¸±à¸™à¸—à¸¶à¸à¸–à¸²à¸§à¸£à¸žà¸£à¹‰à¸­à¸¡à¹ƒà¸Šà¹‰à¸‡à¸²à¸™" : "à¹‚à¸«à¸¡à¸”à¸žà¸·à¹‰à¸™à¸à¸²à¸™"}
            </p>
            <p className="text-[10px] leading-relaxed text-cyan-100/75">{infoMessage}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Log Categories</h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full rounded-lg px-3 py-2 text-xs transition ${
                    activeCategory === cat.id ? "bg-cyan-500/10 text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <cat.icon className="h-3.5 w-3.5" />
                      <span>{cat.label}</span>
                    </div>
                    <span className="text-[10px] font-bold opacity-50">{cat.count}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950/80 shadow-inner">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400"></div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">à¸£à¸²à¸¢à¸à¸²à¸£à¸¥à¹ˆà¸²à¸ªà¸¸à¸”</span>
              </div>
              <span className="text-[9px] text-slate-600">à¹ƒà¸«à¸¡à¹ˆà¸ªà¸¸à¸”à¸à¹ˆà¸­à¸™</span>
            </div>
            <div className="h-[420px] space-y-2 overflow-y-auto p-4">
              {filteredLogs.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-slate-400">
                  {logs.length === 0
                    ? logsMode === "connected"
                      ? "No operation logs have been recorded yet. Publish, scheduler, and routing events will appear here as the system runs."
                      : logsMode === "missing-table"
                        ? "Persistent log storage is not installed yet. Apply the latest Supabase SQL to start recording logs."
                        : "Log storage is unavailable right now, but publish and scheduler flows continue safely."
                    : "à¹„à¸¡à¹ˆà¸¡à¸µ log à¹ƒà¸™à¸«à¸¡à¸§à¸”à¸™à¸µà¹‰à¸ˆà¸²à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¹‚à¸«à¸¥à¸”à¸­à¸¢à¸¹à¹ˆà¸•à¸­à¸™à¸™à¸µà¹‰"}
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const details = log.metadata || log.details || {};
                  const topic = details.topic || "-";
                  const result = details.result || "-";
                  const scheduledAt = details.scheduled_at || null;
                  const attemptedAt = details.attempted_at || log.created_at || null;
                  const errorMessage = details.error_message || (log.level === "error" ? log.message : "");
                  const publishMode = details.publish_mode || "-";

                  return (
                    <div
                      key={log.id}
                      className={`rounded-xl border p-3 text-[11px] ${
                        log.level === "error" ? "border-rose-500/20 bg-rose-500/8" : "border-white/5 bg-white/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="shrink-0 text-slate-600">[{formatLogTime(log.created_at)}]</span>
                        <span className={`shrink-0 font-bold uppercase ${getSourceTone(log)}`}>[{log.source}]</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getResultTone(result, log.level)}`}>
                          {formatResultLabel(result)}
                        </span>
                        <span className="text-slate-300">{log.event}</span>
                      </div>
                      <p className="mt-2 text-sm text-white">{log.message}</p>
                      <div className="mt-3 grid gap-2 text-[10px] text-slate-400 md:grid-cols-2">
                        <p>à¹‚à¸žà¸ªà¸•à¹Œ: <span className="text-slate-200">{topic}</span></p>
                        <p>Scheduled: <span className="text-slate-200">{formatLogDateTime(scheduledAt)}</span></p>
                        <p>Attempted: <span className="text-slate-200">{formatLogDateTime(attemptedAt)}</span></p>
                        <p>Result: <span className={getResultTone(result, log.level)}>{formatResultLabel(result)}</span></p>
                        <p>Mode: <span className="text-slate-200">{publishMode}</span></p>
                      </div>
                      {errorMessage ? (
                        <div className="mt-3 rounded-lg border border-rose-500/10 bg-rose-500/5 px-3 py-2 text-[10px] text-rose-200">
                          Error: {errorMessage}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
              <div className="flex gap-4">
                <span className="animate-pulse text-cyan-400">_</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
