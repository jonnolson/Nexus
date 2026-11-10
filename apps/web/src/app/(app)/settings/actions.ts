"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { SETTINGS_FIELDS, settingsSchema, type SettingsField } from "@/lib/settings/schema";
import { createClient } from "@/lib/supabase/server";

export type SettingsState =
  | {
      formError?: string;
      fieldErrors?: Partial<Record<SettingsField, string>>;
      values?: Partial<Record<SettingsField, string>>;
      saved?: number;
    }
  | undefined;

export async function saveSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const values = Object.fromEntries(
    SETTINGS_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]),
  ) as Record<SettingsField, string>;

  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<SettingsField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as SettingsField | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { formError: "Couldn't save your settings. Try again.", values };

  revalidatePath("/", "layout");
  return { saved: Date.now(), values };
}
