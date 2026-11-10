import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { formatTimestamp } from "@/lib/dates";
import { safeTaskReturnTo } from "@/lib/tasks/constants";
import { getTask, listProjectOptions } from "@/lib/tasks/data";
import { StartTimerButton } from "@/components/time/start-timer-button";
import { TimeSection } from "@/components/time/time-section";
import { getRunningEntry, listEntries } from "@/lib/time/data";
import { taskToFormValues } from "@/lib/tasks/schema";
import { TaskForm } from "./task-form";

export const metadata: Metadata = { title: "Task" };

export default function TaskPage({ params, searchParams }: PageProps<"/tasks/[id]">) {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6 p-4 md:p-8">
      <Suspense fallback={<div className="h-96 glass animate-pulse rounded-xl" />}>
        <TaskDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TaskDetail({ params, searchParams }: PageProps<"/tasks/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [task, entries, running] = await Promise.all([getTask(id), listEntries({ taskId: id }), getRunningEntry()]);
  const projects = await listProjectOptions(task.project_id);
  const returnTo = safeTaskReturnTo(sp.from);
  const backLabel = returnTo.startsWith("/projects/") && task.project ? task.project.name : "Tasks";

  return (
    <>
      <div className="grid gap-2">
        <Link
          href={returnTo}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {backLabel}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit task</h1>
        {task.project && (
          <p className="text-sm text-muted-foreground">
            <Link href={`/projects/${task.project.id}`} className="underline-offset-4 hover:underline">
              {task.project.name}
            </Link>{" "}
            ·{" "}
            <Link href={`/clients/${task.project.client.id}`} className="underline-offset-4 hover:underline">
              {task.project.client.name}
            </Link>
          </p>
        )}
      </div>

      <TaskForm id={task.id} returnTo={returnTo} defaults={taskToFormValues(task)} projects={projects} />

      <TimeSection
        entries={entries}
        targetMinutes={task.estimate_minutes}
        targetLabel="estimate"
        returnTo={`/tasks/${task.id}`}
        action={
          <StartTimerButton
            taskId={task.id}
            running={running?.task_id === task.id}
            label={task.title}
            size="sm"
          />
        }
      />

      <p className="text-xs text-muted-foreground">
        Created {formatTimestamp(task.created_at)}
        {task.completed_at && ` · Completed ${formatTimestamp(task.completed_at)}`}
      </p>
    </>
  );
}
