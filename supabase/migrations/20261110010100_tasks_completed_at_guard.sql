-- completed_at is owned by the database: it is set when a task becomes done, kept
-- while it stays done, and cleared when it's reopened. The first version fired only
-- on `update of status`, so an update that set completed_at alone (or re-sent
-- status = 'done' with completed_at = null) could overwrite it.
create or replace function private.set_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    if tg_op = 'UPDATE' and old.status = 'done' then
      new.completed_at = old.completed_at;   -- stays done: keep the original time
    else
      new.completed_at = now();              -- just became done
    end if;
  else
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger tasks_set_completed_at on public.tasks;
create trigger tasks_set_completed_at before insert or update on public.tasks
  for each row execute function private.set_task_completed_at();
