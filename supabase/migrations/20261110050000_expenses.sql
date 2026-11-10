-- =============================================================================
-- Expenses (accounting, basic)
--
-- One row per business expense. Amount is the total paid (tax included), as
-- integer minor units + currency. tax_minor is the GST/HST portion of that total
-- (for input tax credits); 0 when none / unknown.
--
-- Categories follow the CRA T2125 business-expense lines so yearly totals map
-- onto the tax return. The list is enforced here and mirrored in
-- apps/web/src/lib/expenses/categories.ts; add categories via a new migration.
-- =============================================================================

create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,

  title         text not null check (char_length(btrim(title)) between 1 and 200),
  amount_minor  integer not null check (amount_minor > 0),
  currency      text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  tax_minor     integer not null default 0 check (tax_minor >= 0),
  category      text not null check (category in (
                  'advertising', 'meals', 'office', 'supplies', 'software', 'professional_fees',
                  'rent', 'phone_internet', 'travel', 'vehicle', 'insurance', 'bank_fees',
                  'equipment', 'education', 'subcontractors', 'other'
                )),
  spent_on      date not null default current_date,
  notes         text check (char_length(notes) <= 2000),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint expenses_tax_within_amount check (tax_minor <= amount_minor)
);

create index expenses_owner_spent_idx on public.expenses (owner_id, spent_on desc);
create index expenses_owner_category_idx on public.expenses (owner_id, category);

alter table public.expenses enable row level security;
revoke all on public.expenses from anon;

create policy "expenses: owner full access" on public.expenses
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function private.set_updated_at();
