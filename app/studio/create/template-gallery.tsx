"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowSquareOut, Lock } from "@phosphor-icons/react/ssr";
import { ApiError, apiFetch, errorMessage } from "@/lib/api-client";
import { clearGuidedDraft, isGuidedTemplate, readGuidedDraft, type EventDraft, type GuidedDraft } from "@/lib/guided-draft";
import { birthdayTitle, personalizeBirthday, personalizeEvent } from "@/lib/guided-personalization";
import { parsePlanFeature, type PlanFeatureId, type PlanType } from "@/lib/plans";
import type { ProjectRecord } from "@/lib/projects";
import PaywallOverlay from "@/app/paywall/paywall-overlay";
import { Notice } from "@/app/ui/status";

export type GalleryTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  headline: string;
  accent: string;
  accentSoft: string;
  locked: boolean;
};

type Group = { id: string; title: string; lead: string; templates: GalleryTemplate[] };

/** Idempotency keys survive a reload so a repeated launch returns the same page instead of a duplicate. */
function launchKey(templateId: string, draftId: string) {
  const storageKey = `linkli-launch:${templateId}:${draftId || "none"}`;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(storageKey, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

async function applyDraft(project: ProjectRecord, templateId: string, draft: GuidedDraft): Promise<ProjectRecord> {
  let patch: { title: string; config: ProjectRecord["config"] } | null = null;
  if (templateId === "birthday" && "recipient" in draft && draft.recipient.trim()) {
    patch = { title: birthdayTitle(draft), config: personalizeBirthday(project.config, draft) };
  } else if ((templateId === "event" || templateId === "wedding") && "name" in draft && draft.name.trim()) {
    patch = personalizeEvent(project.config, draft as EventDraft, templateId);
  }
  if (!patch) return project;
  const saved = await apiFetch<{ project: ProjectRecord }>(`/api/projects/${project.id}`, {
    method: "PATCH",
    json: { ...patch, expectedUpdatedAt: project.updatedAt },
  });
  return saved.project;
}

export default function TemplateGallery({ groups, plan, email, launchTemplate, launchDraft }: { groups: Group[]; plan: PlanType; email: string; launchTemplate: string; launchDraft: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(launchTemplate || null);
  const [error, setError] = useState("");
  const [paywall, setPaywall] = useState<PlanFeatureId | null>(null);
  const inFlight = useRef(false);
  const allTemplates = groups.flatMap((group) => group.templates);

  async function create(templateId: string, draftId = "") {
    if (inFlight.current) return;
    const template = allTemplates.find((item) => item.id === templateId);
    if (template?.locked) {
      setCreating(null);
      setPaywall("paidTemplate");
      return;
    }
    inFlight.current = true;
    setCreating(templateId);
    setError("");
    try {
      const data = await apiFetch<{ project: ProjectRecord }>("/api/projects", {
        method: "POST",
        headers: { "idempotency-key": launchKey(templateId, draftId || String(Date.now())) },
        json: { templateId },
      });
      let project = data.project;
      if (draftId && isGuidedTemplate(templateId)) {
        const draft = readGuidedDraft(templateId, draftId);
        if (draft) {
          project = await applyDraft(project, templateId, draft).catch(() => project);
          clearGuidedDraft(templateId, draftId);
        }
      }
      router.replace(`/studio/${project.id}`);
    } catch (caught) {
      inFlight.current = false;
      setCreating(null);
      if (caught instanceof ApiError && caught.status === 403 && caught.feature) {
        setPaywall(parsePlanFeature(caught.feature) || "morePages");
        return;
      }
      setError(errorMessage(caught, "לא הצלחנו ליצור את העמוד. נסו שוב."));
    }
  }

  useEffect(() => {
    if (!launchTemplate) return;
    const timer = window.setTimeout(() => void create(launchTemplate, launchDraft), 0);
    return () => window.clearTimeout(timer);
    // Runs once for the launch parameters; create() guards against re-entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (launchTemplate && creating === launchTemplate && !error) {
    const template = allTemplates.find((item) => item.id === launchTemplate);
    return (
      <div className="gallery-launch" role="status" aria-live="polite">
        <span className="gallery-launch__emoji" aria-hidden="true">{template?.emoji}</span>
        <p className="gallery-launch__title">מכינים את {template?.name || "העמוד"}…</p>
        <p className="gallery-launch__lead">עוד רגע ייפתח העורך עם מה שכבר כתבתם.</p>
      </div>
    );
  }

  return (
    <>
      {error ? <Notice tone="danger" className="gallery-error">{error}</Notice> : null}
      {groups.map((group) => (
        <section className="gallery-group" key={group.id} aria-labelledby={`gallery-${group.id}`}>
          <header className="gallery-group__header">
            <h2 className="ui-section-title" id={`gallery-${group.id}`}>{group.title}</h2>
            <p className="ui-section-lead">{group.lead}</p>
          </header>
          <ul className="gallery-grid">
            {group.templates.map((template) => {
              const busy = creating === template.id;
              return (
                <li key={template.id} className="template-tile" style={{ "--thumb-accent": template.accent, "--thumb-soft": template.accentSoft } as CSSProperties}>
                  <button
                    type="button"
                    className="template-tile__main"
                    onClick={() => void create(template.id)}
                    disabled={creating !== null}
                    aria-busy={busy || undefined}
                    aria-describedby={`tile-${template.id}-desc`}
                  >
                    <span className="template-tile__thumb" aria-hidden="true">
                      <span className="template-tile__emoji">{template.emoji}</span>
                      <span className="template-tile__headline">{template.headline}</span>
                    </span>
                    <span className="template-tile__name">
                      {template.name}
                      {template.locked ? <span className="template-tile__lock"><Lock aria-hidden="true" weight="bold" />יוצר</span> : null}
                    </span>
                  </button>
                  <p className="template-tile__desc" id={`tile-${template.id}-desc`}>{busy ? "מכינים טיוטה…" : template.description}</p>
                  <a className="template-tile__preview" href={`/preview/${template.id}`} target="_blank" rel="noreferrer">
                    לראות דוגמה<ArrowSquareOut aria-hidden="true" /><span className="sr-only">: {template.name} (נפתח בחלון חדש)</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <PaywallOverlay open={paywall !== null} onClose={() => setPaywall(null)} currentPlan={plan} email={email} feature={paywall} />
    </>
  );
}
