"use client";

import { useMemo, useSyncExternalStore } from "react";
import PublishedExperience from "@/app/p/[slug]/published-experience";
import { parseDraftPreviewConfig, readDraftPreviewRaw } from "@/lib/draft-preview";
import { applyPlanToConfig, type PlanType } from "@/lib/plans";
import type { TemplateConfig } from "@/lib/templates";

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export default function DraftPreviewClient({
  projectId,
  slug,
  templateId,
  config,
  showWatermark,
  plan,
}: {
  projectId: string;
  slug: string;
  templateId: string;
  config: TemplateConfig;
  showWatermark: boolean;
  plan: PlanType;
}) {
  // The server never sees sessionStorage, so the server snapshot is the saved config and the
  // client swaps in the unsaved draft after hydration without a mismatch.
  const raw = useSyncExternalStore(subscribeToStorage, () => readDraftPreviewRaw(projectId), () => null);
  const liveConfig = useMemo(() => parseDraftPreviewConfig(raw, templateId, config), [raw, templateId, config]);

  return <PublishedExperience slug={slug} templateId={templateId} config={applyPlanToConfig(liveConfig, plan)} showWatermark={showWatermark} trackAnalytics={false} draftPreview draftPreviewHref={`/studio?edit=${projectId}`} />;
}
