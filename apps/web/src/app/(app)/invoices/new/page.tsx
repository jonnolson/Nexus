import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { listClientOptions, getClient } from "@/lib/clients/data";
import { todayInStudio } from "@/lib/dates";
import { defaultTaxFor, taxLabel } from "@/lib/invoices/constants";
import { getUnbilledForClient } from "@/lib/invoices/data";
import { getProfile } from "@/lib/settings/data";
import { ClientPicker, NewInvoiceForm } from "./new-invoice-form";

export const metadata: Metadata = { title: "New invoice" };

export default function NewInvoicePage({ searchParams }: PageProps<"/invoices/new">) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <div className="grid gap-2">
        <Link href="/invoices" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Invoices
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
        <p className="text-sm text-muted-foreground">
          Pick a client and choose what to bill. You can edit everything on the draft afterwards.
        </p>
      </div>
      <Suspense fallback={<div className="h-64 glass animate-pulse rounded-xl" />}>
        <NewInvoice searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewInvoice({ searchParams }: Pick<PageProps<"/invoices/new">, "searchParams">) {
  const { client: clientParam } = await searchParams;
  const clientId = typeof clientParam === "string" ? clientParam : "";
  const clients = await listClientOptions(clientId || undefined);
  const selected = clients.find((c) => c.id === clientId);

  if (!selected) {
    return (
      <div className="grid gap-4">
        <ClientPicker clients={clients} value="" />
        {clients.length === 0 && (
          <p className="text-sm text-muted-foreground">
            <Link href="/clients/new" className="underline underline-offset-4">Add a client</Link> first.
          </p>
        )}
      </div>
    );
  }

  const [client, profile, unbilled] = await Promise.all([getClient(selected.id), getProfile(), getUnbilledForClient(selected.id)]);
  const tax = defaultTaxFor(client, Boolean(profile.gst_number));
  const taxNote = !profile.gst_number
    ? "No GST/HST will be charged: add your GST/HST number in Settings to charge tax."
    : `Tax: ${taxLabel(tax.name, tax.rateBps) ?? "none"}, based on ${client.name}'s location. You can change it on the draft.`;

  return (
    <div className="grid gap-6">
      <ClientPicker clients={clients} value={client.id} />
      <NewInvoiceForm
        key={client.id}
        clientId={client.id}
        currency={client.currency}
        today={todayInStudio()}
        groups={unbilled.groups}
        fixedFees={unbilled.fixedFees}
        taxNote={taxNote}
      />
    </div>
  );
}
