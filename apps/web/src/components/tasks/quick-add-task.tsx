"use client";

import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { quickAddTaskAction } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import type { ProjectOption } from "@/lib/tasks/data";

/**
 * One-line task capture. With `projectId` the task goes straight into that
 * project; otherwise a project picker is shown (blank = standalone task).
 */
export function QuickAddTask({
  projectId,
  projects = [],
  defaultProjectId = "",
}: {
  projectId?: string;
  projects?: ProjectOption[];
  defaultProjectId?: string;
}) {
  const [state, action, pending] = useActionState(quickAddTaskAction, undefined);
  const titleRef = useRef<HTMLInputElement>(null);

  // After a successful add, keep focus in the title box for rapid entry.
  useEffect(() => {
    if (state?.ok) titleRef.current?.focus();
  }, [state?.ok]);

  return (
    <form
      key={state?.ok ?? "initial"}
      action={action}
      className="grid gap-2 glass rounded-xl p-2 sm:flex sm:items-center"
    >
      <Input
        ref={titleRef}
        name="title"
        placeholder="Add a task…"
        aria-label="New task"
        required
        maxLength={300}
        autoComplete="off"
        className="border-0 shadow-none focus-visible:ring-0 sm:flex-1 dark:bg-transparent"
      />
      <div className="flex gap-2">
        {projectId ? (
          <input type="hidden" name="project_id" value={projectId} />
        ) : (
          <FormSelect
            name="project_id"
            aria-label="Project"
            defaultValue={defaultProjectId}
            className="min-w-0 flex-1 sm:w-48 sm:flex-none"
            options={[
              { value: "", label: "No project" },
              ...projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.clientName}` })),
            ]}
          />
        )}
        <Input name="due_date" type="date" aria-label="Due date" className="w-auto" />
        <Button type="submit" disabled={pending} aria-label="Add task">
          {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="px-2 text-sm text-destructive sm:basis-full">
          {state.error}
        </p>
      )}
    </form>
  );
}
