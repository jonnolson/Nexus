import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toSearchPattern } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { OPEN_TASK_STATUSES, type TaskView } from "./constants";

type TaskProject = Pick<Tables<"projects">, "id" | "name" | "status"> & {
  client: Pick<Tables<"clients">, "id" | "name">;
};
export type Task = Tables<"tasks"> & { project: TaskProject | null };

const TASK_SELECT =
  "*, project:projects!tasks_project_same_owner(id, name, status, client:clients!projects_client_same_owner(id, name))" as const;

export async function listTasks({
  q = "",
  view = "open",
  projectId,
}: { q?: string; view?: TaskView; projectId?: string | "none" } = {}): Promise<Task[]> {
  await requireUser();
  const supabase = await createClient();

  let query = supabase.from("tasks").select(TASK_SELECT).limit(500);

  if (view === "open") {
    query = query
      .in("status", OPEN_TASK_STATUSES)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
  } else if (view === "done") {
    query = query.eq("status", "done").order("completed_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (projectId === "none") query = query.is("project_id", null);
  else if (projectId && z.uuid().safeParse(projectId).success) query = query.eq("project_id", projectId);

  const pattern = toSearchPattern(q);
  if (pattern) query = query.ilike("title", pattern);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load tasks: ${error.message}`);
  return data as Task[];
}

/** A project's tasks: open first (by due date, priority), then done (latest first). */
export async function listTasksForProject(projectId: string): Promise<Task[]> {
  await requireUser();
  if (!z.uuid().safeParse(projectId).success) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("project_id", projectId)
    .order("completed_at", { ascending: false, nullsFirst: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) throw new Error(`Couldn't load tasks: ${error.message}`);
  return data as Task[];
}

export async function getTask(id: string): Promise<Task> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select(TASK_SELECT).eq("id", id).maybeSingle();

  if (error) throw new Error(`Couldn't load task: ${error.message}`);
  if (!data) notFound();
  return data as Task;
}

export type ProjectOption = { id: string; name: string; clientName: string; status: string };

/** Projects offered in task pickers: open ones, plus `includeId` whatever its status. */
export async function listProjectOptions(includeId?: string | null): Promise<ProjectOption[]> {
  await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select("id, name, status, client:clients!projects_client_same_owner(name)")
    .order("name", { ascending: true })
    .limit(1000);

  const open = "status.in.(lead,active,on_hold)";
  query =
    includeId && z.uuid().safeParse(includeId).success
      ? query.or(`${open},id.eq.${includeId}`)
      : query.in("status", ["lead", "active", "on_hold"]);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load projects: ${error.message}`);
  return (data as unknown as { id: string; name: string; status: string; client: { name: string } }[]).map(
    (p) => ({ id: p.id, name: p.name, status: p.status, clientName: p.client.name }),
  );
}
