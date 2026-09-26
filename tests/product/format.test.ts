import { describe, expect, it } from "vitest";
import { formatRelativeDate, parseDbTimestamp } from "@/lib/format";

const now = Date.parse("2026-09-26T12:00:00Z");

describe("date formatting for SQLite timestamps", () => {
  it("reads zone-less SQLite values as UTC", () => {
    expect(parseDbTimestamp("2026-09-26 09:30:00")?.toISOString()).toBe("2026-09-26T09:30:00.000Z");
    expect(parseDbTimestamp("2026-09-26 09:30:00.125")?.toISOString()).toBe("2026-09-26T09:30:00.125Z");
    expect(parseDbTimestamp("2026-09-26T09:30:00Z")?.toISOString()).toBe("2026-09-26T09:30:00.000Z");
    expect(parseDbTimestamp("not a date")).toBeNull();
  });

  it("describes recent edits relatively and older ones by date", () => {
    expect(formatRelativeDate("2026-09-26 11:59:40", now)).toBe("עכשיו");
    expect(formatRelativeDate("2026-09-26 11:45:00", now)).toContain("15");
    expect(formatRelativeDate("2026-09-25 12:00:00", now)).toBe("אתמול");
    expect(formatRelativeDate("2026-08-01 12:00:00", now)).toMatch(/1/);
    expect(formatRelativeDate("", now)).toBe("");
  });
});
