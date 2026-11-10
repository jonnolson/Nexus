import { z } from "zod";
import { isDateString } from "@/lib/dates";
import { looksLikeAmount, minorToInput, parseMoneyInput } from "@/lib/money";
import type { Tables } from "@/lib/supabase/database.types";
import { EXPENSE_CATEGORY_VALUES } from "./categories";

const AMOUNT_MESSAGE = "Enter an amount like 49.99.";
const INT4_MAX = 2_147_483_647;

/** Add / edit an expense. Amount = total paid incl. tax; tax = GST/HST portion (optional). */
export const expenseFormSchema = z
  .object({
    title: z.string().trim().min(1, "What was it?").max(200, "Keep this under 200 characters."),
    amount: z.string().trim().min(1, "Enter the amount.").refine(looksLikeAmount, AMOUNT_MESSAGE),
    tax: z.string().trim().refine(looksLikeAmount, AMOUNT_MESSAGE),
    currency: z.string().regex(/^[A-Z]{3}$/, "Pick a currency."),
    category: z.enum(EXPENSE_CATEGORY_VALUES, "Pick a category."),
    spent_on: z.string().refine(isDateString, "Enter a valid date."),
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

export type ExpenseFormField = "title" | "amount" | "tax" | "currency" | "category" | "spent_on" | "notes";

export function expenseToFormValues(e: Tables<"expenses">): Record<ExpenseFormField, string> {
  return {
    title: e.title,
    amount: minorToInput(e.amount_minor, e.currency),
    tax: e.tax_minor ? minorToInput(e.tax_minor, e.currency) : "",
    currency: e.currency,
    category: e.category,
    spent_on: e.spent_on,
    notes: e.notes ?? "",
  };
}
