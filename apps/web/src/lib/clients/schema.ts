import { z } from "zod";
import { isCountryCode } from "@/lib/countries";
import { looksLikeAmount, minorToInput, parseMoneyInput } from "@/lib/money";
import { STUDIO_DEFAULTS } from "@/lib/studio";
import type { Tables } from "@/lib/supabase/database.types";
import { PROVINCE_CODES } from "@/lib/tax/canada";

/** Trimmed optional text: "" → null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v));

const INT4_MAX = 2_147_483_647;
const AMOUNT_MESSAGE = "Enter an amount like 120 or 120.50.";

/**
 * Validates the client form (raw strings from FormData) and converts it to a DB row.
 * Shared by the create and update Server Actions.
 */
export const clientFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(200, "Keep this under 200 characters."),
    contact_name: optionalText(200),
    email: optionalText(320).refine((v) => v === null || z.email().safeParse(v).success, {
      message: "Enter a valid email address.",
    }),
    phone: optionalText(50),
    website: optionalText(500),
    address_line1: optionalText(200),
    address_line2: optionalText(200),
    city: optionalText(100),
    region: optionalText(100),
    postal_code: optionalText(20),
    country_code: z.string().refine(isCountryCode, "Pick a country."),
    tax_id: optionalText(50),
    currency: z.string().regex(/^[A-Z]{3}$/, "Pick a currency."),
    default_rate: z.string().trim().refine(looksLikeAmount, AMOUNT_MESSAGE),
    notes: optionalText(10_000),
  })
  .transform(({ default_rate, ...rest }, ctx) => {
    // GST/HST depends on the client's province, so Canadian clients need a real one.
    if (rest.country_code === "CA" && rest.region !== null) {
      if (!(PROVINCE_CODES as string[]).includes(rest.region)) {
        ctx.addIssue({ code: "custom", path: ["region"], message: "Pick a province or territory." });
      }
    }
    if (rest.country_code === "CA" && rest.postal_code) {
      rest.postal_code = rest.postal_code.toUpperCase();
    }

    const minor = parseMoneyInput(default_rate, rest.currency);
    if (Number.isNaN(minor) || (minor !== null && minor > INT4_MAX)) {
      ctx.addIssue({ code: "custom", path: ["default_rate"], message: AMOUNT_MESSAGE });
    }

    if (ctx.issues.length > 0) return z.NEVER;
    return { ...rest, default_rate_minor: minor };
  });

export type ClientInput = z.output<typeof clientFormSchema>;
export type ClientFormField = keyof z.input<typeof clientFormSchema>;

export const CLIENT_FORM_FIELDS = [
  "name",
  "contact_name",
  "email",
  "phone",
  "website",
  "address_line1",
  "address_line2",
  "city",
  "region",
  "postal_code",
  "country_code",
  "tax_id",
  "currency",
  "default_rate",
  "notes",
] as const satisfies readonly ClientFormField[];

/** Starting values for a brand-new client: CAD, $120/h, Canada. */
export const NEW_CLIENT_DEFAULTS: Partial<Record<ClientFormField, string>> = {
  country_code: STUDIO_DEFAULTS.country,
  currency: STUDIO_DEFAULTS.currency,
  default_rate: minorToInput(STUDIO_DEFAULTS.hourlyRateMinor, STUDIO_DEFAULTS.currency),
};

/** A saved client → the string values the form expects. */
export function clientToFormValues(client: Tables<"clients">): Record<ClientFormField, string> {
  const { default_rate_minor, currency } = client;
  const values = Object.fromEntries(
    CLIENT_FORM_FIELDS.map((f) => [f, f in client ? String(client[f as keyof typeof client] ?? "") : ""]),
  ) as Record<ClientFormField, string>;
  values.default_rate = minorToInput(default_rate_minor, currency);
  return values;
}
