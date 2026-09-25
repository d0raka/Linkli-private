export const DEFAULT_EVENT_TIMEZONE = "Asia/Jerusalem";

export const EVENT_TIMEZONE_OPTIONS = [
  { value: "Asia/Jerusalem", label: "ישראל (Asia/Jerusalem)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "לונדון" },
  { value: "America/New_York", label: "ניו יורק" },
] as const;

export type EventInstant = {
  start: Date;
  end: Date;
  timeZone: string;
  display: string;
  startLocal: string;
  endLocal: string;
};

export function isValidIanaTimeZone(zone?: string | null) {
  if (!zone || !/^[A-Za-z0-9_+\-/]+$/.test(zone)) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolvedEventTimeZone(zone?: string | null) {
  return isValidIanaTimeZone(zone) ? String(zone) : DEFAULT_EVENT_TIMEZONE;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatOffsetDate(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function zonedLocalToUtc(localIso: string, timeZone: string) {
  const match = localIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || "0");
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const asZone = formatOffsetDate(new Date(utcGuess), timeZone);
  const asZoneUtc = Date.UTC(asZone.year, asZone.month - 1, asZone.day, asZone.hour, asZone.minute, asZone.second);
  let result = new Date(utcGuess - (asZoneUtc - utcGuess));
  // Re-evaluate at the proposed instant, including days when the UTC offset changes.
  for (let attempt = 0; attempt < 2; attempt++) {
    const actual = formatOffsetDate(result, timeZone);
    const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    if (actualUtc === utcGuess) return result;
    result = new Date(result.getTime() + utcGuess - actualUtc);
  }
  return null;
}

function parseIsoDate(value?: string | null) {
  if (!value || !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDisplayDate(value?: string | null, timeZone = DEFAULT_EVENT_TIMEZONE) {
  if (!value) return null;
  const dateMatch = value.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  const timeMatch = value.match(/(\d{1,2}):(\d{2})/);
  if (!dateMatch) return null;
  const day = dateMatch[1].padStart(2, "0");
  const month = dateMatch[2].padStart(2, "0");
  const year = dateMatch[3];
  const hour = (timeMatch?.[1] || "19").padStart(2, "0");
  const minute = timeMatch?.[2] || "00";
  return zonedLocalToUtc(`${year}-${month}-${day}T${hour}:${minute}:00`, timeZone);
}

export function formatLocalInput(date: Date, timeZone: string) {
  const parts = formatOffsetDate(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatEventDisplay(date: Date, timeZone: string) {
  const parts = formatOffsetDate(date, timeZone);
  return `${pad(parts.day)}.${pad(parts.month)}.${parts.year} · ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function wallTimeStamp(date: Date, timeZone: string) {
  const parts = formatOffsetDate(date, timeZone);
  return `${parts.year}${pad(parts.month)}${pad(parts.day)}T${pad(parts.hour)}${pad(parts.minute)}${pad(parts.second)}`;
}

export function utcStamp(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

export function normalizeEventInstant(input: {
  eventStartsAt?: string | null;
  eventEndsAt?: string | null;
  eventTimezone?: string | null;
  eventDate?: string | null;
}): EventInstant | null {
  const timeZone = resolvedEventTimeZone(input.eventTimezone);
  const start = parseIsoDate(input.eventStartsAt)
    || zonedLocalToUtc(String(input.eventStartsAt || "").slice(0, 19), timeZone)
    || parseDisplayDate(input.eventDate, timeZone);
  if (!start) return null;
  const end = parseIsoDate(input.eventEndsAt)
    || zonedLocalToUtc(String(input.eventEndsAt || "").slice(0, 19), timeZone)
    || new Date(start.getTime() + 2 * 60 * 60 * 1000);
  if (end.getTime() <= start.getTime()) return null;
  return {
    start,
    end,
    timeZone,
    display: formatEventDisplay(start, timeZone),
    startLocal: formatLocalInput(start, timeZone),
    endLocal: formatLocalInput(end, timeZone),
  };
}

export function countdownParts(now: number, start: Date) {
  const diff = start.getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    expired: false,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function googleCalendarUrl(input: {
  title: string;
  details: string;
  location: string;
  instant: EventInstant;
}) {
  const dates = `${wallTimeStamp(input.instant.start, input.instant.timeZone)}/${wallTimeStamp(input.instant.end, input.instant.timeZone)}`;
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", input.title);
  url.searchParams.set("details", input.details);
  url.searchParams.set("location", input.location);
  url.searchParams.set("dates", dates);
  url.searchParams.set("ctz", input.instant.timeZone);
  return url.toString();
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r?\n/g, "\\n");
}

export function buildIcs(input: {
  uid: string;
  title: string;
  details: string;
  location: string;
  instant: EventInstant;
  stamp?: Date;
}) {
  const stamp = utcStamp(input.stamp || new Date());
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Linkli//Event//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${input.instant.timeZone}:${wallTimeStamp(input.instant.start, input.instant.timeZone)}`,
    `DTEND;TZID=${input.instant.timeZone}:${wallTimeStamp(input.instant.end, input.instant.timeZone)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `DESCRIPTION:${escapeIcs(input.details)}`,
    `LOCATION:${escapeIcs(input.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function clampGuestCount(value: number, maxGuests = 10) {
  const max = Math.min(20, Math.max(1, Math.round(maxGuests) || 10));
  return Math.min(max, Math.max(1, Math.round(value) || 1));
}
