import "server-only";

import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { studioDateOf } from "@/lib/dates";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { entryRate, type TimeEntry } from "@/lib/time/data";
import { entryMinutes } from "@/lib/time/format";

export type IncomeEntry = Tables<"income_entries"> & { client: { id: string; name: string } | null };

/** One payment received: a paid invoice or a manual income entry. */
export type IncomeItem = {
  key: string;
  kind: "invoice" | "manual";
  /** Studio date (YYYY-MM-DD) the money came in. */
  date: string;
  title: string;
  clientName: string | null;
  currency: string;
  /** Total received, tax included. */
  totalMinor: number;
  /** GST/HST portion (collected tax). */
  taxMinor: number;
  /** Income before tax. */
  netMinor: number;
  href: string;
};

const ENTRY_SELECT = "*, client:clients!income_entries_client_same_owner(id, name)" as const;

export async function getIncomeEntry(id: string): Promise<IncomeEntry> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("income_entries").select(ENTRY_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load income: ${error.message}`);
  if (!data) notFound();
  return data as unknown as IncomeEntry;
}

/** Every payment received (paid invoices + manual entries), newest first. */
export async function listIncome(): Promise<IncomeItem[]> {
  await requireUser();
  const supabase = await createClient();
  const [invoices, entries] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, number, currency, subtotal_minor, tax_minor, total_minor, paid_at, issue_date, client:clients!invoices_client_same_owner(name)")
      .eq("status", "paid")
      .limit(10000),
    supabase.from("income_entries").select(ENTRY_SELECT).limit(10000),
  ]);
  if (invoices.error) throw new Error(`Couldn't load paid invoices: ${invoices.error.message}`);
  if (entries.error) throw new Error(`Couldn't load income: ${entries.error.message}`);

  type PaidRow = {
    id: string; number: string; currency: string; subtotal_minor: number; tax_minor: number;
    total_minor: number; paid_at: string | null; issue_date: string; client: { name: string } | null;
  };
  const items: IncomeItem[] = [
    ...(invoices.data as unknown as PaidRow[]).map((i) => ({
      key: `invoice:${i.id}`,
      kind: "invoice" as const,
      date: i.paid_at ? studioDateOf(i.paid_at) : i.issue_date,
      title: `Invoice ${i.number}`,
      clientName: i.client?.name ?? null,
      currency: i.currency,
      totalMinor: i.total_minor,
      taxMinor: i.tax_minor,
      netMinor: i.subtotal_minor,
      href: `/invoices/${i.id}`,
    })),
    ...(entries.data as unknown as IncomeEntry[]).map((e) => ({
      key: `manual:${e.id}`,
      kind: "manual" as const,
      date: e.received_on,
      title: e.title,
      clientName: e.client?.name ?? null,
      currency: e.currency,
      totalMinor: e.amount_minor,
      taxMinor: e.tax_minor,
      netMinor: e.amount_minor - e.tax_minor,
      href: `/income/${e.id}`,
    })),
  ];
  return items.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date < b.date ? 1 : -1));
}

/** Money not yet received, by source. Amounts are per currency (minor units). */
export type PendingIncome = {
  sent: { count: number; overdue: number; byCurrency: Record<string, number> };
  drafts: { count: number; byCurrency: Record<string, number> };
  unbilledTime: { minutes: number; unratedMinutes: number; byCurrency: Record<string, number> };
  fixedFees: { count: number; byCurrency: Record<string, number> };
  total: Record<string, number>;
};

const add = (acc: Record<string, number>, currency: string, minor: number) => {
  acc[currency] = (acc[currency] ?? 0) + minor;
};

/**
 * Income that's on its way: sent-but-unpaid invoices, drafts, billable time not yet
 * invoiced (valued at its effective rate; time on fixed-fee projects is covered by the
 * fee), and the uninvoiced remainder of fixed fees on projects that aren't cancelled.
 */
export async function pendingIncome(today: string): Promise<PendingIncome> {
  await requireUser();
  const supabase = await createClient();
  const [open, time, fixed] = await Promise.all([
    supabase.from("invoices").select("status, currency, total_minor, due_date").in("status", ["sent", "draft"]).limit(5000),
    supabase
      .from("time_entries")
      .select(
        "*, client:clients!time_entries_client_same_owner(id, name, currency, default_rate_minor), project:projects!time_entries_project_same_owner(id, name, billing_type, hourly_rate_minor, currency)",
      )
      .eq("billable", true)
      .not("ended_at", "is", null)
      .is("invoice_line_id", null)
      .limit(20000),
    supabase
      .from("projects")
      .select("fixed_fee_minor, currency, lines:invoice_lines(amount_minor, invoice:invoices!invoice_lines_invoice_same_owner(status))")
      .eq("billing_type", "fixed")
      .neq("status", "cancelled"),
  ]);
  for (const r of [open, time, fixed]) if (r.error) throw new Error(`Couldn't load pending income: ${r.error.message}`);

  const result: PendingIncome = {
    sent: { count: 0, overdue: 0, byCurrency: {} },
    drafts: { count: 0, byCurrency: {} },
    unbilledTime: { minutes: 0, unratedMinutes: 0, byCurrency: {} },
    fixedFees: { count: 0, byCurrency: {} },
    total: {},
  };

  for (const i of open.data ?? []) {
    if (i.status === "sent") {
      result.sent.count++;
      if (i.due_date < today) result.sent.overdue++;
      add(result.sent.byCurrency, i.currency, i.total_minor);
    } else {
      result.drafts.count++;
      add(result.drafts.byCurrency, i.currency, i.total_minor);
    }
    add(result.total, i.currency, i.total_minor);
  }

  for (const e of (time.data ?? []) as unknown as TimeEntry[]) {
    if (e.project && e.project.billing_type !== "hourly") continue;
    const minutes = entryMinutes(e.started_at, e.ended_at);
    result.unbilledTime.minutes += minutes;
    const rate = entryRate(e);
    if (!rate) {
      result.unbilledTime.unratedMinutes += minutes;
      continue;
    }
    const value = Math.round((minutes * rate.minor) / 60);
    add(result.unbilledTime.byCurrency, rate.currency, value);
    add(result.total, rate.currency, value);
  }

  type FixedRow = { fixed_fee_minor: number | null; currency: string; lines: { amount_minor: number; invoice: { status: string } | null }[] };
  for (const p of (fixed.data ?? []) as unknown as FixedRow[]) {
    if (p.fixed_fee_minor == null) continue;
    const invoiced = p.lines.filter((l) => l.invoice && l.invoice.status !== "void").reduce((s, l) => s + l.amount_minor, 0);
    const remaining = p.fixed_fee_minor - invoiced;
    if (remaining <= 0) continue;
    result.fixedFees.count++;
    add(result.fixedFees.byCurrency, p.currency, remaining);
    add(result.total, p.currency, remaining);
  }

  return result;
}
