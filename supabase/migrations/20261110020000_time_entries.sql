-- =============================================================================
-- Time entries
--
-- A time entry hangs off a task, a project, or just a client (client_id null =
-- internal/admin time). The parents are kept consistent by triggers:
--   task chosen    → project_id := task's project (when it has one)
--   project chosen → client_id  := project's client
-- and when a project moves to another client, or a task to another project,
-- its entries follow.
--
-- ended_at null = the running timer; at most one per user.
-- Durations are derived from started_at / ended_at, never stored.
-- =============================================================================

alter table public.tasks
  add constraint tasks_id_owner_unique unique (id, owner_id);

create table public.time_entries (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,

  client_id     uuid,
  project_id    uuid,
  task_id       uuid,

  description   text check (char_length(description) <= 2000),
  billable      boolean not null default true,

  started_at    timestamptz not null,
  ended_at      timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint time_entries_ended_after_started check (ended_at is null or ended_at > started_at),

  -- Composite FKs: parents must belong to the same owner. NO ACTION = a client or
  -- project with tracked time can't be deleted (checked at end of statement, so
  -- deleting the whole user still cascades cleanly).
  constraint time_entries_client_same_owner
    foreign key (client_id, owner_id) references public.clients (id, owner_id) on delete no action,
  constraint time_entries_project_same_owner
    foreign key (project_id, owner_id) references public.projects (id, owner_id) on delete no action,
  -- Deleting a task keeps its time (on the project); only task_id is cleared.
  constraint time_entries_task_same_owner
    foreign key (task_id, owner_id) references public.tasks (id, owner_id) on delete set null (task_id)
);

create index time_entries_owner_started_idx on public.time_entries (owner_id, started_at desc);
create index time_entries_client_id_idx on public.time_entries (client_id);
create index time_entries_project_id_idx on public.time_entries (project_id);
create index time_entries_task_id_idx on public.time_entries (task_id);
-- One running timer per user.
create unique index time_entries_one_running_per_owner
  on public.time_entries (owner_id) where ended_at is null;

alter table public.time_entries enable row level security;
revoke all on public.time_entries from anon;

create policy "time_entries: owner full access" on public.time_entries
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger time_entries_set_updated_at before update on public.time_entries
  for each row execute function private.set_updated_at();

-- Fill project/client from the most specific parent. Runs as the caller, so RLS
-- applies: another owner's task/project is invisible here, the values are left
-- as given, and the composite FKs then reject the row.
create or replace function private.time_entries_fill_parents()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_project uuid;
  v_client  uuid;
begin
  if new.task_id is not null then
    select t.project_id into v_project from public.tasks t where t.id = new.task_id;
    if v_project is not null then
      new.project_id := v_project;
    end if;
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

create trigger time_entries_fill_parents before insert or update on public.time_entries
  for each row execute function private.time_entries_fill_parents();

-- Keep entries consistent when a project changes client.
create or replace function private.projects_cascade_client_to_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.time_entries set client_id = new.client_id
   where project_id = new.id and client_id is distinct from new.client_id;
  return null;
end;
$$;

create trigger projects_cascade_client_to_time after update of client_id on public.projects
  for each row when (old.client_id is distinct from new.client_id)
  execute function private.projects_cascade_client_to_time();

-- ...and when a task moves to another project (the fill trigger then fixes client_id).
create or replace function private.tasks_cascade_project_to_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id is not null then
    update public.time_entries set project_id = new.project_id
     where task_id = new.id and project_id is distinct from new.project_id;
  end if;
  return null;
end;
$$;

create trigger tasks_cascade_project_to_time after update of project_id on public.tasks
  for each row when (old.project_id is distinct from new.project_id)
  execute function private.tasks_cascade_project_to_time();
