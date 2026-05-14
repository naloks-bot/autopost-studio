export const LOW_STOCK_THRESHOLD = 3;

export const REVIEW_CHECKLIST_FIELDS = [
  { id: "hookClarity", label: "Hook clarity" },
  { id: "usefulness", label: "Usefulness" },
  { id: "brandFit", label: "Brand fit" },
  { id: "cta", label: "CTA" },
  { id: "antiSlop", label: "Low AI-slop risk" },
];

export const REVIEWABLE_STATUSES = ["draft", "review", "approved"];
export const STOCK_STATUSES = ["draft", "review", "approved", "scheduled", "posted", "failed"];

export function normalizeQualityChecklist(value = {}) {
  const source =
    value && typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return {};
          }
        })()
      : value || {};

  return REVIEW_CHECKLIST_FIELDS.reduce((accumulator, field) => {
    accumulator[field.id] = Boolean(source?.[field.id]);
    return accumulator;
  }, {});
}

export function getChecklistCompletion(checklist = {}) {
  const normalized = normalizeQualityChecklist(checklist);
  const completed = REVIEW_CHECKLIST_FIELDS.filter((field) => normalized[field.id]).length;
  return {
    completed,
    total: REVIEW_CHECKLIST_FIELDS.length,
    isComplete: completed === REVIEW_CHECKLIST_FIELDS.length,
  };
}

export function deriveHookFromContent(content = "", fallback = "") {
  const firstLine = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  const hook = firstLine || String(fallback || "").trim();
  return hook.length <= 140 ? hook : `${hook.slice(0, 137)}...`;
}

export function parseContentPillars(value = "") {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildBatchTopic(baseTopic = "", contentPillar = "", index = 0) {
  const cleanTopic = String(baseTopic || "").trim() || "Content draft";
  return contentPillar ? `${cleanTopic} - ${contentPillar}` : `${cleanTopic} - Draft ${index + 1}`;
}

export function isReviewableStatus(status = "") {
  return REVIEWABLE_STATUSES.includes(String(status || "draft"));
}

export function isApprovedStatus(status = "") {
  return ["approved", "scheduled", "posted", "failed", "publishing"].includes(String(status || ""));
}

export function canSchedulePost(post = {}) {
  return Boolean(post?.source !== "local" && (post?.status === "approved" || post?.status === "failed" || post?.status === "scheduled"));
}

export function canPublishPost(post = {}) {
  return Boolean(post?.source !== "local" && (post?.status === "approved" || post?.status === "scheduled" || post?.status === "failed"));
}

export function getAvailableStockCount(posts = [], pageId = "") {
  return (posts || []).filter((post) => {
    const matchesPage = pageId ? (post.page_id || "default") === pageId : true;
    return matchesPage && (post.status === "approved" || post.status === "scheduled");
  }).length;
}

export function buildStockSummary(posts = [], workspacePages = [], threshold = LOW_STOCK_THRESHOLD) {
  const pages = Array.isArray(workspacePages) && workspacePages.length ? workspacePages : [{ id: "default", label: "Default Page" }];

  const totals = STOCK_STATUSES.reduce((accumulator, status) => {
    accumulator[status] = 0;
    return accumulator;
  }, {});

  const byPage = pages.map((page) => {
    const counts = STOCK_STATUSES.reduce((accumulator, status) => {
      accumulator[status] = 0;
      return accumulator;
    }, {});

    const pagePosts = posts.filter((post) => (post.page_id || "default") === page.id);
    for (const post of pagePosts) {
      const status = STOCK_STATUSES.includes(post.status) ? post.status : "draft";
      counts[status] += 1;
      totals[status] += 1;
    }

    const available = counts.approved + counts.scheduled;
    return {
      pageId: page.id,
      pageLabel: page.label || page.id || "Untitled page",
      counts,
      available,
      isLowStock: available < threshold,
    };
  });

  return {
    totals,
    byPage,
    lowStockPages: byPage.filter((page) => page.isLowStock),
    threshold,
  };
}
