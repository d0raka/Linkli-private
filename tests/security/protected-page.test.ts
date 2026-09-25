import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import PublishedPage, { generateMetadata } from "@/app/p/[slug]/page";
import PasswordGate from "@/app/p/[slug]/password-gate";
import PublishedExperience from "@/app/p/[slug]/published-experience";
import { GET as getBackground } from "@/app/api/public/[slug]/background/route";
import { GET as getEmoji } from "@/app/api/public/[slug]/emoji/route";
import { hashPassword } from "@/lib/auth";
import { serializePageAccessCookie } from "@/lib/page-access";
import { persistPlan } from "@/lib/plans";
import { ensureDatabase } from "@/db";
import { useTestDatabase } from "../setup/db";
import { createProject, createUser, storeMedia } from "../helpers/users";
import { callRoute, getRequest } from "../helpers/requests";
import { runWithRequestContext } from "../shims/next-headers";

const HEADLINE = "דנה, תתחתני איתי?";
const SUBTITLE = "הסוד הגדול של המשפחה";

async function lockedPage(ownerPlan: "max" | "free" = "max") {
  const owner = await createUser({ email: "owner@linkli.test", plan: "max" });
  const hash = (await hashPassword("secret-page-pass")).hash;
  const project = await createProject(owner.email, { published: true, slug: "locked-page", accessPasswordHash: hash, config: { headline: HEADLINE, subtitle: SUBTITLE } });
  await storeMedia(project.id, "project_backgrounds");
  await storeMedia(project.id, "project_emoji_images");
  if (ownerPlan === "free") await persistPlan(await ensureDatabase(), owner.email, "free");
  const setCookie = await serializePageAccessCookie(project.slug, hash);
  const [name, value] = setCookie.split(";")[0].split("=");
  return { owner, project, accessCookie: { [name]: value } };
}

function renderPage(slug: string, cookies: Record<string, string> = {}) {
  return runWithRequestContext({ cookies }, () => PublishedPage({ params: Promise.resolve({ slug }) })) as Promise<ReactElement>;
}

describe("password-protected published pages", () => {
  useTestDatabase();

  it("SEC-02: keeps the gate even after the owner drops below Max", async () => {
    const { project } = await lockedPage("free");
    const element = await renderPage(project.slug);
    expect(element.type).toBe(PasswordGate);
  });

  it("renders the experience once the unlock cookie is present", async () => {
    const { project, accessCookie } = await lockedPage();
    const element = await renderPage(project.slug, accessCookie);
    expect(element.type).toBe(PublishedExperience);
  });

  it("SEC-03: the lock screen does not reveal the headline", async () => {
    const { project } = await lockedPage();
    const element = await renderPage(project.slug);
    const props = element.props as Record<string, unknown>;
    expect(JSON.stringify(props)).not.toContain(HEADLINE);
  });

  it("SEC-03/05: locked page metadata is neutral and noindex", async () => {
    const { project } = await lockedPage();
    const metadata = await runWithRequestContext({}, () => generateMetadata({ params: Promise.resolve({ slug: project.slug }) }));
    const serialized = JSON.stringify(metadata);
    expect(serialized).not.toContain(HEADLINE);
    expect(serialized).not.toContain(SUBTITLE);
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it("SEC-05: personal pages are noindex by default even when open", async () => {
    const owner = await createUser({ email: "open@linkli.test", plan: "pro" });
    const project = await createProject(owner.email, { published: true, slug: "open-page", config: { headline: HEADLINE } });
    const metadata = await runWithRequestContext({}, () => generateMetadata({ params: Promise.resolve({ slug: project.slug }) }));
    expect(String(metadata.title)).toContain(HEADLINE);
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it("SEC-04: protected media requires the unlock cookie", async () => {
    const { project, accessCookie } = await lockedPage();
    for (const handler of [getBackground, getEmoji]) {
      const denied = await callRoute(handler, getRequest(`/api/public/${project.slug}/background`), { params: { slug: project.slug } });
      expect(denied.status).toBe(404);
      const allowed = await callRoute(handler, getRequest(`/api/public/${project.slug}/background`), { params: { slug: project.slug }, cookies: accessCookie });
      expect(allowed.status).toBe(200);
      expect(allowed.headers.get("cache-control")).toContain("no-store");
    }
  });
});
