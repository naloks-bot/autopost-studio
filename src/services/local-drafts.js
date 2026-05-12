const STORAGE_KEY = "autopost-studio-local-drafts";

function normalizeLocalDraft(draft = {}) {
  return {
    id: draft.id || `local-${crypto.randomUUID()}`,
    page_id: draft.page_id || "default",
    topic: draft.topic || "",
    content: draft.content || "",
    image_prompt: draft.image_prompt || "",
    image_url: draft.image_url || "",
    image_provider: draft.image_provider || null,
    image_revised_prompt: draft.image_revised_prompt || null,
    image_storage_path: draft.image_storage_path || null,
    image_storage_mode: draft.image_storage_mode || null,
    status: draft.status || "draft",
    scheduled_at: draft.scheduled_at || null,
    posted_at: draft.posted_at || null,
    created_at: draft.created_at || new Date().toISOString(),
    source: "local",
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getLocalDrafts() {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const drafts = raw ? JSON.parse(raw) : [];
    return Array.isArray(drafts) ? drafts.map((draft) => normalizeLocalDraft(draft)) : [];
  } catch (error) {
    console.error("Failed to read local drafts:", error);
    return [];
  }
}

export function saveLocalDraft(draft) {
  if (!canUseStorage()) return null;

  const entry = normalizeLocalDraft(draft);
  const nextDrafts = [entry, ...getLocalDrafts()];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDrafts));
  return entry;
}

export function updateLocalDraft(id, draft) {
  if (!canUseStorage()) return null;

  const currentDrafts = getLocalDrafts();
  const existingDraft = currentDrafts.find((item) => item.id === id);
  if (!existingDraft) return saveLocalDraft(draft);

  const entry = normalizeLocalDraft({
    ...existingDraft,
    ...draft,
    id,
    created_at: existingDraft.created_at,
  });
  const nextDrafts = currentDrafts.map((item) => (item.id === id ? entry : item));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDrafts));
  return entry;
}

export function removeLocalDraft(id) {
  if (!canUseStorage()) return;

  const nextDrafts = getLocalDrafts().filter((draft) => draft.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDrafts));
}
