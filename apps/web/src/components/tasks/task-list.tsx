"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { setTaskStatusAction } from "@/app/(app)/tasks/actions";
import { Badge } from "@/components/ui/badge";
import { StartTimerButton } from "@/components/time/start-timer-button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateOnly } from "@/lib/dates";
import type { Task } from "@/lib/tasks/data";
import { cn } from "@/lib/utils";

export function TaskList({
  tasks,
  today,
  showProject = true,
  returnTo,
  runningTaskId = null,
}: {
  tasks: Task[];
  /** "YYYY-MM-DD" in the studio's time zone, computed on the server. */
  today: string;
  showProject?: boolean;
  /** Where the task page should send you back to. */
  returnTo: string;
  /** Task whose timer is running, if any (its ▶ becomes ■). */
  runningTaskId?: string | null;
}) {
  return (
    <ul className="divide-y glass rounded-xl">
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          today={today}
          showProject={showProject}
          returnTo={returnTo}
          timerRunning={t.id === runningTaskId}
        />
      ))}
    </ul>
  );
}

function TaskRow({
  task,
  today,
  showProject,
  returnTo,
  timerRunning,
}: {
  task: Task;
  today: string;
  showProject: boolean;
  returnTo: string;
  timerRunning: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setOptimisticStatus] = useOptimistic(task.status);
  const [error, setError] = useState<string | null>(null);
  const done = status === "done";
  const overdue = !done && task.due_date !== null && task.due_date < today;

  const toggle = (checked: boolean) =>
    startTransition(async () => {
      setError(null);
      const next = checked ? "done" : "todo";
      setOptimisticStatus(next);
      const result = await setTaskStatusAction(task.id, next);
      if (result.error) setError(result.error);
    });

  const href = `/tasks/${task.id}?from=${encodeURIComponent(returnTo)}`;

  return (
    <li className={cn("flex items-start gap-3 px-3 py-2.5", pending && "opacity-70")}>
      <Checkbox
        checked={done}
        onCheckedChange={(v) => toggle(v === true)}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className="mt-0.5"
      />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <Link
          href={href}
          className={cn(
            "truncate text-sm underline-offset-4 hover:underline",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {showProject &&
            (task.project ? (
              <Link href={`/projects/${task.project.id}`} className="truncate hover:text-foreground">
                {task.project.name} · {task.project.client.name}
              </Link>
            ) : (
              <span>No project</span>
            ))}
          {status === "in_progress" && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[0.65rem]">
              In progress
            </Badge>
          )}
          {task.notes && <span aria-label="Has notes">Notes</span>}
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5 text-xs tabular-nums">
        {task.priority === 3 && (
          <span className="flex items-center text-destructive" title="High priority">
            <ArrowUp className="size-3.5" />
            <span className="sr-only">High priority</span>
          </span>
        )}
        {task.priority === 1 && (
          <span className="flex items-center text-muted-foreground" title="Low priority">
            <ArrowDown className="size-3.5" />
            <span className="sr-only">Low priority</span>
          </span>
        )}
        {task.due_date && (
          <span className={cn("text-muted-foreground", overdue && "font-medium text-destructive")}>
            {task.due_date === today ? "Today" : formatDateOnly(task.due_date, { year: undefined })}
            {overdue && <span className="sr-only"> (overdue)</span>}
          </span>
        )}
        {(!done || timerRunning) && (
          <StartTimerButton taskId={task.id} running={timerRunning} label={task.title} className="-my-1" />
        )}
      </div>
    </li>
  );
}
