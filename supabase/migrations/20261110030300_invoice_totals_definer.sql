-- Follow-up to 20261110030200: the depth check doesn't cover AFTER triggers.
-- Postgres fires a cascade's BEFORE triggers nested inside it (depth 2), but its
-- AFTER triggers are queued and fired at the top level (depth 1). The invoice
-- totals trigger is AFTER, so during account deletion it still ran as
-- supabase_auth_admin and failed to update `invoices`.
--
-- It now runs with the owner's rights (SECURITY DEFINER). That grants nothing new:
-- it only recomputes the totals of the invoice whose lines just changed, and RLS
-- plus the composite FKs have already decided whether that line change was allowed
-- before this trigger runs. If the parent invoice is gone (cascade), the update
-- simply matches no rows.

create or replace function private.invoice_lines_recalc_parent()
returns trigger
language plpgsql
security definer
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

revoke all on function private.invoice_lines_recalc_parent() from public;
