/** Whole minutes between two instants (an open entry counts up to `now`). */
export function entryMinutes(startedAt: string, endedAt: string | null, now = Date.now()): number {
  const end = endedAt ? Date.parse(endedAt) : now;
  return Math.max(0, Math.round((end - Date.parse(startedAt)) / 60_000));
}

/** 95 → "1:35". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** 95 → "1h 35m", 60 → "1h", 5 → "5m". For prose and summaries. */
export function formatDurationLong(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Seconds → "1:05:09" for the running timer. */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Parses a duration typed by a person: "1:30", "1.5", "1.5h", "90m", "45".
 * A bare whole number up to 12 is read as hours, larger as minutes ("90" = 1h30).
 * Returns minutes, null for empty, NaN for invalid.
 */
export function parseDurationInput(input: string): number | null {
  const v = input.trim().toLowerCase().replace(/\s+/g, "");
  if (v === "") return null;
  let m: RegExpExecArray | null;
  if ((m = /^(\d{1,3}):([0-5]\d)$/.exec(v))) return Number(m[1]) * 60 + Number(m[2]);
  if ((m = /^(\d{1,4})m(in)?$/.exec(v))) return Number(m[1]);
  if ((m = /^(\d{1,3}(?:\.\d{1,2})?)h?$/.exec(v))) {
    const n = Number(m[1]);
    if (!v.includes(".") && !v.endsWith("h") && n > 12) return n; // "90" → minutes
    return Math.round(n * 60);
  }
  return NaN;
}
