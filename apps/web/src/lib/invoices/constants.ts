import { PROVINCES, formatRate, salesTaxForClient } from "@/lib/tax/canada";
import { STUDIO_DEFAULTS } from "@/lib/studio";

export const INVOICE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]["value"];

export const INVOICE_VIEWS = [
  { value: "outstanding", label: "Outstanding" },
  { value: "draft", label: "Drafts" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
  { value: "all", label: "All" },
] as const;
export type InvoiceView = (typeof INVOICE_VIEWS)[number]["value"];

export const viewStatuses = (view: InvoiceView): InvoiceStatus[] =>
  view === "outstanding" ? ["sent"] : view === "all" ? ["draft", "sent", "paid", "void"] : [view];

/** Display status: a sent invoice past its due date shows as Overdue. */
export function displayStatus(status: string, dueDate: string, today: string): { label: string; tone: "draft" | "sent" | "overdue" | "paid" | "void" } {
  if (status === "sent" && dueDate < today) return { label: "Overdue", tone: "overdue" };
  const meta = INVOICE_STATUSES.find((s) => s.value === status);
  return { label: meta?.label ?? status, tone: (meta?.value ?? "draft") as "draft" | "sent" | "paid" | "void" };
}

/** Tax choices on an invoice (one line: GST or HST, or none). */
export const TAX_OPTIONS = [
  { key: "none", name: null, rateBps: 0, label: "No tax" },
  { key: "zero", name: "Zero-rated", rateBps: 0, label: "Zero-rated export (0%)" },
  { key: "gst5", name: "GST", rateBps: 500, label: "GST 5%" },
  { key: "hst13", name: "HST", rateBps: 1300, label: "HST 13% (ON)" },
  { key: "hst14", name: "HST", rateBps: 1400, label: "HST 14% (NS)" },
  { key: "hst15", name: "HST", rateBps: 1500, label: "HST 15% (NB, NL, PE)" },
] as const;
export type TaxKey = (typeof TAX_OPTIONS)[number]["key"];

export const taxKeyFor = (name: string | null, rateBps: number): TaxKey =>
  TAX_OPTIONS.find((o) => o.name === name && o.rateBps === rateBps)?.key ?? (rateBps === 0 ? "none" : "gst5");

/**
 * Default tax for a new invoice. Not GST-registered → none. Otherwise by the
 * client's location (place of supply); a Canadian client without a province
 * falls back to the studio's own province.
 */
export function defaultTaxFor(
  client: { country_code: string; region: string | null },
  gstRegistered: boolean,
): { name: string | null; rateBps: number } {
  if (!gstRegistered) return { name: null, rateBps: 0 };
  const tax = salesTaxForClient(client);
  if (tax.kind === "zero-rated") return { name: "Zero-rated", rateBps: 0 };
  if (tax.kind === "taxable") return { name: tax.components[0].name, rateBps: tax.components[0].rateBps };
  const home = PROVINCES.find((p) => p.code === STUDIO_DEFAULTS.province)!;
  return { name: home.tax.name, rateBps: home.tax.rateBps };
}

export const taxLabel = (name: string | null, rateBps: number) =>
  name === null ? null : name === "Zero-rated" ? "Zero-rated (0%)" : `${name} ${formatRate(rateBps)}`;
