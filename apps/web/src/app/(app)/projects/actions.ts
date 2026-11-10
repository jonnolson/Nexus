"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { PROJECT_STATUS_VALUES } from "@/lib/projects/constants";
import {
  PROJECT_FORM_FIELDS,
  projectFormSchema,
  type ProjectFormField,
} from "@/lib/projects/schema";
import { createClient } from "@/lib/supabase/server";

export type ProjectFormState =
  | {
      formError?: string;
      fieldErrors?: Partial<Record<ProjectFormField, string>>;
      values?: Partial<Record<ProjectFormField, string>>;
    }
  | undefined;

const idSchema = z.uuid();
/** Postgres foreign_key_violation: the client doesn't exist or isn't yours. */
const FK_VIOLATION = "23503";

function readForm(formData: FormData) {
  const values = Object.fromEntries(
    PROJECT_FORM_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]),
  ) as Record<ProjectFormField, string>;
  return { values, parsed: projectFormSchema.safeParse(values) };
}

function fieldErrorsFrom(error: z.ZodError) {
  const fieldErrors: Partial<Record<ProjectFormField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as ProjectFormField | undefined;
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function revalidateProject(id: string, clientId?: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireUser();
  const { values, parsed } = readForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return error.code === FK_VIOLATION
      ? { fieldErrors: { client_id: "Pick a client." }, values }
      : { formError: "Couldn't save the project. Try again.", values };
  }

  revalidateProject(data.id, parsed.data.client_id);
  redirect(`/projects/${data.id}`);
}

export async function updateProjectAction(
  id: string,
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { formError: "Unknown project." };

  const { values, parsed } = readForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const supabase = await createClient();
  const { data: before } = await supabase.from("projects").select("client_id").eq("id", id).maybeSingle();

  const { data, error } = await supabase
    .from("projects")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return error.code === FK_VIOLATION
      ? { fieldErrors: { client_id: "Pick a client." }, values }
      : { formError: "Couldn't save the project. Try again.", values };
  }
  if (!data) return { formError: "This project no longer exists.", values };

  revalidateProject(id, parsed.data.client_id);
  if (before && before.client_id !== parsed.data.client_id) revalidatePath(`/clients/${before.client_id}`);
  redirect(`/projects/${id}`);
}

/** Errors are returned, not thrown (production hides thrown action messages). */
export type ActionResult = { error?: string };

export async function setProjectStatusAction(id: string, status: string): Promise<ActionResult> {
  await requireUser();
  const parsedStatus = z.enum(PROJECT_STATUS_VALUES).safeParse(status);
  if (!idSchema.safeParse(id).success || !parsedStatus.success) return { error: "Invalid status." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ status: parsedStatus.data })
    .eq("id", id)
    .select("client_id")
    .maybeSingle();
  if (error) return { error: "Couldn't update the status. Try again." };

  revalidateProject(id, data?.client_id);
  return {};
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown project." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .select("client_id")
    .maybeSingle();
  if (error) {
    return {
      error:
        error.code === FK_VIOLATION
          ? "This project has tracked time, so it can't be deleted. Mark it Completed or Cancelled instead."
          : "Couldn't delete the project. Try again.",
    };
  }

  revalidateProject(id, data?.client_id);
  redirect("/projects");
}
