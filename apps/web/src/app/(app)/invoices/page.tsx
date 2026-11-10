import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Receipt, X } from "lucide-react";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateOnly, todayInStudio } from "@/lib/dates";
import { INVOICE_VIEWS, type InvoiceView } from "@/lib/invoices/constants";
import { listInvoices } from "@/lib/invoices/data";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Bill your work and track what&apos;s owed.</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus />
            New invoice
          </Link>
        </Button>
      </div>
      <Suspense fallback={<div className="h-64 glass animate-pulse rounded-xl" />}>
        <InvoiceList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type SP = Awaited<PageProps<"/invoices">["searchParams"]>;
const str = (v: SP[string]) => (typeof v === "string" ? v : "");

async function InvoiceList({ searchParams }: Pick<PageProps<"/invoices">, "searchParams">) {
  const params = await searchParams;
  const viewParam = str(params.view);
  const view: InvoiceView = INVOICE_VIEWS.some((v) => v.value === viewParam) ? (viewParam as InvoiceView) : "outstanding";
  const clientId = str(params.client);

  const [invoices, outstanding] = await Promise.all([
    listInvoices({ view, clientId: clientId || undefined }),
    view === "outstanding" ? null : listInvoices({ view: "outstanding", clientId: clientId || undefined }),
  ]);
  const today = todayInStudio();
  const open = view === "outstanding" ? invoices : outstanding!;

  // Outstanding / overdue totals per currency.
  const sum = (list: typeof invoices) =>
    Object.entries(
      list.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.currency]: (acc[i.currency] ?? 0) + i.total_minor }), {}),
    )
      .map(([c, m]) => formatMoney(m, c))
      .join(" + ") || formatMoney(0, "CAD");
  const overdue = open.filter((i) => i.due_date < today);
  const clientName = invoices[0]?.client.name ?? open[0]?.client.name;

  const href = (next: { view?: InvoiceView; client?: string | null }) => {
    const sp = new URLSearchParams();
    const v = next.view ?? view;
    if (v !== "outstanding") sp.set("view", v);
    const c = next.client === undefined ? clientId : next.client;
    if (c) sp.set("client", c);
    const s = sp.toString();
    return s ? `/invoices?${s}` : "/invoices";
  };

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-2 sm:max-w-md sm:gap-4">
        <div className="glass rounded-xl p-3">
          <dt className="text-xs text-muted-foreground">Outstanding · {open.length}</dt>
          <dd className="text-lg font-semibold tabular-nums tracking-tight sm:text-xl">{sum(open)}</dd>
        </div>
        <div className={cn("glass rounded-xl p-3", overdue.length > 0 && "border-destructive/40")}>
          <dt className={cn("text-xs text-muted-foreground", overdue.length > 0 && "text-destructive")}>
            Overdue · {overdue.length}
          </dt>
          <dd className={cn("text-lg font-semibold tabular-nums tracking-tight sm:text-xl", overdue.length > 0 && "text-destructive")}>
            {sum(overdue)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Invoice status" className="flex w-fit flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm">
          {INVOICE_VIEWS.map((v) => (
            <Link
              key={v.value}
              href={href({ view: v.value })}
              aria-current={view === v.value ? "page" : undefined}
              data-sound
              className={cn(
                "rounded-md px-3 py-1 text-muted-foreground transition-colors hover:text-foreground",
                view === v.value && "font-medium text-primary-ink ring-1 ring-primary-ink/60 ring-inset",
              )}
            >
              {v.label}
            </Link>
          ))}
        </nav>
        {clientId && (
          <Link
            href={href({ client: null })}
            className="flex w-fit items-center gap-1.5 rounded-full border bg-muted/50 py-1 pr-2 pl-3 text-sm hover:bg-muted"
          >
            Client: <span className="font-medium">{clientName ?? "Selected"}</span>
            <X className="size-3.5" aria-label="Clear client filter" />
          </Link>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="grid min-h-48 place-items-center glass rounded-xl border-dashed p-8 text-center">
          <div className="grid justify-items-center gap-3">
            <Receipt className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {view === "outstanding" ? "Nothing outstanding. Nice." : "No invoices here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden sm:table-cell">Issued</TableHead>
                <TableHead className="hidden md:table-cell">Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id} className="relative">
                  <TableCell className="pl-4">
                    <Link
                      href={`/invoices/${i.id}`}
                      className="font-medium tabular-nums after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                    >
                      {i.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{i.client.name}</TableCell>
                  <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                    {formatDateOnly(i.issue_date)}
                  </TableCell>
                  <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">
                    {formatDateOnly(i.due_date)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={i.status} dueDate={i.due_date} today={today} />
                  </TableCell>
                  <TableCell className="pr-4 text-right font-medium tabular-nums">
                    {formatMoney(i.total_minor, i.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
