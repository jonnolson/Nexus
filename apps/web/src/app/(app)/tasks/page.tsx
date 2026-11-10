import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ListChecks, Search, X } from "lucide-react";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { TaskList } from "@/components/tasks/task-list";
import { Input } from "@/components/ui/input";
import { todayInStudio } from "@/lib/dates";
import { getProject } from "@/lib/projects/data";
import { DUE_GROUPS, TASK_VIEWS, dueGroup, type TaskView } from "@/lib/tasks/constants";
import { listProjectOptions, listTasks, type Task } from "@/lib/tasks/data";
import { getRunningEntry } from "@/lib/time/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 p-4 md:p-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">What needs doing, across every project.</p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <TasksView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type SP = Awaited<PageProps<"/tasks">["searchParams"]>;
const str = (v: SP[string]) => (typeof v === "string" ? v : "");

async function TasksView({ searchParams }: Pick<PageProps<"/tasks">, "searchParams">) {
  const params = await searchParams;
  const q = str(params.q).slice(0, 100);
  const viewParam = str(params.view);
  const view: TaskView = TASK_VIEWS.some((v) => v.value === viewParam) ? (viewParam as TaskView) : "open";
  const projectParam = str(params.project);

  const [tasks, projects, project, running] = await Promise.all([
    listTasks({ q, view, projectId: projectParam || undefined }),
    listProjectOptions(projectParam && projectParam !== "none" ? projectParam : null),
    projectParam && projectParam !== "none" ? getProject(projectParam) : Promise.resolve(null),
    getRunningEntry(),
  ]);
  const runningTaskId = running?.task_id ?? null;
  const today = todayInStudio();

  const href = (next: { view?: TaskView; project?: string | null }) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    const v = next.view ?? view;
    if (v !== "open") sp.set("view", v);
    const p = next.project === undefined ? projectParam : next.project;
    if (p) sp.set("project", p);
    const s = sp.toString();
    return s ? `/tasks?${s}` : "/tasks";
  };
  const returnTo = href({});

  return (
    <div className="grid gap-4">
      <QuickAddTask projects={projects} defaultProjectId={project?.id ?? ""} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Form action="/tasks" className="relative w-full sm:max-w-xs" role="search">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search tasks"
              aria-label="Search tasks"
              className="pl-8"
            />
            {view !== "open" && <input type="hidden" name="view" value={view} />}
            {projectParam && <input type="hidden" name="project" value={projectParam} />}
          </Form>
          {(project || projectParam === "none") && (
            <Link
              href={href({ project: null })}
              className="flex w-fit items-center gap-1.5 rounded-full border bg-muted/50 py-1 pr-2 pl-3 text-sm hover:bg-muted"
            >
              Project: <span className="font-medium">{project ? project.name : "None"}</span>
              <X className="size-3.5" aria-label="Clear project filter" />
            </Link>
          )}
        </div>

        <nav aria-label="Task status" className="flex w-fit gap-1 rounded-lg bg-muted p-1 text-sm">
          {TASK_VIEWS.map((v) => (
            <Link
              key={v.value}
              href={href({ view: v.value })}
              aria-current={view === v.value ? "page" : undefined}
              data-sound
              className={cn(
                "rounded-md px-3 py-1 text-muted-foreground transition-colors hover:text-foreground",
                view === v.value && "font-medium text-primary-ink ring-1 ring-primary-ink/60 ring-inset",
              )}
            >
              {v.label}
            </Link>
          ))}
        </nav>
      </div>

      {tasks.length === 0 ? (
        <div className="grid min-h-48 place-items-center glass rounded-xl border-dashed p-8 text-center">
          <div className="grid justify-items-center gap-3">
            <ListChecks className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {q ? "No tasks match that search." : view === "open" ? "All clear. Nothing open." : "Nothing here."}
            </p>
          </div>
        </div>
      ) : view === "open" ? (
        <GroupedTasks tasks={tasks} today={today} showProject={!project} returnTo={returnTo} runningTaskId={runningTaskId} />
      ) : (
        <TaskList tasks={tasks} today={today} showProject={!project} returnTo={returnTo} runningTaskId={runningTaskId} />
      )}
    </div>
  );
}

function GroupedTasks({
  tasks,
  today,
  showProject,
  returnTo,
  runningTaskId,
}: {
  tasks: Task[];
  today: string;
  showProject: boolean;
  returnTo: string;
  runningTaskId: string | null;
}) {
  const groups = DUE_GROUPS.map((g) => ({
    ...g,
    tasks: tasks.filter((t) => dueGroup(t.due_date, today) === g.value),
  })).filter((g) => g.tasks.length > 0);

  return (
    <div className="grid gap-6">
      {groups.map((g) => (
        <section key={g.value} className="grid gap-2" aria-labelledby={`group-${g.value}`}>
          <h2
            id={`group-${g.value}`}
            className={cn(
              "flex items-center gap-2 text-sm font-medium",
              g.value === "overdue" && "text-destructive",
            )}
          >
            {g.label}
            <span className="font-normal text-muted-foreground">{g.tasks.length}</span>
          </h2>
          <TaskList tasks={g.tasks} today={today} showProject={showProject} returnTo={returnTo} runningTaskId={runningTaskId} />
        </section>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="h-12 glass animate-pulse rounded-xl" />
      <div className="h-8 w-full animate-pulse rounded-lg bg-muted sm:max-w-xs" />
      <div className="h-64 glass animate-pulse rounded-xl" />
    </div>
  );
}
