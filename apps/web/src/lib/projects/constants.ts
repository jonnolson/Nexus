export const PROJECT_STATUSES = [
  { value: "lead", label: "Lead", tone: "outline" },
  { value: "active", label: "Active", tone: "default" },
  { value: "on_hold", label: "On hold", tone: "secondary" },
  { value: "completed", label: "Completed", tone: "secondary" },
  { value: "cancelled", label: "Cancelled", tone: "outline" },
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["value"];
export const PROJECT_STATUS_VALUES = PROJECT_STATUSES.map((s) => s.value) as [
  ProjectStatus,
  ...ProjectStatus[],
];

/** Statuses that count as "open" work: the default list view. */
export const OPEN_STATUSES: ProjectStatus[] = ["lead", "active", "on_hold"];

export const statusMeta = (status: string) =>
  PROJECT_STATUSES.find((s) => s.value === status) ?? PROJECT_STATUSES[1];

export const BILLING_TYPES = [
  { value: "hourly", label: "Hourly" },
  { value: "fixed", label: "Fixed fee" },
  { value: "non_billable", label: "Non-billable" },
] as const;

export type BillingType = (typeof BILLING_TYPES)[number]["value"];
export const BILLING_TYPE_VALUES = BILLING_TYPES.map((b) => b.value) as [
  BillingType,
  ...BillingType[],
];

/** List filters shown as tabs on /projects. */
export const PROJECT_VIEWS = [
  { value: "open", label: "Open", statuses: OPEN_STATUSES },
  { value: "completed", label: "Completed", statuses: ["completed"] },
  { value: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
  { value: "all", label: "All", statuses: PROJECT_STATUS_VALUES },
] as const satisfies readonly { value: string; label: string; statuses: readonly ProjectStatus[] }[];

export type ProjectView = (typeof PROJECT_VIEWS)[number]["value"];

/** "12.5" hours → 750 minutes. Returns null for empty, NaN for invalid. */
export function parseHoursInput(input: string): number | null {
  const cleaned = input.trim();
  if (cleaned === "") return null;
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(cleaned)) return NaN;
  return Math.round(Number(cleaned) * 60);
}

/** 750 minutes → "12.5". */
export function minutesToHoursInput(minutes: number | null | undefined): string {
  if (minutes == null) return "";
  return String(Math.round((minutes / 60) * 100) / 100);
}

export function formatHours(minutes: number): string {
  const h = Math.round((minutes / 60) * 100) / 100;
  return `${h} h`;
}
