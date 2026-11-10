import Link from "next/link";
import { connection } from "next/server";
import {
  FolderKanban,
  ListChecks,
  NotebookPen,
  Plus,
  Receipt,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import { Block, BlockEmpty, BlockRow } from "@/components/dashboard/block";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { Elapsed } from "@/components/time/elapsed";
import { entryLabel } from "@/components/time/shell-timer";
import { StartTimerButton } from "@/components/time/start-timer-button";
import { Button } from "@/components/ui/button";
import { recentClients } from "@/lib/dashboard/data";
import { formatDateOnly, formatTimestamp, requestNow, todayInStudio } from "@/lib/dates";
import { listExpenses, summarize } from "@/lib/expenses/data";
import { listInvoices } from "@/lib/invoices/data";
import { formatMoney } from "@/lib/money";
import { listNotes } from "@/lib/notes/data";
import { noteDisplayTitle } from "@/lib/notes/schema";
import { listProjects } from "@/lib/projects/data";
import { listTasks } from "@/lib/tasks/data";
import { getRunningEntry, listEntries } from "@/lib/time/data";
import { entryMinutes, formatDuration } from "@/lib/time/format";
import { cn } from "@/lib/utils";

const SHOW = 5;

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild size="sm" variant="default">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

const shortDate = (d: string) => formatDateOnly(d, { month: "short", day: "numeric" });

// --- Clients -------------------------------------------------------------------------

export async function ClientsBlock() {
  const clients = await recentClients(SHOW);
  return (
    <Block
      title="Clients"
      icon={Users}
      actions={
        <ActionLink href="/clients/new">
          <Plus /> Add client
        </ActionLink>
      }
      viewAll={{ href: "/clients", label: "All clients" }}
    >
      {clients.length === 0 ? (
        <BlockEmpty>No clients yet.</BlockEmpty>
      ) : (
        <ul>
          {clients.map((c) => (
            <BlockRow
              key={c.id}
              href={`/clients/${c.id}`}
              title={c.name}
              subtitle={c.contact_name ?? undefined}
              meta={
                <>
                  <span className="block">{c.what}</span>
                  <span className="block">{shortDate(c.at.slice(0, 10))}</span>
                </>
              }
            />
          ))}
        </ul>
      )}
    </Block>
  );
}

// --- Projects ------------------------------------------------------------------------

export async function ProjectsBlock() {
  const open = await listProjects({ view: "open" });
  // Active first, then on hold / leads; within each, soonest due (listProjects order).
  const rank: Record<string, number> = { active: 0, on_hold: 1, lead: 2 };
  const projects = [...open].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9)).slice(0, SHOW);
  const activeCount = open.filter((p) => p.status === "active").length;
  return (
    <Block
      title={`Projects${activeCount ? ` · ${activeCount} active` : ""}`}
      icon={FolderKanban}
      actions={
        <ActionLink href="/projects/new">
          <Plus /> New project
        </ActionLink>
      }
      viewAll={{ href: "/projects", label: "All projects" }}
    >
      {projects.length === 0 ? (
        <BlockEmpty>No open projects.</BlockEmpty>
      ) : (
        <ul>
          {projects.map((p) => (
            <BlockRow
              key={p.id}
              href={`/projects/${p.id}`}
              title={p.name}
              subtitle={p.client.name}
              meta={
                <span className="flex flex-col items-end gap-1">
                  <ProjectStatusBadge status={p.status} />
                  {p.due_date && <span>Due {shortDate(p.due_date)}</span>}
                </span>
              }
            />
          ))}
        </ul>
      )}
    </Block>
  );
}

// --- Tasks ---------------------------------------------------------------------------

