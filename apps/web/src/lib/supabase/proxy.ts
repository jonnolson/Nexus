import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { hasRequiredAal } from "@/lib/mfa-policy";

/** Routes reachable without a session. */
const PUBLIC_PATHS = ["/login", "/auth"];
/** Routes reachable with a password-only (AAL1) session — used to enrol/verify MFA. */
const MFA_PATHS = ["/mfa"];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Refreshes the Supabase session cookie and enforces the auth gate:
 *   no session      → /login
 *   session, AAL1   → /mfa   (MFA is mandatory in Nexus; see lib/mfa-policy.ts)
 *   session, AAL2   → through
 *
 * This is the first line of defence only. Every Server Action / Route Handler
 * must still call `requireUser()` (lib/auth.ts), and RLS guards the data itself.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not put code between createServerClient and getClaims — it can cause
  // hard-to-debug random logouts. getClaims() verifies the JWT signature.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const worthReturningTo =
      pathname !== "/" && !matches(pathname, [...PUBLIC_PATHS, ...MFA_PATHS]);
    if ((path === "/login" || path === "/mfa") && worthReturningTo) {
      url.searchParams.set("next", pathname + request.nextUrl.search);
    }
    const redirect = NextResponse.redirect(url);
    // Carry refreshed auth cookies across the redirect.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (matches(pathname, PUBLIC_PATHS)) {
    // Already fully signed in? Skip the login screen.
    if (pathname === "/login" && claims && hasRequiredAal(claims.aal)) return redirectTo("/");
    return response;
  }

  if (!claims) return redirectTo("/login");

  if (!hasRequiredAal(claims.aal) && !matches(pathname, MFA_PATHS)) {
    return redirectTo("/mfa");
  }

  return response;
}
