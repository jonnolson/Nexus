# Where we left off (2026-11-10)

Status: **Clients, Projects, Tasks, Time tracking, Invoices, Settings, Notes (basic) and
Expenses (basic, Accounting section) are built and verified** (typecheck, lint, production
build, 265 smoke checks). Since then also done: custom animated dropdowns everywhere,
Nexus logo + app icons (web + desktop), accent `#94FFF3` used as outlines/strokes only
(rules in `CLAUDE.md` → Design), and per-section background line-art
(`public/background-graphics/`, recoloured to the accent) with frosted-glass content panels
(`glass` utility in `globals.css`, `components/shell/page-backdrop.tsx`).

**No git commits yet**: everything is untracked on `main`.

**Bonsai import in progress** (exports in `apps/past-content-docs/`): clients (45), projects (133) and invoices (192) done;
next: tasks → time (mark historical time as billed!) → expenses. Decisions + name mapping in
`docs/bonsai-import.md`; follow them.

**Pick up here:** first git commit → then one of: receipt uploads + GST/HST summary
(accounting), Contracts, or richer Notes. Your own to-dos: fill in Settings (GST/HST number,
payment instructions), optional Resend key for emailing invoices.

## Starting it again after a reboot

1. Open Docker Desktop and wait for it to start.
2. `pnpm db:start` (fast now; images are cached, data persists).
3. `pnpm dev`, then open http://localhost:3000

If the terminal says `docker` isn't found, restart VS Code (Docker is at
`%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`).

Applying a new migration without wiping your data: `npx supabase migration up`, then
`pnpm db:types`. (`pnpm db:reset` rebuilds the DB from scratch and **deletes your user**.)

## Done

- Auth + app shell (module 1). Account created in Studio; signing in works.
- **Clients** (module 2a): `supabase/migrations/20261109120000_clients.sql`, pages under
  `apps/web/src/app/(app)/clients/` (list + search + archived tab, new, detail, edit, archive,
  delete), data layer `apps/web/src/lib/clients/`, money helpers `apps/web/src/lib/money.ts`.
  Verified: typecheck, lint, production build, and a signed-in smoke test of every page.
- **Canada/BC setup:** new clients default to CAD at $120/h (`apps/web/src/lib/studio.ts`;
  moves to Settings later). Clients have a country code + province (migration
  `20261109130000_clients_canada.sql`), and the client page shows which GST/HST applies,
  using place-of-supply rules from `apps/web/src/lib/tax/canada.ts` (rates in basis points;
  update rates there only). BC PST is shown as a note, not charged automatically.
  **Get the tax treatment confirmed by an accountant before invoicing goes live.**
