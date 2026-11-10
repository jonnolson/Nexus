/**
 * Whether a second factor (TOTP, AAL2) is required to use Nexus.
 *
 * Required by default. Set `NEXUS_MFA_REQUIRED=false` (in `apps/web/.env.local`
 * locally, or the hosting provider's environment variables in production) to sign in
 * with password only. The owner chose password-only for now (2026-11-10) because
 * authenticator codes were being rejected during setup; turn it back on by removing
 * the variable once enrolment works (see NEXT-STEPS.md). Any value other than the
 * exact string "false", including a missing variable, keeps MFA required.
 */
export const mfaRequired = process.env.NEXUS_MFA_REQUIRED !== "false";

/** True when the session's assurance level is enough to reach app data. */
export const hasRequiredAal = (aal: unknown) => !mfaRequired || aal === "aal2";
