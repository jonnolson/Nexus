/**
 * Sanitises a post-login `next` destination so it can only point inside Nexus.
 * Blocks open redirects like `//evil.com`, `/\evil.com` or `https://evil.com`.
 */
export function safeNext(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/mfa")) return fallback;
  return value;
}
