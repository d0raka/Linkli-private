import { describe, expect, it } from "vitest";
import { formatGuestWhatsAppReply, formatHostWhatsAppInvite, tidyWhatsAppText, whatsappShareHref } from "@/lib/whatsapp-share";

describe("whatsapp share copy", () => {
  it("builds a ready invite with line breaks, tease, link and brand line", () => {
    const text = formatHostWhatsAppInvite({
      headline: "היום כולו שלך",
      tease: "הכנו לך כמה רגעים קצרים ואז ברכה.",
      url: "https://linkli.online/p/daniel",
      emoji: "🎂",
    });
    expect(text).toBe(tidyWhatsAppText([
      "🎂 היום כולו שלך",
      "",
      "הכנו לך כמה רגעים קצרים ואז ברכה.",
      "",
      "תפתחו מכאן:",
      "https://linkli.online/p/daniel",
      "",
      "נשלח מ־Linkli",
    ].join("\n")));
    expect(text).toContain("\n\n");
    expect(whatsappShareHref(text)).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(whatsappShareHref(text))).toContain("נשלח מ־Linkli");
  });

  it("keeps guest replies as a short note plus answers", () => {
    const text = formatGuestWhatsAppReply({
      message: "פתחתי. תודה, התרגשתי.",
      answers: "• איך חוגגים? — עוגה",
      url: "https://linkli.online/p/daniel",
    });
    expect(text).toContain("המענה שלי:");
    expect(text).toContain("נשלח מ־Linkli");
    expect(text.split("\n").length).toBeGreaterThan(4);
  });
});
