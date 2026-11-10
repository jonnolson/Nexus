import { z } from "zod";
import { addDays, isDateString, studioDateTimeToUtc } from "@/lib/dates";
import { parseDurationInput } from "./format";

const optionalId = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || z.uuid().safeParse(v).success, message)
    .transform((v) => (v === "" ? null : v));

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_MINUTES = 24 * 60;

/** Parent links shared by the timer and the entry form. The DB fills in the rest. */
const parents = {
  client_id: optionalId("Pick a client."),
  project_id: optionalId("Pick a project."),
  task_id: optionalId("Pick a task."),
};

const description = z
  .string()
  .trim()
  .max(2000, "Keep this under 2,000 characters.")
  .transform((v) => (v === "" ? null : v));

/** Checkbox: present ("on") = true. */
const checkbox = z.string().transform((v) => v === "on" || v === "true");

export const timerStartSchema = z.object({ description, ...parents, billable: checkbox });

/**
 * Manual / edited entry. Times are wall-clock in the studio's time zone and are
 * converted to UTC here. Give an end time, or a duration. An end time earlier
 * than the start means the entry ran past midnight.
 */
export const entryFormSchema = z
  .object({
    description,
    ...parents,
    billable: checkbox,
    date: z.string().refine(isDateString, "Enter a valid date."),
    start_time: z.string().trim().regex(TIME_RE, "Enter a time like 09:30."),
    end_time: z
      .string()
      .trim()
      .refine((v) => v === "" || TIME_RE.test(v), "Enter a time like 17:00."),
    duration: z
      .string()
      .refine((v) => {
        const n = parseDurationInput(v);
        return n === null || (Number.isFinite(n) && n > 0);
      }, "Enter a duration like 1:30 or 1.5."),
    /** Editing the running timer: an empty end keeps it running. */
    allow_running: checkbox,
  })
  .transform(({ date, start_time, end_time, duration, allow_running, ...rest }, ctx) => {
    const started_at = studioDateTimeToUtc(date, start_time);
    const startMs = Date.parse(started_at);
    let ended_at: string | null = null;

    if (end_time) {
      let endMs = Date.parse(studioDateTimeToUtc(date, end_time));
      if (endMs <= startMs) endMs = Date.parse(studioDateTimeToUtc(addDays(date, 1), end_time));
      ended_at = new Date(endMs).toISOString();
    } else {
      const minutes = parseDurationInput(duration);
      if (minutes) ended_at = new Date(startMs + minutes * 60_000).toISOString();
    }

    if (!ended_at && !allow_running) {
      ctx.addIssue({ code: "custom", path: ["end_time"], message: "Enter an end time or a duration." });
      return z.NEVER;
    }
    if (ended_at && Date.parse(ended_at) - startMs > MAX_MINUTES * 60_000) {
      ctx.addIssue({ code: "custom", path: ["duration"], message: "An entry can't be longer than 24 hours." });
      return z.NEVER;
    }
    if (startMs > Date.now() + 60_000 && !ended_at) {
      ctx.addIssue({ code: "custom", path: ["start_time"], message: "A running timer can't start in the future." });
      return z.NEVER;
    }

    return { ...rest, started_at, ended_at };
  });

/** Where the entry page may send you back to: our own /time, or a client/project/task page. */
export function safeTimeReturnTo(v: unknown): string {
  return typeof v === "string" &&
    /^\/(time|(clients|projects|tasks)\/[0-9a-f-]{36})(\?[\w=&%+.-]*)?$/i.test(v)
    ? v
    : "/time";
}

export type EntryFormField =keyof z.input<typeof entryFormSchema>;

export const ENTRY_FORM_FIELDS = [
  "description",
  "client_id",
  "project_id",
  "task_id",
  "billable",
  "date",
  "start_time",
  "end_time",
  "duration",
  "allow_running",
] as const satisfies readonly EntryFormField[];
