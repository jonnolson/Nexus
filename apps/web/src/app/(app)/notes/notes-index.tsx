import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { NotebookPen, Plus, Search, X } from "lucide-react";
import { NoteList } from "@/components/notes/note-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listNotes } from "@/lib/notes/data";
import type { NoteSpace } from "@/lib/notes/schema";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** Shared list page for /notes/work and /notes/personal. */
export function NotesIndex({ space, searchParams }: { space: NoteSpace; searchParams: SearchParams }) {
  const title = space === "work" ? "Work notes" : "Personal notes";
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {space === "work" ? "Meeting notes, ideas and anything client-related." : "Just for you."}
          </p>
        </div>
        <Button asChild>
          <Link href={`/notes/new?space=${space}`}>
            <Plus />
            New note
          </Link>
        </Button>
      </div>
      <Suspense fallback={<div className="h-48 glass animate-pulse rounded-xl" />}>
        <NotesResults space={space} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NotesResults({ space, searchParams }: { space: NoteSpace; searchParams: SearchParams }) {
  const params = await searchParams;
  const q = str(params.q).slice(0, 100);
  const clientId = space === "work" ? str(params.client) : "";
  const projectId = space === "work" ? str(params.project) : "";
  const notes = await listNotes({ space, q, clientId: clientId || undefined, projectId: projectId || undefined });

  const filterLabel = projectId
    ? `Project: ${notes[0]?.project?.name ?? "selected"}`
    : clientId
      ? `Client: ${notes[0]?.client?.name ?? "selected"}`
      : null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Form action={`/notes/${space}`} className="relative w-full sm:max-w-xs" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={q} placeholder="Search notes" aria-label="Search notes" className="pl-8" />
          {clientId && <input type="hidden" name="client" value={clientId} />}
          {projectId && <input type="hidden" name="project" value={projectId} />}
        </Form>
        {filterLabel && (
          <Link
            href={q ? `/notes/${space}?q=${encodeURIComponent(q)}` : `/notes/${space}`}
            className="flex w-fit items-center gap-1.5 rounded-full border bg-muted/50 py-1 pr-2 pl-3 text-sm hover:bg-muted"
          >
            {filterLabel}
            <X className="size-3.5" aria-label="Clear filter" />
          </Link>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="grid min-h-48 place-items-center glass rounded-xl border-dashed p-8 text-center">
          <div className="grid justify-items-center gap-3">
            <NotebookPen className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{q ? "No notes match that search." : "No notes yet."}</p>
          </div>
        </div>
      ) : (
        <NoteList notes={notes} showLinks={space === "work"} />
      )}
    </div>
  );
}
