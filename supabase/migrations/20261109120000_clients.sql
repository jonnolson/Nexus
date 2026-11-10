-- =============================================================================
-- Clients (CRM)
--
-- One row per client business or person. Holds the primary contact and billing
-- details that invoices/contracts snapshot when they're sent. Archive (not delete)
-- is the normal way to retire a client once projects/invoices reference it.
-- =============================================================================

create table public.clients (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,

  name                  text not null check (char_length(btrim(name)) between 1 and 200),

  -- Primary contact
  contact_name          text check (char_length(contact_name) <= 200),
  email                 text check (char_length(email) <= 320),
  phone                 text check (char_length(phone) <= 50),
  website               text check (char_length(website) <= 500),

  -- Billing address
  address_line1         text check (char_length(address_line1) <= 200),
  address_line2         text check (char_length(address_line2) <= 200),
  city                  text check (char_length(city) <= 100),
  region                text check (char_length(region) <= 100),
  postal_code           text check (char_length(postal_code) <= 20),
  country               text check (char_length(country) <= 100),
  tax_id                text check (char_length(tax_id) <= 50),

  -- Billing defaults. Money = integer minor units + ISO 4217 code.
  currency              text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  default_rate_minor    integer check (default_rate_minor >= 0),

  notes                 text check (char_length(notes) <= 10000),
  archived_at           timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index clients_owner_id_idx on public.clients (owner_id);
create index clients_owner_name_idx on public.clients (owner_id, lower(name));

alter table public.clients enable row level security;
revoke all on public.clients from anon;

create policy "clients: owner full access" on public.clients
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger clients_set_updated_at before update on public.clients
  for each row execute function private.set_updated_at();
