import { defaultWorkspacePages, normalizeWorkspacePages } from "./app-settings.js";

function normalizePageId(pageId) {
  return typeof pageId === "string" && pageId.trim() ? pageId.trim() : "default";
}

function getResolvedPageRecord({ pageId, settings = {}, pages = [] } = {}) {
  const workspacePages = getPageContextPages(settings, pages);
  const requestedPageId = normalizePageId(pageId);
  const resolvedPage =
    workspacePages.find((page) => page.id === requestedPageId) ||
    workspacePages.find((page) => page.id === "default") ||
    workspacePages[0] ||
    defaultWorkspacePages[0];

  return {
    requestedPageId,
    resolvedPage,
  };
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
  const { requestedPageId, resolvedPage } = getResolvedPageRecord({ pageId, settings, pages });

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
  const { requestedPageId, resolvedPage } = getResolvedPageRecord({ pageId, settings, pages });
  const hasDirectPageId = Boolean(resolvedPage?.facebookPageId);
  const hasDirectPageToken = Boolean(resolvedPage?.facebookPageAccessToken);
  const hasGlobalPageId = Boolean(settings.facebookPageId);
  const hasGlobalPageToken = Boolean(settings.facebookPageAccessToken);
  const source = resolvedPage.id === requestedPageId ? "matched" : "fallback";

  let fallbackReason = "";
  if (source === "fallback") {
    fallbackReason = "Requested page was missing. Using default page context.";
  } else if (!hasDirectPageId && !hasDirectPageToken) {
    fallbackReason = "No page-specific Facebook config found. Global V1 publish config remains active.";
  } else if (!hasDirectPageId) {
    fallbackReason = "Page-specific Facebook Page ID is missing. Global V1 publish config remains active.";
  } else if (!hasDirectPageToken) {
    fallbackReason = "Page-specific Facebook token is missing. Global V1 publish config remains active.";
  }

  return {
    requestedPageId,
    resolvedPageId: resolvedPage.id || "default",
    label: resolvedPage.label || "Default Page",
    description: resolvedPage.description || "",
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
    usesGlobalPublishConfig: !(hasDirectPageId && hasDirectPageToken),
    source,
  };
}

export function resolveEffectivePublishConfig({ post = null, pageId, settings = {}, pages = [] } = {}) {
  const readiness = getPagePublishReadiness({
    pageId: pageId || post?.page_id,
    settings,
    pages,
  });
  const { resolvedPage } = getResolvedPageRecord({
    pageId: pageId || post?.page_id,
    settings,
    pages,
  });
  const globalSettings = {
    ...settings,
    facebookPageId: settings.facebookPageId || "",
    facebookPageAccessToken: settings.facebookPageAccessToken || "",
  };
  const pageSpecificSettings = {
    ...settings,
    facebookPageId: resolvedPage?.facebookPageId || "",
    facebookPageAccessToken: resolvedPage?.facebookPageAccessToken || "",
  };
  const isLiveMode = settings.facebookPublishMode === "live";

  if (!isLiveMode) {
    const mockConfigReady = readiness.pageConfigReady || readiness.globalConfigReady;
    const effectiveSettings = readiness.pageConfigReady ? pageSpecificSettings : globalSettings;

    return {
      ...readiness,
      effectivePublishSource: "mock",
      effectivePublishLabel: "Mock Safe",
      livePerPagePublishStatus: "Disabled",
      effectiveSettings,
      effectivePageId: effectiveSettings.facebookPageId || "",
      canAttemptPublish: mockConfigReady,
      blockedReason: mockConfigReady
        ? ""
        : "Facebook publish config is incomplete for both page-specific and global settings.",
      isPageSpecificLive: false,
    };
  }

  if (readiness.pageConfigReady) {
    return {
      ...readiness,
      effectivePublishSource: "page-specific",
      effectivePublishLabel: "Page-Specific Live",
      livePerPagePublishStatus: "Active",
      effectiveSettings: pageSpecificSettings,
      effectivePageId: pageSpecificSettings.facebookPageId,
      canAttemptPublish: true,
      blockedReason: "",
      isPageSpecificLive: true,
    };
  }

  if (readiness.source === "fallback" && readiness.requestedPageId !== readiness.resolvedPageId) {
    return {
      ...readiness,
      effectivePublishSource: "blocked",
      effectivePublishLabel: "Blocked",
      livePerPagePublishStatus: "Blocked",
      effectiveSettings: null,
      effectivePageId: "",
      canAttemptPublish: false,
      blockedReason: "Requested page could not be resolved. Live publish was blocked to avoid publishing to the wrong page.",
      isPageSpecificLive: false,
    };
  }

  if (readiness.resolvedPageId !== "default") {
    return {
      ...readiness,
      effectivePublishSource: "blocked",
      effectivePublishLabel: "Blocked",
      livePerPagePublishStatus: "Blocked",
      effectiveSettings: null,
      effectivePageId: "",
      canAttemptPublish: false,
      blockedReason: "Page-specific publish config is incomplete. Live publish was blocked to avoid publishing to the wrong page.",
      isPageSpecificLive: false,
    };
  }

  if (readiness.globalConfigReady) {
    return {
      ...readiness,
      effectivePublishSource: "global-v1",
      effectivePublishLabel: "Global V1 Live",
      livePerPagePublishStatus: "Fallback",
      effectiveSettings: globalSettings,
      effectivePageId: globalSettings.facebookPageId,
      canAttemptPublish: true,
      blockedReason: "",
      fallbackReason: readiness.fallbackReason || "Default page is using the stable global V1 publish config.",
      isPageSpecificLive: false,
    };
  }

  return {
    ...readiness,
    effectivePublishSource: "blocked",
    effectivePublishLabel: "Blocked",
    livePerPagePublishStatus: "Blocked",
    effectiveSettings: null,
    effectivePageId: "",
    canAttemptPublish: false,
    blockedReason: "Global V1 publish config is incomplete, and no safe page-specific live config is available.",
    isPageSpecificLive: false,
  };
}

export function runPerPagePublishDryRun({ post = null, pageId, settings = {}, pages = [] } = {}) {
  const effectivePublish = resolveEffectivePublishConfig({
    post,
    pageId,
    settings,
    pages,
  });

  return {
    requestedPageId: effectivePublish.requestedPageId,
    resolvedPageId: effectivePublish.resolvedPageId,
    resolvedPageLabel: effectivePublish.label,
    pageSpecificPageIdReady: effectivePublish.hasPageSpecificPageId,
    pageSpecificTokenReady: effectivePublish.hasPageSpecificToken,
    fallbackReason: effectivePublish.fallbackReason || effectivePublish.blockedReason,
    wouldUsePageContext: effectivePublish.label,
    effectiveExecutionMode: effectivePublish.effectiveExecutionMode,
    effectiveExecutionLabel: effectivePublish.effectivePublishLabel,
    effectivePublishSource: effectivePublish.effectivePublishSource,
    livePerPagePublishStatus: effectivePublish.livePerPagePublishStatus,
    isDryRunOnly: true,
    dryRunLabel: "Dry run only - this preview does not publish live",
    willCallFacebookApi: false,
    willPublish: false,
  };
}
