import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLAN_CATALOG } from "@/lib/plans";

const root = new URL("../../", import.meta.url);

describe("user-facing copy honesty", () => {
  it("uses the full RSVP rehearsal banner on draft preview", () => {
    const source = readFileSync(new URL("app/p/[slug]/published-experience.tsx", root), "utf8");
    expect(source).toContain("מצב בדיקה: התשובה לא נשמרת אצל האורחים");
  });

  it("keeps Free plan copy as one published page plus unlimited drafts", () => {
    const free = PLAN_CATALOG.find((plan) => plan.id === "free");
    expect(free?.summary).toBe("עמוד מפורסם אחד · טיוטות ללא הגבלה");
    const account = readFileSync(new URL("app/account/page.tsx", root), "utf8") + readFileSync(new URL("app/account/account-client.tsx", root), "utf8");
    expect(account).not.toMatch(/טיוטות חופשיות/);
    expect(account).toMatch(/plan\.summary/);
  });
});
