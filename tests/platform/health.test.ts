import { describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { missingRequiredEnv, PRODUCTION_REQUIRED_ENV } from "@/lib/runtime-env";
import { useTestDatabase } from "../setup/db";
import { callRoute, getRequest, readJson } from "../helpers/requests";

describe("runtime env and health", () => {
  it("lists production secrets by name only", () => {
    expect(missingRequiredEnv({}, "production")).toEqual([...PRODUCTION_REQUIRED_ENV, "BILLING_PAYPAL_URL"]);
    expect(missingRequiredEnv(Object.fromEntries([...PRODUCTION_REQUIRED_ENV, "BILLING_PAYPAL_URL"].map((key) => [key, "configured"])), "production")).toEqual([]);
    expect(missingRequiredEnv({}, "development")).toEqual([]);
  });

  it("never echoes secret values in the missing-env report", () => {
    const report = missingRequiredEnv({ AUTH_PEPPER: "super-secret-pepper-value" }, "production");
    expect(JSON.stringify(report)).not.toContain("super-secret-pepper-value");
  });
  it("rejects any production demo setting, even false", () => {
    expect(missingRequiredEnv({ BILLING_DEMO_MODE: "false" }, "production")).toContain("BILLING_DEMO_MODE_MUST_BE_ABSENT");
  });
  it("requires transactional mail and a checkout URL", () => {
    expect(missingRequiredEnv({}, "production")).toEqual(expect.arrayContaining(["RESEND_API_KEY", "EMAIL_FROM", "BILLING_PAYPAL_URL"]));
  });
});

describe("GET /api/health", () => {
  useTestDatabase({ BILLING_STATE_SECRET: "state-test", BILLING_PAYPAL_URL: "https://checkout.example.com", TURNSTILE_SITE_KEY: "site-test", TURNSTILE_SECRET_KEY: "turnstile-test" });

  it("reports a ready database without leaking env values", async () => {
    const response = await callRoute(health, getRequest("/api/health"));
    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body.ok).toBe(true);
    expect(body.db).toBe("ok");
    expect(body.emailConfigured).toBe(true);
    expect(body.billingConfigured).toBe(true);
    expect(body.missing).toEqual([]);
    expect(JSON.stringify(body)).not.toContain("test-pepper-do-not-use-in-production");
    expect(JSON.stringify(body)).not.toContain("whsec_test_secret");
  });
});
