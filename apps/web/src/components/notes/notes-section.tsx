import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Note } from "@/lib/notes/data";
import { NoteList } from "./note-list";

/** "Notes" block for a client or project page. */
export function NotesSection({
  notes,
  newHref,
  allHref,
  showLinks = false,
}: {
  notes: Note[];
  newHref: string;
  allHref: string;
  showLinks?: boolean;
}) {
  const shown = notes.slice(0, 6);
  return (
    <section className="grid gap-3" aria-labelledby="linked-notes">
      <div className="flex items-center justify-between gap-4">
        <h2 id="linked-notes" className="flex items-baseline gap-2 text-base font-medium">
          Notes
          {notes.length > 0 && <span className="text-sm font-normal text-muted-foreground">{notes.length}</span>}
        </h2>
        <div className="flex gap-2">
          {notes.length > shown.length && (
            <Button asChild variant="ghost" size="sm">
              <Link href={allHref}>View all</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={newHref}>
              <Plus />
              New note
            </Link>
          </Button>
        </div>
      </div>
      {shown.length > 0 ? (
        <NoteList notes={shown} showLinks={showLinks} />
      ) : (
        <p className="glass rounded-xl border-dashed p-6 text-center text-sm text-muted-foreground">No notes yet.</p>
      )}
    </section>
  );
}
