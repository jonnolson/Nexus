-- =============================================================================
-- Tasks
--
-- A task usually belongs to a project; project_id may be null for standalone
-- "inbox" to-dos. Deleting a project deletes its tasks. completed_at is kept in
-- sync with status by a trigger, so it can't drift from what the UI sends.
-- =============================================================================

-- Composite target so a task can only reference a project owned by the same user.
alter table public.projects
  add constraint projects_id_owner_unique unique (id, owner_id);

create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id        uuid,

  title             text not null check (char_length(btrim(title)) between 1 and 300),
  notes             text check (char_length(notes) <= 10000),

  status            text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  -- 1 = low, 2 = normal, 3 = high (numeric so it sorts).
  priority          smallint not null default 2 check (priority between 1 and 3),
  due_date          date,
  estimate_minutes  integer check (estimate_minutes > 0),
  completed_at      timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- MATCH SIMPLE (default): no check when project_id is null.
  constraint tasks_project_same_owner
    foreign key (project_id, owner_id) references public.projects (id, owner_id) on delete cascade
);

create index tasks_owner_id_idx on public.tasks (owner_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_owner_status_due_idx on public.tasks (owner_id, status, due_date);

alter table public.tasks enable row level security;
revoke all on public.tasks from anon;

create policy "tasks: owner full access" on public.tasks
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function private.set_updated_at();

create or replace function private.set_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then
      new.completed_at = now();
    end if;
  else
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_set_completed_at before insert or update of status on public.tasks
  for each row execute function private.set_task_completed_at();
