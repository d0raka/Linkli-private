import { describe, expect, it } from "vitest";
import {
  buildIcs,
  clampGuestCount,
  countdownParts,
  googleCalendarUrl,
  normalizeEventInstant,
} from "@/lib/event-time";
import { PLAN_CATALOG, parsePurchasablePlan } from "@/lib/plans";
import { getTemplate, safeConfig } from "@/lib/templates";

describe("event time, calendar and guest cap", () => {
  it("parses ISO starts in Asia/Jerusalem including DST spring-forward", () => {
    const winter = normalizeEventInstant({
      eventStartsAt: "2026-01-15T19:30:00",
      eventTimezone: "Asia/Jerusalem",
    });
    expect(winter?.display).toBe("15.01.2026 · 19:30");
    expect(winter?.start.toISOString()).toBe("2026-01-15T17:30:00.000Z");

    const summer = normalizeEventInstant({
      eventStartsAt: "2026-07-15T19:30:00",
      eventTimezone: "Asia/Jerusalem",
    });
    expect(summer?.start.toISOString()).toBe("2026-07-15T16:30:00.000Z");
  });

  it("treats invalid or inverted ranges as missing, and expired countdowns as zero", () => {
    expect(normalizeEventInstant({ eventStartsAt: "not-a-date" })).toBeNull();
    expect(normalizeEventInstant({
      eventStartsAt: "2026-09-18T21:00:00",
      eventEndsAt: "2026-09-18T20:00:00",
      eventTimezone: "Asia/Jerusalem",
    })).toBeNull();
    const start = new Date("2026-01-01T00:00:00.000Z");
    expect(countdownParts(Date.parse("2026-01-02T00:00:00.000Z"), start)).toMatchObject({ expired: true, days: 0, seconds: 0 });
    expect(countdownParts(Date.parse("2025-12-31T00:00:00.000Z"), start).days).toBe(1);
  });

  it("emits Google Calendar dates= and ICS UID/DTSTAMP/TZID", () => {
    const instant = normalizeEventInstant({
      eventStartsAt: "2026-09-18T19:30:00",
      eventEndsAt: "2026-09-18T21:30:00",
      eventTimezone: "Asia/Jerusalem",
    })!;
    const google = new URL(googleCalendarUrl({ title: "חתונה", details: "שלום", location: "תל אביב", instant }));
    expect(google.searchParams.get("dates")).toBe("20260918T193000/20260918T213000");
    expect(google.searchParams.get("ctz")).toBe("Asia/Jerusalem");
    const ics = buildIcs({
      uid: "event-locked@page.linkli.online",
      title: "חתונה",
      details: "שלום",
      location: "תל אביב",
      instant,
      stamp: new Date("2026-09-01T12:00:00.000Z"),
    });
    expect(ics).toContain("UID:event-locked@page.linkli.online");
    expect(ics).toContain("DTSTAMP:20260901T120000Z");
    expect(ics).toContain("DTSTART;TZID=Asia/Jerusalem:20260918T193000");
    expect(ics).toContain("DTEND;TZID=Asia/Jerusalem:20260918T213000");
  });

  it("respects maxGuests instead of a hardcoded 10", () => {
    expect(clampGuestCount(15, 4)).toBe(4);
    expect(clampGuestCount(0, 8)).toBe(1);
    expect(clampGuestCount(12, 20)).toBe(12);
  });
});

describe("plan catalog truth", () => {
  it("keeps Business on a waitlist and does not sell it at checkout", () => {
    const business = PLAN_CATALOG.find((plan) => plan.id === "business");
    expect(business?.waitlist).toBe(true);
    expect(parsePurchasablePlan("business")).toBeNull();
    expect(parsePurchasablePlan("max")).toBe("max");
    const max = PLAN_CATALOG.find((plan) => plan.id === "max");
    expect(max?.features.join(" ")).toMatch(/אישורי הגעה/);
    expect(max?.features.join(" ")).not.toMatch(/דומיין/);
    expect(PLAN_CATALOG.find((plan) => plan.id === "pro")?.features.join(" ")).not.toMatch(/hash/i);
  });

  it("keeps custom memory slides instead of hardcoded copy", () => {
    expect(getTemplate("event").description).toMatch(/אישורי? הגעה/);
    const config = safeConfig({
      memorySlides: [{ icon: "🎉", title: "החגיגה", text: "רגע אחד" }],
    }, "memories");
    expect(config.memorySlides).toEqual([{ icon: "🎉", title: "החגיגה", text: "רגע אחד" }]);
  });
});


it("keeps Israel wall times stable across normalization and runtime timezones", () => {
  const once = normalizeEventInstant({ eventStartsAt: "2026-09-18T19:30", eventTimezone: "Asia/Jerusalem" })!;
  expect(once.start.toISOString()).toBe("2026-09-18T16:30:00.000Z");
  const twice = normalizeEventInstant({ eventStartsAt: once.startLocal, eventEndsAt: once.endLocal, eventTimezone: once.timeZone })!;
  expect(twice.start.toISOString()).toBe(once.start.toISOString());
  expect(twice.display).toBe("18.09.2026 · 19:30");
});
