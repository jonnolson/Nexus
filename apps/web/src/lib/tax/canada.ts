/**
 * Canadian sales tax (GST/HST) for a BC-based supplier of services.
 *
 * Place of supply: for services, GST/HST follows the CLIENT's province, not the
 * supplier's. Services to clients outside Canada are generally zero-rated exports.
 *
 * Rates are integer basis points (500 = 5%), never floats. When a rate changes,
 * update it here only. Invoices snapshot the rate at send time, so history is safe.
 *
 * Last reviewed: 2026-11. Not tax advice; confirm with CRA / an accountant.
 * Notable change: Nova Scotia HST 15% → 14% on 2025-04-01.
 */

export type TaxComponent = { name: "GST" | "HST"; rateBps: number };

export const PROVINCES = [
  { code: "AB", name: "Alberta", tax: { name: "GST", rateBps: 500 } },
  { code: "BC", name: "British Columbia", tax: { name: "GST", rateBps: 500 } },
  { code: "MB", name: "Manitoba", tax: { name: "GST", rateBps: 500 } },
  { code: "NB", name: "New Brunswick", tax: { name: "HST", rateBps: 1500 } },
  { code: "NL", name: "Newfoundland and Labrador", tax: { name: "HST", rateBps: 1500 } },
  { code: "NS", name: "Nova Scotia", tax: { name: "HST", rateBps: 1400 } },
  { code: "NT", name: "Northwest Territories", tax: { name: "GST", rateBps: 500 } },
  { code: "NU", name: "Nunavut", tax: { name: "GST", rateBps: 500 } },
  { code: "ON", name: "Ontario", tax: { name: "HST", rateBps: 1300 } },
  { code: "PE", name: "Prince Edward Island", tax: { name: "HST", rateBps: 1500 } },
  { code: "QC", name: "Quebec", tax: { name: "GST", rateBps: 500 } },
  { code: "SK", name: "Saskatchewan", tax: { name: "GST", rateBps: 500 } },
  { code: "YT", name: "Yukon", tax: { name: "GST", rateBps: 500 } },
] as const satisfies readonly { code: string; name: string; tax: TaxComponent }[];

export type ProvinceCode = (typeof PROVINCES)[number]["code"];

export const PROVINCE_CODES = PROVINCES.map((p) => p.code) as ProvinceCode[];

/** For select inputs: { value: "BC", label: "British Columbia" }. */
export const PROVINCE_OPTIONS = PROVINCES.map((p) => ({ value: p.code, label: p.name }));

export const provinceName =(code: string | null | undefined) =>
  PROVINCES.find((p) => p.code === code)?.name ?? null;

export const formatRate = (bps: number) => `${(bps / 100).toString()}%`;

export type SalesTax =
  | { kind: "taxable"; components: TaxComponent[]; label: string; notes: string[] }
  | { kind: "zero-rated"; components: []; label: string; notes: string[] }
  | { kind: "unknown"; components: []; label: string; notes: string[] };

/** Which sales tax a BC supplier charges this client on services. */
export function salesTaxForClient(client: {
  country_code: string;
  region: string | null;
}): SalesTax {
  if (client.country_code !== "CA") {
    return {
      kind: "zero-rated",
      components: [],
      label: "0%: zero-rated export",
      notes: ["Services to non-resident clients are generally zero-rated."],
    };
  }

  const province = PROVINCES.find((p) => p.code === client.region);
  if (!province) {
    return {
      kind: "unknown",
      components: [],
      label: "Set a province to work out GST/HST",
      notes: [],
    };
  }

  const notes: string[] = [];
  if (province.code === "BC") {
    notes.push("BC PST (7%) may also apply to some software/IT services; design work is generally exempt.");
  }
  if (province.code === "QC") {
    notes.push("QST is only charged if you're registered for it.");
  }

  return {
    kind: "taxable",
    components: [province.tax],
    label: `${province.tax.name} ${formatRate(province.tax.rateBps)}`,
    notes,
  };
}

/** Tax on an amount in minor units, rounded half-up to the cent. */
export function taxOnMinor(amountMinor: number, rateBps: number): number {
  return Math.round((amountMinor * rateBps) / 10_000);
}
