"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { noteFormSchema, type NoteFormField } from "@/lib/notes/schema";
import { createClient } from "@/lib/supabase/server";

/** Errors are returned, not thrown (production hides thrown action messages). */
export type ActionResult = { error?: string };

export type NoteFormState =
  | {
      error?: string;
      fieldErrors?: Partial<Record<NoteFormField, string>>;
      values?: Record<NoteFormField, string>;
      saved?: number;
    }
  | undefined;

const idSchema = z.uuid();
const FK_VIOLATION = "23503";
const revalidateAll = () => revalidatePath("/", "layout");

function readNote(formData: FormData) {
  const values: Record<NoteFormField, string> = {
    space: String(formData.get("space") ?? "work"),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    client_id: String(formData.get("client_id") ?? ""),
    project_id: String(formData.get("project_id") ?? ""),
  };
  const parsed = noteFormSchema.safeParse(values);
  if (parsed.success) return { values, parsed } as const;
  const fieldErrors: Partial<Record<NoteFormField, string>> = {};
  for (const i of parsed.error.issues) {
    const k = i.path[0] as NoteFormField | undefined;
    if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
  }
  return { values, parsed, fieldErrors } as const;
}

export async function createNoteAction(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  await requireUser();
  const { values, parsed, fieldErrors } = readNote(formData);
  if (!parsed.success) return { fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").insert(parsed.data).select("id").single();
  if (error || !data) {
    return { error: error?.code === FK_VIOLATION ? "That client or project no longer exists." : "Couldn't save the note. Try again.", values };
  }
  revalidateAll();
  redirect(`/notes/${data.id}`);
}

export async function updateNoteAction(id: string, _prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown note." };
  const { values, parsed, fieldErrors } = readNote(formData);
  if (!parsed.success) return { fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").update(parsed.data).eq("id", id).select("id").maybeSingle();
  if (error) {
    return { error: error.code === FK_VIOLATION ? "That client or project no longer exists." : "Couldn't save the note. Try again.", values };
  }
  if (!data) return { error: "This note no longer exists.", values };
  revalidateAll();
  return { saved: Date.now(), values };
}

export async function setNotePinnedAction(id: string, pinned: boolean): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown note." };
  const supabase = await createClient();
  const { error } = await supabase.from("notes").update({ pinned }).eq("id", id);
  if (error) return { error: "Couldn't update the note. Try again." };
  revalidateAll();
  return {};
}

export async function deleteNoteAction(id: string, space: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown note." };
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the note. Try again." };
  revalidateAll();
  redirect(space === "personal" ? "/notes/personal" : "/notes/work");
}
