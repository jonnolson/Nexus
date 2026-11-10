# Nexus — working notes for Claude

Read `docs/ARCHITECTURE.md` before making changes. Next.js here is v16 with breaking
changes — read `apps/web/AGENTS.md` and the bundled docs in `apps/web/node_modules/next/dist/docs/`.

Non-negotiables:
- Every table: RLS on, `owner_id = (select auth.uid())` policy. Copy the template in
  `supabase/migrations/20261109000000_foundation.sql`. Schema changes only via new migrations.
- Every Server Action / Route Handler / data-reading Server Component calls `requireUser()`.
- Cache Components is on: cookie/session reads go inside `<Suspense>`. `middleware` is now `proxy.ts`.
- Secrets never in `NEXT_PUBLIC_*`. Server-only modules start with `import "server-only"`.
- Money = integer minor units + currency code.
- New module: add its route under `apps/web/src/app/(app)/` and flip `ready: true` in
  `apps/web/src/components/shell/nav-config.ts`. UI components: shadcn (radix base) in `components/ui/`.

## Design (owner's preferences — follow in all UI work)

- **Accent colour is `#94FFF3`** (`--brand`). Use it for **outlines, strokes, rings, icons and
  text**, not as solid background blocks. The owner dislikes solid-colour buttons and
  filled active states.
  - Primary buttons: accent border + accent text, transparent background (the `default`
    Button variant already does this). Hover may add at most a faint tint (≤ ~10%).
  - Active / selected states (nav items, tabs, chosen options, checked boxes): accent text +
    a 1px accent outline/ring (`text-primary-ink ring-1 ring-primary-ink/60 ring-inset`),
    no fill. Hover on inactive items stays neutral grey.
  - Thin accent strokes are fine: progress bars, focus rings, status dots, underlines.
- Use the **`primary-ink`** tokens for accent-as-line/text (`text-primary-ink`,
  `border-primary-ink`, `ring-primary-ink`, `fill-primary-ink`): brand aqua in dark mode, deep
  teal `#0f766e` in light mode (aqua on white is unreadable). Avoid `bg-primary` fills.
- If text ever must sit **on** the accent colour, it must be dark (`text-primary-foreground`,
  `#04201d`).
- Semantic colours keep their meaning (paid = green, overdue/destructive = red).
- **Backgrounds + glass:** each section shows its line-art from `public/background-graphics/`
  (named after the page), as a mask filled pure white at 5% opacity (owner's choice), huge and
  off the bottom-right corner; it turns 20° each time the user moves to a different tab
  (`components/shell/page-backdrop.tsx`). Content areas sit on **glass** surfaces: use the `glass` utility
  (`glass rounded-xl`, plus padding) for panels, lists, tables, stat tiles, forms and empty
  states; `Card` already uses it. Don't nest glass inside glass; don't use `bg-card` boxes.
- **Sounds** (`lib/sound.ts`, synthesised, user can mute in the account menu): a soft tick
  on hovering important controls (buttons, select/dropdown triggers and checkboxes get it
  automatically; add `data-sound` to other key links/tabs). `playSuccess()` for genuinely
  positive moments only (currently: invoice marked paid). Keep sounds rare and quiet.
- Dropdowns: always `FormSelect` (`components/ui/form-select.tsx`), never a native `<select>`.
  Motion is smooth and subtle (150–200ms ease-out) and respects `prefers-reduced-motion`.
- Radix marks state with `data-state="open|closed|checked"`; style with `data-[state=…]:`
  (the `data-open:` / `data-checked:` shorthand in generated shadcn code doesn't match Radix).
