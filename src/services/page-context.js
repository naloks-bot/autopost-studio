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

export function getPagePublishReadiness({ pageId, settings = {}, pages = [] } = {}) {
  const pageContext = resolvePageContext({ pageId, settings, pages });
  const resolvedPages = getPageContextPages(settings, pages);
  const resolvedPage =
    resolvedPages.find((page) => page.id === pageContext.resolvedPageId) ||
    resolvedPages[0] ||
    defaultWorkspacePages[0];
  const hasDirectPageId = Boolean(resolvedPage?.facebookPageId);
  const hasDirectPageToken = Boolean(resolvedPage?.facebookPageAccessToken);
  const hasGlobalPageId = Boolean(settings.facebookPageId);
  const hasGlobalPageToken = Boolean(settings.facebookPageAccessToken);

  let fallbackReason = "";
  if (pageContext.source === "fallback") {
    fallbackReason = "Requested page was missing. Using default page context.";
  } else if (!hasDirectPageId && !hasDirectPageToken) {
    fallbackReason = "No page-specific Facebook config found. Global V1 publish config remains active.";
  } else if (!hasDirectPageId) {
    fallbackReason = "Page-specific Facebook Page ID is missing. Global V1 publish config remains active.";
  } else if (!hasDirectPageToken) {
    fallbackReason = "Page-specific Facebook token is missing. Global V1 publish config remains active.";
  }

  return {
    ...pageContext,
    hasPageSpecificPageId: hasDirectPageId,
    hasPageSpecificToken: hasDirectPageToken,
    hasGlobalPageId,
    hasGlobalPageToken,
    pageConfigReady: hasDirectPageId && hasDirectPageToken,
    globalConfigReady: hasGlobalPageId && hasGlobalPageToken,
    fallbackReason,
    effectiveExecutionMode:
      settings.facebookPublishMode === "live" ? "global-v1-live" : "global-v1-mock-safe",
    effectiveExecutionLabel:
      settings.facebookPublishMode === "live" ? "Global V1 Live" : "Global V1 Mock Safe",
  };
}

export function runPerPagePublishDryRun({ post = null, pageId, settings = {}, pages = [] } = {}) {
  const readiness = getPagePublishReadiness({
    pageId: pageId || post?.page_id,
    settings,
    pages,
  });

  return {
    requestedPageId: readiness.requestedPageId,
    resolvedPageId: readiness.resolvedPageId,
    resolvedPageLabel: readiness.label,
    pageSpecificPageIdReady: readiness.hasPageSpecificPageId,
    pageSpecificTokenReady: readiness.hasPageSpecificToken,
    fallbackReason: readiness.fallbackReason,
    wouldUsePageContext: readiness.label,
    effectiveExecutionMode: readiness.effectiveExecutionMode,
    effectiveExecutionLabel: readiness.effectiveExecutionLabel,
    isDryRunOnly: true,
    dryRunLabel: "Dry run only — live per-page publish is disabled",
    willCallFacebookApi: false,
    willPublish: false,
  };
}
