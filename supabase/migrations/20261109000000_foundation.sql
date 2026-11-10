-- =============================================================================
-- Nexus foundation migration
--
-- Security baseline that every later migration builds on:
--   * `anon` gets NOTHING by default — every table is private to signed-in users.
--   * Every table has RLS enabled and scopes rows to (select auth.uid()).
--   * Internal helpers live in the `private` schema, which is not exposed over the API.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Lock down defaults
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Future tables / functions / sequences in `public` are never granted to anon.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon, public;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (business identity used on invoices/contracts)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  business_name  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;

create policy "profiles: owner can read"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: owner can update"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Auto-create a profile when an auth user is created.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- =============================================================================
-- TEMPLATE for every future table (copy this pattern):
--
--   create table public.<thing> (
--     id         uuid primary key default gen_random_uuid(),
--     owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
--     ...
--     created_at timestamptz not null default now(),
--     updated_at timestamptz not null default now()
--   );
--   create index on public.<thing> (owner_id);
--   alter table public.<thing> enable row level security;
--   create policy "<thing>: owner full access" on public.<thing>
--     for all to authenticated
--     using ((select auth.uid()) = owner_id)
--     with check ((select auth.uid()) = owner_id);
--   create trigger <thing>_set_updated_at before update on public.<thing>
--     for each row execute function private.set_updated_at();
-- =============================================================================
