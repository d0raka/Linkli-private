import { describe, expect, it } from "vitest";
import { DELETE as deleteProject, PATCH as patchProject } from "@/app/api/projects/[id]/route";
import { POST as publishProject } from "@/app/api/projects/[id]/publish/route";
import { POST as setPassword } from "@/app/api/projects/[id]/password/route";
import { DELETE as deleteBackground } from "@/app/api/projects/[id]/background/route";
import { DELETE as deleteEmoji } from "@/app/api/projects/[id]/emoji/route";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser, mediaExists, sessionCookieFor, storeMedia } from "../helpers/users";
import { callRoute, jsonRequest } from "../helpers/requests";

describe("cross-account authorization on project endpoints", () => {
  useTestDatabase();

  async function twoUsersWithVictimProject() {
    const attacker = await createUser({ email: "attacker@linkli.test", plan: "max" });
    const victim = await createUser({ email: "victim@linkli.test", plan: "max" });
    const project = await createProject(victim.email, { published: true });
    await storeMedia(project.id, "project_backgrounds");
    await storeMedia(project.id, "project_emoji_images");
    const cookies = await sessionCookieFor(attacker.email);
    return { attacker, victim, project, cookies };
  }

  it("SEC-01: deleting another user's project id must not destroy their media", async () => {
    const { project, cookies } = await twoUsersWithVictimProject();
    const response = await callRoute(deleteProject, jsonRequest(`/api/projects/${project.id}`, { method: "DELETE" }), { cookies, params: { id: project.id } });
    expect(response.status).toBe(404);
    expect(await mediaExists(project.id, "project_backgrounds")).toBe(true);
    expect(await mediaExists(project.id, "project_emoji_images")).toBe(true);
  });

  it("owner deletion removes the project and its media together", async () => {
    const { victim, project } = await twoUsersWithVictimProject();
    const cookies = await sessionCookieFor(victim.email);
    const response = await callRoute(deleteProject, jsonRequest(`/api/projects/${project.id}`, { method: "DELETE" }), { cookies, params: { id: project.id } });
    expect(response.status).toBe(200);
    expect(await mediaExists(project.id, "project_backgrounds")).toBe(false);
    expect(await mediaExists(project.id, "project_emoji_images")).toBe(false);
  });

  it("rejects PATCH, publish, password and media deletion for a non-owner", async () => {
    const { project, cookies } = await twoUsersWithVictimProject();
    const params = { id: project.id };
    const patch = await callRoute(patchProject, jsonRequest(`/api/projects/${project.id}`, { method: "PATCH", body: { title: "pwned" } }), { cookies, params });
    const publish = await callRoute(publishProject, jsonRequest(`/api/projects/${project.id}/publish`, { body: { published: false } }), { cookies, params });
    const password = await callRoute(setPassword, jsonRequest(`/api/projects/${project.id}/password`, { body: { password: "hunter22" } }), { cookies, params });
    const background = await callRoute(deleteBackground, jsonRequest(`/api/projects/${project.id}/background`, { method: "DELETE" }), { cookies, params });
    const emoji = await callRoute(deleteEmoji, jsonRequest(`/api/projects/${project.id}/emoji`, { method: "DELETE" }), { cookies, params });
    for (const response of [patch, publish, password, background, emoji]) expect(response.status).toBe(404);
    expect(await mediaExists(project.id, "project_backgrounds")).toBe(true);
    expect(await mediaExists(project.id, "project_emoji_images")).toBe(true);
  });

  it("requires authentication and a verified email", async () => {
    const { project } = await twoUsersWithVictimProject();
    const anonymous = await callRoute(deleteProject, jsonRequest(`/api/projects/${project.id}`, { method: "DELETE" }), { params: { id: project.id } });
    expect(anonymous.status).toBe(401);
    const unverified = await createUser({ email: "unverified@linkli.test", verified: false });
    const cookies = await sessionCookieFor(unverified.email);
    const own = await createProject(unverified.email);
    const response = await callRoute(deleteBackground, jsonRequest(`/api/projects/${own.id}/background`, { method: "DELETE" }), { cookies, params: { id: own.id } });
    expect(response.status).toBe(403);
  });
});
