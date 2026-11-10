import { z } from "zod";
import { looksLikeAmount, minorToInput, parseMoneyInput } from "@/lib/money";
import type { Tables } from "@/lib/supabase/database.types";
import {
  BILLING_TYPE_VALUES,
  PROJECT_STATUS_VALUES,
  minutesToHoursInput,
  parseHoursInput,
} from "./constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v));

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), {
    message: "Enter a valid date.",
  })
  .transform((v) => (v === "" ? null : v));

const INT4_MAX = 2_147_483_647;
const AMOUNT_MESSAGE = "Enter an amount like 120 or 120.50.";
const HOURS_MESSAGE = "Enter hours like 20 or 12.5.";

/**
 * Validates the project form (raw FormData strings) and converts it to a DB row.
 * Only the money field that matches the billing type is kept.
 */
export const projectFormSchema = z
  .object({
    client_id: z.uuid("Pick a client."),
    name: z.string().trim().min(1, "Enter a project name.").max(200, "Keep this under 200 characters."),
    description: optionalText(10_000),
    status: z.enum(PROJECT_STATUS_VALUES, "Pick a status."),
    billing_type: z.enum(BILLING_TYPE_VALUES, "Pick a billing type."),
    currency: z.string().regex(/^[A-Z]{3}$/, "Pick a currency."),
    // Shape-checked here so they're reported alongside other field errors;
    // currency-specific rules run in the transform below.
    hourly_rate: z.string().refine(looksLikeAmount, AMOUNT_MESSAGE),
    fixed_fee: z.string().refine(looksLikeAmount, AMOUNT_MESSAGE),
    budget_hours: z
      .string()
      .refine((v) => v.trim() === "" || /^\d{1,5}(\.\d{1,2})?$/.test(v.trim()), HOURS_MESSAGE),
    start_date: optionalDate,
    due_date: optionalDate,
  })
  .transform(({ hourly_rate, fixed_fee, budget_hours, ...rest }, ctx) => {
    const money = (input: string, path: string) => {
      const minor = parseMoneyInput(input, rest.currency);
      if (Number.isNaN(minor) || (minor !== null && minor > INT4_MAX)) {
        ctx.addIssue({ code: "custom", path: [path], message: AMOUNT_MESSAGE });
        return null;
      }
      return minor;
    };

    let hourly_rate_minor: number | null = null;
    let fixed_fee_minor: number | null = null;
    if (rest.billing_type === "hourly") hourly_rate_minor = money(hourly_rate, "hourly_rate");
    if (rest.billing_type === "fixed") {
      fixed_fee_minor = money(fixed_fee, "fixed_fee");
      if (fixed_fee_minor === null && !ctx.issues.some((i) => i.path?.[0] === "fixed_fee")) {
        ctx.addIssue({ code: "custom", path: ["fixed_fee"], message: "Enter the fixed fee." });
      }
    }

    const budget_minutes = parseHoursInput(budget_hours);
    if (Number.isNaN(budget_minutes) || budget_minutes === 0) {
      ctx.addIssue({ code: "custom", path: ["budget_hours"], message: HOURS_MESSAGE });
    }

    if (rest.start_date && rest.due_date && rest.due_date < rest.start_date) {
      ctx.addIssue({ code: "custom", path: ["due_date"], message: "Due date can't be before the start date." });
    }

    if (ctx.issues.length > 0) return z.NEVER;
    return { ...rest, hourly_rate_minor, fixed_fee_minor, budget_minutes };
  });

export type ProjectFormField = keyof z.input<typeof projectFormSchema>;

export const PROJECT_FORM_FIELDS = [
  "client_id",
  "name",
  "description",
  "status",
  "billing_type",
  "currency",
  "hourly_rate",
  "fixed_fee",
  "budget_hours",
  "start_date",
  "due_date",
] as const satisfies readonly ProjectFormField[];

export function projectToFormValues(p: Tables<"projects">): Record<ProjectFormField, string> {
  return {
    client_id: p.client_id,
    name: p.name,
    description: p.description ?? "",
    status: p.status,
    billing_type: p.billing_type,
    currency: p.currency,
    hourly_rate: minorToInput(p.hourly_rate_minor, p.currency),
    fixed_fee: minorToInput(p.fixed_fee_minor, p.currency),
    budget_hours: minutesToHoursInput(p.budget_minutes),
    start_date: p.start_date ?? "",
    due_date: p.due_date ?? "",
  };
}
