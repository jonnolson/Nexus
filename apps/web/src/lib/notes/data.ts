import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toSearchPattern } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import type { NoteSpace } from "./schema";

export type Note = Tables<"notes"> & {
  client: Pick<Tables<"clients">, "id" | "name"> | null;
  project: Pick<Tables<"projects">, "id" | "name"> | null;
};

const NOTE_SELECT =
  "*, client:clients!notes_client_same_owner(id, name), project:projects!notes_project_same_owner(id, name)" as const;

const uuid = (v?: string | null) => (v && z.uuid().safeParse(v).success ? v : undefined);

export async function listNotes({
  space,
  q = "",
  clientId,
  projectId,
  limit = 500,
}: {
  space?: NoteSpace;
  q?: string;
  clientId?: string;
  projectId?: string;
  limit?: number;
}): Promise<Note[]> {
  await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("notes")
    .select(NOTE_SELECT)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (space) query = query.eq("space", space);
  if (uuid(clientId)) query = query.eq("client_id", clientId!);
  if (uuid(projectId)) query = query.eq("project_id", projectId!);
  const pattern = toSearchPattern(q);
  if (pattern) query = query.or(`title.ilike.${pattern},body.ilike.${pattern}`);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load notes: ${error.message}`);
  return data as unknown as Note[];
}

export async function getNote(id: string): Promise<Note> {
  await requireUser();
  if (!uuid(id)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select(NOTE_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the note: ${error.message}`);
  if (!data) notFound();
  return data as unknown as Note;
}

export type NoteLinkOptions = {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string }[];
};

/** Active clients and open projects, plus the note's current links whatever their state. */
export async function listNoteLinkOptions(include: { clientId?: string | null; projectId?: string | null } = {}): Promise<NoteLinkOptions> {
  await requireUser();
  const supabase = await createClient();
  const withId = (filter: string, id?: string) => (id ? `${filter},id.eq.${id}` : filter);

  const [clients, projects] = await Promise.all([
    supabase.from("clients").select("id, name").or(withId("archived_at.is.null", uuid(include.clientId))).order("name").limit(1000),
    supabase
      .from("projects")
      .select("id, name, client_id")
      .or(withId("status.in.(lead,active,on_hold)", uuid(include.projectId)))
      .order("name")
      .limit(1000),
  ]);
  const err = clients.error ?? projects.error;
  if (err) throw new Error(`Couldn't load options: ${err.message}`);
  return {
    clients: clients.data ?? [],
    projects: (projects.data ?? []).map((p) => ({ id: p.id, name: p.name, clientId: p.client_id })),
  };
}
