import { STUDIO_DEFAULTS } from "@/lib/studio";

/**
 * Date-only values ("2026-11-09", Postgres `date`) carry no time zone, so they're
 * formatted as calendar dates, never via `new Date(str)` (which would read them as
 * UTC midnight and show the previous day in Vancouver).
 */
export function formatDateOnly(value: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(STUDIO_DEFAULTS.locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...opts,
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * The current instant, for request-time Server Components (after `connection()`),
 * so every figure on a page is computed against the same "now".
 */
export function requestNow(): number {
  return Date.now();
}

/** Today's date in the studio's time zone, as "YYYY-MM-DD". Request-time only. */
export function todayInStudio(): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDIO_DEFAULTS.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ---------------------------------------------------------------------------
// Wall-clock ↔ UTC in the studio's time zone (DST-aware, no library needed)
// ---------------------------------------------------------------------------

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDIO_DEFAULTS.timeZone,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zonedParts(ms: number) {
  const p = Object.fromEntries(partsFormatter.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    ms: Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second),
  };
}

/** Offset of the studio time zone from UTC at an instant, in ms (e.g. -8h in winter). */
const zoneOffset = (ms: number) => zonedParts(ms).ms - Math.floor(ms / 1000) * 1000;

/**
 * "2026-11-10" + "09:30" in Vancouver → UTC ISO string. Handles DST: the offset is
 * re-checked at the resulting instant. Times skipped by spring-forward resolve to
 * the later offset.
 */
export function studioDateTimeToUtc(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let utc = wall - zoneOffset(wall);
  utc = wall - zoneOffset(utc);
  return new Date(utc).toISOString();
}

/** UTC timestamp → studio-local "YYYY-MM-DD". */
export const studioDateOf = (iso: string) => zonedParts(Date.parse(iso)).date;
/** UTC timestamp → studio-local "HH:MM" (24h). */
export const studioTimeOf = (iso: string) => zonedParts(Date.parse(iso)).time;

/** Calendar arithmetic on "YYYY-MM-DD" strings. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

export const isDateString = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Timestamps (timestamptz) shown in the studio's time zone. */
export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat(STUDIO_DEFAULTS.locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: STUDIO_DEFAULTS.timeZone,
  }).format(new Date(iso));
}
