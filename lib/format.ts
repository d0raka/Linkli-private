const TIME_ZONE = "Asia/Jerusalem";

/** SQLite CURRENT_TIMESTAMP values are UTC without a zone marker ("YYYY-MM-DD HH:MM:SS[.SSS]"). */
export function parseDbTimestamp(value: string): Date | null {
  if (!value) return null;
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

const relative = new Intl.RelativeTimeFormat("he", { numeric: "auto" });
const dayMonth = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: TIME_ZONE });
const dayMonthYear = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE });

/** "לפני 5 דקות", "אתמול", "12 בספט׳": recent edits read as relative time, older ones as dates. */
export function formatRelativeDate(value: string, now = Date.now()): string {
  const date = parseDbTimestamp(value);
  if (!date) return "";
  const seconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "עכשיו";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return relative.format(Math.round(seconds / 86_400), "day");
  const sameYear = new Date(now).getUTCFullYear() === date.getUTCFullYear();
  return (sameYear ? dayMonth : dayMonthYear).format(date);
}

const numbers = new Intl.NumberFormat("he-IL");
export function formatCount(value: number) {
  return numbers.format(value);
}
