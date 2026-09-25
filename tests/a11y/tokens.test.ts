import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, parseCssRootVars } from "@/lib/a11y";

const AA_NORMAL = 4.5;
const css = readFileSync(new URL("../../app/styles/tokens.css", import.meta.url), "utf8");

describe("A11Y-01: brand text tokens meet WCAG 2.2 AA contrast", () => {
  it("exposes ink, muted, placeholder, cream, paper, and badge tokens", () => {
    const tokens = parseCssRootVars(css);
    for (const name of ["ink", "muted", "placeholder", "cream", "paper", "badge-bg", "badge-fg", "ribbon-bg", "ribbon-fg"]) {
      expect(tokens[name], `--${name}`).toMatch(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    }
  });

  it("keeps body and muted text at least 4.5:1 on cream and paper", () => {
    const tokens = parseCssRootVars(css);
    for (const fg of ["ink", "muted", "placeholder"]) {
      expect(contrastRatio(tokens[fg], tokens.cream), `${fg} on cream`).toBeGreaterThanOrEqual(AA_NORMAL);
      expect(contrastRatio(tokens[fg], tokens.paper), `${fg} on paper`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it("keeps badge and ribbon text at least 4.5:1 on their backgrounds", () => {
    const tokens = parseCssRootVars(css);
    expect(contrastRatio(tokens["badge-fg"], tokens["badge-bg"])).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(tokens["ribbon-fg"], tokens["ribbon-bg"])).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});
