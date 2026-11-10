-- Fix: adding/editing invoice lines failed with "permission denied for schema private".
-- Trigger functions may live in `private` (firing a trigger doesn't check schema
-- access), but the line trigger *called* private.recalc_invoice(), and the
-- `authenticated` role has no USAGE on `private` by design. The recalculation is
-- now inlined in the trigger itself, and the helper is dropped.

create or replace function private.invoice_lines_recalc_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
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

drop function private.recalc_invoice(uuid);
