import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relative: string) {
  return readFileSync(new URL(`../../${relative}`, import.meta.url), "utf8");
}

describe("A11Y-04/05/06: semantic wiring on public and studio surfaces", () => {
  it("exports noindex 404 metadata", () => {
    const page = source("app/not-found.tsx");
    expect(page).toMatch(/export const metadata/);
    expect(page).toMatch(/robots/);
    expect(page).toMatch(/index:\s*false/);
  });

  it("describes register password help and offers a show/hide control", () => {
    const form = source("app/auth-form.tsx");
    expect(form).toMatch(/aria-describedby=\{?["']password-help["']\}?/);
    expect(form).toMatch(/id="password-help"/);
    expect(form).toMatch(/aria-label=\{visible \? "הסתרת סיסמה" : "הצגת סיסמה"\}/);
  });

  it("marks the current birthday step with aria-current", () => {
    expect(source("app/create/birthday/birthday-creator.tsx")).toMatch(/aria-current=\{index === step \? "step" : undefined\}/);
  });

  it("gives memory slider dots an accessible name", () => {
    const page = source("app/p/[slug]/published-experience.tsx");
    expect(page).toMatch(/aria-label=\{`שקופית \$\{i \+ 1\} מתוך \$\{items\.length\}`\}/);
    expect(page).toMatch(/aria-current=\{i === index \? "true" : undefined\}/);
  });

  it("opens the wax envelope with a button, not a clickable div", () => {
    expect(source("app/p/[slug]/published-experience.tsx")).toMatch(/<button[^>]*className=\{elementClass\(config, "waxEnvelope"/);
  });

  it("gives YouTube iframes a title after the player is ready", () => {
    expect(source("app/studio/page-music-player.tsx")).toMatch(/getIframe\(\)/);
    expect(source("app/studio/page-music-player.tsx")).toMatch(/title/);
  });

  it("traps Tab inside the paywall overlay and focuses the dialog", () => {
    const overlay = source("app/paywall/paywall-overlay.tsx");
    expect(overlay).toMatch(/wrapFocusIndex|FOCUSABLE_SELECTOR/);
    expect(overlay).toMatch(/\.focus\(/);
  });

  it("seeds the accessibility widget from prefers-reduced-motion", () => {
    expect(source("app/accessibility-controls.tsx")).toMatch(/resolveReduceMotion/);
    expect(source("app/accessibility-controls.tsx")).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it("renders a labeled landing menu toggle", () => {
    const nav = source("app/landing-nav.tsx");
    expect(nav).toMatch(/aria-expanded/);
    expect(nav).toMatch(/aria-controls="landing-nav-links"/);
    expect(nav).toMatch(/תפריט/);
  });
});
