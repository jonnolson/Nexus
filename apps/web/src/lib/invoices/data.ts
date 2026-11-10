import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { studioDateOf } from "@/lib/dates";
import { entryMinutes } from "@/lib/time/format";
import { entryRate, type TimeEntry } from "@/lib/time/data";
import { viewStatuses, type InvoiceView } from "./constants";

export type Invoice = Tables<"invoices"> & { client: Pick<Tables<"clients">, "id" | "name"> };
export type InvoiceWithLines = Tables<"invoices"> & {
  client: Tables<"clients">;
  lines: Tables<"invoice_lines">[];
};

const LIST_SELECT = "*, client:clients!invoices_client_same_owner(id, name)" as const;

export async function listInvoices({
  view = "outstanding",
  clientId,
}: { view?: InvoiceView; clientId?: string } = {}): Promise<Invoice[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select(LIST_SELECT)
    .in("status", viewStatuses(view))
    .order("issue_date", { ascending: false })
    .order("number", { ascending: false })
    .limit(500);
  if (clientId && z.uuid().safeParse(clientId).success) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load invoices: ${error.message}`);
  return data as unknown as Invoice[];
}

export async function getInvoice(id: string): Promise<InvoiceWithLines> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, client:clients!invoices_client_same_owner(*), lines:invoice_lines(*)")
    .eq("id", id)
    .order("position", { referencedTable: "invoice_lines", ascending: true })
    .order("created_at", { referencedTable: "invoice_lines", ascending: true })
    .maybeSingle();
  if (error) throw new Error(`Couldn't load invoice: ${error.message}`);
  if (!data) notFound();
  return data as unknown as InvoiceWithLines;
}

/** How many time entries each line bills. */
export async function countEntriesByLine(lineIds: string[]): Promise<Record<string, number>> {
  await requireUser();
  if (lineIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.from("time_entries").select("invoice_line_id").in("invoice_line_id", lineIds);
  if (error) throw new Error(`Couldn't load billed time: ${error.message}`);
  const counts: Record<string, number> = {};
  for (const r of data) if (r.invoice_line_id) counts[r.invoice_line_id] = (counts[r.invoice_line_id] ?? 0) + 1;
  return counts;
}

// ---------------------------------------------------------------------------
// Unbilled work for a client
// ---------------------------------------------------------------------------

export type UnbilledGroup = {
  /** Project id, or "general" for client-level time with no project. */
  key: string;
  projectId: string | null;
  label: string;
  entryIds: string[];
  minutes: number;
  /** Hourly rate in the group's currency; null = no rate set. */
  rateMinor: number | null;
  currency: string;
  /** First / last day worked (studio dates), for the line description. */
  from: string;
  to: string;
};

export type FixedFeeOption = {
  projectId: string;
  name: string;
  feeMinor: number;
  currency: string;
  /** Already billed on non-void invoices. */
  invoicedMinor: number;
};

export async function getUnbilledForClient(clientId: string): Promise<{
  groups: UnbilledGroup[];
  fixedFees: FixedFeeOption[];
}> {
  await requireUser();
  if (!z.uuid().safeParse(clientId).success) return { groups: [], fixedFees: [] };
  const supabase = await createClient();

  const [entriesRes, fixedRes] = await Promise.all([
    supabase
      .from("time_entries")
      .select(
        "*, client:clients!time_entries_client_same_owner(id, name, currency, default_rate_minor), project:projects!time_entries_project_same_owner(id, name, billing_type, hourly_rate_minor, currency), task:tasks!time_entries_task_same_owner(id, title)",
      )
      .eq("client_id", clientId)
      .eq("billable", true)
      .not("ended_at", "is", null)
      .is("invoice_line_id", null)
      .order("started_at", { ascending: true })
      .limit(5000),
    supabase
      .from("projects")
      .select("id, name, fixed_fee_minor, currency, lines:invoice_lines(amount_minor, invoice:invoices!invoice_lines_invoice_same_owner(status))")
      .eq("client_id", clientId)
      .eq("billing_type", "fixed")
      .neq("status", "cancelled")
      .order("name"),
  ]);
  if (entriesRes.error) throw new Error(`Couldn't load unbilled time: ${entriesRes.error.message}`);
  if (fixedRes.error) throw new Error(`Couldn't load projects: ${fixedRes.error.message}`);

  const groups = new Map<string, UnbilledGroup>();
  for (const e of entriesRes.data as unknown as TimeEntry[]) {
    // Time on fixed-fee projects is covered by the fee, not billed hourly.
    if (e.project && e.project.billing_type !== "hourly") continue;
    const key = e.project?.id ?? "general";
    const rate = entryRate(e);
    const g =
      groups.get(key) ??
      ({
        key,
        projectId: e.project?.id ?? null,
        label: e.project?.name ?? "General",
        entryIds: [],
        minutes: 0,
        rateMinor: rate?.minor ?? null,
        currency: rate?.currency ?? e.project?.currency ?? e.client?.currency ?? "CAD",
        from: studioDateOf(e.started_at),
        to: studioDateOf(e.started_at),
      } satisfies UnbilledGroup);
    g.entryIds.push(e.id);
    g.minutes += entryMinutes(e.started_at, e.ended_at);
    const day = studioDateOf(e.started_at);
    if (day < g.from) g.from = day;
    if (day > g.to) g.to = day;
    groups.set(key, g);
  }

  type FixedRow = {
    id: string;
    name: string;
    fixed_fee_minor: number | null;
    currency: string;
    lines: { amount_minor: number; invoice: { status: string } | null }[];
  };
  const fixedFees = (fixedRes.data as unknown as FixedRow[])
    .filter((p) => p.fixed_fee_minor != null)
    .map((p) => ({
      projectId: p.id,
      name: p.name,
      feeMinor: p.fixed_fee_minor!,
      currency: p.currency,
      invoicedMinor: p.lines
        .filter((l) => l.invoice && l.invoice.status !== "void")
        .reduce((s, l) => s + l.amount_minor, 0),
    }));

  return { groups: [...groups.values()], fixedFees };
}

/** Unbilled billable minutes + value per client (for the client page / new invoice picker). */
export async function unbilledSummaryForClient(clientId: string) {
  const { groups } = await getUnbilledForClient(clientId);
  const minutes = groups.reduce((s, g) => s + g.minutes, 0);
  const value: Record<string, number> = {};
  for (const g of groups) {
    if (g.rateMinor != null) value[g.currency] = (value[g.currency] ?? 0) + Math.round((g.minutes * g.rateMinor) / 60);
  }
  return { minutes, value };
}

/** Line quantity for a group: hours to 2 decimals. */
export const hoursQuantity = (minutes: number) => Math.round((minutes / 60) * 100) / 100;
