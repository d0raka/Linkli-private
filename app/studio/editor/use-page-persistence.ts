"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { ProjectRecord } from "@/lib/projects";
import type { TemplateConfig } from "@/lib/templates";

export type SaveState = "saved" | "dirty" | "saving" | "error";
export type SaveResult = { ok: true } | { ok: false; error: unknown };

const AUTOSAVE_DELAY_MS = 1200;

export function contentKey(project: Pick<ProjectRecord, "title" | "config">) {
  return JSON.stringify([project.title, project.config]);
}

type SentFields = Pick<ProjectRecord, "title" | "config" | "slug">;

/**
 * Merges a save response into local state. If the host kept typing while the request was in
 * flight, their newer content wins and only server metadata is adopted; otherwise the server's
 * normalized copy replaces local state. A slug the host is still editing is never overwritten.
 */
export function reconcileSave(local: ProjectRecord, before: ProjectRecord, sent: SentFields, server: ProjectRecord) {
  const sentContent = contentKey(sent);
  const localContent = contentKey(local);
  const editedMeanwhile = localContent !== sentContent && localContent !== contentKey(before);
  const slug = local.slug !== sent.slug ? local.slug : server.slug;
  if (editedMeanwhile) {
    return {
      project: { ...local, updatedAt: server.updatedAt, published: server.published, passwordProtected: server.passwordProtected, slug },
      savedContent: sentContent,
    };
  }
  return { project: { ...server, slug }, savedContent: contentKey(server) };
}

/**
 * Persistence for one page. Saves are serialized, each one sends the version token returned by
 * the previous save, and edits typed while a save is in flight are never overwritten by the
 * server's copy. Drafts autosave; live pages only save on request so guests never see half-typed text.
 */
export function usePagePersistence(initial: ProjectRecord, options: { onConflict: (server: ProjectRecord) => void; onUnauthorized: () => void }) {
  const [project, setProject] = useState(initial);
  const [savedContent, setSavedContent] = useState(() => contentKey(initial));
  const [savedSlug, setSavedSlug] = useState(initial.slug);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const latest = useRef(project);
  const version = useRef(initial.updatedAt);
  const slugRef = useRef(initial.slug);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const callbacks = useRef(options);

  useEffect(() => { latest.current = project; }, [project]);
  useEffect(() => { callbacks.current = options; });

  const currentContent = useMemo(() => contentKey(project), [project]);
  const contentDirty = currentContent !== savedContent;
  const slugDirty = project.slug !== savedSlug;
  const dirty = contentDirty || slugDirty;

  const patch = useCallback((next: Partial<ProjectRecord>) => {
    setProject((current) => ({ ...current, ...next }));
  }, []);

  const patchConfig = useCallback(<K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => {
    setProject((current) => ({ ...current, config: { ...current.config, [key]: value } }));
  }, []);

  const adopt = useCallback((server: ProjectRecord) => {
    version.current = server.updatedAt;
    slugRef.current = server.slug;
    setProject(server);
    setSavedContent(contentKey(server));
    setSavedSlug(server.slug);
    setPaused(false);
  }, []);

  const save = useCallback((input: { config?: TemplateConfig; includeSlug?: boolean; expectedUpdatedAt?: string } = {}): Promise<SaveResult> => {
    const run = async (): Promise<SaveResult> => {
      const current = latest.current;
      const sent = {
        title: current.title,
        config: input.config ?? current.config,
        slug: input.includeSlug === false ? slugRef.current : current.slug,
      };
      setSaving(true);
      try {
        const data = await apiFetch<{ project: ProjectRecord }>(`/api/projects/${current.id}`, {
          method: "PATCH",
          json: { ...sent, expectedUpdatedAt: input.expectedUpdatedAt ?? version.current },
        });
        const server = data.project;
        version.current = server.updatedAt;
        slugRef.current = server.slug;
        const next = reconcileSave(latest.current, current, sent, server);
        latest.current = next.project;
        setProject(next.project);
        setSavedContent(next.savedContent);
        if (input.includeSlug !== false) setSavedSlug(server.slug);
        setFailed(false);
        setPaused(false);
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError && error.status === 409 && error.code === "conflict" && error.data.project) {
          setPaused(true);
          callbacks.current.onConflict(error.data.project as ProjectRecord);
        } else if (error instanceof ApiError && error.status === 401) {
          callbacks.current.onUnauthorized();
        } else {
          setFailed(true);
        }
        return { ok: false, error };
      } finally {
        setSaving(false);
      }
    };
    const next = queue.current.then(run, run);
    queue.current = next;
    return next;
  }, []);

  /** Applies a server response that did not go through save(), e.g. publish or password changes. */
  const applyServer = useCallback((server: ProjectRecord) => {
    version.current = server.updatedAt;
    setProject((local) => ({ ...local, updatedAt: server.updatedAt, published: server.published, passwordProtected: server.passwordProtected }));
  }, []);

  useEffect(() => {
    if (project.published || !contentDirty || paused || failed) return;
    const timer = window.setTimeout(() => void save({ includeSlug: false }), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [currentContent, contentDirty, project.published, paused, failed, save]);

  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  const state: SaveState = saving ? "saving" : failed ? "error" : dirty ? "dirty" : "saved";

  return { project, patch, patchConfig, save, adopt, applyServer, state, dirty, slugDirty, saving, resume: () => { setFailed(false); setPaused(false); } };
}