export async function TasksBlock() {
  await connection(); // reads today's date
  const today = todayInStudio();
  const open = await listTasks({ view: "open" }); // soonest due first, undated last
  const tasks = open.slice(0, SHOW);
  const overdue = open.filter((t) => t.due_date && t.due_date < today).length;
  const dueToday = open.filter((t) => t.due_date === today).length;
  return (
    <Block
      title="Tasks"
      icon={ListChecks}
      actions={
        <ActionLink href="/tasks">
          <Plus /> Add task
        </ActionLink>
      }
      viewAll={{ href: "/tasks", label: `All open tasks (${open.length})` }}
    >
      {(overdue > 0 || dueToday > 0) && (
        <p className="px-2 pb-1 text-xs text-muted-foreground">
          {overdue > 0 && <span className="text-destructive">{overdue} overdue</span>}
          {overdue > 0 && dueToday > 0 && " · "}
          {dueToday > 0 && <span>{dueToday} due today</span>}
        </p>
      )}
      {tasks.length === 0 ? (
        <BlockEmpty>Nothing to do. Nice.</BlockEmpty>
      ) : (
        <ul>
          {tasks.map((t) => {
            const late = t.due_date !== null && t.due_date < today;
            return (
              <BlockRow
                key={t.id}
                href={`/tasks/${t.id}?from=${encodeURIComponent("/")}`}
                title={t.title}
                subtitle={t.project?.name ?? "No project"}
                meta={
                  t.due_date && (
                    <span className={cn(late && "font-medium text-destructive", t.due_date === today && "text-primary-ink")}>
                      {t.due_date === today ? "Today" : late ? `Overdue · ${shortDate(t.due_date)}` : shortDate(t.due_date)}
                    </span>
                  )
                }
              />
            );
          })}
        </ul>
      )}
    </Block>
  );
}

// --- Time ----------------------------------------------------------------------------

export async function TimeBlock() {
  await connection(); // reads the clock
  const now = requestNow();
  const [running, entries] = await Promise.all([
    getRunningEntry(),
    listEntries({ fromIso: new Date(now - 60 * 86_400_000).toISOString() }),
  ]);
  const recent = entries.filter((e) => e.ended_at !== null).slice(0, SHOW);
  const runningLabel = running ? entryLabel(running) : null;

  return (
    <Block
      title="Time"
      icon={Timer}
      actions={
        !running && (
          <ActionLink href="/time">
            <Timer /> Start a timer
          </ActionLink>
        )
      }
      viewAll={{ href: "/time", label: "Time tracking" }}
    >
      {running && runningLabel && (
        <div className="mx-2 mb-2 flex items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-primary-ink/60 ring-inset">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary-ink motion-reduce:animate-none" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{runningLabel.label}</p>
            {runningLabel.context && <p className="truncate text-xs text-muted-foreground">{runningLabel.context}</p>}
          </div>
          <Elapsed startedAt={running.started_at} className="font-mono text-sm tabular-nums text-primary-ink" />
          <StartTimerButton running label={runningLabel.label} />
        </div>
      )}
      {recent.length === 0 ? (
        <BlockEmpty>No time tracked in the last 60 days.</BlockEmpty>
      ) : (
        <ul>
          {recent.map((e) => {
            const { label, context } = entryLabel(e);
            const canResume = Boolean(e.task_id || e.project_id);
            return (
              <BlockRow
                key={e.id}
                href={`/time/${e.id}?from=${encodeURIComponent("/")}`}
                title={label}
                subtitle={context ?? undefined}
                meta={
                  <>
                    <span className="block font-mono tabular-nums text-foreground">
                      {formatDuration(entryMinutes(e.started_at, e.ended_at, now))}
                    </span>
                    <span className="block">{shortDate(e.started_at.slice(0, 10))}</span>
                  </>
                }
                trailing={
                  canResume && (
                    <StartTimerButton
                      taskId={e.task_id ?? undefined}
                      projectId={e.task_id ? undefined : (e.project_id ?? undefined)}
                      label={label}
                    />
                  )
                }
              />
            );
          })}
        </ul>
      )}
    </Block>
  );
}

// --- Invoices ------------------------------------------------------------------------

