"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Trash } from "@phosphor-icons/react/ssr";
import { ApiError, apiFetch, errorMessage } from "@/lib/api-client";
import { canUsePagePassword, featureForConfigKey, hasPlanAccess, isPlanGatedValue, parsePlanFeature, requiredPlanForFeature, type PlanFeatureId } from "@/lib/plans";
import type { ProjectRecord } from "@/lib/projects";
import { primaryPublishIntent, publishPlan, type PublishIntent } from "@/lib/studio-actions";
import type { TemplateConfig } from "@/lib/templates";
import PaywallOverlay from "@/app/paywall/paywall-overlay";
import { Button } from "@/app/ui/button";
import { Dialog } from "@/app/ui/dialog";
import { Notice } from "@/app/ui/status";
import { useToast } from "@/app/ui/toast";
import { Editor, type Profile } from "./editor";

/**
 * Owns persistence for one page: saving with optimistic concurrency, publishing, the page
 * password, deletion and plan gates. The Editor only edits local state through callbacks.
 */
export default function EditorScreen({ initialProject, profile }: { initialProject: ProjectRecord; profile: Profile }) {
  const router = useRouter();
  const toast = useToast();
  const [project, setProject] = useState(initialProject);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<ProjectRecord | null>(null);
  const [paywallFeature, setPaywallFeature] = useState<PlanFeatureId | null>(null);
  const [dialog, setDialog] = useState<"delete" | "unpublish" | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const latest = useRef(project);
  useEffect(() => { latest.current = project; }, [project]);
  // Save requests are numbered so a slow, older response can never overwrite a newer one.
  const saveSequence = useRef(0);

  const patchProject = useCallback((patch: Partial<ProjectRecord>) => {
    setProject((current) => ({ ...current, ...patch }));
  }, []);

  function updateConfig<K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) {
    const feature = featureForConfigKey(String(key));
    if (feature && isPlanGatedValue(value) && !hasPlanAccess(profile.plan, requiredPlanForFeature(feature))) {
      setPaywallFeature(feature);
      return;
    }
    setProject((current) => ({ ...current, config: { ...current.config, [key]: value } }));
  }

  function handlePlanError(error: unknown, fallback: PlanFeatureId) {
    if (error instanceof ApiError && error.status === 403 && (error.code === "plan_limit" || error.feature)) {
      setPaywallFeature(parsePlanFeature(error.feature) || fallback);
      return true;
    }
    return false;
  }

  async function saveProject(options: { quiet?: boolean; expectedUpdatedAt?: string; config?: TemplateConfig } = {}) {
    const current = latest.current;
    const sequence = ++saveSequence.current;
    setSaving(true);
    try {
      const data = await apiFetch<{ project: ProjectRecord }>(`/api/projects/${current.id}`, {
        method: "PATCH",
        json: {
          title: current.title,
          slug: current.slug,
          config: options.config ?? current.config,
          expectedUpdatedAt: options.expectedUpdatedAt ?? current.updatedAt,
        },
      });
      if (sequence !== saveSequence.current) return true;
      setConflict(null);
      patchProject(data.project);
      if (!options.quiet) toast.show("השינויים נשמרו");
      return true;
    } catch (error) {
      if (sequence !== saveSequence.current) return false;
      if (error instanceof ApiError && error.status === 409 && error.code === "conflict" && error.data.project) {
        setConflict(error.data.project as ProjectRecord);
        return false;
      }
      if (error instanceof ApiError && error.status === 401) {
        router.push(`/login?returnTo=${encodeURIComponent(`/studio/${current.id}`)}`);
        return false;
      }
      toast.show(errorMessage(error, "לא הצלחנו לשמור את השינויים."), { tone: "danger" });
      return false;
    } finally {
      if (sequence === saveSequence.current) setSaving(false);
    }
  }

  function saveConfigNow(config: TemplateConfig) {
    patchProject({ config });
    return saveProject({ quiet: true, config });
  }

  async function runPublishIntent(intent: PublishIntent) {
    const plan = publishPlan(intent);
    if (plan.save && !(await saveProject({ quiet: intent === "publish" }))) return false;
    if (!plan.publishRequest) return true;
    setSaving(true);
    try {
      const data = await apiFetch<{ project: ProjectRecord }>(`/api/projects/${latest.current.id}/publish`, { method: "POST", json: plan.publishRequest });
      patchProject(data.project);
      toast.show(data.project.published ? "העמוד באוויר ומוכן לשיתוף" : "העמוד הוחזר לטיוטה. הקישור לא פעיל.");
      return true;
    } catch (error) {
      if (!handlePlanError(error, "morePages")) toast.show(errorMessage(error, "לא הצלחנו לעדכן את מצב הפרסום."), { tone: "danger" });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updatePagePassword(password: string | null) {
    if (password !== null && !canUsePagePassword(profile.plan)) {
      setPaywallFeature("pagePassword");
      return false;
    }
    setSaving(true);
    try {
      const data = await apiFetch<{ project: ProjectRecord }>(`/api/projects/${latest.current.id}/password`, { method: "POST", json: password === null ? { remove: true } : { password } });
      patchProject(data.project);
      toast.show(password === null ? "הסיסמה הוסרה מהעמוד" : "העמוד מוגן עכשיו בסיסמה");
      return true;
    } catch (error) {
      if (!handlePlanError(error, "pagePassword")) toast.show(errorMessage(error, "לא הצלחנו לעדכן את הגנת העמוד."), { tone: "danger" });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function confirmDialog() {
    setDialogBusy(true);
    setDialogError("");
    try {
      if (dialog === "delete") {
        await apiFetch(`/api/projects/${latest.current.id}`, { method: "DELETE" });
        router.push("/studio");
        router.refresh();
        return;
      }
      if (dialog === "unpublish" && (await runPublishIntent("unpublish"))) setDialog(null);
    } catch (error) {
      setDialogError(errorMessage(error, "הפעולה לא הושלמה. נסו שוב."));
    } finally {
      setDialogBusy(false);
    }
  }

  function acceptServerVersion() {
    if (!conflict) return;
    patchProject(conflict);
    setConflict(null);
    toast.show("נטענה הגרסה העדכנית של העמוד");
  }

  async function overwriteServerVersion() {
    if (!conflict) return;
    const version = conflict.updatedAt;
    setConflict(null);
    await saveProject({ expectedUpdatedAt: version });
  }

  return (
    <>
      {conflict ? (
        <Notice
          tone="warning"
          title="העמוד נערך גם בחלון או במכשיר אחר"
          className="editor-conflict"
          actions={<>
            <Button size="sm" onClick={acceptServerVersion}>טעינת הגרסה העדכנית</Button>
            <Button size="sm" variant="inverse" onClick={overwriteServerVersion}>שמירת השינויים שלי</Button>
          </>}
        >
          שמירה מכאן תדרוס את הגרסה השנייה. אפשר לטעון אותה, או לשמור בכל זאת את מה שיש כאן.
        </Notice>
      ) : null}

      <Editor
        key={project.id}
        project={project}
        profile={profile}
        saving={saving}
        onProject={patchProject}
        onConfig={updateConfig}
        onSave={() => saveProject()}
        onSaveConfig={saveConfigNow}
        onPublish={() => void runPublishIntent(primaryPublishIntent(latest.current))}
        onUnpublish={() => setDialog("unpublish")}
        onPassword={updatePagePassword}
        onDelete={() => setDialog("delete")}
        onBack={() => router.push("/studio")}
        onRequirePlan={setPaywallFeature}
      />

      <Dialog
        open={dialog !== null}
        onClose={() => !dialogBusy && setDialog(null)}
        role="alertdialog"
        dismissible={!dialogBusy}
        title={dialog === "delete" ? "למחוק את העמוד?" : "להוריד את העמוד מהאוויר?"}
        description={dialog === "delete"
          ? `״${project.title}״ יימחק לצמיתות, כולל הקישור, התמונות ואישורי ההגעה.`
          : "הקישור יפסיק לעבוד עד שתפרסמו שוב. העמוד עצמו נשמר כטיוטה."}
        footer={<>
          <Button onClick={() => setDialog(null)} disabled={dialogBusy} autoFocus>ביטול</Button>
          <Button
            variant="danger"
            onClick={confirmDialog}
            loading={dialogBusy}
            loadingLabel={dialog === "delete" ? "מוחקים…" : "מעדכנים…"}
            icon={dialog === "delete" ? <Trash aria-hidden="true" /> : undefined}
          >
            {dialog === "delete" ? "מחיקה לצמיתות" : "הורדה מהאוויר"}
          </Button>
        </>}
      >
        {dialogError ? <Notice tone="danger">{dialogError}</Notice> : null}
      </Dialog>

      <PaywallOverlay open={paywallFeature !== null} onClose={() => setPaywallFeature(null)} currentPlan={profile.plan} email={profile.email} feature={paywallFeature} />
    </>
  );
}
