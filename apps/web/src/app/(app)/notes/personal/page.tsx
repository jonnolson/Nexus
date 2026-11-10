import type { Metadata } from "next";
import { NotesIndex } from "../notes-index";

export const metadata: Metadata = { title: "Personal notes" };

export default function PersonalNotesPage({ searchParams }: PageProps<"/notes/personal">) {
  return <NotesIndex space="personal" searchParams={searchParams} />;
}
