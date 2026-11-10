import { z } from "zod";
import { isDateString } from "@/lib/dates";
import { looksLikeAmount, minorToInput, parseMoneyInput } from "@/lib/money";
import type { Tables } from "@/lib/supabase/database.types";

const AMOUNT_MESSAGE = "Enter an amount like 1,250.00.";
const INT4_MAX = 2_147_483_647;

/** Record / edit manual income. Amount = total received incl. tax; tax = GST/HST portion (optional). */
export const incomeFormSchema = z
  .object({
    title: z.string().trim().min(1, "What was it for?").max(200, "Keep this under 200 characters."),
    amount: z.string().trim().min(1, "Enter the amount.").refine(looksLikeAmount, AMOUNT_MESSAGE),
    tax: z.string().trim().refine(looksLikeAmount, AMOUNT_MESSAGE),
    currency: z.string().regex(/^[A-Z]{3}$/, "Pick a currency."),
    received_on: z.string().refine(isDateString, "Enter a valid date."),
    client_id: z
      .string()
      .refine((v) => v === "" || z.uuid().safeParse(v).success, "Pick a client.")
      .transform((v) => (v === "" ? null : v)),
    notes: z
      .string()
      .trim()
      .max(2000, "Keep notes under 2,000 characters.")
      .transform((v) => (v === "" ? null : v)),
  })
  .transform(({ amount, tax, ...rest }, ctx) => {
    const amount_minor = parseMoneyInput(amount, rest.currency);
    const tax_minor = parseMoneyInput(tax, rest.currency) ?? 0;
    if (amount_minor === null || Number.isNaN(amount_minor) || amount_minor <= 0 || amount_minor > INT4_MAX) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: AMOUNT_MESSAGE });
    }
    if (Number.isNaN(tax_minor)) {
      ctx.addIssue({ code: "custom", path: ["tax"], message: AMOUNT_MESSAGE });
    } else if (amount_minor && tax_minor > amount_minor) {
      ctx.addIssue({ code: "custom", path: ["tax"], message: "Tax can't be more than the total." });
    }
    if (ctx.issues.length > 0) return z.NEVER;
    return { ...rest, amount_minor: amount_minor!, tax_minor };
  });

export type IncomeFormField = "title" | "amount" | "tax" | "currency" | "received_on" | "client_id" | "notes";
export const INCOME_FORM_FIELDS: IncomeFormField[] = ["title", "amount", "tax", "currency", "received_on", "client_id", "notes"];

export function incomeToFormValues(e: Tables<"income_entries">): Record<IncomeFormField, string> {
  return {
    title: e.title,
    amount: minorToInput(e.amount_minor, e.currency),
    tax: e.tax_minor ? minorToInput(e.tax_minor, e.currency) : "",
    currency: e.currency,
    received_on: e.received_on,
    client_id: e.client_id ?? "",
    notes: e.notes ?? "",
  };
}
