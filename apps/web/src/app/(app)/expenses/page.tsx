import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Search, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDateOnly, todayInStudio } from "@/lib/dates";
import { categoryLabel, EXPENSE_CATEGORIES } from "@/lib/expenses/categories";
import { expenseYears, listExpenses, summarize, type Expense } from "@/lib/expenses/data";
import { formatMoney } from "@/lib/money";
import { createExpenseAction } from "./actions";
import { ExpenseFilters } from "./expense-filters";
import { ExpenseForm } from "./expense-form";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 p-4 md:p-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-sm text-muted-foreground">Business spending, ready for tax time.</p>
      </div>
      <Suspense fallback={<div className="h-64 glass animate-pulse rounded-xl" />}>
        <ExpensesView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type SP = Awaited<PageProps<"/expenses">["searchParams"]>;
const str = (v: SP[string]) => (typeof v === "string" ? v : "");

async function ExpensesView({ searchParams }: Pick<PageProps<"/expenses">, "searchParams">) {
  const params = await searchParams;
  await connection(); // "today" picks the default year
  const today = todayInStudio();
  const currentYear = Number(today.slice(0, 4));
  const yearParam = Number(str(params.year));
  const year = Number.isInteger(yearParam) && yearParam > 1900 && yearParam < 3000 ? yearParam : currentYear;
  const categoryParam = str(params.category);
  const category = EXPENSE_CATEGORIES.some((c) => c.value === categoryParam) ? categoryParam : "";
  const q = str(params.q).slice(0, 100);

  const [expenses, years] = await Promise.all([
    listExpenses({ year, category: category || undefined, q }),
    expenseYears(currentYear),
  ]);
  const summary = summarize(expenses);
  const currencies = Object.keys(summary).sort((a, b) => (a === "CAD" ? -1 : b === "CAD" ? 1 : a.localeCompare(b)));
  const main = summary[currencies[0] ?? "CAD"];
  const sum = (pick: (s: (typeof summary)[string]) => number) =>
    currencies.map((c) => formatMoney(pick(summary[c]), c)).join(" + ") || formatMoney(0, "CAD");

  // Group by month (YYYY-MM), newest first.
  const months = new Map<string, Expense[]>();
  for (const e of expenses) months.set(e.spent_on.slice(0, 7), [...(months.get(e.spent_on.slice(0, 7)) ?? []), e]);

  const categoryRows = main
    ? Object.entries(main.byCategory).sort((a, b) => b[1] - a[1])
    : [];
  const maxCategory = categoryRows[0]?.[1] ?? 0;

  return (
    <div className="grid gap-6">
      <section className="glass rounded-xl p-4 sm:p-5" aria-labelledby="add-expense">
        <h2 id="add-expense" className="mb-4 text-base font-medium">
          Add an expense
        </h2>
        <ExpenseForm
          mode="create"
          action={createExpenseAction}
          defaults={{ title: "", amount: "", tax: "", currency: "CAD", category: "", spent_on: today, notes: "" }}
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Form action="/expenses" className="relative w-full sm:max-w-xs" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={q} placeholder="Search expenses" aria-label="Search expenses" className="pl-8" />
          <input type="hidden" name="year" value={year} />
          {category && <input type="hidden" name="category" value={category} />}
        </Form>
        <ExpenseFilters years={years} year={year} category={category} q={q} />
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: `Spent in ${year}`, value: sum((s) => s.total) },
          { label: "GST/HST paid", value: sum((s) => s.tax) },
          { label: "Expenses", value: String(expenses.length) },
        ].map((t) => (
          <div key={t.label} className="glass rounded-xl p-3">
            <dt className="text-xs text-muted-foreground">{t.label}</dt>
            <dd className="text-lg font-semibold tabular-nums tracking-tight sm:text-xl">{t.value}</dd>
          </div>
        ))}
      </dl>

      {categoryRows.length > 1 && !category && (
        <section className="grid gap-2" aria-labelledby="by-category">
          <h2 id="by-category" className="text-sm font-medium">
            By category{currencies.length > 1 ? ` (${currencies[0]})` : ""}
          </h2>
          <ul className="grid gap-2 glass rounded-xl p-3">
            {categoryRows.map(([cat, total]) => (
              <li key={cat} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <Link
                    href={`/expenses?year=${year}&category=${cat}`}
                    className="truncate underline-offset-4 hover:underline"
                  >
                    {categoryLabel(cat)}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">{formatMoney(total, currencies[0])}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-primary-ink" style={{ width: `${(total / maxCategory) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {expenses.length === 0 ? (
        <div className="grid min-h-40 place-items-center glass rounded-xl border-dashed p-8 text-center">
          <div className="grid justify-items-center gap-3">
            <Wallet className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {q || category ? "No expenses match." : `No expenses in ${year} yet.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {[...months.entries()].map(([month, list]) => {
            const monthTotals = summarize(list);
            return (
              <section key={month} className="grid gap-2" aria-label={monthLabel(month)}>
                <div className="flex items-baseline justify-between px-1 text-sm">
                  <h3 className="font-medium">{monthLabel(month)}</h3>
                  <span className="tabular-nums text-muted-foreground">
                    {Object.entries(monthTotals)
                      .map(([c, s]) => formatMoney(s.total, c))
                      .join(" + ")}
                  </span>
                </div>
                <ul className="divide-y glass rounded-xl">
                  {list.map((e) => (
                    <li key={e.id} className="relative flex items-center gap-3 px-3 py-2.5">
                      <div className="grid min-w-0 flex-1 gap-0.5">
                        <Link
                          href={`/expenses/${e.id}`}
                          className="truncate text-sm font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                        >
                          {e.title}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {categoryLabel(e.category)} · {formatDateOnly(e.spent_on, { year: undefined })}
                          {e.notes && ` · ${e.notes}`}
                        </p>
                      </div>
                      <div className="grid shrink-0 justify-items-end gap-0.5 text-right">
                        <span className="text-sm font-medium tabular-nums">
                          {formatMoney(e.amount_minor, e.currency)}
                          {e.currency !== "CAD" && <span className="ml-1 text-xs text-muted-foreground">{e.currency}</span>}
                        </span>
                        {e.tax_minor > 0 && (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            incl. {formatMoney(e.tax_minor, e.currency)} tax
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function monthLabel(yyyyMm: string) {
  return formatDateOnly(`${yyyyMm}-01`, { day: undefined, month: "long" });
}
