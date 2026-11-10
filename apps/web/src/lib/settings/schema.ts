import { z } from "zod";
import { isCountryCode } from "@/lib/countries";
import type { Tables } from "@/lib/supabase/database.types";
import { PROVINCE_CODES } from "@/lib/tax/canada";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v));

/** Business details printed on invoices, plus invoicing defaults. */
export const settingsSchema = z
  .object({
    business_name: optionalText(200),
    display_name: optionalText(200),
    business_email: optionalText(320).refine((v) => v === null || z.email().safeParse(v).success, {
      message: "Enter a valid email address.",
    }),
    business_phone: optionalText(50),
    address_line1: optionalText(200),
    address_line2: optionalText(200),
    city: optionalText(100),
    region: optionalText(100),
    postal_code: optionalText(20),
    country_code: z.string().refine(isCountryCode, "Pick a country."),
    gst_number: optionalText(30),
    invoice_prefix: z.string().trim().max(20, "Keep the prefix under 20 characters."),
    next_invoice_number: z.coerce
      .number({ error: "Enter a whole number." })
      .int("Enter a whole number.")
      .min(1, "Must be 1 or more.")
      .max(999_999, "That's too large."),
    payment_terms_days: z.coerce
      .number({ error: "Enter a number of days." })
      .int("Enter a whole number of days.")
      .min(0, "Can't be negative.")
      .max(365, "Keep it within a year."),
    invoice_footer: optionalText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.country_code === "CA" && v.region && !(PROVINCE_CODES as string[]).includes(v.region)) {
      ctx.addIssue({ code: "custom", path: ["region"], message: "Pick a province or territory." });
    }
  })
  .transform((v) => ({
    ...v,
    postal_code: v.country_code === "CA" && v.postal_code ? v.postal_code.toUpperCase() : v.postal_code,
  }));

export type SettingsField = keyof z.input<typeof settingsSchema>;

export const SETTINGS_FIELDS = [
  "business_name",
  "display_name",
  "business_email",
  "business_phone",
  "address_line1",
  "address_line2",
  "city",
  "region",
  "postal_code",
  "country_code",
  "gst_number",
  "invoice_prefix",
  "next_invoice_number",
  "payment_terms_days",
  "invoice_footer",
] as const satisfies readonly SettingsField[];

export function profileToFormValues(p: Tables<"profiles">): Record<SettingsField, string> {
  return Object.fromEntries(
    SETTINGS_FIELDS.map((f) => [f, p[f as keyof typeof p] == null ? "" : String(p[f as keyof typeof p])]),
  ) as Record<SettingsField, string>;
}