export async function InvoicesBlock() {
  await connection(); // reads today's date
  const today = todayInStudio();
  const [sent, drafts] = await Promise.all([listInvoices({ view: "outstanding" }), listInvoices({ view: "draft" })]);
  // Overdue first, then other sent invoices by due date, then drafts.
  const active = [
    ...[...sent].sort((a, b) => a.due_date.localeCompare(b.due_date)),
    ...drafts,
  ].slice(0, SHOW);
  const outstanding = sent.reduce<Record<string, number>>(
    (acc, i) => ({ ...acc, [i.currency]: (acc[i.currency] ?? 0) + i.total_minor }),
    {},
  );
  const outstandingText = Object.entries(outstanding)
    .map(([cur, minor]) => formatMoney(minor, cur))
    .join(" + ");

  return (
    <Block
      title="Invoices"
      icon={Receipt}
      actions={
        <ActionLink href="/invoices/new">
          <Plus /> New invoice
        </ActionLink>
      }
      viewAll={{ href: "/invoices?view=all", label: "All invoices" }}
    >
      {outstandingText && (
        <p className="px-2 pb-1 text-xs text-muted-foreground">
          Outstanding <span className="font-medium text-foreground">{outstandingText}</span>
          {" · "}
          {sent.length} sent{drafts.length > 0 && `, ${drafts.length} draft${drafts.length === 1 ? "" : "s"}`}
        </p>
      )}
      {active.length === 0 ? (
        <BlockEmpty>No drafts or unpaid invoices.</BlockEmpty>
      ) : (
        <ul>
          {active.map((i) => (
            <BlockRow
              key={i.id}
              href={`/invoices/${i.id}`}
              title={
                <>
                  <span className="font-mono">{i.number}</span>
                  <span className="font-normal text-muted-foreground"> · {i.client.name}</span>
                </>
              }
              subtitle={i.status === "draft" ? "Draft" : `Due ${shortDate(i.due_date)}`}
              meta={
                <span className="flex flex-col items-end gap-1">
                  <span className="font-medium text-foreground tabular-nums">{formatMoney(i.total_minor, i.currency)}</span>
                  <InvoiceStatusBadge status={i.status} dueDate={i.due_date} today={today} />
                </span>
              }
            />
          ))}
        </ul>
      )}
    </Block>
  );
}

// --- Expenses ------------------------------------------------------------------------

export async function ExpensesBlock() {
  await connection(); // reads today's date
  const year = Number(todayInStudio().slice(0, 4));
  const expenses = await listExpenses({ year });
  const totals = Object.entries(summarize(expenses));
  const latest = expenses.slice(0, 3);

  return (
    <Block
      title="Expenses"
      icon={Wallet}
      actions={
        <ActionLink href="/expenses#add-expense">
          <Plus /> Add expense
        </ActionLink>
      }
      viewAll={{ href: "/expenses", label: "All expenses" }}
    >
      <div className="grid gap-3 px-2 py-1">
        {totals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses recorded in {year} yet.</p>
        ) : (
          totals.map(([cur, s]) => (
            <div key={cur} className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted-foreground">Spent in {year}{totals.length > 1 ? ` (${cur})` : ""}</span>
              <span className="text-right">
                <span className="block text-lg font-semibold tabular-nums">{formatMoney(s.total, cur)}</span>
                {s.tax > 0 && <span className="block text-xs text-muted-foreground">incl. {formatMoney(s.tax, cur)} GST/HST</span>}
              </span>
            </div>
          ))
        )}
      </div>
      {latest.length > 0 && (
        <ul className="mt-1">
          {latest.map((e) => (
            <BlockRow
              key={e.id}
              href={`/expenses/${e.id}`}
              title={e.title}
              subtitle={shortDate(e.spent_on)}
              meta={<span className="tabular-nums text-foreground">{formatMoney(e.amount_minor, e.currency)}</span>}
            />
          ))}
        </ul>
      )}
    </Block>
  );
}

// --- Notes ---------------------------------------------------------------------------

export async function NotesBlock() {
  // listNotes puts pinned first; the dashboard wants plain recency.
  const notes = (await listNotes({ limit: 20 }))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, SHOW);
  return (
    <Block
      title="Notes"
      icon={NotebookPen}
      actions={
        <ActionLink href="/notes/new">
          <Plus /> New note
        </ActionLink>
      }
      viewAll={{ href: "/notes/work", label: "All notes" }}
    >
      {notes.length === 0 ? (
        <BlockEmpty>No notes yet.</BlockEmpty>
      ) : (
        <ul>
          {notes.map((n) => (
            <BlockRow
              key={n.id}
              href={`/notes/${n.id}`}
              title={noteDisplayTitle(n)}
              subtitle={[n.space === "personal" ? "Personal" : null, n.client?.name, n.project?.name].filter(Boolean).join(" · ") || "Work"}
              meta={formatTimestamp(n.updated_at)}
            />
          ))}
        </ul>
      )}
    </Block>
  );
}
