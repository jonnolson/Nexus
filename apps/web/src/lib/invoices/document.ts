import { countryName } from "@/lib/countries";
import type { Tables } from "@/lib/supabase/database.types";
import { taxLabel } from "./constants";

/** Who the invoice is from, frozen into `issuer_snapshot` when sent. */
export type IssuerSnapshot = {
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string[];
  gstNumber: string | null;
  footer: string | null;
};

/** Who it's billed to, frozen into `client_snapshot` when sent. */
export type ClientSnapshot = {
  name: string;
  contact: string | null;
  email: string | null;
  address: string[];
  taxId: string | null;
};

function addressLines(a: {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country_code: string;
}): string[] {
  const cityLine = [a.city, [a.region, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [a.address_line1, a.address_line2, cityLine, countryName(a.country_code)].filter(
    (l): l is string => Boolean(l),
  );
}

export function issuerFromProfile(p: Tables<"profiles">): IssuerSnapshot {
  return {
    name: p.business_name || p.display_name || "Your business",
    contact: p.business_name && p.display_name ? p.display_name : null,
    email: p.business_email,
    phone: p.business_phone,
    address: p.address_line1 || p.city ? addressLines(p) : [],
    gstNumber: p.gst_number,
    footer: p.invoice_footer,
  };
}

export function clientSnapshotFrom(c: Tables<"clients">): ClientSnapshot {
  return {
    name: c.name,
    contact: c.contact_name,
    email: c.email,
    address: c.address_line1 || c.city ? addressLines(c) : [],
    taxId: c.tax_id,
  };
}

/** Everything needed to render an invoice, on screen or as a PDF. */
export type InvoiceDocument = {
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  issuer: IssuerSnapshot;
  client: ClientSnapshot;
  lines: { id: string; description: string; quantity: number; unitPriceMinor: number; amountMinor: number }[];
  subtotalMinor: number;
  taxLabel: string | null;
  taxMinor: number;
  totalMinor: number;
  notes: string | null;
};

/**
 * Drafts show live details (so fixing a client's address shows up immediately);
 * sent invoices always show what was frozen when they were sent.
 */
export function buildDocument(
  invoice: Tables<"invoices">,
  lines: Tables<"invoice_lines">[],
  live: { profile: Tables<"profiles">; client: Tables<"clients"> },
): InvoiceDocument {
  const frozen = invoice.status !== "draft";
  return {
    number: invoice.number,
    status: invoice.status,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    currency: invoice.currency,
    issuer: (frozen && (invoice.issuer_snapshot as IssuerSnapshot | null)) || issuerFromProfile(live.profile),
    client: (frozen && (invoice.client_snapshot as ClientSnapshot | null)) || clientSnapshotFrom(live.client),
    lines: lines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: Number(l.quantity),
      unitPriceMinor: l.unit_price_minor,
      amountMinor: l.amount_minor,
    })),
    subtotalMinor: invoice.subtotal_minor,
    taxLabel: taxLabel(invoice.tax_name, invoice.tax_rate_bps),
    taxMinor: invoice.tax_minor,
    totalMinor: invoice.total_minor,
    notes: invoice.notes,
  };
}

/** 1.5 → "1.5", 2 → "2", 0.25 → "0.25". */
export const formatQuantity = (q: number) => String(Math.round(q * 100) / 100);
