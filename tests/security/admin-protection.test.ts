import { describe, expect, it } from "vitest";
import { DELETE as deleteUser, PATCH as patchUser } from "@/app/api/admin/users/[email]/route";
import { PATCH as patchProject } from "@/app/api/admin/projects/[id]/route";
import { getProductUser } from "@/lib/auth";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser, DEFAULT_PASSWORD, SESSION_COOKIE, sessionCookieFor } from "../helpers/users";
import { callRoute, jsonRequest, readJson } from "../helpers/requests";
import { runWithRequestContext } from "../shims/next-headers";

const HOUR = 3_600;

async function ageSession(cookies: Record<string, string>, options: { createdSecondsAgo?: number; lastSeenSecondsAgo?: number; expiresInSeconds?: number }) {
  const db = await ensureDatabase();
  const now = Math.floor(Date.now() / 1000);
  const createdAt = new Date((now - (options.createdSecondsAgo ?? 0)) * 1000).toISOString().replace("T", " ").slice(0, 19);
  const token = cookies[SESSION_COOKIE];
  const id = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), (b) => b.toString(16).padStart(2, "0")).join("");
  await db.prepare("UPDATE sessions SET created_at = ?, last_seen_at = ?, expires_at = ? WHERE id = ?")
    .bind(createdAt, now - (options.lastSeenSecondsAgo ?? 0), now + (options.expiresInSeconds ?? 30 * 24 * HOUR), id).run();
  return id;
}

describe("SEC-11: admin sessions and destructive actions", () => {
  useTestDatabase();

  it("refreshes last_seen_at and slides the expiry for active sessions", async () => {
    const user = await createUser({ email: "member@linkli.test" });
    const cookies = await sessionCookieFor(user.email);
    const id = await ageSession(cookies, { lastSeenSecondsAgo: 2 * HOUR, expiresInSeconds: HOUR });
    const product = await runWithRequestContext({ cookies }, () => getProductUser());
    expect(product?.email).toBe(user.email);
    const db = await ensureDatabase();
    const row = await db.prepare("SELECT last_seen_at, expires_at FROM sessions WHERE id = ?").bind(id).first();
    const now = Math.floor(Date.now() / 1000);
    expect(Number(row?.last_seen_at)).toBeGreaterThan(now - 5);
    expect(Number(row?.expires_at)).toBeGreaterThan(now + 29 * 24 * HOUR);
  });

  it("caps admin sessions at 12 hours while ordinary sessions keep their 30 days", async () => {
    const admin = await createUser({ email: "admin@linkli.test" });
    const member = await createUser({ email: "member@linkli.test" });
    const adminCookies = await sessionCookieFor(admin.email);
    const memberCookies = await sessionCookieFor(member.email);
    await ageSession(adminCookies, { createdSecondsAgo: 13 * HOUR });
    await ageSession(memberCookies, { createdSecondsAgo: 13 * HOUR });
    expect(await runWithRequestContext({ cookies: adminCookies }, () => getProductUser())).toBeNull();
    expect((await runWithRequestContext({ cookies: memberCookies }, () => getProductUser()))?.email).toBe(member.email);
  });

  it("requires the admin's password again for plan changes, suspension, deletion and unpublishing", async () => {
    const admin = await createUser({ email: "admin@linkli.test" });
    const target = await createUser({ email: "member@linkli.test" });
    const project = await createProject(target.email, { published: true });
    const cookies = await sessionCookieFor(admin.email);
    const params = { email: target.email };

    const withoutPassword = await callRoute(patchUser, jsonRequest(`/api/admin/users/${target.email}`, { method: "PATCH", body: { action: "set_plan", plan: "max" } }), { cookies, params });
    expect(withoutPassword.status).toBe(403);
    expect((await readJson(withoutPassword)).code).toBe("reauth_required");

    const wrongPassword = await callRoute(patchUser, jsonRequest(`/api/admin/users/${target.email}`, { method: "PATCH", body: { action: "suspend", currentPassword: "nope-nope-nope-nope" } }), { cookies, params });
    expect(wrongPassword.status).toBe(403);

    const planChange = await callRoute(patchUser, jsonRequest(`/api/admin/users/${target.email}`, { method: "PATCH", body: { action: "set_plan", plan: "max", currentPassword: DEFAULT_PASSWORD } }), { cookies, params });
    expect(planChange.status).toBe(200);

    const unpublishWithout = await callRoute(patchProject, jsonRequest(`/api/admin/projects/${project.id}`, { method: "PATCH", body: { published: false } }), { cookies, params: { id: project.id } });
    expect(unpublishWithout.status).toBe(403);
    const unpublish = await callRoute(patchProject, jsonRequest(`/api/admin/projects/${project.id}`, { method: "PATCH", body: { published: false, currentPassword: DEFAULT_PASSWORD } }), { cookies, params: { id: project.id } });
    expect(unpublish.status).toBe(200);

    const deleteWithout = await callRoute(deleteUser, jsonRequest(`/api/admin/users/${target.email}`, { method: "DELETE", body: { confirmation: target.email } }), { cookies, params });
    expect(deleteWithout.status).toBe(403);
    const deletion = await callRoute(deleteUser, jsonRequest(`/api/admin/users/${target.email}`, { method: "DELETE", body: { confirmation: target.email, currentPassword: DEFAULT_PASSWORD } }), { cookies, params });
    expect(deletion.status).toBe(200);
  });

  it("admin republish respects the owner's live-page limit", async () => {
    const admin = await createUser({ email: "admin@linkli.test" });
    const owner = await createUser({ email: "free-owner@linkli.test", plan: "free" });
    await createProject(owner.email, { published: true, slug: "live-one" });
    const draft = await createProject(owner.email, { published: false, slug: "draft-two" });
    const cookies = await sessionCookieFor(admin.email);

    const blocked = await callRoute(patchProject, jsonRequest(`/api/admin/projects/${draft.id}`, { method: "PATCH", body: { published: true, currentPassword: DEFAULT_PASSWORD } }), { cookies, params: { id: draft.id } });
    expect(blocked.status).toBe(403);
    expect((await readJson(blocked)).code).toBe("plan_limit");

    const live = await createProject(owner.email, { published: true, slug: "already-live" });
    const unpublish = await callRoute(patchProject, jsonRequest(`/api/admin/projects/${live.id}`, { method: "PATCH", body: { published: false, currentPassword: DEFAULT_PASSWORD } }), { cookies, params: { id: live.id } });
    expect(unpublish.status).toBe(200);
  });

  it("non-admins cannot reach admin endpoints even with a password", async () => {
    const member = await createUser({ email: "member@linkli.test" });
    const cookies = await sessionCookieFor(member.email);
    const response = await callRoute(patchUser, jsonRequest(`/api/admin/users/${member.email}`, { method: "PATCH", body: { action: "set_plan", plan: "max", currentPassword: DEFAULT_PASSWORD } }), { cookies, params: { email: member.email } });
    expect(response.status).toBe(403);
  });
});
