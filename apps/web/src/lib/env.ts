import { z } from "zod";

/**
 * Public (browser-safe) environment. Only NEXT_PUBLIC_* values belong here.
 * Server-only secrets (Resend, Stripe, service role…) get their own module
 * guarded by `import "server-only"` when those features land.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// Next inlines NEXT_PUBLIC_* only when referenced literally, so list them explicitly.
const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  throw new Error(
    `Missing or invalid environment variables — copy apps/web/.env.example to apps/web/.env.local.\n${z.prettifyError(parsed.error)}`,
  );
}

export const publicEnv = parsed.data;
