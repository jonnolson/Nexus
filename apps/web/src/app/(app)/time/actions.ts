"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ENTRY_FORM_FIELDS,
  entryFormSchema,
  safeTimeReturnTo,
  timerStartSchema,
  type EntryFormField,
} from "@/lib/time/schema";

/** Errors are returned, not thrown (production hides thrown action messages). */
export type ActionResult = { error?: string };

const idSchema = z.uuid();
const FK_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";

/** The running timer shows in the shell on every page, so refresh everything. */
const revalidateAll = () => revalidatePath("/", "layout");

/** check_violation from the invoice lock carries a readable message ("billed on invoice INV-0003…"). */
const lockMessage = (e: { code?: string; message: string }) =>
  e.code === "23514" && e.message.includes("invoice") && !e.message.includes("violates") ? e.message : null;

const friendly = (code: string | undefined, fallback: string) =>
  code === FK_VIOLATION
    ? "That client, project or task no longer exists."
    : code === UNIQUE_VIOLATION
      ? "A timer is already running. Stop it first."
      : fallback;

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

export type TimerState = { error?: string } | undefined;

/** Start from the timer form (description + pickers + billable). */
export async function startTimerAction(_prev: TimerState, formData: FormData): Promise<TimerState> {
  await requireUser();
  const parsed = timerStartSchema.safeParse({
    description: formData.get("description") ?? "",
    client_id: formData.get("client_id") ?? "",
    project_id: formData.get("project_id") ?? "",
    task_id: formData.get("task_id") ?? "",
    billable: formData.get("billable") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the timer details." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_timer", {
    p_description: parsed.data.description ?? undefined,
    p_client_id: parsed.data.client_id ?? undefined,
    p_project_id: parsed.data.project_id ?? undefined,
    p_task_id: parsed.data.task_id ?? undefined,
    p_billable: parsed.data.billable,
  });
  if (error) return { error: friendly(error.code, "Couldn't start the timer. Try again.") };

  revalidateAll();
  return {};
}

/** One-click start from a task or project (▶ buttons). Billable follows the project. */
export async function startTimerForAction(target: { taskId?: string; projectId?: string }): Promise<ActionResult> {
  await requireUser();
  const taskId = target.taskId && idSchema.safeParse(target.taskId).success ? target.taskId : undefined;
  const projectId = target.projectId && idSchema.safeParse(target.projectId).success ? target.projectId : undefined;
  if (!taskId && !projectId) return { error: "Nothing to time." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_timer", { p_task_id: taskId, p_project_id: projectId });
  if (error) return { error: friendly(error.code, "Couldn't start the timer. Try again.") };

  revalidateAll();
  return {};
}

export async function stopTimerAction(): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("stop_timer");
  if (error) return { error: "Couldn't stop the timer. Try again." };
  revalidateAll();
  return {};
}

/** Throw away the running timer without saving it. */
export async function discardTimerAction(): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").delete().is("ended_at", null);
  if (error) return { error: "Couldn't discard the timer. Try again." };
  revalidateAll();
  return {};
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export type EntryFormState =
  | {
      formError?: string;
      fieldErrors?: Partial<Record<EntryFormField, string>>;
      values?: Partial<Record<EntryFormField, string>>;
      ok?: number;
    }
  | undefined;

function readEntryForm(formData: FormData) {
  const values = Object.fromEntries(
    ENTRY_FORM_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]),
  ) as Record<EntryFormField, string>;
  const parsed = entryFormSchema.safeParse(values);
  if (parsed.success) return { values, parsed } as const;

  const fieldErrors: Partial<Record<EntryFormField, string>> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as EntryFormField | undefined;
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { values, parsed, fieldErrors } as const;
}

/** Manual entry from the Time page. Returns `ok` so the form can reset. */
export async function createEntryAction(_prev: EntryFormState, formData: FormData): Promise<EntryFormState> {
  await requireUser();
  formData.set("allow_running", ""); // manual entries always have an end
  const { values, parsed, fieldErrors } = readEntryForm(formData);
  if (!parsed.success) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").insert(parsed.data);
  if (error) return { formError: friendly(error.code, "Couldn't save the entry. Try again."), values };

  revalidateAll();
  return { ok: Date.now() };
}

export async function updateEntryAction(
  id: string,
  returnTo: string,
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { formError: "Unknown entry." };

  const supabase = await createClient();
  const { data: current } = await supabase.from("time_entries").select("ended_at").eq("id", id).maybeSingle();
  if (!current) return { formError: "This entry no longer exists." };

  // Only the running timer may be saved without an end.
  formData.set("allow_running", current.ended_at === null ? "on" : "");
  const { values, parsed, fieldErrors } = readEntryForm(formData);
  if (!parsed.success) return { fieldErrors, values };

  const { error } = await supabase.from("time_entries").update(parsed.data).eq("id", id);
  if (error) return { formError: lockMessage(error) ?? friendly(error.code, "Couldn't save the entry. Try again."), values };

  revalidateAll();
  redirect(safeTimeReturnTo(returnTo));
}

export async function deleteEntryAction(id: string, returnTo: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown entry." };
  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").delete().eq("id", id);
  if (error) return { error: lockMessage(error) ?? "Couldn't delete the entry. Try again." };
  revalidateAll();
  redirect(safeTimeReturnTo(returnTo));
}
