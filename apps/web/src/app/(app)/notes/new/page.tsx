import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { listNoteLinkOptions } from "@/lib/notes/data";
import { isNoteSpace } from "@/lib/notes/schema";
import { createNoteAction } from "../actions";
import { NoteEditor } from "../note-editor";

export const metadata: Metadata = { title: "New note" };

export default function NewNotePage({ searchParams }: PageProps<"/notes/new">) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <Suspense fallback={<div className="h-96 glass animate-pulse rounded-xl" />}>
        <NewNote searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewNote({ searchParams }: Pick<PageProps<"/notes/new">, "searchParams">) {
  const sp = await searchParams;
  const space = isNoteSpace(sp.space) ? sp.space : "work";
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const options = await listNoteLinkOptions({ clientId: str(sp.client), projectId: str(sp.project) });

  // Prefill from ?client= / ?project= (e.g. "New note" on a client or project page).
  const project = options.projects.find((p) => p.id === str(sp.project));
  const client = options.clients.find((c) => c.id === (project?.clientId ?? str(sp.client)));
  const back = project ? `/projects/${project.id}` : client ? `/clients/${client.id}` : `/notes/${space}`;
  const backLabel = project ? project.name : client ? client.name : space === "work" ? "Work notes" : "Personal notes";

  return (
    <>
      <div className="grid gap-2">
        <Link href={back} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          {backLabel}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New note</h1>
      </div>
      <NoteEditor
        action={createNoteAction}
        options={options}
        submitLabel="Save note"
        defaults={{
          space: project || client ? "work" : space,
          title: "",
          body: "",
          client_id: client?.id ?? "",
          project_id: project?.id ?? "",
        }}
      />
    </>
  );
}
