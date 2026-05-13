import { logger } from "./logger.js";
import { hasSupabaseConfig, supabase } from "./supabase.js";

const LOGS_SELECT =
  "id, created_at, category, level, source, event, message, page_id, post_id, details, metadata";

function isMissingLogsTable(error) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        /relation .*operation_logs.* does not exist/i.test(error.message || ""))
  );
}

function normalizeOperationLog(record) {
  const metadata = record.metadata ?? record.details ?? {};
  return {
    id: record.id ?? `local-log-${Date.now()}`,
    created_at: record.created_at ?? new Date().toISOString(),
    category: record.category ?? record.source ?? "system",
    level: record.level ?? "info",
    source: record.source ?? "system",
    event: record.event ?? "unknown",
    message: record.message ?? "",
    page_id: record.page_id ?? null,
    post_id: record.post_id ?? null,
    details: record.details ?? metadata,
    metadata,
  };
}

export async function createOperationLog(entry = {}) {
  if (!hasSupabaseConfig || !supabase) {
    return { data: null, error: null, mode: "offline" };
  }

  const payload = {
    category: entry.category || entry.source || "system",
    level: entry.level || "info",
    source: entry.source || "system",
    event: entry.event || "unknown",
    message: entry.message || "",
    page_id: entry.page_id || null,
    post_id: entry.post_id ? String(entry.post_id) : null,
    details: entry.details || entry.metadata || {},
    metadata: entry.metadata || entry.details || {},
  };

  try {
    const { data, error } = await supabase
      .from("operation_logs")
      .insert([payload])
      .select(LOGS_SELECT)
      .single();

    if (error) {
      if (!isMissingLogsTable(error)) {
        logger.warn("Operation log write skipped.", error);
      }
      return {
        data: null,
        error: null,
        mode: isMissingLogsTable(error) ? "missing-table" : "error",
      };
    }

    return { data: normalizeOperationLog(data), error: null, mode: "connected" };
  } catch (error) {
    logger.warn("Operation log write failed silently.", error);
    return { data: null, error: null, mode: "error" };
  }
}

export async function fetchOperationLogs(limit = 100) {
  if (!hasSupabaseConfig || !supabase) {
    return { data: [], error: null, mode: "offline" };
  }

  try {
    const { data, error } = await supabase
      .from("operation_logs")
      .select(LOGS_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (!isMissingLogsTable(error)) {
        logger.warn("Operation logs fetch skipped.", error);
      }
      return {
        data: [],
        error: null,
        mode: isMissingLogsTable(error) ? "missing-table" : "error",
      };
    }

    return {
      data: (data ?? []).map(normalizeOperationLog),
      error: null,
      mode: "connected",
    };
  } catch (error) {
    logger.warn("Operation logs fetch failed silently.", error);
    return { data: [], error: null, mode: "error" };
  }
}
