import Link from "next/link";
import { formatDateOnly, requestNow, studioDateOf } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { entryMinutes, formatDuration, formatDurationLong } from "@/lib/time/format";
import { totalsOf, type TimeEntry } from "@/lib/time/data";
import { cn } from "@/lib/utils";
import { entryLabel } from "./shell-timer";

/**
 * "Time" block for a project, task or client page: totals, progress against a
 * budget/estimate, and the most recent entries.
 */
export function TimeSection({
  entries,
  targetMinutes,
  targetLabel = "budget",
  returnTo,
  action,
  recent = 5,
}: {
  entries: TimeEntry[];
  targetMinutes?: number | null;
  targetLabel?: string;
  /** Page to come back to after editing an entry. */
  returnTo: string;
  /** e.g. a Start timer button. */
  action?: React.ReactNode;
  recent?: number;
}) {
  const now = requestNow();
  const totals = totalsOf(entries, now);
  const value = Object.entries(totals.value)
    .map(([c, m]) => formatMoney(m, c))
    .join(" + ");
  const pct = targetMinutes ? Math.min(100, (totals.minutes / targetMinutes) * 100) : null;
  const over = targetMinutes != null && totals.minutes > targetMinutes;

  return (
    <section className="grid gap-3" aria-labelledby="time-section">
      <div className="flex items-center justify-between gap-4">
        <h2 id="time-section" className="flex items-baseline gap-2 text-base font-medium">
          Time
          <span className="text-sm font-normal text-muted-foreground">
            {formatDurationLong(totals.minutes)} tracked
            {targetMinutes ? ` of ${formatDurationLong(targetMinutes)} ${targetLabel}` : ""}
          </span>
        </h2>
        {action}
      </div>

      {pct !== null && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`Time against ${targetLabel}`}
          aria-valuemin={0}
          aria-valuemax={targetMinutes!}
          aria-valuenow={totals.minutes}
        >
          <div
            className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : "bg-primary-ink")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {over && (
        <p className="text-sm text-destructive">
          {formatDurationLong(totals.minutes - targetMinutes!)} over {targetLabel}.
        </p>
      )}

      {entries.length > 0 ? (
        <>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <Stat label="Total" value={formatDuration(totals.minutes)} />
            <Stat label="Billable" value={formatDuration(totals.billableMinutes)} />
            <Stat label="Billable value" value={value || "—"} />
          </dl>
          <ul className="divide-y glass rounded-xl">
            {entries.slice(0, recent).map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Link
                  href={`/time/${e.id}?from=${encodeURIComponent(returnTo)}`}
                  className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                >
                  {entryLabel(e).label}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateOnly(studioDateOf(e.started_at), { year: undefined })}
                </span>
                <span
                  className={cn(
                    "w-12 shrink-0 text-right tabular-nums",
                    e.ended_at === null && "text-primary-ink",
                  )}
                >
                  {formatDuration(entryMinutes(e.started_at, e.ended_at, now))}
                </span>
              </li>
            ))}
          </ul>
          {entries.length > recent && (
            <p className="text-xs text-muted-foreground">
              Showing the latest {recent} of {entries.length} entries.
            </p>
          )}
        </>
      ) : (
        <p className="glass rounded-xl border-dashed p-6 text-center text-sm text-muted-foreground">
          No time tracked yet.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
