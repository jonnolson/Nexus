-- =============================================================================
-- Notes (basic)
--
-- Plain-text notes in two spaces (work / personal). Work notes may link to a
-- client and/or project; linking a project fills in its client (same rule as
-- time entries) and the note follows if the project moves to another client.
-- Deleting a client or project keeps its notes, just unlinked.
--
-- Room to grow: `body` is plain text today; a rich-text JSON column (Tiptap) and
-- notebooks can be added later without changing what's here.
-- =============================================================================

create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,

  space       text not null default 'work' check (space in ('work', 'personal')),
  title       text not null default '' check (char_length(title) <= 300),
  body        text not null default '' check (char_length(body) <= 100000),
  pinned      boolean not null default false,

  client_id   uuid,
  project_id  uuid,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint notes_personal_unlinked
    check (space = 'work' or (client_id is null and project_id is null)),
  constraint notes_client_same_owner
    foreign key (client_id, owner_id) references public.clients (id, owner_id)
    on delete set null (client_id),
  constraint notes_project_same_owner
    foreign key (project_id, owner_id) references public.projects (id, owner_id)
    on delete set null (project_id)
);

create index notes_owner_space_idx on public.notes (owner_id, space, pinned desc, updated_at desc);
create index notes_client_id_idx on public.notes (client_id);
create index notes_project_id_idx on public.notes (project_id);

alter table public.notes enable row level security;
revoke all on public.notes from anon;

create policy "notes: owner full access" on public.notes
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger notes_set_updated_at before update on public.notes
  for each row execute function private.set_updated_at();

-- Project chosen → client := project's client. Direct statements only
-- (pg_trigger_depth() = 1): cascaded updates (a project/client being deleted and
-- its link cleared) must not read other tables — see 20261110030200.
create or replace function private.notes_fill_client()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_client uuid;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.project_id is not null then
    select p.client_id into v_client from public.projects p where p.id = new.project_id;
    if found then
      new.client_id := v_client;
    end if;
  end if;
  return new;
end;
$$;

create trigger notes_fill_client before insert or update on public.notes
  for each row execute function private.notes_fill_client();

-- Project moved to another client → its notes follow. Only fires on a direct
-- change of projects.client_id (never during cascades).
create or replace function private.projects_cascade_client_to_notes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.notes set client_id = new.client_id
   where project_id = new.id and client_id is distinct from new.client_id;
  return null;
end;
$$;

create trigger projects_cascade_client_to_notes after update of client_id on public.projects
  for each row when (old.client_id is distinct from new.client_id)
  execute function private.projects_cascade_client_to_notes();