- **Projects** (module 2b): migrations `20261110000000_projects.sql` +
  `20261110000100_projects_fk_no_action.sql`; pages under `apps/web/src/app/(app)/projects/`
  (list with Open/Completed/Cancelled/All, search, client filter; new; detail with quick status
  change; edit; delete); client pages show their projects. Statuses: lead, active, on_hold,
  completed, cancelled. Billing: hourly (blank rate = client's rate), fixed fee, non-billable.
  A composite FK stops a project pointing at another user's client; clients with projects
  can't be deleted (archive instead). Dates/"today" use America/Vancouver.
- **Tasks** (module 2c): migrations `20261110010000_tasks.sql` +
  `20261110010100_tasks_completed_at_guard.sql`; pages under `apps/web/src/app/(app)/tasks/`
  (quick add, checkboxes, Open view grouped Overdue/Today/Upcoming/No date, Done/All, search,
  project filter incl. "no project"; task page = edit form + delete); project pages have a
  Tasks section with progress + quick add. Tasks may be standalone (no project). Deleting a
  project deletes its tasks. `completed_at` is maintained by a DB trigger.
- **Time tracking** (module 3): migrations `20261110020000_time_entries.sql` +
  `20261110020100_timer_functions.sql`. Entries link to a task, project or client (none =
  Internal); DB triggers fill parents (task → project → client) and keep them in sync when a
  task/project moves. One running timer per user; `start_timer`/`stop_timer` RPCs use the DB
  clock and are atomic. Running timer shows in the sidebar/mobile header on every page; ▶ on
  task rows, project and task pages. `/time`: timer, manual entry (Vancouver wall-clock →
  UTC, DST-safe), weekly timesheet with totals + billable value, client/project/internal
  filters. Project/task/client pages show time vs budget/estimate. Projects/clients with
  tracked time can't be deleted; deleting a task keeps its time on the project.
- **Invoices** (module 4) + **Settings**: migrations `20261110030000_invoices.sql` through
  `20261110030300_invoice_totals_definer.sql`. Settings (`/settings`, account menu) holds
  business details, GST/HST number (tax only charged when set), numbering, payment terms,
  payment instructions. Invoices: create from unbilled time (grouped per project) + fixed fees,
  draft editor (lines, dates, tax, notes), DB-computed totals, sequential numbers per user,
  Draft → Sent → Paid / Void with DB-enforced locks (sent invoices, their lines and billed time
  are frozen; void releases time). PDF at `/invoices/<id>/pdf` (@react-pdf/renderer). Email via
  Resend: set `RESEND_API_KEY` + `INVOICE_FROM_EMAIL` in `.env.local` (disabled until then).
- **Notes** (module 6, basic): migration `20261110040000_notes.sql`; pages `/notes/work`,
  `/notes/personal`, `/notes/new`, `/notes/<id>` under `apps/web/src/app/(app)/notes/`.
  Plain-text title + body, pin, search, client/project filter. Work notes link to a client
  and/or project (project fills in client, follows project moves); they show on client and
  project pages (client page includes its projects' notes). Personal notes can't be linked
  (DB check). Deleting a client/project keeps its notes, unlinked.
- **Income** (Accounting): migration `20261110060000_income.sql` (`income_entries` for
  manually recorded income). `/income` combines paid invoices (dated by `paid_at`) +
  manual entries: "Coming in" notice (sent/draft invoices, unbilled billable time valued
  at its rate, uninvoiced fixed fees), interactive chart (by month with year arrows / by
  year, click a year to drill in, hover tooltips, table view), payments list per year,
  "Record income" form, `/income/<id>` edit/delete. Figures are before tax, with
  GST/HST shown separately; chart is CAD (other currencies noted beside it). Code in
  `app/(app)/income/` and `lib/income/`.
- **Expenses** (Accounting, basic): migration `20261110050000_expenses.sql`; `/expenses`
  (quick add, grouped by month, year/category filters, search, totals incl. GST/HST paid,
  category breakdown) and `/expenses/<id>` (edit/delete). Fields: title, total paid,
  GST/HST portion (for ITCs), category (CRA T2125-based list, mirrored in
  `lib/expenses/categories.ts` and the DB check), date, currency, notes.
- **UI polish:** all dropdowns are the custom animated `FormSelect`
  (`components/ui/form-select.tsx` over Radix Select); the native select component is gone.
- **Branding:** logo drawn inline from `apps/web/public/nexus-logo.svg`
  (`components/brand/`). Accent `#94FFF3` = `--primary` (fills, active nav, checkboxes,
  primary buttons) with near-black text on it; `--primary-ink` for accent as text/lines
  (deep teal `#0f766e` in light mode, brand in dark). App icon source:
  `apps/desktop/src-tauri/app-icon.svg` → regenerate with `pnpm tauri icon` (see the
  comment in that file); web favicon `app/icon.svg`, touch icon, PWA icons in `public/icons/`.
- **Trigger rule (learned the hard way):** account deletion cascades run as `supabase_auth_admin`,
  which has no rights on app tables. Cross-table work in BEFORE triggers must skip when
  `pg_trigger_depth() > 1`; AFTER triggers fire at depth 1 even inside cascades, so a
  cross-table AFTER trigger must be `security definer` (see the invoice totals trigger).
  Trigger bodies must never call functions in `private` (no USAGE for `authenticated`).
- Server Actions return errors instead of throwing (production hides thrown messages).
- Shell fixes found along the way: sidebar active-link highlight now streams behind
  `<Suspense>` (was breaking the build on dynamic routes); the server Supabase client calls
  `connection()` (removed `Date.now()` prerender warnings on every page).

## Open issue: MFA setup rejects Google Authenticator codes

- Server and PC clocks agree; the server logs "Invalid TOTP code entered" for every attempt.
  Not yet known whether the phone's clock or the scanned entry is wrong.
- **Temporarily bypassed locally:** `NEXUS_MFA_DISABLED=true` in `apps/web/.env.local`
  (logic in `apps/web/src/lib/mfa-policy.ts`, ignored in production builds).
- To fix: delete old "Nexus" entries in the app, remove the flag, restart `pnpm dev`, sign in,
  rescan, and send Claude the code your phone shows so it can be checked against the server's.
  Then delete the flag and `mfa-policy.ts` escape hatch.

## Next

- **First git commit** (everything so far); branch first per project rules if preferred.
- **You:** fill in Settings (business details, GST/HST number if registered, payment
  instructions); optionally set up Resend for emailing invoices.
- **Contracts** (module 5), per `docs/ARCHITECTURE.md`.
- Accounting, future: receipt photo upload (Supabase Storage), custom categories, link
  expenses to clients/projects (rebillable), mileage log, income vs expense / P&L report,
  GST/HST return summary (collected on invoices − ITCs on expenses), CSV export for the
  accountant, recurring expenses.
- Notes, future features: rich-text editor (Tiptap, store JSON alongside `body`), notebooks,
  autosave, markdown rendering, linking notes to tasks, full-text search, attachments.
- Invoice ideas if wanted: partial payments, Stripe payment links, BC PST as a second tax
  line, recurring invoices, payment reminders for overdue invoices.
- Known Next.js issue: submitting a form with JavaScript disabled, when the action returns a
  message instead of redirecting, crashes or hangs the re-render ("cookies object does not
  match … bug in Next.js"). Normal (JS) use is unaffected. Revisit on a Next upgrade.
- Dashboard: done (blocks for tasks, time, invoices, projects, recent clients, expenses,
  notes in `components/dashboard/`; recent-client ranking in `lib/dashboard/data.ts`).
  Ideas: today's/this week's hours, unbilled time total, revenue this year.
- Desktop tray timer (Tauri) can call the same `start_timer`/`stop_timer` RPCs.
- Time ideas if wanted: rounding rules (e.g. to 6/15 min), a reports page (by client/month).
- Add an automated test setup to the repo (Vitest for unit tests + the signed-in smoke
  tests). So far the tests were throwaway scripts in Claude's session scratch folder, which
  won't survive; they'd need recreating. They create throwaway users via the Supabase admin
  API and never touch your data.
- If the dev server shows "X is not a function" after adding an export to an existing file,
  restart `pnpm dev` (stale Turbopack module).
- Module 1 follow-ups: password reset, Settings (2nd authenticator, sign out everywhere),
  MFA recovery codes.
- Later on Clients if wanted: multiple contacts per client, client list on the dashboard.

When restarting, tell Claude: *"read NEXT-STEPS.md and continue."*
