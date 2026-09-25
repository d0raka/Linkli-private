import { describe, expect, it } from "vitest";
import { POST as uploadBackground } from "@/app/api/projects/[id]/background/route";
import { POST as uploadEmoji } from "@/app/api/projects/[id]/emoji/route";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser, mediaExists, sessionCookieFor } from "../helpers/users";
import { callRoute, ORIGIN } from "../helpers/requests";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array.from({ length: 60 }, (_, index) => index)]);

function uploadRequest(path: string, bytes: Uint8Array, headers: Record<string, string> = {}) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(bytes)], "photo.jpg", { type: "image/jpeg" }));
  return new Request(new URL(path, ORIGIN), { method: "POST", body: form, headers: { origin: ORIGIN, "sec-fetch-site": "same-origin", ...headers } });
}

describe("SEC-12: uploads are checked before the body is parsed", () => {
  useTestDatabase();

  it("rejects oversized declared bodies with 413 before reading them", async () => {
    const owner = await createUser({ email: "owner@linkli.test", plan: "pro" });
    const project = await createProject(owner.email);
    const cookies = await sessionCookieFor(owner.email);
    const request = new Request(new URL(`/api/projects/${project.id}/background`, ORIGIN), {
      method: "POST",
      headers: { origin: ORIGIN, "sec-fetch-site": "same-origin", "content-type": "multipart/form-data; boundary=x", "content-length": String(5_000_000) },
      body: "--x--",
    });
    const response = await callRoute(uploadBackground, request, { cookies, params: { id: project.id } });
    expect(response.status).toBe(413);
  });

  it("returns 404 for another user's project without storing anything", async () => {
    const owner = await createUser({ email: "owner@linkli.test", plan: "pro" });
    const attacker = await createUser({ email: "attacker@linkli.test", plan: "pro" });
    const project = await createProject(owner.email);
    const cookies = await sessionCookieFor(attacker.email);
    for (const [handler, path, table] of [
      [uploadBackground, "background", "project_backgrounds"],
      [uploadEmoji, "emoji", "project_emoji_images"],
    ] as const) {
      const response = await callRoute(handler, uploadRequest(`/api/projects/${project.id}/${path}`, JPEG), { cookies, params: { id: project.id } });
      expect(response.status).toBe(404);
      expect(await mediaExists(project.id, table)).toBe(false);
    }
  });

  it("stores a valid JPEG for the owner on a paid plan and rejects free plans", async () => {
    const owner = await createUser({ email: "owner@linkli.test", plan: "pro" });
    const project = await createProject(owner.email);
    const cookies = await sessionCookieFor(owner.email);
    const response = await callRoute(uploadBackground, uploadRequest(`/api/projects/${project.id}/background`, JPEG), { cookies, params: { id: project.id } });
    expect(response.status).toBe(200);
    expect(await mediaExists(project.id, "project_backgrounds")).toBe(true);

    const free = await createUser({ email: "free@linkli.test", plan: "free" });
    const freeProject = await createProject(free.email);
    const freeCookies = await sessionCookieFor(free.email);
    const denied = await callRoute(uploadBackground, uploadRequest(`/api/projects/${freeProject.id}/background`, JPEG), { cookies: freeCookies, params: { id: freeProject.id } });
    expect(denied.status).toBe(403);
  });
});
