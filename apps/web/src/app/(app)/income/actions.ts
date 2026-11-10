"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { INCOME_FORM_FIELDS, incomeFormSchema, type IncomeFormField } from "@/lib/income/schema";
import { createClient } from "@/lib/supabase/server";

/** Errors are returned, not thrown (production hides thrown action messages). */
export type ActionResult = { error?: string };

export type IncomeFormState =
  | {
      error?: string;
      fieldErrors?: Partial<Record<IncomeFormField, string>>;
      values?: Record<IncomeFormField, string>;
      ok?: number;
    }
  | undefined;

const idSchema = z.uuid();

function readIncome(formData: FormData) {
  const values = Object.fromEntries(INCOME_FORM_FIELDS.map((f) => [f, String(formData.get(f) ?? "")])) as Record<IncomeFormField, string>;
  const parsed = incomeFormSchema.safeParse(values);
  if (parsed.success) return { values, parsed } as const;
  const fieldErrors: Partial<Record<IncomeFormField, string>> = {};
  for (const i of parsed.error.issues) {
    const k = i.path[0] as IncomeFormField | undefined;
    if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
  }
  return { values, parsed, fieldErrors } as const;
}

const friendly = (code: string | undefined) =>
  code === "23503" ? "That client no longer exists." : "Couldn't save the income. Try again.";

function revalidateIncome(id?: string) {
  revalidatePath("/income");
  revalidatePath("/"); // dashboard
  if (id) revalidatePath(`/income/${id}`);
}

/** Record income from the Income page. `ok` changes on success so the form resets. */
export async function createIncomeAction(_prev: IncomeFormState, formData: FormData): Promise<IncomeFormState> {
  await requireUser();
  const { values, parsed, fieldErrors } = readIncome(formData);
  if (!parsed.success) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.from("income_entries").insert(parsed.data);
  if (error) return { error: friendly(error.code), values };

  revalidateIncome();
  return { ok: Date.now() };
}

export async function updateIncomeAction(id: string, _prev: IncomeFormState, formData: FormData): Promise<IncomeFormState> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown income entry." };
  const { values, parsed, fieldErrors } = readIncome(formData);
  if (!parsed.success) return { fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("income_entries").update(parsed.data).eq("id", id).select("id").maybeSingle();
  if (error) return { error: friendly(error.code), values };
  if (!data) return { error: "This income entry no longer exists.", values };

  revalidateIncome(id);
  redirect("/income");
}

export async function deleteIncomeAction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown income entry." };
  const supabase = await createClient();
  const { error } = await supabase.from("income_entries").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the income entry. Try again." };
  revalidateIncome(id);
  redirect("/income");
}
