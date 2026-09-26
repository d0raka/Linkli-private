"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react/ssr";
import { ApiError, apiFetch, errorMessage } from "@/lib/api-client";
import { writeDraftPreviewConfig } from "@/lib/draft-preview";
import { canUsePagePassword, featureForConfigKey, hasPlanAccess, isPlanGatedValue, parsePlanFeature, requiredPlanForFeature, type PlanFeatureId } from "@/lib/plans";
import type { ProjectRecord } from "@/lib/projects";
import { PRODUCTION_ORIGIN } from "@/lib/site";
import type { TemplateConfig } from "@/lib/templates";
import { formatHostWhatsAppInvite, whatsappShareHref } from "@/lib/whatsapp-share";
import PaywallOverlay from "@/app/paywall/paywall-overlay";
import { Button } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Notice } from "@/app/ui/status";
import { useToast } from "@/app/ui/toast";
import { Editor, type Profile } from "./editor";
import EditorTopBar from "./editor-top-bar";
import { usePagePersistence } from "./use-page-persistence";

type PendingDialog = "delete" | "unpublish" | "leave" | null;

/**
 * Owns one page's lifecycle around the Editor: saving (autosave for drafts), publishing, the
 * page password, deletion, plan gates and the editor top bar.
 */
export default function EditorScreen({ initialProject, profile }: { initialProject: ProjectRecord; profile: Profile }) {
  const router = useRouter();
  const toast = useToast();
  const [conflict, setConflict] = useState<ProjectRecord | null>(null);
  const [paywallFeature, setPaywallFeature] = useState<PlanFeatureId | null>(null);
  const [dialog, setDialog] = useState<PendingDialog>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [origin, setOrigin] = useState(PRODUCTION_ORIGIN);
  const persistence = usePagePersistence(initialProject, {
    onConflict: setConflict,
    onUnauthorized: () => router.push(`/login?returnTo=${encodeURIComponent(`/studio/${initialProject.id}`)}`),
  });
  const { project, patch, save, state: saveState } = persistence;
  const busy = publishing || persistence.saving;
  const pageUrl = `${origin}/p/${project.slug}`;
  const shareHref = whatsappShareHref(formatHostWhatsAppInvite({ headline: project.config.headline, tease: project.config.subtitle || project.config.introLabel, url: pageUrl, emoji: project.config.emoji }));

  useEffect(() => {
    const timer = window.setTimeout(() => setOrigin(window.location.origin), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function updateConfig<K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) {
    const feature = featureForConfigKey(String(key));
    if (feature && isPlanGatedValue(value) && !hasPlanAccess(profile.plan, requiredPlanForFeature(feature))) {
      setPaywallFeature(feature);
      return;
    }
    persistence.patchConfig(key, value);
  }

  function planGate(error: unknown, fallback: PlanFeatureId) {
    if (error instanceof ApiError && error.status === 403 && (error.code === "plan_limit" || error.feature)) {
      setPaywallFeature(parsePlanFeature(error.feature) || fallback);
      return true;
    }
    return false;
  }

  async function saveNow(options: { quiet?: boolean } = {}) {
    const result = await save();
    if (result.ok && !options.quiet) toast.show(project.published ? "העמוד עודכן" : "השינויים נשמרו");
    if (!result.ok && !(result.error instanceof ApiError && [401, 409].includes(result.error.status))) {
      toast.show(errorMessage(result.error, "לא הצלחנו לשמור את השינויים."), { tone: "danger" });
    }
    return result.ok;
  }

  async function saveConfigNow(config: TemplateConfig) {
    patch({ config });
    const result = await save({ config, includeSlug: false });
    return result.ok;
  }

  async function publish(published: boolean) {
    if (published && !(await saveNow({ quiet: true }))) return false;
    setPublishing(true);
    try {
      const data = await apiFetch<{ project: ProjectRecord }>(`/api/projects/${project.id}/publish`, { method: "POST", json: { published } });
      persistence.applyServer(data.project);
      toast.show(data.project.published ? "העמוד באוויר. עכשיו אפשר לשתף." : "העמוד הוחזר לטיוטה. הקישור לא פעיל.");
      return true;
    } catch (error) {
      if (!planGate(error, "morePages")) toast.show(errorMessage(error, "לא הצלחנו לעדכן את מצב הפרסום."), { tone: "danger" });
      return false;
    } finally {
      setPublishing(false);
    }
  }

  function primaryAction() {
    if (project.published) void saveNow();
    else void publish(true);
  }

  async function updatePagePassword(password: string | null) {
    if (password !== null && !canUsePagePassword(profile.plan)) {
      setPaywallFeature("pagePassword");
      return false;
    }
    setPublishing(true);
    try {
      const data = await apiFetch<{ project: ProjectRecord }>(`/api/projects/${project.id}/password`, { method: "POST", json: password === null ? { remove: true } : { password } });
      persistence.applyServer(data.project);
      toast.show(password === null ? "הסיסמה הוסרה מהעמוד" : "העמוד מוגן עכשיו בסיסמה");
      return true;
    } catch (error) {
      if (!planGate(error, "pagePassword")) toast.show(errorMessage(error, "לא הצלחנו לעדכן את הגנת העמוד."), { tone: "danger" });
      return false;
    } finally {
      setPublishing(false);
    }
  }

  async function openPreview() {
    writeDraftPreviewConfig(project.id, project.config);
    const tab = window.open("about:blank", "_blank");
    if (!(await saveNow({ quiet: true }))) {
      tab?.close();
      return;
    }
    const href = `/studio/preview/${project.id}`;
    if (tab) tab.location.replace(href);
    else window.open(href, "_blank", "noopener,noreferrer");
  }

  async function leave() {
    if (!persistence.dirty && !persistence.saving) {
      router.push("/studio");
      return;
    }
    if (!project.published && !conflict) {
      await save();
      router.push("/studio");
      return;
    }
    setDialog("leave");
  }

  async function confirmDialog(choice: "primary" | "secondary" = "primary") {
    setDialogBusy(true);
    setDialogError("");
    try {
      if (dialog === "delete") {
        await apiFetch(`/api/projects/${project.id}`, { method: "DELETE" });
        router.push("/studio");
        router.refresh();
        return;
      }
      if (dialog === "unpublish") {
        if (await publish(false)) setDialog(null);
        return;
      }
      if (dialog === "leave") {
        if (choice === "primary" && !(await saveNow({ quiet: true }))) return;
        router.push("/studio");
      }
    } catch (error) {
      setDialogError(errorMessage(error, "הפעולה לא הושלמה. נסו שוב."));
    } finally {
      setDialogBusy(false);
    }
  }

  const dialogCopy = {
    delete: { title: "למחוק את העמוד?", description: `״${project.title}״ יימחק לצמיתות, כולל הקישור, התמונות ואישורי ההגעה.`, confirm: "מחיקה לצמיתות", busy: "מוחקים…" },
    unpublish: { title: "להוריד את העמוד מהאוויר?", description: "הקישור יפסיק לעבוד עד שתפרסמו שוב. העמוד עצמו נשמר כטיוטה.", confirm: "הורדה מהאוויר", busy: "מעדכנים…" },
    leave: { title: "לעדכן את העמוד לפני היציאה?", description: "יש שינויים שעוד לא עודכנו בעמוד שבאוויר. האורחים רואים את הגרסה הקודמת עד שתעדכנו.", confirm: "עדכון ויציאה", busy: "מעדכנים…" },
  } as const;
  const copy = dialog ? dialogCopy[dialog] : null;

  return (
    <div className="editor-shell">
      <EditorTopBar
        project={project}
        saveState={saveState}
        busy={busy}
        shareHref={shareHref}
        pageUrl={pageUrl}
        hasRsvp={project.config.rsvpEnabled === true}
        onBack={() => void leave()}
        onPreview={() => void openPreview()}
        onPrimary={primaryAction}
        onRetry={() => { persistence.resume(); void saveNow(); }}
        onUnpublish={() => setDialog("unpublish")}
        onDelete={() => setDialog("delete")}
      />

      <main id="main-content" className="editor-main" tabIndex={-1}>
        {conflict ? (
          <Notice
            tone="warning"
            title="העמוד נערך גם בחלון או במכשיר אחר"
            className="editor-conflict"
            actions={<>
              <Button size="sm" onClick={() => { persistence.adopt(conflict); setConflict(null); toast.show("נטענה הגרסה העדכנית"); }}>טעינת הגרסה העדכנית</Button>
              <Button size="sm" variant="inverse" onClick={async () => { const version = conflict.updatedAt; setConflict(null); persistence.resume(); await save({ expectedUpdatedAt: version }); }}>שמירת השינויים שלי</Button>
            </>}
          >
            השמירה נעצרה כדי לא לדרוס את הגרסה השנייה. אפשר לטעון אותה, או לשמור בכל זאת את מה שיש כאן.
          </Notice>
        ) : null}

        <div className="studio-app-shell studio-body">
          <section className="studio-app-frame">
            <div className="studio-main studio-main-editor">
              <Editor
                key={project.id}
                project={project}
                profile={profile}
                saving={busy}
                onProject={patch}
                onConfig={updateConfig}
                onSave={() => saveNow({ quiet: true })}
                onSaveConfig={saveConfigNow}
                onCommitSlug={() => { if (persistence.slugDirty) void saveNow(); }}
                onPublish={primaryAction}
                onUnpublish={() => setDialog("unpublish")}
                onPassword={updatePagePassword}
                onDelete={() => setDialog("delete")}
                onRequirePlan={setPaywallFeature}
              />
            </div>
          </section>
        </div>
      </main>

      <Dialog
        open={dialog !== null}
        onClose={() => !dialogBusy && setDialog(null)}
        role="alertdialog"
        dismissible={!dialogBusy}
        title={copy?.title ?? ""}
        description={copy?.description}
        footer={copy ? <>
          <Button onClick={() => setDialog(null)} disabled={dialogBusy} autoFocus>ביטול</Button>
          {dialog === "leave" ? <Button variant="ghost" onClick={() => confirmDialog("secondary")} disabled={dialogBusy}>יציאה בלי לעדכן</Button> : null}
          <Button
            variant={dialog === "leave" ? "primary" : "danger"}
            onClick={() => confirmDialog("primary")}
            loading={dialogBusy}
            loadingLabel={copy.busy}
            icon={dialog === "delete" ? <Trash aria-hidden="true" /> : undefined}
          >
            {copy.confirm}
          </Button>
        </> : null}
      >
        {dialogError ? <Notice tone="danger">{dialogError}</Notice> : null}
      </Dialog>

      <PaywallOverlay open={paywallFeature !== null} onClose={() => setPaywallFeature(null)} currentPlan={profile.plan} email={profile.email} feature={paywallFeature} />
    </div>
  );
}
