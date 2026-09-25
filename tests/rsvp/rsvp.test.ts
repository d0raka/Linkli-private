import { describe, expect, it } from "vitest";
import { POST as submitRsvp } from "@/app/api/public/[slug]/rsvp/route";
import { GET as listRsvp } from "@/app/api/projects/[id]/rsvp/route";
import { GET as exportRsvp } from "@/app/api/projects/[id]/rsvp/export.csv/route";
import { DELETE as deleteRsvp } from "@/app/api/projects/[id]/rsvp/[responseId]/route";
import { DELETE as deleteProject } from "@/app/api/projects/[id]/route";
import { hashPassword } from "@/lib/auth";
import { serializePageAccessCookie } from "@/lib/page-access";
import { deleteOwnedAccount } from "@/lib/account-security";
import { purgeExpiredRsvps } from "@/lib/rsvp";
import { ensureDatabase } from "@/db";
import { lastEmailTo } from "../setup/fetch-guard";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser, sessionCookieFor } from "../helpers/users";
import { callRoute, getRequest, jsonRequest, readJson } from "../helpers/requests";

function cookieFrom(response: Response) {
  const header = response.headers.get("set-cookie") || "";
  const pair = header.split(";")[0];
  const eq = pair.indexOf("=");
  if (eq < 0) return {} as Record<string, string>;
  return { [pair.slice(0, eq)]: pair.slice(eq + 1) };
}

const payload = {
  name: "דנה לוי",
  status: "yes" as const,
  guestCount: 2,
  plusOnes: ["עומר"],
  song: "עידן רייכל",
  answers: ["מגיעים לחגוג! 🥂", "זוג 👥"],
  contact: "dana@example.com",
  consent: true,
};

