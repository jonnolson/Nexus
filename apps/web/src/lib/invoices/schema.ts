import { z } from "zod";
import { isDateString } from "@/lib/dates";
import { looksLikeAmount, parseMoneyInput } from "@/lib/money";
import { TAX_OPTIONS, type TaxKey } from "./constants";

const AMOUNT_MESSAGE = "Enter an amount like 120 or 120.50.";
const INT4_MAX = 2_147_483_647;

/** Line editor: description × quantity × unit price (in the invoice's currency). */
export const lineSchema = (currency: string) =>
  z
    .object({
      description: z.string().trim().min(1, "Describe the line.").max(500, "Keep this under 500 characters."),
      quantity: z
        .string()
        .trim()
        .regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter a quantity like 1 or 12.5.")
        .refine((v) => Number(v) > 0, "Quantity must be more than 0."),
      unit_price: z.string().trim().min(1, "Enter a price.").refine(looksLikeAmount, AMOUNT_MESSAGE),
    })
    .transform(({ quantity, unit_price, ...rest }, ctx) => {
      const minor = parseMoneyInput(unit_price, currency);
      if (minor === null || Number.isNaN(minor) || minor > INT4_MAX) {
        ctx.addIssue({ code: "custom", path: ["unit_price"], message: AMOUNT_MESSAGE });
        return z.NEVER;
      }
      if (Math.round(Number(quantity) * minor) > INT4_MAX) {
        ctx.addIssue({ code: "custom", path: ["quantity"], message: "That line total is too large." });
        return z.NEVER;
      }
      return { ...rest, quantity: Number(quantity), unit_price_minor: minor };
    });

export type LineField = "description" | "quantity" | "unit_price";

/** Draft header: dates, tax, notes. */
export const invoiceDetailsSchema = z
  .object({
    issue_date: z.string().refine(isDateString, "Enter a valid date."),
    due_date: z.string().refine(isDateString, "Enter a valid date."),
    tax: z.enum(TAX_OPTIONS.map((o) => o.key) as [TaxKey, ...TaxKey[]], "Pick a tax option."),
    notes: z
      .string()
      .trim()
      .max(5000, "Keep notes under 5,000 characters.")
      .transform((v) => (v === "" ? null : v)),
  })
  .superRefine((v, ctx) => {
    if (v.due_date < v.issue_date) {
      ctx.addIssue({ code: "custom", path: ["due_date"], message: "Due date can't be before the issue date." });
    }
  })
  .transform(({ tax, ...rest }) => {
    const option = TAX_OPTIONS.find((o) => o.key === tax)!;
    return { ...rest, tax_name: option.name, tax_rate_bps: option.rateBps };
  });

export type DetailsField = "issue_date" | "due_date" | "tax" | "notes";

/** New invoice: client + date + which unbilled groups / fixed fees to include. */
export const newInvoiceSchema = z.object({
  client_id: z.uuid("Pick a client."),
  issue_date: z.string().refine(isDateString, "Enter a valid date."),
  groups: z.array(z.string().max(64)).max(200),
  fixed: z.array(z.uuid()).max(200),
});
