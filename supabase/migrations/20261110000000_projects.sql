-- =============================================================================
-- Projects
--
-- Every project belongs to one client. Billing is hourly (rate falls back to the
-- client's default when null), a fixed fee, or non-billable. Money = integer
-- minor units + ISO currency code (copied from the client by default).
-- =============================================================================

-- Lets child tables use a composite FK (client_id, owner_id) so a row can only
-- ever point at a client owned by the same user. A plain FK bypasses RLS and
-- would accept another owner's client id.
alter table public.clients
  add constraint clients_id_owner_unique unique (id, owner_id);

create table public.projects (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id             uuid not null,

  name                  text not null check (char_length(btrim(name)) between 1 and 200),
  description           text check (char_length(description) <= 10000),

  status                text not null default 'active'
                        check (status in ('lead', 'active', 'on_hold', 'completed', 'cancelled')),

  billing_type          text not null default 'hourly'
                        check (billing_type in ('hourly', 'fixed', 'non_billable')),
  currency              text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  -- Hourly: null = use the client's default rate.
  hourly_rate_minor     integer check (hourly_rate_minor >= 0),
  -- Fixed: the agreed fee.
  fixed_fee_minor       integer check (fixed_fee_minor >= 0),
  budget_minutes        integer check (budget_minutes > 0),

  start_date            date,
  due_date              date,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint projects_client_same_owner
    foreign key (client_id, owner_id) references public.clients (id, owner_id) on delete restrict,
  constraint projects_dates_ordered
    check (start_date is null or due_date is null or due_date >= start_date),
  constraint projects_fixed_has_fee
    check (billing_type <> 'fixed' or fixed_fee_minor is not null)
);

create index projects_owner_id_idx on public.projects (owner_id);
create index projects_client_id_idx on public.projects (client_id);
create index projects_owner_status_idx on public.projects (owner_id, status);

alter table public.projects enable row level security;
revoke all on public.projects from anon;

create policy "projects: owner full access" on public.projects
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger projects_set_updated_at before update on public.projects
  for each row execute function private.set_updated_at();
