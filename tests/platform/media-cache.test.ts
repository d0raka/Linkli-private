import { describe, expect, it } from "vitest";
import { GET as getBackground } from "@/app/api/public/[slug]/background/route";
import { persistPlan } from "@/lib/plans";
import { shouldDisableHttpStore } from "@/lib/http";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser, storeMedia } from "../helpers/users";
import { callRoute, getRequest } from "../helpers/requests";

describe("public media caching", () => {
  useTestDatabase();

  it("lets published unlocked images be cached publicly", async () => {
    const owner = await createUser({ email: "media@linkli.test", plan: "max" });
    await persistPlan(await ensureDatabase(), owner.email, "max");
    const project = await createProject(owner.email, { published: true, slug: "open-media" });
    await storeMedia(project.id, "project_backgrounds");
    const response = await callRoute(getBackground, getRequest(`/api/public/${project.slug}/background`), { params: { slug: project.slug } });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toMatch(/public/i);
    expect(response.headers.get("cache-control")).not.toMatch(/no-store/i);
  });

  it("does not force no-store on public media paths", () => {
    expect(shouldDisableHttpStore("/api/public/open-media/background")).toBe(false);
    expect(shouldDisableHttpStore("/api/projects")).toBe(true);
    expect(shouldDisableHttpStore("/studio")).toBe(true);
    expect(shouldDisableHttpStore("/")).toBe(false);
  });
});
