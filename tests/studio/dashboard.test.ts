import { describe, expect, it } from "vitest";
import { POST as createProjectRoute } from "@/app/api/projects/route";
import { ensureDatabase } from "@/db";
import { loadDashboardPages, pageStage } from "@/lib/dashboard";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser, sessionCookieFor } from "../helpers/users";
import { callRoute, jsonRequest, readJson } from "../helpers/requests";

async function addRsvp(projectId: string, status: "yes" | "maybe" | "no", guests: number) {
  const db = await ensureDatabase();
  await db.prepare(
    `INSERT INTO rsvp_responses (id, project_id, status, guest_count, name, response_token_hash, consent_at, expires_at)
     VALUES (?, ?, ?, ?, 'אורחת', ?, CURRENT_TIMESTAMP, ?)`,
  ).bind(crypto.randomUUID(), projectId, status, guests, crypto.randomUUID(), Math.floor(Date.now() / 1000) + 3600).run();
}

describe("Studio dashboard data", () => {
  useTestDatabase();

  it("tells drafts, unseen live pages and live pages apart", () => {
    expect(pageStage({ published: false, views: 12 })).toBe("draft");
    expect(pageStage({ published: true, views: 0 })).toBe("live-unseen");
    expect(pageStage({ published: true, views: 3 })).toBe("live");
  });

  it("loads only the owner's pages, newest first, with RSVP totals for RSVP pages", async () => {
    const owner = await createUser({ email: "host@linkli.test", plan: "max" });
    await createUser({ email: "other@linkli.test", plan: "max" });
    const invitation = await createProject(owner.email, { templateId: "wedding", published: true, title: "החתונה" });
    const note = await createProject(owner.email, { templateId: "date", title: "דייט" });
    await createProject("other@linkli.test", { templateId: "event", title: "זר" });
    await addRsvp(invitation.id, "yes", 3);
    await addRsvp(invitation.id, "yes", 2);
    await addRsvp(invitation.id, "no", 1);
    const db = await ensureDatabase();
    await db.prepare("UPDATE projects SET updated_at = '2030-01-01 00:00:00' WHERE id = ?").bind(note.id).run();

    const pages = await loadDashboardPages(db, owner.email, "max");
    expect(pages.map((page) => page.title)).toEqual(["דייט", "החתונה"]);
    const wedding = pages.find((page) => page.id === invitation.id)!;
    expect(wedding.rsvp).toEqual({ responses: 3, attending: 2, guests: 5 });
    expect(pages.find((page) => page.id === note.id)!.rsvp).toBeNull();
  });

  it("hides plan-gated RSVP totals when the owner's plan no longer includes them", async () => {
    const owner = await createUser({ email: "free@linkli.test", plan: "free" });
    await createProject(owner.email, { templateId: "wedding", config: { rsvpEnabled: true } });
    const pages = await loadDashboardPages(await ensureDatabase(), owner.email, "free");
    expect(pages[0].rsvpEnabled).toBe(false);
    expect(pages[0].rsvp).toBeNull();
  });
});

describe("Draft policy: plans limit published pages, not drafts", () => {
  useTestDatabase();

  it("lets a paid user keep drafting beyond the published-page quota", async () => {
    const owner = await createUser({ email: "creator@linkli.test", plan: "pro" });
    const cookies = await sessionCookieFor(owner.email);
    for (let index = 0; index < 5; index += 1) {
      const response = await callRoute(createProjectRoute, jsonRequest("/api/projects", { body: { templateId: "birthday" }, headers: { "idempotency-key": crypto.randomUUID() } }), { cookies });
      expect(response.status).toBe(201);
    }
  });

  it("stops creation at the account-wide abuse cap", async () => {
    const owner = await createUser({ email: "busy@linkli.test", plan: "free" });
    const db = await ensureDatabase();
    await db.batch(Array.from({ length: 100 }, (_, index) => db.prepare(
      "INSERT INTO projects (id, owner_email, title, slug, template_id, config_json) VALUES (?, ?, 'x', ?, 'date', '{}')",
    ).bind(crypto.randomUUID(), owner.email, `cap-${index}`)));
    const cookies = await sessionCookieFor(owner.email);
    const response = await callRoute(createProjectRoute, jsonRequest("/api/projects", { body: { templateId: "birthday" }, headers: { "idempotency-key": crypto.randomUUID() } }), { cookies });
    expect(response.status).toBe(403);
    expect((await readJson<{ code: string }>(response)).code).toBe("draft_cap");
  });
});
