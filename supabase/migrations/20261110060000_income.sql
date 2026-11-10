-- =============================================================================
-- Income (accounting): manually recorded income
--
-- The Income page combines two sources:
--   * invoices marked paid (public.invoices, status = 'paid', dated by paid_at), and
--   * these manual entries: money received outside Nexus invoicing (e.g. payments
--     from before Nexus, cash/e-transfer jobs, other business income).
--
-- amount_minor is the total received (tax included), as integer minor units +
-- currency. tax_minor is the GST/HST portion of it (collected tax, owed to the
-- CRA); 0 when none. Income before tax = amount_minor - tax_minor.
--
-- Optionally linked to a client; deleting the client keeps the entry, unlinked.
-- =============================================================================

create table public.income_entries (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,

  title         text not null check (char_length(btrim(title)) between 1 and 200),
  amount_minor  integer not null check (amount_minor > 0),
  currency      text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  tax_minor     integer not null default 0 check (tax_minor >= 0),
  received_on   date not null default current_date,
  client_id     uuid,
  notes         text check (char_length(notes) <= 2000),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint income_entries_tax_within_amount check (tax_minor <= amount_minor),
  -- Can't point at another user's client (same pattern as projects / notes).
  constraint income_entries_client_same_owner
    foreign key (client_id, owner_id) references public.clients (id, owner_id)
    on delete set null (client_id)
);

create index income_entries_owner_received_idx on public.income_entries (owner_id, received_on desc);
create index income_entries_client_id_idx on public.income_entries (client_id);

alter table public.income_entries enable row level security;
revoke all on public.income_entries from anon;

create policy "income_entries: owner full access" on public.income_entries
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger income_entries_set_updated_at before update on public.income_entries
  for each row execute function private.set_updated_at();

-- Paid invoices are read by paid date on the Income page.
create index if not exists invoices_owner_paid_idx on public.invoices (owner_id, paid_at)
  where status = 'paid';
