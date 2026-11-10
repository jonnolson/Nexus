import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, Hourglass, HandCoins, Plus, Receipt } from "lucide-react";
import { listClientOptions } from "@/lib/clients/data";
import { formatDateOnly, todayInStudio } from "@/lib/dates";
import { listIncome, pendingIncome, type IncomeItem, type PendingIncome } from "@/lib/income/data";
import { formatMoney } from "@/lib/money";
import { formatDuration } from "@/lib/time/format";
import { createIncomeAction } from "./actions";
import { IncomeChart, type ChartPoint } from "./income-chart";
import { IncomeForm } from "./income-form";

export const metadata: Metadata = { title: "Income" };

/** The chart and headline totals use the studio currency; other currencies are listed beside them. */
const MAIN_CURRENCY = "CAD";

export default function IncomePage({ searchParams }: PageProps<"/income">) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 p-4 md:p-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Income</h1>
        <p className="text-sm text-muted-foreground">Money received: paid invoices plus income you record yourself.</p>
      </div>
      <Suspense fallback={<div className="glass h-96 animate-pulse rounded-xl" />}>
        <IncomeView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const sumText = (byCurrency: Record<string, number>) =>
  Object.entries(byCurrency)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => (a === MAIN_CURRENCY ? -1 : b === MAIN_CURRENCY ? 1 : a.localeCompare(b)))
    .map(([c, v]) => formatMoney(v, c))
    .join(" + ");

