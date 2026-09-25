import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GET as og } from "@/app/api/public/[slug]/og/route";
import { persistPlan } from "@/lib/plans";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser } from "../helpers/users";
import { callRoute, getRequest } from "../helpers/requests";

const root = new URL("../../", import.meta.url);

describe("per-page Open Graph JPEG", () => {
  useTestDatabase();

  it("points unlocked pages at the per-page OG route and keeps marketing art for password locks", () => {
    const source = readFileSync(new URL("app/p/[slug]/page.tsx", root), "utf8");
    expect(source).toMatch(/\/api\/public\/\$\{slug\}\/og/);
    expect(source).toMatch(/isLocked[\s\S]*og-marketing\.jpg/);
  });

  it("serves a JPEG under 300KB for a published unlocked page", async () => {
    const owner = await createUser({ email: "og@linkli.test", plan: "pro" });
    await persistPlan(await ensureDatabase(), owner.email, "pro");
    const project = await createProject(owner.email, { published: true, slug: "og-page" });
    const response = await callRoute(og, getRequest(`/api/public/${project.slug}/og`), { params: { slug: project.slug } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/jpeg");
    expect((await response.arrayBuffer()).byteLength).toBeLessThan(300_000);
  });
});
