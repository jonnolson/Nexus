import { z } from "zod";

export const NOTE_SPACES = [
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
] as const;
export type NoteSpace = (typeof NOTE_SPACES)[number]["value"];
export const isNoteSpace = (v: unknown): v is NoteSpace => v === "work" || v === "personal";

const optionalId = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || z.uuid().safeParse(v).success, message)
    .transform((v) => (v === "" ? null : v));

/** Create / save a note. Personal notes drop any client/project link. */
export const noteFormSchema = z
  .object({
    space: z.enum(["work", "personal"], "Pick a space."),
    title: z.string().trim().max(300, "Keep the title under 300 characters."),
    body: z.string().max(100_000, "This note is too long (100,000 characters max)."),
    client_id: optionalId("Pick a client."),
    project_id: optionalId("Pick a project."),
  })
  .superRefine((v, ctx) => {
    if (!v.title && !v.body.trim()) {
      ctx.addIssue({ code: "custom", path: ["title"], message: "Give the note a title or some text." });
    }
  })
  .transform((v) => (v.space === "personal" ? { ...v, client_id: null, project_id: null } : v));

export type NoteFormField = "space" | "title" | "body" | "client_id" | "project_id";

/** Title to show: the title, else the first line of the body. */
export function noteDisplayTitle(n: { title: string; body: string }): string {
  if (n.title.trim()) return n.title.trim();
  const first = n.body.split("\n").find((l) => l.trim());
  return first ? first.trim().slice(0, 120) : "Untitled";
}

/** A short plain-text preview of the body (skipping the line used as the title). */
export function noteSnippet(n: { title: string; body: string }, max = 160): string {
  const lines = n.body.split("\n").map((l) => l.trim()).filter(Boolean);
  const rest = n.title.trim() ? lines : lines.slice(1);
  const text = rest.join(" ");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
