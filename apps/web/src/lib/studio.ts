/**
 * Studio-wide defaults. Hard-coded for now; these move to a Settings page
 * (stored on `profiles`) once Settings exists.
 */
export const STUDIO_DEFAULTS = {
  /** Home province: Nexus is run from British Columbia. */
  province: "BC",
  country: "CA",
  currency: "CAD",
  /** Default hourly rate in minor units (cents): $120.00. */
  hourlyRateMinor: 12_000,
  locale: "en-CA",
  /** Used for "today", overdue checks and date display. */
  timeZone: "America/Vancouver",
} as const;
