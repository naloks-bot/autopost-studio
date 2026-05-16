import React, { useMemo, useState } from "react";
import { ChevronDown, Copy, Cpu, Download, History, Info, ShieldAlert, Share2, Terminal } from "lucide-react";

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

function getResultValue(log = {}, details = {}) {
  return details.result || (log.level === "error" ? "failed" : "info");
}

function getResultTone(result = "", level = "info") {
  if (result === "success") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (result === "mock" || result === "mock_attempt") return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  if (result === "skipped" || result === "fallback" || result === "cancelled" || result === "scheduled") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }
  if (result === "claimed") return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  if (result === "failed" || level === "error") return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  return "border-white/10 bg-white/5 text-slate-300";
}

function getSourceTone(log) {
  if (log.level === "error") return "text-rose-300";
  if (log.source === "scheduler" || log.source === "scheduler_edge") return "text-cyan-300";
  if (log.source === "manual_publish") return "text-emerald-300";
  if (log.source === "ai") return "text-violet-300";
  return "text-slate-300";
}

function formatResultLabel(result = "") {
  const labels = {
    success: "SUCCESS",
    failed: "FAILED",
    mock: "MOCK",
    skipped: "SKIPPED",
    fallback: "FALLBACK",
    cancelled: "CANCELLED",
    scheduled: "SCHEDULED",
    claimed: "CLAIMED",
    started: "STARTED",
    due: "DUE",
    live_attempt: "LIVE ATTEMPT",
    mock_attempt: "MOCK ATTEMPT",
    info: "INFO",
  };
  return labels[result] || String(result || "INFO").replace(/_/g, " ").toUpperCase();
}

function formatSourceLabel(source = "") {
  return String(source || "system").replace(/\s+/g, "_").toUpperCase();
}

function truncateText(value = "", max = 110) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "-";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trim()}…`;
}

function maskSecretsInText(value = "") {
  return String(value || "")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [masked]")
    .replace(/(EAAG[A-Za-z0-9]+)/g, "[masked_token]")
    .replace(/((?:access[_-]?token|page[_-]?access[_-]?token|token|secret|api[_-]?key|authorization)\s*[:=]\s*)([^\s,]+)/gi, "$1[masked]");
}

function sanitizeLogData(value, parentKey = "") {
  const key = String(parentKey || "").toLowerCase();
  const isSafeTokenDiagnostic = /^token_(present|fingerprint|source)$/.test(key);
  const isSensitiveKey = !isSafeTokenDiagnostic && /token|secret|api.?key|authorization|access.?token/.test(key);

  if (value == null) return value;
  if (isSensitiveKey) return "[masked]";
  if (typeof value === "string") return maskSecretsInText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeLogData(item, parentKey));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeLogData(childValue, childKey)]));
  }
  return value;
}

function buildShortMessage(log = {}, details = {}) {
  return truncateText(details.short_message || details.error_message || details.message || log.message || "-", 120);
}

function buildMetaItems(log = {}, details = {}) {
  return [
    { label: "โพสต์", value: details.topic || details.post_title || log.post_title || "-" },
    { label: "Scheduled", value: formatLogDateTime(details.scheduled_at || log.scheduled_at || null) },
    { label: "Attempt", value: details.attempt || details.attempt_number || "-" },
    { label: "Mode", value: details.publish_mode || details.mode || "-" },
  ];
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
    { id: "all", label: "ทั้งหมด", icon: History, count: counts.all },
    { id: "ai", label: "AI", icon: Cpu, count: counts.ai },
    { id: "scheduler", label: "ระบบอัตโนมัติ", icon: History, count: counts.scheduler },
    { id: "publishing", label: "การโพสต์", icon: Share2, count: counts.publishing },
    { id: "errors", label: "ข้อผิดพลาด", icon: ShieldAlert, count: counts.errors },
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
              <h2 className="text-xl font-bold tracking-tight text-white">ประวัติระบบ</h2>
              <p className="text-xs text-slate-400">ดู phase สำคัญแบบสรุปหนึ่งบรรทัดก่อน แล้วค่อยกางรายละเอียดเมื่อจำเป็น</p>
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
            <p className="text-xs font-semibold text-cyan-200">{hasPersistentLogs ? "บันทึกถาวรพร้อมใช้งาน" : "โหมดพื้นฐาน"}</p>
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

        <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950/80 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">รายการล่าสุด</span>
            </div>
            <span className="text-[9px] text-slate-600">ใหม่สุดก่อน</span>
          </div>

          <div className="h-[520px] space-y-3 overflow-y-auto p-4">
            {filteredLogs.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-slate-400">
                {logs.length === 0
                  ? logsMode === "connected"
                    ? "No operation logs have been recorded yet. Publish, scheduler, and routing events will appear here as the system runs."
                    : logsMode === "missing-table"
                      ? "Persistent log storage is not installed yet. Apply the latest Supabase SQL to start recording logs."
                      : "Log storage is unavailable right now, but publish and scheduler flows continue safely."
                  : "ไม่มี log ในหมวดนี้จากข้อมูลที่โหลดอยู่ตอนนี้"}
              </div>
            ) : (
              filteredLogs.map((log) => {
                const details = sanitizeLogData(log.metadata || log.details || {});
                const result = getResultValue(log, details);
                const shortMessage = buildShortMessage(log, details);
                const metaItems = buildMetaItems(log, details);
                const fullMessage = maskSecretsInText(log.message || "-");
                const errorMessage = maskSecretsInText(details.error_message || "");

                return (
                  <details
                    key={log.id}
                    className={`rounded-2xl border ${
                      log.level === "error" ? "border-rose-500/20 bg-rose-500/8" : "border-white/5 bg-white/5"
                    }`}
                  >
                    <summary className="list-none cursor-pointer px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="text-slate-500">[{formatLogTime(log.created_at)}]</span>
                            <span className={`font-semibold ${getSourceTone(log)}`}>{formatSourceLabel(log.source)}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${getResultTone(result, log.level)}`}>
                              {formatResultLabel(result)}
                            </span>
                            <span className="text-slate-200">{log.event || "-"}</span>
                            <span className="min-w-0 truncate text-slate-400">— {shortMessage}</span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {metaItems.map((item) => (
                              <span key={`${log.id}-${item.label}`} className="rounded-full border border-white/5 bg-slate-950/60 px-2.5 py-1 text-[10px] text-slate-400">
                                {item.label}: <span className="text-slate-200">{truncateText(item.value, 48)}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                      </div>
                    </summary>

                    <div className="space-y-4 border-t border-white/5 px-4 py-4 text-xs text-slate-300">
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Summary</p>
                          <p className="mt-1 leading-relaxed text-white">{fullMessage}</p>
                        </div>
                        {errorMessage ? (
                          <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Error Detail</p>
                            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-rose-100">{errorMessage}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Attempted</p>
                          <p className="mt-1 text-slate-200">{formatLogDateTime(details.attempted_at || log.created_at || null)}</p>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Scheduled</p>
                          <p className="mt-1 text-slate-200">{formatLogDateTime(details.scheduled_at || log.scheduled_at || null)}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Metadata</p>
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-300">
                          {JSON.stringify(details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
