import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toSearchPattern } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Expense = Tables<"expenses">;

export async function listExpenses({
  year,
  category,
  q = "",
}: {
  year?: number;
  category?: string;
  q?: string;
}): Promise<Expense[]> {
  await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("expenses")
    .select("*")
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);

  if (year) query = query.gte("spent_on", `${year}-01-01`).lte("spent_on", `${year}-12-31`);
  if (category) query = query.eq("category", category);
  const pattern = toSearchPattern(q);
  if (pattern) query = query.or(`title.ilike.${pattern},notes.ilike.${pattern}`);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load expenses: ${error.message}`);
  return data;
}

/** Years that have expenses (plus the current one), newest first, for the year picker. */
export async function expenseYears(currentYear: number): Promise<number[]> {
  await requireUser();
  const supabase = await createClient();
  const [{ data: oldest }, { data: newest }] = await Promise.all([
    supabase.from("expenses").select("spent_on").order("spent_on", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("expenses").select("spent_on").order("spent_on", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const from = Math.min(currentYear, oldest ? Number(oldest.spent_on.slice(0, 4)) : currentYear);
  const to = Math.max(currentYear, newest ? Number(newest.spent_on.slice(0, 4)) : currentYear);
  return Array.from({ length: to - from + 1 }, (_, i) => to - i);
}

export async function getExpense(id: string): Promise<Expense> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the expense: ${error.message}`);
  if (!data) notFound();
  return data;
}

/** Totals per currency: total, tax, and per-category totals. */
export function summarize(expenses: Expense[]) {
  const byCurrency: Record<string, { total: number; tax: number; count: number; byCategory: Record<string, number> }> = {};
  for (const e of expenses) {
    const s = (byCurrency[e.currency] ??= { total: 0, tax: 0, count: 0, byCategory: {} });
    s.total += e.amount_minor;
    s.tax += e.tax_minor;
    s.count += 1;
    s.byCategory[e.category] = (s.byCategory[e.category] ?? 0) + e.amount_minor;
  }
  return byCurrency;
}
