"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CLIENT_FORM_FIELDS,
  clientFormSchema,
  type ClientFormField,
} from "@/lib/clients/schema";

export type ClientFormState =
  | {
      formError?: string;
      fieldErrors?: Partial<Record<ClientFormField, string>>;
      /** Echoed back so the form keeps what was typed after a failed submit. */
      values?: Partial<Record<ClientFormField, string>>;
    }
  | undefined;

const idSchema = z.uuid();

function readForm(formData: FormData) {
  const values = Object.fromEntries(
    CLIENT_FORM_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]),
  ) as Record<ClientFormField, string>;
  return { values, parsed: clientFormSchema.safeParse(values) };
}

function fieldErrorsFrom(error: z.ZodError) {
  const fieldErrors: Partial<Record<ClientFormField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as ClientFormField | undefined;
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireUser();
  const { values, parsed } = readForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { formError: "Couldn't save the client. Try again.", values };

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

export async function updateClientAction(
  id: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { formError: "Unknown client." };

  const { values, parsed } = readForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { formError: "Couldn't save the client. Try again.", values };
  if (!data) return { formError: "This client no longer exists.", values };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

/**
 * Errors are returned, not thrown: production builds replace thrown Server
 * Action messages with a generic one, so the user would never see them.
 */
export type ActionResult = { error?: string };

export async function setClientArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown client." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: "Couldn't update the client. Try again." };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return {};
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown client." };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) {
    // foreign_key_violation: projects still point at this client.
    return {
      error:
        error.code === "23503"
          ? "This client has projects or tracked time, so it can't be deleted. Archive it instead."
          : "Couldn't delete the client. Try again.",
    };
  }

  revalidatePath("/clients");
  redirect("/clients");
}
