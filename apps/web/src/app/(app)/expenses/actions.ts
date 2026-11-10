"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { expenseFormSchema, type ExpenseFormField } from "@/lib/expenses/schema";
import { createClient } from "@/lib/supabase/server";

/** Errors are returned, not thrown (production hides thrown action messages). */
export type ActionResult = { error?: string };

export type ExpenseFormState =
  | {
      error?: string;
      fieldErrors?: Partial<Record<ExpenseFormField, string>>;
      values?: Record<ExpenseFormField, string>;
      ok?: number;
    }
  | undefined;

const FIELDS: ExpenseFormField[] = ["title", "amount", "tax", "currency", "category", "spent_on", "notes"];
const idSchema = z.uuid();

function readExpense(formData: FormData) {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")])) as Record<ExpenseFormField, string>;
  const parsed = expenseFormSchema.safeParse(values);
  if (parsed.success) return { values, parsed } as const;
  const fieldErrors: Partial<Record<ExpenseFormField, string>> = {};
  for (const i of parsed.error.issues) {
    const k = i.path[0] as ExpenseFormField | undefined;
    if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
  }
  return { values, parsed, fieldErrors } as const;
}

/** Quick add from the Expenses page. `ok` changes on success so the form resets. */
export async function createExpenseAction(_prev: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  await requireUser();
  const { values, parsed, fieldErrors } = readExpense(formData);
  if (!parsed.success) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert(parsed.data);
  if (error) return { error: "Couldn't save the expense. Try again.", values };

  revalidatePath("/expenses");
  return { ok: Date.now() };
}

export async function updateExpenseAction(id: string, _prev: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown expense." };
  const { values, parsed, fieldErrors } = readExpense(formData);
  if (!parsed.success) return { fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("expenses").update(parsed.data).eq("id", id).select("id").maybeSingle();
  if (error) return { error: "Couldn't save the expense. Try again.", values };
  if (!data) return { error: "This expense no longer exists.", values };

  revalidatePath("/expenses");
  revalidatePath(`/expenses/${id}`);
  redirect("/expenses");
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown expense." };
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the expense. Try again." };
  revalidatePath("/expenses");
  redirect("/expenses");
}
