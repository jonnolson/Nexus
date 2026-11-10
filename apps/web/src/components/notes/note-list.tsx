import Link from "next/link";
import { Pin } from "lucide-react";
import { formatTimestamp } from "@/lib/dates";
import type { Note } from "@/lib/notes/data";
import { noteDisplayTitle, noteSnippet } from "@/lib/notes/schema";

/** Notes as a list of cards: title, preview, links, last edited. */
export function NoteList({ notes, showLinks = true }: { notes: Note[]; showLinks?: boolean }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {notes.map((n) => {
        const snippet = noteSnippet(n);
        return (
          <li key={n.id} className="relative grid gap-1 glass rounded-xl p-3 transition-colors hover:bg-muted/40">
            <div className="flex items-start gap-2">
              <Link
                href={`/notes/${n.id}`}
                className="min-w-0 flex-1 truncate font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
              >
                {noteDisplayTitle(n)}
              </Link>
              {n.pinned && <Pin className="size-3.5 shrink-0 fill-current text-muted-foreground" aria-label="Pinned" />}
            </div>
            {snippet && <p className="line-clamp-2 text-sm text-muted-foreground">{snippet}</p>}
            <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
              {showLinks && n.client && <span>{n.client.name}</span>}
              {showLinks && n.project && (
                <>
                  <span aria-hidden>·</span>
                  <span>{n.project.name}</span>
                </>
              )}
              {showLinks && (n.client || n.project) && <span aria-hidden>·</span>}
              <span>Edited {formatTimestamp(n.updated_at)}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
