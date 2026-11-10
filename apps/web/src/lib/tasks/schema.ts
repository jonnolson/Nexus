import { z } from "zod";
import { minutesToHoursInput, parseHoursInput } from "@/lib/projects/constants";
import type { Tables } from "@/lib/supabase/database.types";
import { TASK_STATUS_VALUES } from "./constants";

const HOURS_MESSAGE = "Enter hours like 2 or 1.5.";

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), {
    message: "Enter a valid date.",
  })
  .transform((v) => (v === "" ? null : v));

/** "" → null (standalone task), otherwise a project id. */
const optionalProjectId = z
  .string()
  .trim()
  .refine((v) => v === "" || z.uuid().safeParse(v).success, "Pick a project.")
  .transform((v) => (v === "" ? null : v));

const title = z.string().trim().min(1, "Enter a task.").max(300, "Keep this under 300 characters.");
const priority = z.coerce.number().int().min(1).max(3);

/** Quick add: just a title, plus optional project / due date / priority. */
export const quickTaskSchema = z.object({
  title,
  project_id: optionalProjectId,
  due_date: optionalDate,
  priority: priority.default(2),
});

/** Full edit form. */
export const taskFormSchema = z
  .object({
    title,
    notes: z
      .string()
      .trim()
      .max(10_000, "Keep this under 10,000 characters.")
      .transform((v) => (v === "" ? null : v)),
    project_id: optionalProjectId,
    status: z.enum(TASK_STATUS_VALUES, "Pick a status."),
    priority,
    due_date: optionalDate,
    estimate_hours: z
      .string()
      .refine((v) => v.trim() === "" || /^\d{1,4}(\.\d{1,2})?$/.test(v.trim()), HOURS_MESSAGE),
  })
  .transform(({ estimate_hours, ...rest }, ctx) => {
    const estimate_minutes = parseHoursInput(estimate_hours);
    if (estimate_minutes === 0) {
      ctx.addIssue({ code: "custom", path: ["estimate_hours"], message: HOURS_MESSAGE });
      return z.NEVER;
    }
    return { ...rest, estimate_minutes };
  });

export type TaskFormField = keyof z.input<typeof taskFormSchema>;

export const TASK_FORM_FIELDS = [
  "title",
  "notes",
  "project_id",
  "status",
  "priority",
  "due_date",
  "estimate_hours",
] as const satisfies readonly TaskFormField[];

export function taskToFormValues(t: Tables<"tasks">): Record<TaskFormField, string> {
  return {
    title: t.title,
    notes: t.notes ?? "",
    project_id: t.project_id ?? "",
    status: t.status,
    priority: String(t.priority),
    due_date: t.due_date ?? "",
    estimate_hours: minutesToHoursInput(t.estimate_minutes),
  };
}
