import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasRequiredAal } from "@/lib/mfa-policy";

export type CurrentUser = {
  id: string;
  email: string | undefined;
};

/**
 * Data Access Layer entry point. Call at the top of every Server Component,
 * Server Action and Route Handler that touches user data — never rely on
 * proxy.ts alone. Deduplicated per request via React `cache`.
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) redirect("/login");
  if (!hasRequiredAal(data.claims.aal)) redirect("/mfa");

  return { id: data.claims.sub, email: data.claims.email };
});
