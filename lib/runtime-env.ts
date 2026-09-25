export const PRODUCTION_REQUIRED_ENV = [
  "AUTH_PEPPER", "BILLING_WEBHOOK_SECRET", "BILLING_STATE_SECRET",
  "RESEND_API_KEY", "EMAIL_FROM", "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY",
] as const;

export const CHECKOUT_ENV = ["BILLING_PAYPAL_URL", "BILLING_CHECKOUT_URL"];
export const HEALTH_ENV = [...PRODUCTION_REQUIRED_ENV, ...CHECKOUT_ENV, "BILLING_DEMO_MODE", "TURNSTILE_TEST_BYPASS"];
function present(value: unknown) { return typeof value === "string" && value.trim().length > 0; }
export function emailConfigured(values: Record<string, unknown>) { return present(values.RESEND_API_KEY) && present(values.EMAIL_FROM); }
export function billingConfigured(values: Record<string, unknown>) { return CHECKOUT_ENV.some((key) => present(values[key])); }

/** Names only. Never return configuration values or allow demo checkout in production. */
export function missingRequiredEnv(values: Record<string, unknown>, nodeEnv: string): string[] {
  if (nodeEnv === "development") return [];
  const missing: string[] = PRODUCTION_REQUIRED_ENV.filter((name) => !present(values[name]));
  if (!billingConfigured(values)) missing.push("BILLING_PAYPAL_URL");
  if (values.BILLING_DEMO_MODE !== null && values.BILLING_DEMO_MODE !== undefined) missing.push("BILLING_DEMO_MODE_MUST_BE_ABSENT");
  if (nodeEnv === "production" && values.TURNSTILE_TEST_BYPASS !== null && values.TURNSTILE_TEST_BYPASS !== undefined) missing.push("TURNSTILE_TEST_BYPASS_MUST_BE_ABSENT");
  return missing;
}
