import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { templates } from "@/lib/templates";
import { allAppCss } from "../helpers/css";

const css = allAppCss();

describe("each invitation edition has its own paper", () => {
  it.each(templates)("$id is not a recolored clone", (template) => {
    expect(css).toMatch(new RegExp(`paper-${template.id}`));
    expect(css).toMatch(new RegExp(`experience-${template.config.theme}`));
    expect(css).toMatch(new RegExp(`preview-${template.config.theme}`));
  });

  it("keeps the editor WhatsApp note as a compact chip, not a full-width banner", () => {
    const studio = readFileSync(new URL("../../app/studio/editor/editor.tsx", import.meta.url), "utf8");
    expect(studio).toMatch(/editor-whatsapp-chip/);
    expect(studio).not.toMatch(/editor-workspace[\s\S]{0,80}whatsapp-warning[\s\S]{0,40}הוסיפו מספר/);
  });
});
