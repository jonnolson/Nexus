import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toSearchPattern } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Client = Tables<"clients">;
export type ClientListItem = Pick<
  Client,
  "id" | "name" | "contact_name" | "email" | "phone" | "currency" | "default_rate_minor" | "archived_at"
>;


export async function listClients({
  q = "",
  archived = false,
}: { q?: string; archived?: boolean } = {}): Promise<ClientListItem[]> {
  await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, name, contact_name, email, phone, currency, default_rate_minor, archived_at")
    .order("name", { ascending: true })
    .limit(500);

  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  const pattern = toSearchPattern(q);
  if (pattern) {
    query = query.or(
      `name.ilike.${pattern},contact_name.ilike.${pattern},email.ilike.${pattern}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load clients: ${error.message}`);
  return data;
}

/** Loads one client or renders the 404 page. RLS hides other owners' rows. */
export async function getClient(id: string): Promise<Client> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(`Couldn't load client: ${error.message}`);
  if (!data) notFound();
  return data;
}

export type ClientOption = Pick<Client, "id" | "name" | "currency" | "default_rate_minor" | "archived_at">;

/**
 * Clients offered in pickers: active ones, plus `includeId` even if archived
 * (so editing a project whose client was archived still shows it).
 */
export async function listClientOptions(includeId?: string): Promise<ClientOption[]> {
  await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, name, currency, default_rate_minor, archived_at")
    .order("name", { ascending: true })
    .limit(1000);

  query =
    includeId && z.uuid().safeParse(includeId).success
      ? query.or(`archived_at.is.null,id.eq.${includeId}`)
      : query.is("archived_at", null);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load clients: ${error.message}`);
  return data;
}
