-- =============================================================================
-- Make cross-table triggers safe inside cascades.
--
-- Deleting an account runs as `supabase_auth_admin`, which (correctly) has no
-- privileges on app tables. Any trigger that reads or writes ANOTHER table while
-- a cascade is running therefore fails, and the whole account deletion fails
-- with it. Found when the invoice-totals trigger tried to update `invoices`
-- while a user's invoice lines were being cascaded away.
--
-- Rule from here on: cross-table trigger work only happens for direct statements
-- (pg_trigger_depth() = 1). Cascaded changes never need it: they only clear links
-- or remove rows whose parents are being removed too.
-- =============================================================================

-- Invoice totals: skip in cascades (lines are being cleared/removed with their invoice).
create or replace function private.invoice_lines_recalc_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;
  foreach v_id in array (
    case
      when tg_op = 'INSERT' then array[new.invoice_id]
      when tg_op = 'DELETE' then array[old.invoice_id]
      when new.invoice_id = old.invoice_id then array[new.invoice_id]
      else array[old.invoice_id, new.invoice_id]
    end
  ) loop
    update public.invoices i
       set subtotal_minor = s.subtotal,
           tax_minor      = round(s.subtotal * i.tax_rate_bps / 10000.0)::integer,
           total_minor    = s.subtotal + round(s.subtotal * i.tax_rate_bps / 10000.0)::integer
      from (select coalesce(sum(amount_minor), 0)::integer as subtotal
              from public.invoice_lines where invoice_id = v_id) s
     where i.id = v_id;
  end loop;
  return null;
end;
$$;

-- Time entry parents: only derive for direct inserts/updates. Cascaded updates
-- (a task or invoice line being cleared) leave project/client as they are.
create or replace function private.time_entries_fill_parents()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_project uuid;
  v_client  uuid;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

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

-- Project moved to another client → its unbilled time follows. Billed time stays
-- with the client it was invoiced to.
create or replace function private.projects_cascade_client_to_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.time_entries set client_id = new.client_id
   where project_id = new.id
     and invoice_line_id is null
     and client_id is distinct from new.client_id;
  return null;
end;
$$;

-- Task moved to another project → its unbilled time follows (project AND client,
-- set here directly rather than relying on a nested trigger).
create or replace function private.tasks_cascade_project_to_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id is not null then
    update public.time_entries te
       set project_id = new.project_id,
           client_id  = p.client_id
      from public.projects p
     where p.id = new.project_id
       and te.task_id = new.id
       and te.invoice_line_id is null
       and (te.project_id is distinct from new.project_id or te.client_id is distinct from p.client_id);
  end if;
  return null;
end;
$$;
