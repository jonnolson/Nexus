# Nexus — Architecture & Stack Decisions

Nexus is a single-owner operations hub for a freelance design/dev studio. It replaces
Bonsai (clients, projects, tasks, time, invoices, contracts) and Notion (notes, with
separate Work and Personal spaces).

## Requirements that drove the stack

| Requirement | What it implies |
|---|---|
| Desktop + web + phone, all in sync | One cloud database as the source of truth; one UI codebase rendered everywhere |
| Tight security | Mature auth with mandatory MFA, database-level access control, no secrets in the client |
| Invoices / contracts emailed from the app | Server-side PDF generation + transactional email |
| Time tracking | Timer state stored server-side so it follows you between devices; native tray on desktop |
| Notes (Notion-lite) | Rich-text block editor, stored as JSON |
| Solo developer, built with AI help | Mainstream, well-documented tools; minimal moving parts |

## The stack

| Layer | Choice | Why |
|---|---|---|
| **App framework** | **Next.js 16 (App Router, React 19, TypeScript)** | Server Components + Server Actions keep data access and secrets on the server. Generates PDFs and sends email from the same codebase. Largest ecosystem. |
| **Database / Auth / Storage / Realtime** | **Supabase** (Postgres) | Real Postgres with **Row-Level Security**, built-in Auth with **TOTP MFA** (passkeys available), file Storage for contracts/PDFs/attachments, and Realtime for live cross-device sync. Local dev stack via the CLI. No vendor lock-in: it's Postgres. |
| **Desktop** | **Tauri v2** wrapping the hosted web app | ~10 MB native app (vs ~150 MB Electron). Adds what the browser can't: system-tray timer, global shortcut, native notifications, launch-at-login. Remote page gets **zero** native permissions unless granted per capability. |
| **Phone** | **Installable PWA** (same web app) | No app-store overhead; responsive UI from day one. Tauri v2 can later produce real iOS/Android builds from the same shell if needed. |
| **Styling / UI** | **Tailwind CSS v4** + **shadcn/ui** (add when building screens) | Owned component code, fast to theme to your own brand. |
| **Validation** | **Zod** | One schema validates forms, Server Actions and env vars. |
| **Hosting** | **Vercel** (web) + **Supabase Cloud** (data) | Zero-ops, preview deploys, HTTPS by default. |

### Added when the feature lands (not installed yet)

| Feature | Library |
|---|---|
| Invoice / contract PDFs | `@react-pdf/renderer` (templates as React components) |
| Sending email | **Resend** + **React Email** (same templates for email bodies) |
| Getting paid online (optional) | **Stripe** payment links on invoices |
| Notes editor | **Tiptap** (or BlockNote, built on it), stored as JSON in Postgres |
| E-signature on contracts | Simple typed-signature + audit trail in-house first; Documenso/DocuSeal if legally stronger signing is needed |
| Client-side data cache / optimistic UI | TanStack Query (only if Server Components + Realtime aren't enough) |

### Considered and rejected

- **Electron** — heavy, and adds nothing Tauri lacks for this app.
- **Offline-first sync engines (PowerSync, ElectricSQL, Zero)** — powerful but a lot of
  complexity for a solo app that's almost always online. Revisit if offline editing on
  the phone becomes a real need; all of them sit on top of Postgres, so the door stays open.
- **Firebase** — NoSQL is a poor fit for relational invoicing/CRM data.
- **Self-rolled auth** — never for a "security is tight" requirement.

## Security model (defence in depth)

1. **Auth** — Supabase Auth. Public sign-up **disabled** (single owner). Password ≥ 12
   chars with mixed classes. **TOTP MFA mandatory**: any session below AAL2 is sent to
   `/mfa` and can't reach data. Sessions expire after 30 days, or 7 days idle.
2. **Proxy** (`apps/web/src/proxy.ts`) — refreshes the session cookie and gates every route.
3. **Data Access Layer** (`apps/web/src/lib/auth.ts` → `requireUser()`) — called again in
   every Server Component / Server Action / Route Handler. Never trust proxy alone.
4. **Row-Level Security** — every table has RLS on, scoped to `owner_id = auth.uid()`.
   `anon` has no grants by default. Even a leaked publishable key can't read anything.
5. **Secrets** — only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key reach the
   browser. Resend/Stripe/service-role keys stay server-only (`import "server-only"`).
6. **HTTP headers** — strict CSP (self + Supabase only, `frame-ancestors 'none'`), HSTS,
   nosniff, DENY framing, locked Permissions-Policy, `noindex`.
   *Upgrade path:* nonce-based CSP to drop `'unsafe-inline'` scripts, at the cost of
   dynamic rendering on every page.
7. **Desktop** — Tauri capabilities empty by default; the remote page has no native API access.
8. **Later** — passkeys as a second factor, audit log table, Supabase PITR backups,
   Vercel firewall / rate limiting on auth routes.

## Data conventions

- All tables: `id uuid`, `owner_id uuid default auth.uid()`, `created_at`, `updated_at`
  (trigger `private.set_updated_at`). Copy the template at the bottom of the foundation migration.
- Money stored as **integer minor units** (cents) + ISO currency code. Never floats.
- Time entries stored as `started_at` / `ended_at` timestamps; durations are derived.
- Documents (invoices, contracts) are **snapshotted** when sent: client details, line items
  and rates are copied, so later edits to a client don't rewrite history.
- Notes carry a `space` (`work` | `personal`) and belong to a notebook.
- Schema changes go through `supabase/migrations/` only, then `pnpm db:types`.

## Repository layout

```
nexus/
├─ apps/
│  ├─ web/          Next.js app — the real product (web + PWA + what desktop loads)
│  └─ desktop/      Tauri v2 shell
├─ supabase/
│  ├─ config.toml   Local stack + hardened auth settings
│  └─ migrations/   SQL migrations (source of truth for the schema)
└─ docs/
```

## Planned module order

1. ✅ Auth screens (login, MFA enrol/verify, sign out) + app shell/navigation.
   Follow-ups: password reset, Settings (add 2nd authenticator, sign out everywhere),
   MFA recovery codes (`auth.mfa.recoveryCodes`, experimental in supabase-js 2.119).
   **Lost authenticator today:** delete the factor in Supabase dashboard → Authentication → Users.
2. Clients (CRM) → Projects (statuses) → Tasks
3. Time tracking (+ desktop tray timer)
4. Invoices (templates, PDF, email, payment status)
5. Contracts (templates, PDF, email, sign)
6. Notes (notebooks, Work/Personal spaces)
