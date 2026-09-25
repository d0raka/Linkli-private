import { safeConfig, type TemplateConfig } from "./templates";

const storageKey = (projectId: string) => `linkli-draft-preview:${projectId}`;

export function writeDraftPreviewConfig(projectId: string, config: TemplateConfig) {
  try {
    sessionStorage.setItem(storageKey(projectId), JSON.stringify(config));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Raw stored draft (a stable primitive, safe as a useSyncExternalStore snapshot). */
export function readDraftPreviewRaw(projectId: string): string | null {
  try {
    return sessionStorage.getItem(storageKey(projectId));
  } catch {
    return null;
  }
}

export function parseDraftPreviewConfig(raw: string | null, templateId: string, fallback: TemplateConfig) {
  if (!raw) return fallback;
  try {
    return safeConfig(JSON.parse(raw), templateId);
  } catch {
    return fallback;
  }
}

export function readDraftPreviewConfig(projectId: string, templateId: string, fallback: TemplateConfig) {
  return parseDraftPreviewConfig(readDraftPreviewRaw(projectId), templateId, fallback);
}
