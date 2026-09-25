import { describe, expect, it } from "vitest";
import { getTemplate, safeConfig, templates, FONT_FAMILIES } from "@/lib/templates";
import { applyPlanToConfig } from "@/lib/plans";

describe("crafted invitation editions", () => {
  it.each(templates)("$id has a complete, distinct guest journey", (template) => {
    const c = safeConfig(template.config, template.id);
    expect(c.questions.length).toBeGreaterThanOrEqual(2);
    expect(c.questions.length).toBeLessThanOrEqual(4);
    expect(new Set(c.questions.map((q) => q.id)).size).toBe(c.questions.length);
    expect(c.questions.every((q) => q.prompt && q.widget && q.options.length >= 2)).toBe(true);
    expect(c.successText.length).toBeGreaterThan(30);
    expect(c.successText).not.toMatch(/מנוע היצירה|תודה שהשתמשתם/);
    expect(c.cardBorderColor).not.toBe("#ffffff");
    expect(FONT_FAMILIES).toContain(c.fontFamily);
    expect(templates.filter((t) => t.config.headline === template.config.headline)).toHaveLength(1);
    expect(c.showFallingEmojis).toBe(true);
    expect(`${template.name} ${template.description} ${template.category} ${c.highlights.join(" ")} ${c.questions.map((q) => q.prompt).join(" ")}`).not.toMatch(/טקס כיבוי|מוכנים להתחיל|Glassmorphism|Google Maps|WhatsApp|\bPro\b|\bFree\b/);
  });
  it("keeps widgets attached to IDs after reorder and repeated normalization", () => {
    const base = safeConfig(getTemplate("wedding").config, "wedding");
    const reversed = safeConfig({ ...base, questions: [...base.questions].reverse() }, "wedding");
    expect(Object.fromEntries(reversed.questions.map((q) => [q.id, q.widget]))).toEqual(Object.fromEntries(base.questions.map((q) => [q.id, q.widget])));
  });
  it("keeps free memories as text and strips paid capabilities from publication", () => {
    expect(getTemplate("memories").free).toBe(true);
    const c = safeConfig({ ...getTemplate("event").config, hideBranding:true, showMusicPlayer:true, memorySlides:[{icon:"🌿",title:"טיול",text:"שלנו",photoKey:"memories/a/b.jpg"}] }, "event");
    const free = applyPlanToConfig(c, "free");
    expect(free.hideBranding).toBe(false);
    expect(free.memorySlides?.[0].photoKey).toBeUndefined();
    for (const key of ["rsvpEnabled", "showMusicPlayer", "showCalendar", "showGuests", "showWaze"] as const) expect(free[key]).toBe(false);
    expect(applyPlanToConfig(c, "pro").memorySlides?.[0].photoKey).toBeTruthy();
  });
});
