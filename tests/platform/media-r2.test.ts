import { describe, expect, it } from "vitest";
import { POST as uploadBackground } from "@/app/api/projects/[id]/background/route";
import { GET as getBackground } from "@/app/api/public/[slug]/background/route";
import { persistPlan } from "@/lib/plans";
import { ensureDatabase } from "@/db";
import { env } from "../shims/cloudflare-workers";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser, sessionCookieFor } from "../helpers/users";
import { callRoute, getRequest, ORIGIN } from "../helpers/requests";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array.from({ length: 60 }, (_, index) => index)]);

function uploadRequest(path: string, bytes: Uint8Array) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(bytes)], "photo.jpg", { type: "image/jpeg" }));
  return new Request(new URL(path, ORIGIN), { method: "POST", body: form, headers: { origin: ORIGIN, "sec-fetch-site": "same-origin" } });
}

describe("new page media lives on the MEDIA binding", () => {
  useTestDatabase();

  it("writes background bytes to R2 and keeps only the key in D1", async () => {
    const owner = await createUser({ email: "r2@linkli.test", plan: "pro" });
    await persistPlan(await ensureDatabase(), owner.email, "pro");
    const project = await createProject(owner.email, { published: true, slug: "r2-page" });
    const cookies = await sessionCookieFor(owner.email);
    const uploaded = await callRoute(uploadBackground, uploadRequest(`/api/projects/${project.id}/background`, JPEG), { cookies, params: { id: project.id } });
    expect(uploaded.status).toBe(200);

    const db = await ensureDatabase();
    const row = await db.prepare("SELECT object_key, length(data) AS bytes FROM project_backgrounds WHERE project_id = ?").bind(project.id).first();
    expect(String(row?.object_key || "")).toMatch(/^project_backgrounds\//);
    expect(Number(row?.bytes ?? 0)).toBeLessThan(8);
    const stored = await (env.MEDIA as { get: (key: string) => Promise<{ body: Uint8Array } | null> }).get(String(row?.object_key));
    expect(stored?.body.byteLength).toBe(JPEG.byteLength);

    const response = await callRoute(getBackground, getRequest(`/api/public/${project.slug}/background`), { params: { slug: project.slug } });
    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBe(JPEG.byteLength);
  });
});
