-- =============================================================================
-- Timer functions
--
-- Start/stop run in the database so they use one clock (now()) and are atomic:
-- starting a timer stops any running one in the same transaction. SECURITY
-- INVOKER, so RLS and the composite FKs apply exactly as for direct writes.
-- =============================================================================

alter table public.time_entries alter column started_at set default now();

create or replace function public.stop_timer()
returns setof public.time_entries
language sql
security invoker
set search_path = ''
as $$
  update public.time_entries
     set ended_at = greatest(now(), started_at + interval '1 second')
   where owner_id = (select auth.uid()) and ended_at is null
  returning *;
$$;

create or replace function public.start_timer(
  p_description text default null,
  p_client_id   uuid default null,
  p_project_id  uuid default null,
  p_task_id     uuid default null,
  p_billable    boolean default null
)
returns public.time_entries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_project uuid := p_project_id;
  v_billable boolean := p_billable;
  v_entry public.time_entries;
begin
  perform public.stop_timer();

  if p_task_id is not null then
    select coalesce(t.project_id, v_project) into v_project from public.tasks t where t.id = p_task_id;
  end if;

  -- Default: billable unless the project is non-billable.
  if v_billable is null then
    select p.billing_type <> 'non_billable' into v_billable from public.projects p where p.id = v_project;
    v_billable := coalesce(v_billable, true);
  end if;

  insert into public.time_entries (description, client_id, project_id, task_id, billable)
  values (nullif(btrim(p_description), ''), p_client_id, v_project, p_task_id, v_billable)
  returning * into v_entry;

  return v_entry;
end;
$$;

revoke all on function public.stop_timer() from public, anon;
revoke all on function public.start_timer(text, uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.stop_timer() to authenticated;
grant execute on function public.start_timer(text, uuid, uuid, uuid, boolean) to authenticated;