async function IncomeView({ searchParams }: Pick<PageProps<"/income">, "searchParams">) {
  const params = await searchParams;
  await connection(); // "today" picks the default year and what's overdue
  const today = todayInStudio();
  const currentYear = Number(today.slice(0, 4));

  const [items, pending, clients] = await Promise.all([listIncome(), pendingIncome(today), listClientOptions()]);

  const years = items.map((i) => Number(i.date.slice(0, 4)));
  const firstYear = Math.min(currentYear, ...years);
  const lastYear = Math.max(currentYear, ...years);
  const yearParam = Number(typeof params.year === "string" ? params.year : "");
  const year = Number.isInteger(yearParam) && yearParam >= firstYear && yearParam <= lastYear ? yearParam : currentYear;

  const main = items.filter((i) => i.currency === MAIN_CURRENCY);
  const points: ChartPoint[] = main.map((i) => ({ date: i.date, net: i.netMinor, tax: i.taxMinor, total: i.totalMinor }));
  const otherCurrencies: Record<string, number> = {};
  for (const i of items) if (i.currency !== MAIN_CURRENCY) otherCurrencies[i.currency] = (otherCurrencies[i.currency] ?? 0) + i.netMinor;

  const yearItems = items.filter((i) => i.date.startsWith(String(year)));
  const months = new Map<string, IncomeItem[]>();
  for (const i of yearItems) months.set(i.date.slice(0, 7), [...(months.get(i.date.slice(0, 7)) ?? []), i]);

  return (
    <div className="grid gap-6">
      <PendingNotice pending={pending} />

      <IncomeChart points={points} currency={MAIN_CURRENCY} year={year} firstYear={firstYear} lastYear={lastYear} />
      {Object.keys(otherCurrencies).length > 0 && (
        <p className="-mt-4 px-1 text-xs text-muted-foreground">
          Also received in other currencies (not charted): {sumText(otherCurrencies)} before tax.
        </p>
      )}

      <details className="group glass rounded-xl">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          <Plus className="size-4 text-primary-ink transition-transform duration-200 ease-out group-open:rotate-45 motion-reduce:transition-none" />
          Record income
          <span className="font-normal text-muted-foreground">for payments outside Nexus invoices</span>
        </summary>
        <div className="border-t px-4 pt-4 pb-4 sm:px-5">
          <IncomeForm
            mode="create"
            action={createIncomeAction}
            clients={clients}
            defaults={{ title: "", amount: "", tax: "", currency: MAIN_CURRENCY, received_on: today, client_id: "", notes: "" }}
          />
        </div>
      </details>

      <section className="grid gap-4" aria-labelledby="payments-heading">
        <div className="flex items-baseline justify-between px-1">
          <h2 id="payments-heading" className="text-sm font-medium">
            Payments in {year}
          </h2>
          <span className="text-xs text-muted-foreground">{yearItems.length} total</span>
        </div>
        {yearItems.length === 0 ? (
          <div className="glass grid min-h-32 place-items-center rounded-xl border-dashed p-8 text-center">
            <div className="grid justify-items-center gap-3">
              <HandCoins className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No income recorded in {year}.</p>
            </div>
          </div>
        ) : (
          [...months.entries()].map(([month, list]) => (
            <div key={month} className="grid gap-2">
              <div className="flex items-baseline justify-between px-1 text-sm">
                <h3 className="font-medium">{formatDateOnly(`${month}-01`, { day: undefined, month: "long" })}</h3>
                <span className="tabular-nums text-muted-foreground">
                  {sumText(list.reduce<Record<string, number>>((a, i) => ({ ...a, [i.currency]: (a[i.currency] ?? 0) + i.netMinor }), {}))}
                </span>
              </div>
              <ul className="glass divide-y rounded-xl">
                {list.map((i) => (
                  <li key={i.key} className="relative flex items-center gap-3 px-3 py-2.5">
                    {i.kind === "invoice" ? (
                      <Receipt className="size-4 shrink-0 text-muted-foreground" aria-label="Paid invoice" />
                    ) : (
                      <HandCoins className="size-4 shrink-0 text-muted-foreground" aria-label="Recorded income" />
                    )}
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <Link
                        href={i.href}
                        className="truncate text-sm font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                      >
                        {i.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {[i.clientName, formatDateOnly(i.date, { year: undefined }), i.kind === "manual" ? "Recorded" : "Paid invoice"]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="grid shrink-0 justify-items-end gap-0.5 text-right">
                      <span className="text-sm font-medium tabular-nums">
                        {formatMoney(i.netMinor, i.currency)}
                        {i.currency !== MAIN_CURRENCY && <span className="ml-1 text-xs text-muted-foreground">{i.currency}</span>}
                      </span>
                      {i.taxMinor > 0 && (
                        <span className="text-xs tabular-nums text-muted-foreground">+ {formatMoney(i.taxMinor, i.currency)} GST/HST</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

/** "Coming in": money owed or still to invoice, totalled, with where to act on each part. */
function PendingNotice({ pending }: { pending: PendingIncome }) {
  const total = sumText(pending.total);
  const rows = [
    pending.sent.count > 0 && {
      label: `${pending.sent.count} sent invoice${pending.sent.count === 1 ? "" : "s"} awaiting payment`,
      note: pending.sent.overdue > 0 ? { text: `${pending.sent.overdue} overdue`, danger: true } : null,
      value: sumText(pending.sent.byCurrency),
      href: "/invoices",
    },
    pending.drafts.count > 0 && {
      label: `${pending.drafts.count} draft invoice${pending.drafts.count === 1 ? "" : "s"} not sent yet`,
      note: null,
      value: sumText(pending.drafts.byCurrency),
      href: "/invoices?view=draft",
    },
    pending.unbilledTime.minutes > 0 && {
      label: `${formatDuration(pending.unbilledTime.minutes)} of billable time not invoiced`,
      note: pending.unbilledTime.unratedMinutes > 0 ? { text: `${formatDuration(pending.unbilledTime.unratedMinutes)} has no rate, so it isn't counted`, danger: false } : null,
      value: sumText(pending.unbilledTime.byCurrency) || "No rate",
      href: "/invoices/new",
    },
    pending.fixedFees.count > 0 && {
      label: `Fixed fees not yet invoiced on ${pending.fixedFees.count} project${pending.fixedFees.count === 1 ? "" : "s"}`,
      note: null,
      value: sumText(pending.fixedFees.byCurrency),
      href: "/projects",
    },
  ].filter((r): r is { label: string; note: { text: string; danger: boolean } | null; value: string; href: string } => Boolean(r));

  if (rows.length === 0) {
    return (
      <div className="glass flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground">
        <Hourglass className="size-4 shrink-0" />
        Nothing outstanding: no unpaid invoices, drafts or unbilled time.
      </div>
    );
  }

  return (
    <section className="glass rounded-xl ring-1 ring-primary-ink/40" aria-labelledby="pending-heading">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pt-4 pb-2">
        <Hourglass className="size-4 shrink-0 self-center text-primary-ink" aria-hidden />
        <h2 id="pending-heading" className="text-sm font-medium">
          Coming in
        </h2>
        <span className="text-xs text-muted-foreground">active work and invoices not paid yet</span>
        <span className="ml-auto text-xl font-semibold tracking-tight tabular-nums">{total || formatMoney(0, MAIN_CURRENCY)}</span>
      </div>
      <ul className="px-2 pb-2">
        {rows.map((r) => (
          <li key={r.href} className="relative flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-foreground/5">
            <div className="min-w-0 flex-1">
              <Link
                href={r.href}
                data-sound
                className="block truncate text-sm after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring/50"
              >
                {r.label}
              </Link>
              {r.note && <p className={r.note.danger ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{r.note.text}</p>}
            </div>
            <span className="text-sm font-medium tabular-nums">{r.value}</span>
            <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
          </li>
        ))}
      </ul>
    </section>
  );
}
