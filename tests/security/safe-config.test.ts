import { describe, expect, it } from "vitest";
import { safeConfig } from "@/lib/templates";
import { safeNavigationUrl } from "@/lib/safe-links";

describe("SEC-10: trusted-label navigation links only accept their real providers", () => {
  it("accepts genuine Waze and Google Maps links", () => {
    expect(safeNavigationUrl("https://waze.com/ul?ll=32.08,34.78&navigate=yes", "waze")).toBe("https://waze.com/ul?ll=32.08,34.78&navigate=yes");
    expect(safeNavigationUrl("https://www.waze.com/ul/hsv8z7e6", "waze")).toBe("https://www.waze.com/ul/hsv8z7e6");
    expect(safeNavigationUrl("https://ul.waze.com/ul?place=abc", "waze")).toBe("https://ul.waze.com/ul?place=abc");
    expect(safeNavigationUrl("https://www.google.com/maps/place/Tel+Aviv", "maps")).toBe("https://www.google.com/maps/place/Tel+Aviv");
    expect(safeNavigationUrl("https://maps.google.com/?q=Tel+Aviv", "maps")).toBe("https://maps.google.com/?q=Tel+Aviv");
    expect(safeNavigationUrl("https://maps.app.goo.gl/abc123", "maps")).toBe("https://maps.app.goo.gl/abc123");
    expect(safeNavigationUrl("https://goo.gl/maps/abc123", "maps")).toBe("https://goo.gl/maps/abc123");
  });

  it("rejects javascript:, data:, http:, lookalike hosts and non-map Google URLs", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "http://waze.com/ul?q=x",
      "https://waze.com.evil.example/ul",
      "https://evil.example/waze.com",
      "https://www.google.com/search?q=phish",
      "https://accounts.google.com/",
      "not a url",
    ]) {
      expect(safeNavigationUrl(value, "waze")).toBe("");
      expect(safeNavigationUrl(value, "maps")).toBe("");
    }
    expect(safeNavigationUrl("https://waze.com/ul?q=x", "maps")).toBe("");
    expect(safeNavigationUrl("https://www.google.com/maps/place/x", "waze")).toBe("");
  });

  it("safeConfig drops hostile navigation URLs while keeping valid ones", () => {
    const config = safeConfig({ wazeUrl: "https://evil.example/login", googleMapsUrl: "https://maps.app.goo.gl/ok" }, "event");
    expect(config.wazeUrl).toBe("");
    expect(config.googleMapsUrl).toBe("https://maps.app.goo.gl/ok");
    expect(safeConfig({ wazeUrl: "javascript:alert(1)" }, "event").wazeUrl).toBe("");
  });
});

describe("SEC-10: class-name-bearing config values are allowlisted", () => {
  it("falls back to defaults for unknown or injected values", () => {
    const config = safeConfig({
      bgStyle: "soft studio-hidden",
      cardShape: "rounded-3d experience-card",
      emojiShape: "circle) url(x",
      buttonStyle: "gradient danger",
      decorationSet: "custom",
      fontFamily: "Rubik\"; color: red",
    }, "date");
    expect(config.bgStyle).toBe("bloom");
    expect(config.cardShape).toBe("rounded-3d");
    expect(config.emojiShape).toBe("rounded");
    expect(config.buttonStyle).toBe("solid");
    expect(config.decorationSet).toBe("template");
    expect(config.fontFamily).toBe("Rubik");
  });

  it("keeps every value the Studio can actually select", () => {
    for (const bgStyle of ["soft", "solid", "dots", "bloom", "sunset", "waves", "paper", "stripes", "spotlight", "aurora", "night", "fluid-mesh", "image"]) {
      expect(safeConfig({ bgStyle }, "date").bgStyle).toBe(bgStyle);
    }
    for (const cardShape of ["rounded-3d", "rounded-pill", "square-minimal"]) expect(safeConfig({ cardShape }, "date").cardShape).toBe(cardShape);
    for (const emojiShape of ["rounded", "circle", "square", "pill"]) expect(safeConfig({ emojiShape }, "date").emojiShape).toBe(emojiShape);
    for (const buttonStyle of ["gradient", "solid", "outline", "soft"]) expect(safeConfig({ buttonStyle }, "date").buttonStyle).toBe(buttonStyle);
    for (const fontFamily of ["Rubik", "Heebo"]) expect(safeConfig({ fontFamily }, "date").fontFamily).toBe(fontFamily);
  });

  it("rejects unhosted Studio font names and falls back to Rubik", () => {
    for (const fontFamily of ["Assistant", "Varela Round", "Secular One"]) {
      expect(safeConfig({ fontFamily }, "date").fontFamily).toBe("Rubik");
    }
  });
});
