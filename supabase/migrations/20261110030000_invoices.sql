-- =============================================================================
-- Invoices
--
--   profiles        + business details printed on invoices, numbering, terms
--   invoices        one per bill; status draft → sent → paid (or void)
--   invoice_lines   description × quantity × unit price; amount computed here
--   time_entries    + invoice_line_id: which line billed this entry
--
-- Money = integer minor units + currency. Totals are computed by the database
-- from the lines, so they can't drift from what's stored. Once an invoice leaves
-- draft its amounts, lines and billed time entries are locked; voiding releases
-- the time so it can be billed again.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Business details on the profile
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column business_email       text check (char_length(business_email) <= 320),
  add column business_phone       text check (char_length(business_phone) <= 50),
  add column address_line1        text check (char_length(address_line1) <= 200),
  add column address_line2        text check (char_length(address_line2) <= 200),
  add column city                 text check (char_length(city) <= 100),
  add column region               text check (char_length(region) <= 100),
  add column postal_code          text check (char_length(postal_code) <= 20),
  add column country_code         text not null default 'CA' check (country_code ~ '^[A-Z]{2}$'),
  -- Tax is only charged when this is set (you can't charge GST/HST unregistered).
  add column gst_number           text check (char_length(gst_number) <= 30),
  add column invoice_prefix       text not null default 'INV-' check (char_length(invoice_prefix) <= 20),
  add column next_invoice_number  integer not null default 1 check (next_invoice_number > 0),
  add column payment_terms_days   integer not null default 30 check (payment_terms_days between 0 and 365),
  add column invoice_footer       text check (char_length(invoice_footer) <= 2000);

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id        uuid not null,

  number           text not null check (char_length(number) between 1 and 40),
  status           text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),

  issue_date       date not null default current_date,
  due_date         date not null default current_date,
  currency         text not null check (currency ~ '^[A-Z]{3}$'),

  -- One sales tax line (GST or HST; 0 bps = none / zero-rated).
  tax_name         text,
  tax_rate_bps     integer not null default 0 check (tax_rate_bps between 0 and 10000),

  subtotal_minor   integer not null default 0,
  tax_minor        integer not null default 0,
  total_minor      integer not null default 0,

  notes            text check (char_length(notes) <= 5000),

  -- Frozen copies of who it's from / to, written when the invoice is sent.
  issuer_snapshot  jsonb,
  client_snapshot  jsonb,

  sent_at          timestamptz,
  paid_at          timestamptz,
  voided_at        timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint invoices_number_unique unique (owner_id, number),
  constraint invoices_id_owner_unique unique (id, owner_id),
  constraint invoices_due_after_issue check (due_date >= issue_date),
  constraint invoices_client_same_owner
    foreign key (client_id, owner_id) references public.clients (id, owner_id) on delete no action
);

create index invoices_owner_status_idx on public.invoices (owner_id, status, due_date);
create index invoices_client_id_idx on public.invoices (client_id);

alter table public.invoices enable row level security;
revoke all on public.invoices from anon;

create policy "invoices: owner can read" on public.invoices
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "invoices: owner can create" on public.invoices
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "invoices: owner can update" on public.invoices
  for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
-- Only drafts can be deleted; sent invoices are voided instead (keeps numbering intact).
create policy "invoices: owner can delete drafts" on public.invoices
  for delete to authenticated using ((select auth.uid()) = owner_id and status = 'draft');

create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Lines
-- ---------------------------------------------------------------------------
create table public.invoice_lines (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  invoice_id        uuid not null,
  project_id        uuid,

  position          integer not null default 0,
  description       text not null check (char_length(btrim(description)) between 1 and 500),
  quantity          numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price_minor  integer not null check (unit_price_minor >= 0),
  -- round(quantity × unit price), maintained by trigger.
  amount_minor      integer not null default 0,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint invoice_lines_id_owner_unique unique (id, owner_id),
  constraint invoice_lines_invoice_same_owner
    foreign key (invoice_id, owner_id) references public.invoices (id, owner_id) on delete cascade,
  constraint invoice_lines_project_same_owner
    foreign key (project_id, owner_id) references public.projects (id, owner_id) on delete set null (project_id)
);

create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id, position);
create index invoice_lines_project_idx on public.invoice_lines (project_id);

alter table public.invoice_lines enable row level security;
revoke all on public.invoice_lines from anon;

create policy "invoice_lines: owner full access" on public.invoice_lines
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger invoice_lines_set_updated_at before update on public.invoice_lines
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Time entries → the line that billed them
-- ---------------------------------------------------------------------------
alter table public.time_entries
  add column invoice_line_id uuid,
  add constraint time_entries_invoice_line_same_owner
    foreign key (invoice_line_id, owner_id) references public.invoice_lines (id, owner_id)
    on delete set null (invoice_line_id);

create index time_entries_invoice_line_idx on public.time_entries (invoice_line_id);
-- Fast "unbilled time" lookups.
create index time_entries_unbilled_idx on public.time_entries (owner_id, client_id)
  where invoice_line_id is null and billable and ended_at is not null;

