import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { formatTimestamp, todayInStudio } from "@/lib/dates";
import { taxKeyFor } from "@/lib/invoices/constants";
import { buildDocument, formatQuantity } from "@/lib/invoices/document";
import { countEntriesByLine, getInvoice } from "@/lib/invoices/data";
import { minorToInput } from "@/lib/money";
import { emailConfigured } from "@/lib/server-env";
import { getProfile } from "@/lib/settings/data";
import { DraftEditor } from "./draft-editor";
import { InvoiceActions } from "./invoice-actions";

export const metadata: Metadata = { title: "Invoice" };

export default function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 p-4 md:p-8">
      <Link href="/invoices" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Invoices
      </Link>
      <Suspense fallback={<div className="h-[32rem] glass animate-pulse rounded-xl" />}>
        <InvoiceDetail params={params} />
      </Suspense>
    </div>
  );
}

async function InvoiceDetail({ params }: Pick<PageProps<"/invoices/[id]">, "params">) {
  const { id } = await params;
  const [invoice, profile] = await Promise.all([getInvoice(id), getProfile()]);
  const counts = await countEntriesByLine(invoice.lines.map((l) => l.id));
  const doc = buildDocument(invoice, invoice.lines, { profile, client: invoice.client });
  const today = todayInStudio();
  const draft = invoice.status === "draft";

  const timeline = [
    ["Created", invoice.created_at],
    ["Sent", invoice.sent_at],
    ["Paid", invoice.paid_at],
    ["Voided", invoice.voided_at],
  ].filter((t): t is [string, string] => Boolean(t[1]));

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight tabular-nums">{invoice.number}</h1>
            <InvoiceStatusBadge status={invoice.status} dueDate={invoice.due_date} today={today} />
          </div>
          <Link href={`/clients/${invoice.client.id}`} className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {invoice.client.name}
          </Link>
        </div>
        <InvoiceActions
          id={invoice.id}
          number={invoice.number}
          status={invoice.status}
          clientEmail={invoice.client.email}
          emailReady={emailConfigured()}
        />
      </div>

      {draft && (
        <DraftEditor
          invoiceId={invoice.id}
          currency={invoice.currency}
          gstRegistered={Boolean(profile.gst_number)}
          details={{
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            tax: taxKeyFor(invoice.tax_name, invoice.tax_rate_bps),
            notes: invoice.notes ?? "",
          }}
          lines={invoice.lines.map((l) => ({
            id: l.id,
            description: l.description,
            quantity: formatQuantity(Number(l.quantity)),
            unitPrice: minorToInput(l.unit_price_minor, invoice.currency),
            billedEntries: counts[l.id] ?? 0,
          }))}
        />
      )}

      {!draft && invoice.status !== "void" && (
        <p className="text-sm text-muted-foreground">
          This invoice is locked. To change it, void it and create a new one; its time goes back to unbilled.
        </p>
      )}

      <InvoicePreview doc={doc} />

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {timeline.map(([label, at]) => (
          <li key={label}>
            {label} {formatTimestamp(at)}
          </li>
        ))}
      </ul>
    </div>
  );
}
