"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type EnrollResult =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; error: string };

/**
 * Starts TOTP enrolment for a signed-in (AAL1) user who has no verified factor.
 * Users who already have a verified factor must verify it instead — adding a
 * new authenticator requires AAL2 and will live in Settings.
 */
export async function startEnrollment(): Promise<EnrollResult> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { ok: false, error: "Couldn't load your security settings. Try again." };

  if (factors.totp.length > 0) {
    return { ok: false, error: "An authenticator is already set up. Enter its code instead." };
  }

  // Clear abandoned, never-verified attempts so they don't pile up.
  await Promise.all(
    factors.all
      .filter((f) => f.factor_type === "totp" && f.status === "unverified")
      .map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })),
  );

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Nexus",
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
  });

  if (error || !data) {
    return { ok: false, error: "Couldn't start setup. Try again." };
  }

  return {
    ok: true,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

const verifySchema = z.object({
  factorId: z.uuid(),
  code: z.string().regex(/^\d{6}$/),
  next: z.string().optional(),
});

export type VerifyState = { error: string } | undefined;

/** Verifies a 6-digit code, upgrading the session to AAL2 on success. */
export async function verifyCode(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const parsed = verifySchema.safeParse({
    factorId: formData.get("factorId"),
    code: formData.get("code"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: "Enter the 6-digit code from your app." };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code: parsed.data.code,
  });

  if (error) {
    return {
      error:
        error.status === 429
          ? "Too many attempts. Wait a few minutes and try again."
          : "That code didn't work. Check your app and try again.",
    };
  }

  redirect(safeNext(parsed.data.next));
}
