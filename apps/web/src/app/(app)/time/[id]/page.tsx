import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { formatTimestamp, studioDateOf, studioTimeOf } from "@/lib/dates";
import { getEntry, listTimeOptions } from "@/lib/time/data";
import { safeTimeReturnTo } from "@/lib/time/schema";
import { updateEntryAction } from "../actions";
import { EntryForm } from "../entry-form";

export const metadata: Metadata = { title: "Edit time entry" };

export default function EntryPage({ params, searchParams }: PageProps<"/time/[id]">) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <Suspense fallback={<div className="h-96 glass animate-pulse rounded-xl" />}>
        <EditEntry params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditEntry({ params, searchParams }: PageProps<"/time/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const entry = await getEntry(id);
  const options = await listTimeOptions({
    clientId: entry.client_id,
    projectId: entry.project_id,
    taskId: entry.task_id,
  });
  const returnTo = safeTimeReturnTo(sp.from);
  const running = entry.ended_at === null;

  return (
    <>
      <div className="grid gap-2">
        <Link
          href={returnTo}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {running ? "Edit running timer" : "Edit time entry"}
        </h1>
      </div>
      <div className="glass rounded-xl p-4 sm:p-6">
      <EntryForm
        mode="edit"
        action={updateEntryAction.bind(null, entry.id, returnTo)}
        options={options}
        running={running}
        entryId={entry.id}
        returnTo={returnTo}
        defaults={{
          description: entry.description ?? "",
          client_id: entry.client_id ?? "",
          project_id: entry.project_id ?? "",
          task_id: entry.task_id ?? "",
          billable: entry.billable ? "on" : "",
          date: studioDateOf(entry.started_at),
          start_time: studioTimeOf(entry.started_at),
          end_time: entry.ended_at ? studioTimeOf(entry.ended_at) : "",
          duration: "",
        }}
      />
      </div>
      <p className="text-xs text-muted-foreground">
        Created {formatTimestamp(entry.created_at)}
        {entry.updated_at !== entry.created_at && ` · Updated ${formatTimestamp(entry.updated_at)}`}
      </p>
    </>
  );
}
