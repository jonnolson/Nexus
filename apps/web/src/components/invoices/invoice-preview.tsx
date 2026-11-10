import { formatDateOnly } from "@/lib/dates";
import { formatQuantity, type InvoiceDocument } from "@/lib/invoices/document";
import { formatMoney } from "@/lib/money";

/** On-screen invoice, laid out like the PDF (same data, same order). */
export function InvoicePreview({ doc }: { doc: InvoiceDocument }) {
  const money = (minor: number) => formatMoney(minor, doc.currency);
  return (
    <article
      aria-label={`Invoice ${doc.number}`}
      className="relative overflow-hidden rounded-xl border bg-white p-6 text-sm text-neutral-900 shadow-sm sm:p-10 dark:border-neutral-700"
    >
      {(doc.status === "paid" || doc.status === "void") && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-24 right-8 -rotate-12 text-5xl font-bold tracking-widest text-neutral-900/10 uppercase"
        >
          {doc.status}
        </span>
      )}

      <header className="flex flex-col justify-between gap-6 sm:flex-row">
        <div className="grid gap-0.5">
          <p className="text-base font-semibold">{doc.issuer.name}</p>
          {[doc.issuer.contact, ...doc.issuer.address, doc.issuer.email, doc.issuer.phone]
            .filter(Boolean)
            .map((l) => (
              <p key={l} className="text-neutral-500">
                {l}
              </p>
            ))}
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-bold tracking-wider">INVOICE</p>
          <p className="font-semibold">{doc.number}</p>
        </div>
      </header>

      <div className="mt-8 flex flex-col justify-between gap-6 sm:flex-row">
        <div className="grid max-w-xs gap-0.5">
          <p className="mb-1 text-[0.7rem] tracking-wider text-neutral-500 uppercase">Bill to</p>
          <p className="font-semibold">{doc.client.name}</p>
          {[doc.client.contact, ...doc.client.address].filter(Boolean).map((l) => (
            <p key={l}>{l}</p>
          ))}
          {doc.client.email && <p className="text-neutral-500">{doc.client.email}</p>}
          {doc.client.taxId && <p className="text-neutral-500">Tax ID: {doc.client.taxId}</p>}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 self-start sm:text-right">
          <dt className="text-neutral-500">Issued</dt>
          <dd>{formatDateOnly(doc.issueDate)}</dd>
          <dt className="text-neutral-500">Due</dt>
          <dd className="font-semibold">{formatDateOnly(doc.dueDate)}</dd>
          <dt className="text-neutral-500">Amount due</dt>
          <dd className="font-semibold">
            {money(doc.status === "paid" ? 0 : doc.totalMinor)} {doc.currency}
          </dd>
        </dl>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse">
          <thead>
            <tr className="border-b border-neutral-900 text-left text-[0.7rem] tracking-wider text-neutral-500 uppercase">
              <th className="py-2 font-normal">Description</th>
              <th className="w-16 py-2 text-right font-normal">Qty</th>
              <th className="w-24 py-2 text-right font-normal">Rate</th>
              <th className="w-28 py-2 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-neutral-400">
                  No lines yet
                </td>
              </tr>
            )}
            {doc.lines.map((l) => (
              <tr key={l.id} className="border-b border-neutral-200 align-top">
                <td className="py-2 pr-4">{l.description}</td>
                <td className="py-2 text-right tabular-nums">{formatQuantity(l.quantity)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.unitPriceMinor)}</td>
                <td className="py-2 text-right tabular-nums">{money(l.amountMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 ml-auto grid w-full max-w-60 grid-cols-[1fr_auto] gap-y-1 tabular-nums">
        <dt className="text-neutral-500">Subtotal</dt>
        <dd className="text-right">{money(doc.subtotalMinor)}</dd>
        {doc.taxLabel && (
          <>
            <dt className="text-neutral-500">{doc.taxLabel}</dt>
            <dd className="text-right">{money(doc.taxMinor)}</dd>
          </>
        )}
        <dt className="mt-1 border-t border-neutral-900 pt-2 text-base font-semibold">Total {doc.currency}</dt>
        <dd className="mt-1 border-t border-neutral-900 pt-2 text-right text-base font-semibold">{money(doc.totalMinor)}</dd>
      </dl>

      {doc.notes && (
        <section className="mt-8">
          <p className="mb-1 text-[0.7rem] tracking-wider text-neutral-500 uppercase">Notes</p>
          <p className="whitespace-pre-wrap">{doc.notes}</p>
        </section>
      )}
      {doc.issuer.footer && (
        <section className="mt-6">
          <p className="mb-1 text-[0.7rem] tracking-wider text-neutral-500 uppercase">How to pay</p>
          <p className="whitespace-pre-wrap">{doc.issuer.footer}</p>
        </section>
      )}
      {doc.issuer.gstNumber && (
        <p className="mt-8 text-center text-xs text-neutral-500">GST/HST No. {doc.issuer.gstNumber}</p>
      )}
    </article>
  );
}
