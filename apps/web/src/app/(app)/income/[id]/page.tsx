import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { listClientOptions } from "@/lib/clients/data";
import { formatTimestamp } from "@/lib/dates";
import { getIncomeEntry } from "@/lib/income/data";
import { incomeToFormValues } from "@/lib/income/schema";
import { updateIncomeAction } from "../actions";
import { IncomeForm } from "../income-form";

export const metadata: Metadata = { title: "Edit income" };

export default function IncomeEntryPage({ params }: PageProps<"/income/[id]">) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <Link href="/income" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Income
      </Link>
      <Suspense fallback={<div className="glass h-80 animate-pulse rounded-xl" />}>
        <EditIncome params={params} />
      </Suspense>
    </div>
  );
}

async function EditIncome({ params }: Pick<PageProps<"/income/[id]">, "params">) {
  const { id } = await params;
  const entry = await getIncomeEntry(id);
  // Keep the linked client selectable even if it's archived.
  const clients = await listClientOptions(entry.client_id ?? undefined);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Edit income</h1>
      <div className="glass rounded-xl p-4 sm:p-6">
        <IncomeForm
          mode="edit"
          action={updateIncomeAction.bind(null, entry.id)}
          defaults={incomeToFormValues(entry)}
          clients={clients}
          entryId={entry.id}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Recorded {formatTimestamp(entry.created_at)}
        {entry.updated_at !== entry.created_at && ` · Updated ${formatTimestamp(entry.updated_at)}`}
      </p>
    </>
  );
}
