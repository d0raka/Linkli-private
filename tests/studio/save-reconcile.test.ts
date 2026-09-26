import { describe, expect, it } from "vitest";
import { contentKey, reconcileSave } from "@/app/studio/editor/use-page-persistence";
import type { ProjectRecord } from "@/lib/projects";
import { getTemplate, safeConfig } from "@/lib/templates";

const config = safeConfig(getTemplate("birthday").config, "birthday");

function page(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: "6f1d2c3e-4b5a-4c6d-8e7f-90a1b2c3d4e5",
    title: "הפתעה לדנה",
    slug: "dana",
    templateId: "birthday",
    config,
    published: false,
    passwordProtected: false,
    views: 0,
    clicks: 0,
    createdAt: "2026-09-26 10:00:00",
    updatedAt: "2026-09-26 10:00:00.000",
    ...overrides,
  };
}

describe("editor save reconciliation", () => {
  it("adopts the server copy when nothing changed during the request", () => {
    const before = page({ config: { ...config, headline: "שלום " } });
    const sent = { title: before.title, config: before.config, slug: before.slug };
    const server = page({ config: { ...config, headline: "שלום" }, updatedAt: "2026-09-26 10:00:05.000" });
    const next = reconcileSave(before, before, sent, server);
    expect(next.project.config.headline).toBe("שלום");
    expect(next.project.updatedAt).toBe("2026-09-26 10:00:05.000");
    expect(next.savedContent).toBe(contentKey(server));
  });

  it("keeps text typed while the save was in flight and still takes the new version token", () => {
    const before = page({ config: { ...config, headline: "שלום" } });
    const sent = { title: before.title, config: before.config, slug: before.slug };
    const local = page({ config: { ...config, headline: "שלום דנה" } });
    const server = page({ config: before.config, updatedAt: "2026-09-26 10:00:05.000", published: true });
    const next = reconcileSave(local, before, sent, server);
    expect(next.project.config.headline).toBe("שלום דנה");
    expect(next.project.updatedAt).toBe("2026-09-26 10:00:05.000");
    expect(next.project.published).toBe(true);
    expect(next.savedContent).toBe(contentKey(sent));
    expect(next.savedContent).not.toBe(contentKey(next.project));
  });

  it("treats an explicit config save (image upload) as the latest content", () => {
    const before = page();
    const uploaded = { ...config, bgImageVersion: 3 };
    const sent = { title: before.title, config: uploaded, slug: before.slug };
    const local = page({ config: uploaded });
    const server = page({ config: uploaded, updatedAt: "2026-09-26 10:00:07.000" });
    const next = reconcileSave(local, before, sent, server);
    expect(next.project.config.bgImageVersion).toBe(3);
    expect(next.savedContent).toBe(contentKey(server));
  });

  it("never overwrites a page address the host is still typing", () => {
    const before = page();
    const sent = { title: before.title, config: before.config, slug: "dana" };
    const local = page({ slug: "dana-birth" });
    const server = page({ slug: "dana", updatedAt: "2026-09-26 10:00:09.000" });
    expect(reconcileSave(local, before, sent, server).project.slug).toBe("dana-birth");
  });
});
