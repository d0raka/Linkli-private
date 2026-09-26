import { describe, expect, it } from "vitest";
import { allAppCss } from "../helpers/css";

const css = allAppCss();
const studioCss = css;
const marketingCss = css;

describe("A11Y-02 / FE-05 / A11Y-04: CSS motion, viewport, and touch invariants", () => {
  it("defines bounce instead of leaving the wax envelope animation as a no-op", () => {
    expect(css).toMatch(/@keyframes\s+bounce\s*\{/);
  });

  it("does not force editor decorations to keep traveling under reduced motion", () => {
    expect(css).not.toMatch(/\.visual-editor\s+\.preview-falling[^}]*animation-name:\s*decoTravel\s*!important/);
    expect(css).not.toMatch(/html\[data-reduce-motion="true"\][^{]*\.visual-editor[^{]*preview-falling[\s\S]{0,220}animation-name:\s*decoTravel\s*!important/);
  });

  it("covers decorative motion globally when the OS asks to reduce it", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,420}animation:\s*none\s*!important/);
  });

  it("uses dynamic viewport height for studio and legal shells", () => {
    expect(studioCss).toMatch(/\.studio-body\s*\{[^}]*min-height:\s*100dvh/);
    expect(css).toMatch(/\.legal-shell\s*\{[^}]*min-height:\s*100dvh/);
  });

  it("gives slider dots a 44px touch target", () => {
    expect(css).toMatch(/\.slider-dots\s+button\s*\{[^}]*min-width:\s*44px/);
    expect(css).toMatch(/\.slider-dots\s+button\s*\{[^}]*min-height:\s*44px/);
  });

  it("exposes a mobile nav toggle instead of hiding landing links with no replacement", () => {
    expect(css).toMatch(/\.nav-menu-toggle/);
    expect(css).not.toMatch(/\.nav-links>a:not\(\.button\)\{display:none\}/);
  });

  it("keeps landing scroll-reveals visible once they enter the viewport", () => {
    expect(marketingCss).toMatch(/\.reveal\.reveal-armed:not\(\.is-inview\)\s*\{[\s\S]*?opacity:\s*0/);
    expect(marketingCss).toMatch(/\.reveal\.reveal-armed\.is-inview\s*\{[\s\S]*?opacity:\s*1/);
    expect(marketingCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.reveal\.reveal-armed/);
  });

  it("lets the main wrap expand on 1920-class screens instead of a 1240px column", () => {
    expect(css).toMatch(/@media \(min-width: 1800px\)[\s\S]{0,120}\.wrap \{ width: min\(1720px/);
    expect(css).not.toMatch(/@media \(min-width: 1920px\)[\s\S]{0,80}\.wrap \{ width: min\(1240px/);
  });

  it("lets the landing wrap use the wide canvas instead of a 1520 column", () => {
    expect(marketingCss).toMatch(/\.landing-shell \.wrap\s*\{\s*width:\s*min\(1880px/);
    expect(marketingCss).not.toMatch(/\.landing-shell \.wrap\s*\{\s*width:\s*min\(1520px/);
  });
});