-- ---------------------------------------------------------------------------
-- Totals
-- ---------------------------------------------------------------------------
create or replace function private.recalc_invoice(p_invoice_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.invoices i
     set subtotal_minor = s.subtotal,
         tax_minor      = round(s.subtotal * i.tax_rate_bps / 10000.0)::integer,
         total_minor    = s.subtotal + round(s.subtotal * i.tax_rate_bps / 10000.0)::integer
    from (select coalesce(sum(amount_minor), 0)::integer as subtotal
            from public.invoice_lines where invoice_id = p_invoice_id) s
   where i.id = p_invoice_id;
end;
$$;

create or replace function private.invoice_lines_compute_amount()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.amount_minor := round(new.quantity * new.unit_price_minor)::integer;
  return new;
end;
$$;

create trigger invoice_lines_compute_amount before insert or update on public.invoice_lines
  for each row execute function private.invoice_lines_compute_amount();

create or replace function private.invoice_lines_recalc_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.recalc_invoice(old.invoice_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.invoice_id <> old.invoice_id) then
    perform private.recalc_invoice(new.invoice_id);
  end if;
  return null;
end;
$$;

create trigger invoice_lines_recalc_parent after insert or update or delete on public.invoice_lines
  for each row execute function private.invoice_lines_recalc_parent();

-- Tax rate changed on a draft → recompute.
create or replace function private.invoices_recalc_on_tax_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.tax_minor   := round(new.subtotal_minor * new.tax_rate_bps / 10000.0)::integer;
  new.total_minor := new.subtotal_minor + new.tax_minor;
  return new;
end;
$$;

create trigger invoices_recalc_on_tax_change before update of tax_rate_bps on public.invoices
  for each row when (old.tax_rate_bps is distinct from new.tax_rate_bps)
  execute function private.invoices_recalc_on_tax_change();

-- ---------------------------------------------------------------------------
-- Locks. Enforced only for direct statements (pg_trigger_depth() = 1), so the
-- database's own cascades — voiding, deleting a whole account — still work.
-- ---------------------------------------------------------------------------
create or replace function private.invoices_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Allowed status moves.
  if new.status is distinct from old.status and not (
       (old.status = 'draft' and new.status = 'sent')
    or (old.status = 'sent'  and new.status in ('paid', 'void'))
    or (old.status = 'paid'  and new.status in ('sent', 'void'))
  ) then
    raise exception 'An invoice can''t go from % to %.', old.status, new.status
      using errcode = 'check_violation';
  end if;

  -- Once sent, the document itself is frozen.
  if old.status <> 'draft' and (
       new.client_id, new.number, new.issue_date, new.due_date, new.currency,
       new.tax_name, new.tax_rate_bps, new.subtotal_minor, new.tax_minor, new.total_minor,
       new.notes, new.issuer_snapshot, new.client_snapshot
     ) is distinct from (
       old.client_id, old.number, old.issue_date, old.due_date, old.currency,
       old.tax_name, old.tax_rate_bps, old.subtotal_minor, old.tax_minor, old.total_minor,
       old.notes, old.issuer_snapshot, old.client_snapshot
     ) then
    raise exception 'Invoice % has been sent and can''t be changed. Void it and create a new one.', old.number
      using errcode = 'check_violation';
  end if;

  -- Timestamps follow the status.
  if new.status = 'sent' and old.status = 'draft' then new.sent_at := coalesce(new.sent_at, now()); end if;
  if new.status = 'paid' then new.paid_at := coalesce(new.paid_at, now()); end if;
  if new.status = 'sent' and old.status = 'paid' then new.paid_at := null; end if;
  if new.status = 'void' then new.voided_at := now(); end if;

  return new;
end;
$$;

create trigger invoices_guard before update on public.invoices
  for each row execute function private.invoices_guard();

-- Voiding releases the invoice's time entries so they can be billed again.
create or replace function private.invoices_release_time_on_void()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.time_entries te
     set invoice_line_id = null
    from public.invoice_lines l
   where l.invoice_id = new.id and te.invoice_line_id = l.id;
  return null;
end;
$$;

create trigger invoices_release_time_on_void after update of status on public.invoices
  for each row when (new.status = 'void' and old.status <> 'void')
  execute function private.invoices_release_time_on_void();

create or replace function private.invoice_lines_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;
  select status into v_status from public.invoices
   where id = coalesce(new.invoice_id, old.invoice_id);
  if v_status is not null and v_status <> 'draft' then
    raise exception 'Lines can only be changed while the invoice is a draft.'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger invoice_lines_guard before insert or update or delete on public.invoice_lines
  for each row execute function private.invoice_lines_guard();

-- Time billed on a sent/paid invoice can't be edited, deleted or unlinked.
create or replace function private.time_entries_invoice_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_number text;
begin
  if pg_trigger_depth() > 1 or old.invoice_line_id is null then
    return coalesce(new, old);
  end if;

  select i.number into v_number
    from public.invoice_lines l join public.invoices i on i.id = l.invoice_id
   where l.id = old.invoice_line_id and i.status in ('sent', 'paid');

  if v_number is not null and (
       tg_op = 'DELETE'
    or (new.started_at, new.ended_at, new.billable, new.invoice_line_id, new.client_id, new.project_id)
       is distinct from
       (old.started_at, old.ended_at, old.billable, old.invoice_line_id, old.client_id, old.project_id)
  ) then
    raise exception 'This time is billed on invoice %. Void the invoice to change it.', v_number
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger time_entries_invoice_guard before update or delete on public.time_entries
  for each row execute function private.time_entries_invoice_guard();

-- ---------------------------------------------------------------------------
-- Numbering: atomically take the next number from the caller's profile.
-- ---------------------------------------------------------------------------
create or replace function public.allocate_invoice_number()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prefix text;
  v_n integer;
begin
  update public.profiles
     set next_invoice_number = next_invoice_number + 1
   where id = (select auth.uid())
  returning invoice_prefix, next_invoice_number - 1 into v_prefix, v_n;

  if v_n is null then
    raise exception 'No profile for this user.';
  end if;
  return v_prefix || lpad(v_n::text, 4, '0');
end;
$$;

revoke all on function public.allocate_invoice_number() from public, anon;
grant execute on function public.allocate_invoice_number() to authenticated;
