import "server-only";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type RecentClient = {
  id: string;
  name: string;
  contact_name: string | null;
  /** ISO timestamp of the latest interaction. */
  at: string;
  /** What that interaction was, for the row's subtitle. */
  what: "Time tracked" | "Invoice" | "Project" | "Note" | "Added";
};

/**
 * Active clients ranked by their most recent interaction: time tracked, an invoice or
 * project touched, a linked note edited, or the client being added. Each source is
 * capped (newest 50) so this stays cheap as history grows. (`updated_at` on clients is
 * skipped on purpose: bulk imports touch every row.)
 */
export async function recentClients(limit = 5): Promise<RecentClient[]> {
  await requireUser();
  const supabase = await createClient();

  const [time, invoices, projects, notes, added] = await Promise.all([
    supabase.from("time_entries").select("client_id, at:started_at").not("client_id", "is", null).order("started_at", { ascending: false }).limit(50),
    supabase.from("invoices").select("client_id, at:updated_at").order("updated_at", { ascending: false }).limit(50),
    supabase.from("projects").select("client_id, at:updated_at").order("updated_at", { ascending: false }).limit(50),
    supabase.from("notes").select("client_id, at:updated_at").not("client_id", "is", null).order("updated_at", { ascending: false }).limit(50),
    supabase.from("clients").select("client_id:id, at:created_at").is("archived_at", null).order("created_at", { ascending: false }).limit(50),
  ]);
  const failed = [time, invoices, projects, notes, added].find((r) => r.error);
  if (failed?.error) throw new Error(`Couldn't load recent clients: ${failed.error.message}`);

  const latest = new Map<string, { at: string; what: RecentClient["what"] }>();
  const sources: [{ client_id: string | null; at: string }[] | null, RecentClient["what"]][] = [
    [time.data, "Time tracked"],
    [invoices.data, "Invoice"],
    [projects.data, "Project"],
    [notes.data, "Note"],
    [added.data, "Added"],
  ];
  for (const [rows, what] of sources) {
    for (const r of rows ?? []) {
      if (!r.client_id) continue;
      const prev = latest.get(r.client_id);
      if (!prev || r.at > prev.at) latest.set(r.client_id, { at: r.at, what });
    }
  }

  // Fetch a few spares in case some of the top ids are archived.
  const ranked = [...latest.entries()].sort((a, b) => (a[1].at < b[1].at ? 1 : -1)).slice(0, limit * 3);
  if (ranked.length === 0) return [];
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, contact_name")
    .in("id", ranked.map(([id]) => id))
    .is("archived_at", null);
  if (error) throw new Error(`Couldn't load recent clients: ${error.message}`);

  const byId = new Map(clients.map((c) => [c.id, c]));
  return ranked
    .filter(([id]) => byId.has(id))
    .slice(0, limit)
    .map(([id, info]) => ({ ...byId.get(id)!, ...info }));
}
