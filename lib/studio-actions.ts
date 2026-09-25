/**
 * Publishing intents for the Studio. The primary button is always "make my latest edits live":
 * it publishes a draft or saves an already published page, and never takes a page offline.
 * Unpublishing is a separate, explicit intent.
 */
export type PublishIntent = "publish" | "update" | "unpublish";

export function primaryPublishIntent(project: { published: boolean }): PublishIntent {
  return project.published ? "update" : "publish";
}

export function publishPlan(intent: PublishIntent): { save: boolean; publishRequest: { published: boolean } | null } {
  if (intent === "publish") return { save: true, publishRequest: { published: true } };
  if (intent === "update") return { save: true, publishRequest: null };
  return { save: false, publishRequest: { published: false } };
}

export function primaryPublishLabel(project: { published: boolean }, saving: boolean, variant: "compact" | "full" = "compact") {
  if (saving) return "שומרים…";
  if (project.published) return "עדכון העמוד באוויר";
  return variant === "full" ? "פרסום וקבלת קישור" : "שמירה ופרסום";
}
