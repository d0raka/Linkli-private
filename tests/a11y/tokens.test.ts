import { describe, expect, it } from "vitest";
import { contrastRatio, parseCssRootVars } from "@/lib/a11y";
import { appCss } from "../helpers/css";

const AA_TEXT = 4.5;
const AA_UI = 3;
const css = appCss("styles/tokens.css");

function resolve(tokens: Record<string, string>, name: string, depth = 0): string {
  const value = tokens[name];
  const reference = value?.match(/^var\(--([a-z0-9-]+)\)$/i);
  if (reference && depth < 8) return resolve(tokens, reference[1], depth + 1);
  return value;
}

function darkTokens(light: Record<string, string>) {
  const block = css.match(/:root\[data-color-scheme="auto"\]\s*\{([^}]+)\}/);
  expect(block, "dark scheme block").toBeTruthy();
  return { ...light, ...parseCssRootVars(`:root {${block![1]}}`) };
}

const light = parseCssRootVars(css);
const schemes = { light, dark: darkTokens(light) };

describe("A11Y-01: semantic color tokens meet WCAG 2.2 AA in every scheme", () => {
  it.each(Object.entries(schemes))("%s: text tokens are readable on page, surface and sunken backgrounds", (_scheme, tokens) => {
    for (const fg of ["color-text", "color-text-muted", "color-text-subtle", "color-accent", "color-success", "color-warning", "color-danger"]) {
      for (const bg of ["color-bg", "color-surface", "color-bg-sunken"]) {
        const ratio = contrastRatio(resolve(tokens, fg), resolve(tokens, bg));
        expect(ratio, `${fg} on ${bg} (${resolve(tokens, fg)} / ${resolve(tokens, bg)})`).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it.each(Object.entries(schemes))("%s: filled controls keep their labels readable", (_scheme, tokens) => {
    expect(contrastRatio(resolve(tokens, "color-on-accent"), resolve(tokens, "color-accent"))).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(resolve(tokens, "color-on-inverse"), resolve(tokens, "color-inverse"))).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(resolve(tokens, "color-accent"), resolve(tokens, "color-accent-soft"))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(Object.entries(schemes))("%s: input borders and focus rings are visible against the surface", (_scheme, tokens) => {
    expect(contrastRatio(resolve(tokens, "color-border-input"), resolve(tokens, "color-surface"))).toBeGreaterThanOrEqual(AA_UI);
    expect(contrastRatio(resolve(tokens, "color-focus"), resolve(tokens, "color-surface"))).toBeGreaterThanOrEqual(AA_UI);
    expect(contrastRatio(resolve(tokens, "color-focus"), resolve(tokens, "color-bg"))).toBeGreaterThanOrEqual(AA_UI);
  });

  it("keeps the legacy aliases pointed at semantic tokens", () => {
    for (const alias of ["ink", "muted", "placeholder", "cream", "paper", "badge-bg", "badge-fg"]) {
      expect(light[alias], `--${alias}`).toMatch(/^var\(--color-/);
    }
  });
});
