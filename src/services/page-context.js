import { defaultWorkspacePages, normalizeWorkspacePages } from "./app-settings.js";

function normalizePageId(pageId) {
  return typeof pageId === "string" && pageId.trim() ? pageId.trim() : "default";
}

export function getPageContextPages(settings = {}, pages = []) {
  if (Array.isArray(pages) && pages.length) {
    return normalizeWorkspacePages(pages);
  }

  if (Array.isArray(settings.workspacePages) && settings.workspacePages.length) {
    return normalizeWorkspacePages(settings.workspacePages);
  }

  return normalizeWorkspacePages(defaultWorkspacePages);
}

export function resolvePageContext({ pageId, settings = {}, pages = [] } = {}) {
  const workspacePages = getPageContextPages(settings, pages);
  const requestedPageId = normalizePageId(pageId);
  const resolvedPage =
    workspacePages.find((page) => page.id === requestedPageId) ||
    workspacePages.find((page) => page.id === "default") ||
    workspacePages[0] ||
    defaultWorkspacePages[0];

  return {
    requestedPageId,
    resolvedPageId: resolvedPage.id || "default",
    label: resolvedPage.label || "Default Page",
    description: resolvedPage.description || "",
    hasDirectPageConfig: Boolean(
      resolvedPage.facebookPageId && resolvedPage.facebookPageAccessToken
    ),
    usesGlobalPublishConfig: !(
      resolvedPage.facebookPageId && resolvedPage.facebookPageAccessToken
    ),
    source: resolvedPage.id === requestedPageId ? "matched" : "fallback",
  };
}