describe("public RSVP and owner dashboard", () => {
  useTestDatabase();

  async function publishedEvent(options: {
    slug?: string;
    config?: Record<string, unknown>;
    published?: boolean;
    accessPasswordHash?: string | null;
    ownerPlan?: "max" | "free";
    ownerEmail?: string;
  } = {}) {
    const owner = await createUser({ email: options.ownerEmail ?? "host@linkli.test", plan: options.ownerPlan ?? "max" });
    const project = await createProject(owner.email, {
      templateId: "event",
      published: options.published ?? true,
      slug: options.slug ?? "wedding-rsvp",
      accessPasswordHash: options.accessPasswordHash ?? null,
      config: { rsvpEnabled: true, rsvpNotifyOwner: true, responseLimit: 50, retentionDays: 365, ...options.config },
    });
    return { owner, project };
  }

  it("creates a response with consent and sets a token cookie", async () => {
    const { project } = await publishedEvent();
    const response = await callRoute(submitRsvp, jsonRequest(`/api/public/${project.slug}/rsvp`, { body: payload }), { params: { slug: project.slug } });
    expect(response.status).toBe(201);
    const body = await readJson<{ id: string; status: string }>(response);
    expect(body.status).toBe("yes");
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.headers.get("set-cookie") || "").toMatch(/linkli_rsvp_/);
  });

  it("rejects missing consent and ignores honeypot posts", async () => {
    const { project } = await publishedEvent();
    const denied = await callRoute(submitRsvp, jsonRequest(`/api/public/${project.slug}/rsvp`, { body: { ...payload, consent: false } }), { params: { slug: project.slug } });
    expect(denied.status).toBe(400);

    const spam = await callRoute(submitRsvp, jsonRequest(`/api/public/${project.slug}/rsvp`, { body: { ...payload, company: "Bot Co" } }), { params: { slug: project.slug } });
    expect(spam.status).toBe(201);
    const db = await ensureDatabase();
    const count = await db.prepare("SELECT COUNT(*) AS n FROM rsvp_responses WHERE project_id = ?").bind(project.id).first("n");
    expect(Number(count)).toBe(0);
  });

  it("updates the same guest when the response cookie is sent again", async () => {
    const { project } = await publishedEvent();
    const first = await callRoute(submitRsvp, jsonRequest(`/api/public/${project.slug}/rsvp`, { body: payload }), { params: { slug: project.slug } });
    expect(first.status).toBe(201);
    const created = await readJson<{ id: string }>(first);
    const cookies = cookieFrom(first);
    const second = await callRoute(
      submitRsvp,
      jsonRequest(`/api/public/${project.slug}/rsvp`, { body: { ...payload, status: "maybe", guestCount: 1, song: "אחר" } }),
      { params: { slug: project.slug }, cookies },
    );
    expect(second.status).toBe(200);
    const updated = await readJson<{ id: string; status: string }>(second);
    expect(updated.id).toBe(created.id);
    expect(updated.status).toBe("maybe");
    const db = await ensureDatabase();
    expect(Number(await db.prepare("SELECT COUNT(*) AS n FROM rsvp_responses WHERE project_id = ?").bind(project.id).first("n"))).toBe(1);
  });

  it("enforces responseLimit on new guests but still allows updates", async () => {
    const { project } = await publishedEvent({ config: { responseLimit: 1, rsvpNotifyOwner: false } });
    const first = await callRoute(submitRsvp, jsonRequest(`/api/public/${project.slug}/rsvp`, { body: payload }), { params: { slug: project.slug } });
    expect(first.status).toBe(201);
    const blocked = await callRoute(
      submitRsvp,
      jsonRequest(`/api/public/${project.slug}/rsvp`, { body: { ...payload, name: "אורח שני", contact: "other@example.com" } }),
      { params: { slug: project.slug } },
    );
    expect(blocked.status).toBe(409);
    const update = await callRoute(
      submitRsvp,
      jsonRequest(`/api/public/${project.slug}/rsvp`, { body: { ...payload, status: "no", guestCount: 1 } }),
      { params: { slug: project.slug }, cookies: cookieFrom(first) },
    );
    expect(update.status).toBe(200);
  });

  it("respects the password gate and unpublished pages", async () => {
    const hash = (await hashPassword("secret-page-pass")).hash;
    const locked = await publishedEvent({ slug: "locked-rsvp", accessPasswordHash: hash });
    const denied = await callRoute(submitRsvp, jsonRequest(`/api/public/${locked.project.slug}/rsvp`, { body: payload }), { params: { slug: locked.project.slug } });
    expect(denied.status).toBe(401);

    const setCookie = await serializePageAccessCookie(locked.project.slug, hash);
    const [name, value] = setCookie.split(";")[0].split("=");
    const allowed = await callRoute(submitRsvp, jsonRequest(`/api/public/${locked.project.slug}/rsvp`, { body: payload }), {
      params: { slug: locked.project.slug },
      cookies: { [name]: value },
    });
    expect(allowed.status).toBe(201);

    const draft = await publishedEvent({ slug: "draft-rsvp", published: false, ownerEmail: "draft-host@linkli.test" });
    const missing = await callRoute(submitRsvp, jsonRequest(`/api/public/${draft.project.slug}/rsvp`, { body: payload }), { params: { slug: draft.project.slug } });
    expect(missing.status).toBe(404);
  });

  it("lets the owner list, export and delete responses, and hides them from other accounts", async () => {
    const { owner, project } = await publishedEvent({ config: { rsvpNotifyOwner: true } });
    const created = await callRoute(submitRsvp, jsonRequest(`/api/public/${project.slug}/rsvp`, { body: payload }), { params: { slug: project.slug } });
    const { id } = await readJson<{ id: string }>(created);
    expect(lastEmailTo(owner.email)?.subject).toMatch(/אישור הגעה|RSVP|אורח/i);

    const cookies = await sessionCookieFor(owner.email);
    const list = await callRoute(listRsvp, getRequest(`/api/projects/${project.id}/rsvp`), { cookies, params: { id: project.id } });
    expect(list.status).toBe(200);
    const dashboard = await readJson<{ summary: { total: number; guests: number }; responses: Array<{ id: string; name: string; contact?: string }> }>(list);
    expect(dashboard.summary.total).toBe(1);
    expect(dashboard.summary.guests).toBe(2);
    expect(dashboard.responses[0]?.name).toBe("דנה לוי");
    expect(JSON.stringify(dashboard)).not.toContain("dana@example.com");

    const csv = await callRoute(exportRsvp, getRequest(`/api/projects/${project.id}/rsvp/export.csv`), { cookies, params: { id: project.id } });
    expect(csv.status).toBe(200);
    expect(csv.headers.get("content-type")).toMatch(/text\/csv/);
    const csvText = await csv.text();
    expect(csvText).toContain("דנה לוי");
    expect(csvText).not.toContain("dana@example.com");

    const stranger = await createUser({ email: "stranger@linkli.test", plan: "max" });
    const stolen = await callRoute(listRsvp, getRequest(`/api/projects/${project.id}/rsvp`), {
      cookies: await sessionCookieFor(stranger.email),
      params: { id: project.id },
    });
    expect(stolen.status).toBe(404);

    const removed = await callRoute(deleteRsvp, jsonRequest(`/api/projects/${project.id}/rsvp/${id}`, { method: "DELETE" }), {
      cookies,
      params: { id: project.id, responseId: id },
    });
    expect(removed.status).toBe(200);
    const db = await ensureDatabase();
    expect(await db.prepare("SELECT id FROM rsvp_responses WHERE id = ?").bind(id).first()).toBeNull();
  });

  it("cascades RSVP rows when a project or account is deleted, and purges expired responses", async () => {
    const { owner, project } = await publishedEvent({ config: { rsvpNotifyOwner: false, retentionDays: 1 } });
    const created = await callRoute(submitRsvp, jsonRequest(`/api/public/${project.slug}/rsvp`, { body: payload }), { params: { slug: project.slug } });
    expect(created.status).toBe(201);
    const db = await ensureDatabase();
    await db.prepare("UPDATE rsvp_responses SET expires_at = 1 WHERE project_id = ?").bind(project.id).run();
    expect(await purgeExpiredRsvps(db)).toBeGreaterThan(0);
    expect(Number(await db.prepare("SELECT COUNT(*) AS n FROM rsvp_responses WHERE project_id = ?").bind(project.id).first("n"))).toBe(0);

    await callRoute(submitRsvp, jsonRequest(`/api/public/${project.slug}/rsvp`, { body: payload }), { params: { slug: project.slug } });
    const cookies = await sessionCookieFor(owner.email);
    await callRoute(deleteProject, jsonRequest(`/api/projects/${project.id}`, { method: "DELETE" }), { cookies, params: { id: project.id } });
    expect(Number(await db.prepare("SELECT COUNT(*) AS n FROM rsvp_responses WHERE project_id = ?").bind(project.id).first("n"))).toBe(0);

    const second = await publishedEvent({ slug: "account-rsvp", ownerEmail: "gone@linkli.test", config: { rsvpNotifyOwner: false } });
    await callRoute(submitRsvp, jsonRequest(`/api/public/${second.project.slug}/rsvp`, { body: payload }), { params: { slug: second.project.slug } });
    await deleteOwnedAccount(second.owner.email);
    expect(Number(await db.prepare("SELECT COUNT(*) AS n FROM rsvp_responses WHERE project_id = ?").bind(second.project.id).first("n"))).toBe(0);
  });

  it("rate-limits repeated public submissions from the same client", async () => {
    const { project } = await publishedEvent({ config: { rsvpNotifyOwner: false, responseLimit: 50 } });
    let last = 201;
    for (let index = 0; index < 9; index += 1) {
      const response = await callRoute(
        submitRsvp,
        jsonRequest(`/api/public/${project.slug}/rsvp`, {
          body: { ...payload, name: `אורח ${index}`, contact: `guest${index}@example.com` },
          headers: { "cf-connecting-ip": "203.0.113.9" },
        }),
        { params: { slug: project.slug } },
      );
      last = response.status;
    }
    expect(last).toBe(429);
  });
});
