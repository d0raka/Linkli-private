import { describe, expect, it } from "vitest";
import { PATCH as patchProject } from "@/app/api/projects/[id]/route";
import { POST as publishProject } from "@/app/api/projects/[id]/publish/route";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser, sessionCookieFor } from "../helpers/users";
import { callRoute, jsonRequest, readJson } from "../helpers/requests";

describe("FE-03: optimistic concurrency on project saves", () => {
  useTestDatabase();

  it("rejects a save whose expectedUpdatedAt no longer matches and returns the server copy", async () => {
    const owner = await createUser({ email: "owner@linkli.test", plan: "pro" });
    const project = await createProject(owner.email);
    const cookies = await sessionCookieFor(owner.email);
    const db = await ensureDatabase();
    await db.prepare("UPDATE projects SET title = 'from another tab', updated_at = '2030-01-01 00:00:00' WHERE id = ?").bind(project.id).run();

    const stale = await callRoute(patchProject, jsonRequest(`/api/projects/${project.id}`, { method: "PATCH", body: { title: "mine", expectedUpdatedAt: "2020-01-01 00:00:00" } }), { cookies, params: { id: project.id } });
    expect(stale.status).toBe(409);
    const data = await readJson<{ code: string; project: { title: string; updatedAt: string } }>(stale);
    expect(data.code).toBe("conflict");
    expect(data.project.title).toBe("from another tab");

    const fresh = await callRoute(patchProject, jsonRequest(`/api/projects/${project.id}`, { method: "PATCH", body: { title: "mine", expectedUpdatedAt: data.project.updatedAt } }), { cookies, params: { id: project.id } });
    expect(fresh.status).toBe(200);
  });

  it("still accepts saves without expectedUpdatedAt for older clients", async () => {
    const owner = await createUser({ email: "owner@linkli.test", plan: "pro" });
    const project = await createProject(owner.email);
    const cookies = await sessionCookieFor(owner.email);
    const response = await callRoute(patchProject, jsonRequest(`/api/projects/${project.id}`, { method: "PATCH", body: { title: "legacy" } }), { cookies, params: { id: project.id } });
    expect(response.status).toBe(200);
  });
});

describe("BILL-05: publish limits are enforced atomically", () => {
  useTestDatabase();

  it("lets exactly one of several concurrent publishes through on a one-page plan", async () => {
    const owner = await createUser({ email: "free@linkli.test", plan: "free" });
    const cookies = await sessionCookieFor(owner.email);
    const projects = await Promise.all(Array.from({ length: 5 }, () => createProject(owner.email)));
    const responses = await Promise.all(projects.map((project) =>
      callRoute(publishProject, jsonRequest(`/api/projects/${project.id}/publish`, { body: { published: true } }), { cookies, params: { id: project.id } }),
    ));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 403)).toHaveLength(4);
    const db = await ensureDatabase();
    expect(await db.prepare("SELECT COUNT(*) AS total FROM projects WHERE owner_email = ? AND published = 1").bind(owner.email).first("total")).toBe(1);
  });

  it("unpublishing never needs quota and re-publishing an already published page is a no-op", async () => {
    const owner = await createUser({ email: "free@linkli.test", plan: "free" });
    const cookies = await sessionCookieFor(owner.email);
    const project = await createProject(owner.email, { published: true });
    const again = await callRoute(publishProject, jsonRequest(`/api/projects/${project.id}/publish`, { body: { published: true } }), { cookies, params: { id: project.id } });
    expect(again.status).toBe(200);
    const off = await callRoute(publishProject, jsonRequest(`/api/projects/${project.id}/publish`, { body: { published: false } }), { cookies, params: { id: project.id } });
    expect(off.status).toBe(200);
    expect((await readJson<{ project: { published: boolean } }>(off)).project.published).toBe(false);
  });
});
