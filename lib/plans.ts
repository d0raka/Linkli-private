export const PROJECT_LIMITS = {
  free: 1,
  plus: 10,
  max: 999,
} as const;

export type PlanType = "free" | "plus" | "max";

export function canRemoveBranding(plan?: string | null): boolean {
  return plan === "plus" || plan === "max";
}

export function canUseCustomDomain(plan?: string | null): boolean {
  return plan === "plus" || plan === "max";
}

export function getPlanName(plan?: string | null): string {
  if (plan === "max") return "Max";
  if (plan === "plus") return "Plus";
  return "חינם";
}
