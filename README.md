# Nexus

Studio operations hub: clients, projects, tasks, time, invoices, contracts and notes.
Web + installable phone app + Tauri desktop, all backed by one Supabase project.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the stack and security model.

## Prerequisites

- Node 22+, pnpm 10+
- **Docker Desktop** (runs the local Supabase stack)
- **Rust** via https://rustup.rs (desktop app only)

## First run

```bash
pnpm install
pnpm db:start                         # starts local Postgres/Auth/Storage, prints keys
cp apps/web/.env.example apps/web/.env.local   # paste the URL + publishable key
pnpm db:types                         # generate TypeScript types from the schema
pnpm dev                              # http://localhost:3000
```

Create your user in Supabase Studio (http://127.0.0.1:54323 → Authentication → Add user,
tick "Auto confirm"). Public sign-up is disabled. On first sign-in you'll be asked to scan a
QR code with an authenticator app; every sign-in after that asks for its 6-digit code.

## Scripts (repo root)

| Script | What it does |
|---|---|
| `pnpm dev` | Run the web app |
| `pnpm build` / `lint` / `typecheck` | Checks for the web app |
| `pnpm db:start` / `db:reset` | Start local Supabase / rebuild DB from migrations |
| `pnpm db:types` | Regenerate `database.types.ts` |
| `pnpm desktop:dev` | Run the desktop shell against `localhost:3000` |
| `pnpm desktop:build` | Build the desktop installer (set `frontendDist` to your prod URL first) |
