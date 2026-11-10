"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Ends this device's session. ("Sign out everywhere" will live in Settings.) */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
