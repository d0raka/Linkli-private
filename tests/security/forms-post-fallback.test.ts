import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { GET as noscriptGet, POST as noscriptPost } from "@/app/api/forms/noscript/route";

const root = new URL("../../", import.meta.url).pathname;

function tsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

function formTags(source: string) {
  return Array.from(source.matchAll(/<form\b[^>]*>/g), (match) => match[0]);
}

describe("SEC-06: forms never fall back to a native GET submission", () => {
  it("every <form> in app/ declares method=\"post\" and an action", () => {
    const offenders: string[] = [];
    for (const file of tsxFiles(join(root, "app"))) {
      const source = readFileSync(file, "utf8");
      for (const tag of formTags(source)) {
        const hasPost = /\bmethod=["']post["']/i.test(tag);
        const hasAction = /\baction=/.test(tag);
        if (!hasPost || !hasAction) offenders.push(`${relative(root, file)}: ${tag.slice(0, 80)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every guided create wizard posts to the noscript fallback", () => {
    const wizards = [
      "app/create/birthday/birthday-creator.tsx",
      "app/create/guided-event-creator.tsx",
    ];
    const missing = wizards.filter((file) => {
      const source = readFileSync(join(root, file), "utf8");
      return !/<form\b[^>]*\bmethod=["']post["'][^>]*\baction=["']\/api\/forms\/noscript["']/.test(source)
        && !/<form\b[^>]*\baction=["']\/api\/forms\/noscript["'][^>]*\bmethod=["']post["']/.test(source);
    });
    expect(missing).toEqual([]);
  });

  it("the no-script landing route answers a native POST with an explanation and never a success", async () => {
    const request = new Request("https://linkli.test/api/forms/noscript", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "email=a%40b.c&password=super-secret",
    });
    const response = await noscriptPost(request);
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const html = await response.text();
    expect(html).not.toContain("super-secret");
    expect(html).toContain("JavaScript");
    expect(await noscriptGet()).toMatchObject({ status: 405 });
  });
});
