import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { billingSummary } from "@/components/projects/billing-summary";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateOnly, formatTimestamp, todayInStudio } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { BILLING_TYPES, OPEN_STATUSES, formatHours, type ProjectStatus } from "@/lib/projects/constants";
import { effectiveHourlyRate, getProject } from "@/lib/projects/data";
import { listTasksForProject } from "@/lib/tasks/data";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { TaskList } from "@/components/tasks/task-list";
import { StartTimerButton } from "@/components/time/start-timer-button";
import { TimeSection } from "@/components/time/time-section";
import { NotesSection } from "@/components/notes/notes-section";
import { listNotes } from "@/lib/notes/data";
import { getRunningEntry, listEntries } from "@/lib/time/data";
import { ProjectActions } from "./project-actions";

export const metadata: Metadata = { title: "Project" };

export default function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 p-4 md:p-8">
      <Link
        href="/projects"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Projects
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ProjectDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ProjectDetail({ params }: Pick<PageProps<"/projects/[id]">, "params">) {
  const { id } = await params;
  const [project, tasks, entries, running, notes] = await Promise.all([
    getProject(id),
    listTasksForProject(id),
    listEntries({ projectId: id }),
    getRunningEntry(),
    listNotes({ projectId: id }),
  ]);
  const projectTimerRunning = running?.project_id === id && running.task_id === null;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const rate = effectiveHourlyRate(project);
  const today = todayInStudio();
  const overdue =
    project.due_date !== null &&
    project.due_date < today &&
    OPEN_STATUSES.includes(project.status as ProjectStatus);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
            {overdue && <Badge variant="destructive">Overdue</Badge>}
          </div>
          <Link
            href={`/clients/${project.client.id}`}
            className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {project.client.name}
            {project.client.archived_at && " (archived)"}
          </Link>
        </div>
        <div className="flex items-start gap-2">
          <StartTimerButton
            projectId={project.id}
            running={projectTimerRunning}
            label={project.name}
            size="sm"
          />
          <Button asChild variant="outline">
            <Link href={`/projects/${project.id}/edit`}>
              <Pencil />
              Edit
            </Link>
          </Button>
          <ProjectActions id={project.id} name={project.name} status={project.status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <Detail label="Type">
                {BILLING_TYPES.find((b) => b.value === project.billing_type)?.label}
              </Detail>
              {project.billing_type === "hourly" && (
                <Detail label="Hourly rate">
                  {rate && (
                    <>
                      {formatMoney(rate.minor, rate.currency)} / hour
                      {rate.fromClient && (
                        <span className="block text-xs text-muted-foreground">
                          From {project.client.name}&apos;s default rate
                        </span>
                      )}
                    </>
                  )}
                </Detail>
              )}
              {project.billing_type === "fixed" && (
                <Detail label="Fixed fee">
                  {project.fixed_fee_minor != null && formatMoney(project.fixed_fee_minor, project.currency)}
                </Detail>
              )}
              <Detail label="Currency">{project.currency}</Detail>
              <Detail label="Budget">
                {project.budget_minutes != null && (
                  <>
                    {formatHours(project.budget_minutes)}
                    {rate && (
                      <span className="block text-xs text-muted-foreground">
                        ≈ {formatMoney(Math.round((project.budget_minutes / 60) * rate.minor), rate.currency)} at{" "}
                        {billingSummary(project)}
                      </span>
                    )}
                  </>
                )}
              </Detail>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <Detail label="Start date">
                {project.start_date && formatDateOnly(project.start_date, { weekday: "short" })}
              </Detail>
              <Detail label="Due date">
                {project.due_date && (
                  <span className={overdue ? "font-medium text-destructive" : undefined}>
                    {formatDateOnly(project.due_date, { weekday: "short" })}
                  </span>
                )}
              </Detail>
            </dl>
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-3" aria-labelledby="project-tasks">
        <div className="flex items-center justify-between gap-4">
          <h2 id="project-tasks" className="flex items-baseline gap-2 text-base font-medium">
            Tasks
            {tasks.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {doneCount} of {tasks.length} done
              </span>
            )}
          </h2>
          {tasks.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/tasks?project=${project.id}`}>Open in Tasks</Link>
            </Button>
          )}
        </div>
        {tasks.length > 0 && (
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Tasks done"
            aria-valuemin={0}
            aria-valuemax={tasks.length}
            aria-valuenow={doneCount}
          >
            <div
              className="h-full rounded-full bg-primary-ink transition-all"
              style={{ width: `${(doneCount / tasks.length) * 100}%` }}
            />
          </div>
        )}
        <QuickAddTask projectId={project.id} />
        {tasks.length > 0 && (
          <TaskList
            tasks={tasks}
            today={today}
            showProject={false}
            returnTo={`/projects/${project.id}`}
            runningTaskId={running?.task_id ?? null}
          />
        )}
      </section>

      <NotesSection
        notes={notes}
        newHref={`/notes/new?project=${project.id}`}
        allHref={`/notes/work?project=${project.id}`}
      />

      <TimeSection
        entries={entries}
        targetMinutes={project.budget_minutes}
        returnTo={`/projects/${project.id}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          {project.description ? (
            <p className="text-sm whitespace-pre-wrap">{project.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Created {formatTimestamp(project.created_at)}
        {project.updated_at !== project.created_at && ` · Updated ${formatTimestamp(project.updated_at)}`}
      </p>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 glass animate-pulse rounded-xl" />
        <div className="h-56 glass animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
