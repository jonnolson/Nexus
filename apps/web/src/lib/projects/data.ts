import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toSearchPattern } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { PROJECT_VIEWS, type ProjectView } from "./constants";

type ProjectClient = Pick<Tables<"clients">, "id" | "name" | "currency" | "default_rate_minor" | "archived_at">;
export type Project = Tables<"projects"> & { client: ProjectClient };

const PROJECT_SELECT =
  "*, client:clients!projects_client_same_owner(id, name, currency, default_rate_minor, archived_at)" as const;

export async function listProjects({
  q = "",
  view = "open",
  clientId,
}: { q?: string; view?: ProjectView; clientId?: string } = {}): Promise<Project[]> {
  await requireUser();
  const supabase = await createClient();

  const statuses = (PROJECT_VIEWS.find((v) => v.value === view) ?? PROJECT_VIEWS[0]).statuses;

  let query = supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .in("status", [...statuses])
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true })
    .limit(500);

  if (clientId && z.uuid().safeParse(clientId).success) query = query.eq("client_id", clientId);

  const pattern = toSearchPattern(q);
  if (pattern) query = query.ilike("name", pattern);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load projects: ${error.message}`);
  return data as Project[];
}

/** All projects for one client (client page), newest first. */
export async function listProjectsForClient(clientId: string): Promise<Project[]> {
  await requireUser();
  if (!z.uuid().safeParse(clientId).success) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Couldn't load projects: ${error.message}`);
  return data as Project[];
}

export async function getProject(id: string): Promise<Project> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Couldn't load project: ${error.message}`);
  if (!data) notFound();
  return data as Project;
}

/** Effective hourly rate: the project's override, else the client's default. */
export function effectiveHourlyRate(
  p: Project,
): { minor: number; currency: string; fromClient: boolean } | null {
  if (p.billing_type !== "hourly") return null;
  if (p.hourly_rate_minor != null) {
    return { minor: p.hourly_rate_minor, currency: p.currency, fromClient: false };
  }
  // The client's rate is in the client's currency; only inherit it when they match.
  if (p.client.default_rate_minor != null && p.client.currency === p.currency) {
    return { minor: p.client.default_rate_minor, currency: p.client.currency, fromClient: true };
  }
  return null;
}
