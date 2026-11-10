import type { Metadata } from "next";
import { NotesIndex } from "../notes-index";

export const metadata: Metadata = { title: "Work notes" };

export default function WorkNotesPage({ searchParams }: PageProps<"/notes/work">) {
  return <NotesIndex space="work" searchParams={searchParams} />;
}
