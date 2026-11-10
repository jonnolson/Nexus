import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { formatTimestamp } from "@/lib/dates";
import { getNote, listNoteLinkOptions } from "@/lib/notes/data";
import { updateNoteAction } from "../actions";
import { NoteEditor } from "../note-editor";
import { NoteActions } from "./note-actions";

export const metadata: Metadata = { title: "Note" };

export default function NotePage({ params }: PageProps<"/notes/[id]">) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <Suspense fallback={<div className="h-96 glass animate-pulse rounded-xl" />}>
        <NoteDetail params={params} />
      </Suspense>
    </div>
  );
}

async function NoteDetail({ params }: Pick<PageProps<"/notes/[id]">, "params">) {
  const { id } = await params;
  const note = await getNote(id);
  const options = await listNoteLinkOptions({ clientId: note.client_id, projectId: note.project_id });
  const listHref = note.space === "personal" ? "/notes/personal" : "/notes/work";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <Link href={listHref} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" />
            {note.space === "personal" ? "Personal notes" : "Work notes"}
          </Link>
          {(note.client || note.project) && (
            <p className="text-sm text-muted-foreground">
              {note.client && (
                <Link href={`/clients/${note.client.id}`} className="underline-offset-4 hover:underline">
                  {note.client.name}
                </Link>
              )}
              {note.client && note.project && " · "}
              {note.project && (
                <Link href={`/projects/${note.project.id}`} className="underline-offset-4 hover:underline">
                  {note.project.name}
                </Link>
              )}
            </p>
          )}
        </div>
        <NoteActions id={note.id} pinned={note.pinned} space={note.space} />
      </div>

      <NoteEditor
        action={updateNoteAction.bind(null, note.id)}
        options={options}
        submitLabel="Save"
        defaults={{
          space: note.space,
          title: note.title,
          body: note.body,
          client_id: note.client_id ?? "",
          project_id: note.project_id ?? "",
        }}
      />

      <p className="text-xs text-muted-foreground">
        Created {formatTimestamp(note.created_at)}
        {note.updated_at !== note.created_at && ` · Edited ${formatTimestamp(note.updated_at)}`}
      </p>
    </>
  );
}
