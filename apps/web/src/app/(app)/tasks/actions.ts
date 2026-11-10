"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TASK_STATUS_VALUES, safeTaskReturnTo } from "@/lib/tasks/constants";
import {
  TASK_FORM_FIELDS,
  quickTaskSchema,
  taskFormSchema,
  type TaskFormField,
} from "@/lib/tasks/schema";

/** Errors are returned, not thrown (production hides thrown action messages). */
export type ActionResult = { error?: string };

const idSchema = z.uuid();
const FK_VIOLATION = "23503";

function revalidateTasks(...projectIds: (string | null | undefined)[]) {
  revalidatePath("/tasks");
  for (const id of new Set(projectIds)) if (id) revalidatePath(`/projects/${id}`);
}

export type QuickTaskState = { error?: string; ok?: number } | undefined;

/** Quick add from the tasks page or a project page. `ok` changes on success so the form can reset. */
export async function quickAddTaskAction(_prev: QuickTaskState, formData: FormData): Promise<QuickTaskState> {
  await requireUser();
  const parsed = quickTaskSchema.safeParse({
    title: formData.get("title") ?? "",
    project_id: formData.get("project_id") ?? "",
    due_date: formData.get("due_date") ?? "",
    priority: formData.get("priority") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the task." };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert(parsed.data);
  if (error) {
    return { error: error.code === FK_VIOLATION ? "That project no longer exists." : "Couldn't add the task. Try again." };
  }

  revalidateTasks(parsed.data.project_id);
  return { ok: Date.now() };
}

export type TaskFormState =
  | {
      formError?: string;
      fieldErrors?: Partial<Record<TaskFormField, string>>;
      values?: Partial<Record<TaskFormField, string>>;
    }
  | undefined;

export async function updateTaskAction(
  id: string,
  returnTo: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { formError: "Unknown task." };

  const values = Object.fromEntries(
    TASK_FORM_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]),
  ) as Record<TaskFormField, string>;
  const parsed = taskFormSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<TaskFormField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as TaskFormField | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values };
  }

  const supabase = await createClient();
  const { data: before } = await supabase.from("tasks").select("project_id").eq("id", id).maybeSingle();
  const { data, error } = await supabase
    .from("tasks")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return error.code === FK_VIOLATION
      ? { fieldErrors: { project_id: "Pick a project." }, values }
      : { formError: "Couldn't save the task. Try again.", values };
  }
  if (!data) return { formError: "This task no longer exists.", values };

  revalidateTasks(parsed.data.project_id, before?.project_id);
  revalidatePath(`/tasks/${id}`);
  redirect(safeTaskReturnTo(returnTo));
}

export async function setTaskStatusAction(id: string, status: string): Promise<ActionResult> {
  await requireUser();
  const parsedStatus = z.enum(TASK_STATUS_VALUES).safeParse(status);
  if (!idSchema.safeParse(id).success || !parsedStatus.success) return { error: "Invalid status." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: parsedStatus.data })
    .eq("id", id)
    .select("project_id")
    .maybeSingle();
  if (error) return { error: "Couldn't update the task. Try again." };
  if (!data) return { error: "This task no longer exists." };

  revalidateTasks(data.project_id);
  revalidatePath(`/tasks/${id}`);
  return {};
}

export async function deleteTaskAction(id: string, returnTo: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown task." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .select("project_id")
    .maybeSingle();
  if (error) return { error: "Couldn't delete the task. Try again." };

  revalidateTasks(data?.project_id);
  redirect(safeTaskReturnTo(returnTo));
}
