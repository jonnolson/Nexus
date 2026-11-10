/**
 * Whether a second factor (TOTP, AAL2) is required to use Nexus.
 *
 * TEMPORARY dev escape hatch: set `NEXUS_MFA_DISABLED=true` in `apps/web/.env.local`
 * to sign in with password only while MFA setup is being debugged. It is ignored in
 * production builds, so a deployed Nexus always requires MFA. Remove this flag once
 * MFA works locally (see NEXT-STEPS.md).
 */
export const mfaRequired =
  process.env.NODE_ENV === "production" || process.env.NEXUS_MFA_DISABLED !== "true";

/** True when the session's assurance level is enough to reach app data. */
export const hasRequiredAal = (aal: unknown) => !mfaRequired || aal === "aal2";
