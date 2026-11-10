/**
 * Money helpers. Amounts are always integer minor units (cents) + ISO 4217 code;
 * never floats. Decimal places come from Intl, so JPY (0) and KWD (3) work too.
 */

/** Currencies offered in pickers. Any valid ISO code is still accepted by the DB. */
export const CURRENCIES = ["CAD", "USD", "EUR", "GBP", "AUD", "NZD", "CHF", "JPY"] as const;

/** Canadian formatting: "$120.00" for CAD, "US$120.00" for USD, so they're never confused. */
const DEFAULT_LOCALE = "en-CA";

export function currencyDecimals(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
}

/** Formats minor units for display, e.g. (12050, "USD") → "$120.50". */
export function formatMoney(minor: number, currency: string, locale = DEFAULT_LOCALE): string {
  const decimals = currencyDecimals(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(minor / 10 ** decimals);
}

/** Minor units → plain decimal string for form inputs, e.g. 12050 → "120.50". */
export function minorToInput(minor: number | null | undefined, currency: string): string {
  if (minor == null) return "";
  const decimals = currencyDecimals(currency);
  return (minor / 10 ** decimals).toFixed(decimals);
}

/**
 * Cheap, currency-independent shape check for an amount field ("", "120", "1,250.50").
 * Lets forms flag obviously bad input alongside other field errors; the exact
 * decimal rules for the chosen currency are still applied by parseMoneyInput.
 */
export const looksLikeAmount = (input: string) => /^\s*(\d[\d,\s]*)?(\.\d*)?\s*$/.test(input);

/**
 * Parses user input ("120", "120.5", "1,250.00") into minor units without float math.
 * Returns null for empty input, NaN for anything invalid or with too many decimals.
 */
export function parseMoneyInput(input: string, currency: string): number | null {
  const cleaned = input.replace(/[\s,]/g, "");
  if (cleaned === "") return null;

  const decimals = currencyDecimals(currency);
  const match = /^(\d{1,9})(?:\.(\d*))?$/.exec(cleaned);
  if (!match) return NaN;

  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) return NaN;

  return Number(whole) * 10 ** decimals + Number(fraction.padEnd(decimals, "0") || "0");
}
