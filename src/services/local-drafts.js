const STORAGE_KEY = "autopost-studio-local-drafts";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getLocalDrafts() {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const drafts = raw ? JSON.parse(raw) : [];
    return Array.isArray(drafts) ? drafts : [];
  } catch (error) {
    console.error("Failed to read local drafts:", error);
    return [];
  }
}

export function saveLocalDraft(draft) {
  if (!canUseStorage()) return null;

  const entry = {
    id: `local-${crypto.randomUUID()}`,
    page_id: draft.page_id || null,
    topic: draft.topic,
    content: draft.content,
    image_prompt: draft.image_prompt,
    image_url: draft.image_url,
    status: draft.status || "draft",
    scheduled_at: draft.scheduled_at || null,
    posted_at: null,
    created_at: draft.created_at || new Date().toISOString(),
    source: "local",
  };

  const nextDrafts = [entry, ...getLocalDrafts()];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDrafts));
  return entry;
}

export function removeLocalDraft(id) {
  if (!canUseStorage()) return;

  const nextDrafts = getLocalDrafts().filter((draft) => draft.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDrafts));
}
