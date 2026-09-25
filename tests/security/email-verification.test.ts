import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as createDemoUser } from "@/app/api/admin/users/route";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase, backfillEmailVerifications } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createUser, sessionCookieFor } from "../helpers/users";
import { callRoute, jsonRequest, readJson } from "../helpers/requests";
import { runWithRequestContext } from "../shims/next-headers";

describe("SEC-08: email verification fails closed", () => {
  useTestDatabase();

  it("treats an account without a verification row as unverified", async () => {
    const user = await createUser({ email: "legacy@linkli.test", withVerificationRow: false });
    const cookies = await sessionCookieFor(user.email);
    const product = await runWithRequestContext({ cookies }, () => getProductUser());
    expect(product?.emailVerified).toBe(false);
  });

  it("login sends an account without a verification row to the verification screen", async () => {
    const user = await createUser({ email: "legacy@linkli.test", withVerificationRow: false });
    const response = await callRoute(login, jsonRequest("/api/auth/login", { body: { email: user.email, password: user.password } }));
    const data = await readJson<{ requiresVerification: boolean; redirectTo: string }>(response);
    expect(data.requiresVerification).toBe(true);
    expect(data.redirectTo).toContain("/verify-email");
  });

  it("the migration backfill marks pre-existing accounts verified without touching pending rows", async () => {
    const db = await ensureDatabase();
    await createUser({ email: "legacy@linkli.test", withVerificationRow: false });
    await createUser({ email: "pending@linkli.test", verified: false });
    await backfillEmailVerifications(db);
    const legacy = await db.prepare("SELECT verified_at FROM email_verifications WHERE user_email = ?").bind("legacy@linkli.test").first();
    const pending = await db.prepare("SELECT verified_at FROM email_verifications WHERE user_email = ?").bind("pending@linkli.test").first();
    expect(legacy?.verified_at).toBeTruthy();
    expect(pending?.verified_at).toBeNull();
  });

  it("admin-created demo accounts get an explicit verified row", async () => {
    const admin = await createUser({ email: "admin@linkli.test" });
    const cookies = await sessionCookieFor(admin.email);
    const response = await callRoute(createDemoUser, jsonRequest("/api/admin/users", { body: { username: "demo.user", displayName: "Demo", password: "a-long-demo-password-2026", plan: "pro" } }), { cookies });
    expect(response.status).toBe(201);
    const db = await ensureDatabase();
    const row = await db.prepare("SELECT verified_at FROM email_verifications WHERE user_email = ?").bind("demo.user@demo.linkli.invalid").first();
    expect(row?.verified_at).toBeTruthy();
  });
});
