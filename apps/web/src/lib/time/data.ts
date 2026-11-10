import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { entryMinutes } from "./format";

type EntryClient = Pick<Tables<"clients">, "id" | "name" | "currency" | "default_rate_minor">;
type EntryProject = Pick<Tables<"projects">, "id" | "name" | "billing_type" | "hourly_rate_minor" | "currency">;
type EntryTask = Pick<Tables<"tasks">, "id" | "title">;

export type TimeEntry = Tables<"time_entries"> & {
  client: EntryClient | null;
  project: EntryProject | null;
  task: EntryTask | null;
};

const ENTRY_SELECT = [
  "*",
  "client:clients!time_entries_client_same_owner(id, name, currency, default_rate_minor)",
  "project:projects!time_entries_project_same_owner(id, name, billing_type, hourly_rate_minor, currency)",
  "task:tasks!time_entries_task_same_owner(id, title)",
].join(", ");

// ---------------------------------------------------------------------------
// Value
// ---------------------------------------------------------------------------

/**
 * Hourly rate for an entry: project override → client default (same currency).
 * Fixed-fee and non-billable projects have no hourly value.
 */
export function entryRate(e: TimeEntry): { minor: number; currency: string } | null {
  if (e.project) {
    if (e.project.billing_type !== "hourly") return null;
    if (e.project.hourly_rate_minor != null) return { minor: e.project.hourly_rate_minor, currency: e.project.currency };
    if (e.client?.default_rate_minor != null && e.client.currency === e.project.currency) {
      return { minor: e.client.default_rate_minor, currency: e.client.currency };
    }
    return null;
  }
  if (e.client?.default_rate_minor != null) return { minor: e.client.default_rate_minor, currency: e.client.currency };
  return null;
}

/** Billable value in minor units, or null when there's no hourly rate. */
export function entryValue(e: TimeEntry, now?: number): { minor: number; currency: string } | null {
  if (!e.billable) return null;
  const rate = entryRate(e);
  if (!rate) return null;
  return { minor: Math.round((entryMinutes(e.started_at, e.ended_at, now) * rate.minor) / 60), currency: rate.currency };
}

export type TimeTotals = {
  minutes: number;
  billableMinutes: number;
  /** Billable value per currency (minor units). */
  value: Record<string, number>;
};

export function totalsOf(entries: TimeEntry[], now = Date.now()): TimeTotals {
  const totals: TimeTotals = { minutes: 0, billableMinutes: 0, value: {} };
  for (const e of entries) {
    const minutes = entryMinutes(e.started_at, e.ended_at, now);
    totals.minutes += minutes;
    if (e.billable) totals.billableMinutes += minutes;
    const v = entryValue(e, now);
    if (v) totals.value[v.currency] = (totals.value[v.currency] ?? 0) + v.minor;
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getRunningEntry(): Promise<TimeEntry | null> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select(ENTRY_SELECT)
    .is("ended_at", null)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the timer: ${error.message}`);
  return data as unknown as TimeEntry | null;
}

export async function listEntries({
  fromIso,
  toIso,
  clientId,
  projectId,
  taskId,
  internalOnly,
}: {
  fromIso?: string;
  toIso?: string;
  clientId?: string;
  projectId?: string;
  taskId?: string;
  internalOnly?: boolean;
}): Promise<TimeEntry[]> {
  await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("time_entries")
    .select(ENTRY_SELECT)
    .order("started_at", { ascending: false })
    .limit(2000);

  if (fromIso) query = query.gte("started_at", fromIso);
  if (toIso) query = query.lt("started_at", toIso);
  const uuid = (v?: string) => (v && z.uuid().safeParse(v).success ? v : undefined);
  if (uuid(clientId)) query = query.eq("client_id", clientId!);
  if (uuid(projectId)) query = query.eq("project_id", projectId!);
  if (uuid(taskId)) query = query.eq("task_id", taskId!);
  if (internalOnly) query = query.is("client_id", null);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load time entries: ${error.message}`);
  return data as unknown as TimeEntry[];
}

export async function getEntry(id: string): Promise<TimeEntry> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("time_entries").select(ENTRY_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the entry: ${error.message}`);
  if (!data) notFound();
  return data as unknown as TimeEntry;
}

// ---------------------------------------------------------------------------
// Picker options (client → project → task)
// ---------------------------------------------------------------------------

export type TimeOptions = {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string; billable: boolean }[];
  tasks: { id: string; title: string; projectId: string | null }[];
};

/** Active clients, open projects and open tasks, plus any ids passed in `include`. */
export async function listTimeOptions(include: {
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
} = {}): Promise<TimeOptions> {
  await requireUser();
  const supabase = await createClient();
  const uuid = (v?: string | null) => (v && z.uuid().safeParse(v).success ? v : null);
  const withId = (filter: string, id: string | null) => (id ? `${filter},id.eq.${id}` : filter);

  const [clients, projects, tasks] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .or(withId("archived_at.is.null", uuid(include.clientId)))
      .order("name")
      .limit(1000),
    supabase
      .from("projects")
      .select("id, name, client_id, billing_type")
      .or(withId("status.in.(lead,active,on_hold)", uuid(include.projectId)))
      .order("name")
      .limit(1000),
    supabase
      .from("tasks")
      .select("id, title, project_id")
      .or(withId("status.in.(todo,in_progress)", uuid(include.taskId)))
      .order("title")
      .limit(2000),
  ]);

  const err = clients.error ?? projects.error ?? tasks.error;
  if (err) throw new Error(`Couldn't load options: ${err.message}`);

  return {
    clients: clients.data ?? [],
    projects: (projects.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      clientId: p.client_id,
      billable: p.billing_type !== "non_billable",
    })),
    tasks: (tasks.data ?? []).map((t) => ({ id: t.id, title: t.title, projectId: t.project_id })),
  };
}
