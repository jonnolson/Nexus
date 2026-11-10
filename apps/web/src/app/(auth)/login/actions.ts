"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { mfaRequired } from "@/lib/mfa-policy";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type LoginState = { error: string; email: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = schema.safeParse({
    email,
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately vague: never reveal whether the email exists.
    const message =
      error.status === 429
        ? "Too many attempts. Wait a few minutes and try again."
        : error.code === "email_not_confirmed"
          ? "Confirm your email address before signing in."
          : "Incorrect email or password.";
    return { error: message, email };
  }

  // Password alone is AAL1 — continue to the second factor (unless the dev flag disables it).
  const next = safeNext(parsed.data.next);
  if (!mfaRequired) redirect(next);
  redirect(next === "/" ? "/mfa" : `/mfa?next=${encodeURIComponent(next)}`);
}
