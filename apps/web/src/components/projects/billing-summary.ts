import "server-only";
import { formatMoney } from "@/lib/money";
import { effectiveHourlyRate, type Project } from "@/lib/projects/data";

/** One-line billing description, e.g. "$120.00/h", "Fixed $5,000.00", "Non-billable". */
export function billingSummary(p: Project): string {
  if (p.billing_type === "non_billable") return "Non-billable";
  if (p.billing_type === "fixed") {
    return p.fixed_fee_minor != null ? `Fixed ${formatMoney(p.fixed_fee_minor, p.currency)}` : "Fixed fee";
  }
  const rate = effectiveHourlyRate(p);
  return rate ? `${formatMoney(rate.minor, rate.currency)}/h` : "Hourly (no rate)";
}
