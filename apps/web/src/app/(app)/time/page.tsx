import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { entryLabel } from "@/components/time/shell-timer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addDays,
  formatDateOnly,
  isDateString,
  requestNow,
  startOfWeek,
  studioDateOf,
  studioDateTimeToUtc,
  studioTimeOf,
  todayInStudio,
} from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { entryMinutes, formatDuration } from "@/lib/time/format";
import {
  entryValue,
  getRunningEntry,
  listEntries,
  listTimeOptions,
  totalsOf,
  type TimeEntry,
  type TimeTotals,
} from "@/lib/time/data";
import { cn } from "@/lib/utils";
import { createEntryAction } from "./actions";
import { EntryForm } from "./entry-form";
import { TimerPanel } from "./timer-panel";

export const metadata: Metadata = { title: "Time" };

export default function TimePage({ searchParams }: PageProps<"/time">) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 p-4 md:p-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Time</h1>
        <p className="text-sm text-muted-foreground">Track it live, or add it after the fact.</p>
      </div>
      <Suspense fallback={<div className="h-32 glass animate-pulse rounded-xl" />}>
        <TimeView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type SP = Awaited<PageProps<"/time">["searchParams"]>;
const str = (v: SP[string]) => (typeof v === "string" ? v : "");

async function TimeView({ searchParams }: Pick<PageProps<"/time">, "searchParams">) {
  const params = await searchParams;
  // "Today" decides which week to load, so it's read before any data access:
  // mark the render as request-time first (Cache Components).
  await connection();
  const today = todayInStudio();
  const week = startOfWeek(isDateString(params.week) ? (params.week as string) : today);
  const thisWeek = startOfWeek(today);
  const clientFilter = str(params.client); // client id, or "internal"
  const projectFilter = str(params.project);

  const [running, options, entries] = await Promise.all([
    getRunningEntry(),
    listTimeOptions(),
    listEntries({
      fromIso: studioDateTimeToUtc(week, "00:00"),
      toIso: studioDateTimeToUtc(addDays(week, 7), "00:00"),
      clientId: clientFilter !== "internal" ? clientFilter : undefined,
      internalOnly: clientFilter === "internal",
      projectId: projectFilter || undefined,
    }),
  ]);

  const now = requestNow();
  const totals = totalsOf(entries, now);
  const filterName =
    clientFilter === "internal"
      ? "Internal"
      : (options.clients.find((c) => c.id === clientFilter)?.name ??
        entries.find((e) => e.client?.id === clientFilter)?.client?.name);
  const projectName =
    options.projects.find((p) => p.id === projectFilter)?.name ??
    entries.find((e) => e.project?.id === projectFilter)?.project?.name;

  const href = (next: { week?: string | null; client?: string | null; project?: string | null }) => {
    const sp = new URLSearchParams();
    const w = next.week === undefined ? week : next.week;
    if (w && w !== thisWeek) sp.set("week", w);
    const c = next.client === undefined ? clientFilter : next.client;
    if (c) sp.set("client", c);
    const p = next.project === undefined ? projectFilter : next.project;
    if (p) sp.set("project", p);
    const s = sp.toString();
    return s ? `/time?${s}` : "/time";
  };

  // Group by local day, most recent day first.
  const days = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const d = studioDateOf(e.started_at);
    days.set(d, [...(days.get(d) ?? []), e]);
  }
  const dayKeys = [...days.keys()].sort().reverse();
  const runningSummary = running ? { id: running.id, startedAt: running.started_at, billable: running.billable, ...entryLabel(running) } : null;

  return (
    <div className="grid gap-6">
      <TimerPanel running={runningSummary} options={options} />

      <details className="group glass rounded-xl">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:hidden">
          <span className="text-muted-foreground group-open:hidden">+ </span>
          Add time manually
        </summary>
        <div className="border-t p-4">
          <EntryForm
            mode="create"
            action={createEntryAction}
            options={options}
            defaults={{ date: today, billable: "on" }}
          />
        </div>
      </details>

      <section className="grid gap-4" aria-labelledby="timesheet">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Previous week">
              <Link href={href({ week: addDays(week, -7) })}>
                <ChevronLeft />
              </Link>
            </Button>
            <h2 id="timesheet" className="min-w-44 text-center text-sm font-medium">
              {formatDateOnly(week, { year: undefined })} – {formatDateOnly(addDays(week, 6))}
            </h2>
            <Button asChild variant="ghost" size="icon-sm" aria-label="Next week">
              <Link href={href({ week: addDays(week, 7) })}>
                <ChevronRight />
              </Link>
            </Button>
            {week !== thisWeek && (
              <Button asChild variant="link" size="sm">
                <Link href={href({ week: null })}>This week</Link>
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {clientFilter && (
              <FilterChip label="Client" value={filterName ?? "Unknown"} href={href({ client: null })} />
            )}
            {projectFilter && (
              <FilterChip label="Project" value={projectName ?? "Unknown"} href={href({ project: null })} />
            )}
          </div>
        </div>

        <Totals totals={totals} />

        {entries.length === 0 ? (
          <div className="grid min-h-40 place-items-center glass rounded-xl border-dashed p-8 text-center">
            <div className="grid justify-items-center gap-3">
              <Clock className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No time tracked this week.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {dayKeys.map((day) => {
              const list = days.get(day)!;
              const dayMinutes = list.reduce((s, e) => s + entryMinutes(e.started_at, e.ended_at, now), 0);
              return (
                <div key={day} className="grid gap-2">
                  <div className="flex items-baseline justify-between px-1 text-sm">
                    <h3 className="font-medium">
                      {day === today ? "Today" : formatDateOnly(day, { weekday: "long", year: undefined })}
                    </h3>
                    <span className="tabular-nums text-muted-foreground">{formatDuration(dayMinutes)}</span>
                  </div>
                  <ul className="divide-y glass rounded-xl">
                    {list.map((e) => (
                      <EntryRow key={e.id} entry={e} now={now} filterHref={href} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Totals({ totals }: { totals: TimeTotals }) {
  const value = Object.entries(totals.value)
    .map(([currency, minor]) => formatMoney(minor, currency))
    .join(" + ");
  return (
    <dl className="grid grid-cols-3 gap-2 sm:gap-4">
      {[
        { label: "Total", value: formatDuration(totals.minutes) },
        { label: "Billable", value: formatDuration(totals.billableMinutes) },
        { label: "Billable value", value: value || "—" },
      ].map((t) => (
        <div key={t.label} className="glass rounded-xl p-3">
          <dt className="text-xs text-muted-foreground">{t.label}</dt>
          <dd className="text-lg font-semibold tabular-nums tracking-tight sm:text-xl">{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EntryRow({
  entry: e,
  now,
  filterHref,
}: {
  entry: TimeEntry;
  now: number;
  filterHref: (n: { client?: string | null; project?: string | null }) => string;
}) {
  const { label } = entryLabel(e);
  const minutes = entryMinutes(e.started_at, e.ended_at, now);
  const value = entryValue(e, now);
  const runningNow = e.ended_at === null;

  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <Link href={`/time/${e.id}`} className="truncate text-sm underline-offset-4 hover:underline">
          {label}
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {e.client ? (
            <Link href={filterHref({ client: e.client.id, project: null })} className="hover:text-foreground">
              {e.client.name}
            </Link>
          ) : (
            <Link href={filterHref({ client: "internal", project: null })} className="hover:text-foreground">
              Internal
            </Link>
          )}
          {e.project && (
            <>
              <span aria-hidden>·</span>
              <Link href={filterHref({ project: e.project.id })} className="hover:text-foreground">
                {e.project.name}
              </Link>
            </>
          )}
          {e.task && e.description && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{e.task.title}</span>
            </>
          )}
          {!e.billable && (
            <Badge variant="outline" className="h-4 px-1.5 text-[0.65rem] font-normal">
              Non-billable
            </Badge>
          )}
          {e.invoice_line_id && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[0.65rem] font-normal">
              Invoiced
            </Badge>
          )}
        </div>
      </div>
      <div className="grid shrink-0 justify-items-end gap-0.5 text-right">
        <span className={cn("text-sm font-medium tabular-nums", runningNow && "text-primary-ink")}>
          {formatDuration(minutes)}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {studioTimeOf(e.started_at)}–{runningNow ? "now" : studioTimeOf(e.ended_at!)}
          {value && ` · ${formatMoney(value.minor, value.currency)}`}
        </span>
      </div>
    </li>
  );
}

function FilterChip({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex w-fit items-center gap-1.5 rounded-full border bg-muted/50 py-1 pr-2 pl-3 text-sm hover:bg-muted"
    >
      {label}: <span className="font-medium">{value}</span>
      <X className="size-3.5" aria-label={`Clear ${label.toLowerCase()} filter`} />
    </Link>
  );
}
