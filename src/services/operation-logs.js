import { logger } from "./logger.js";
import { hasSupabaseConfig, supabase } from "./supabase.js";

const LOGS_SELECT =
  "id, created_at, level, source, event, message, page_id, post_id, metadata";

function isMissingLogsTable(error) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        /relation .*operation_logs.* does not exist/i.test(error.message || ""))
  );
}

function normalizeOperationLog(record) {
  return {
    id: record.id ?? `local-log-${Date.now()}`,
    created_at: record.created_at ?? new Date().toISOString(),
    level: record.level ?? "info",
    source: record.source ?? "system",
    event: record.event ?? "unknown",
    message: record.message ?? "",
    page_id: record.page_id ?? null,
    post_id: record.post_id ?? null,
    metadata: record.metadata ?? {},
  };
}

export async function createOperationLog(entry = {}) {
  if (!hasSupabaseConfig || !supabase) {
    return { data: null, error: null, mode: "offline" };
  }

  const payload = {
    level: entry.level || "info",
    source: entry.source || "system",
    event: entry.event || "unknown",
    message: entry.message || "",
    page_id: entry.page_id || null,
    post_id: entry.post_id ? String(entry.post_id) : null,
    metadata: entry.metadata || {},
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
