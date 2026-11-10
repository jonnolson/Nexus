import "server-only";
import { z } from "zod";

/**
 * Server-only secrets. Never prefixed NEXT_PUBLIC_, never imported by client code.
 * Everything here is optional: features that need a missing value switch off
 * gracefully (e.g. "Email invoice" is disabled until Resend is configured).
 */
const schema = z.object({
  RESEND_API_KEY: z.string().min(1).optional(),
  /** e.g. "Your Studio <billing@yourstudio.ca>": must be a domain verified in Resend. */
  INVOICE_FROM_EMAIL: z.string().min(3).optional(),
});

const parsed = schema.safeParse({
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  INVOICE_FROM_EMAIL: process.env.INVOICE_FROM_EMAIL || undefined,
});

export const serverEnv = parsed.success ? parsed.data : {};

export const emailConfigured = () => Boolean(serverEnv.RESEND_API_KEY && serverEnv.INVOICE_FROM_EMAIL);
