import { describe, expect, it } from "vitest";
import { resolveReduceMotion } from "@/lib/a11y";

describe("A11Y-02: reduced-motion preference seeding", () => {
  it("uses the OS preference when the visitor has not saved a choice", () => {
    expect(resolveReduceMotion({ systemPrefersReduce: true })).toBe(true);
    expect(resolveReduceMotion({ systemPrefersReduce: false })).toBe(false);
  });

  it("keeps an explicit saved choice over the OS preference", () => {
    expect(resolveReduceMotion({ saved: false, systemPrefersReduce: true })).toBe(false);
    expect(resolveReduceMotion({ saved: true, systemPrefersReduce: false })).toBe(true);
  });
});
