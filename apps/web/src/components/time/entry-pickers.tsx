"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { FormSelect, type SelectOption } from "@/components/ui/form-select";
import type { TimeOptions } from "@/lib/time/data";
import { cn } from "@/lib/utils";

/**
 * Client → project → task pickers that stay consistent:
 *   picking a task sets its project (and client); picking a project sets its client;
 *   changing the client clears a project/task that belongs to someone else.
 * Submits client_id / project_id / task_id. The database applies the same rules.
 */
export function EntryPickers({
  options,
  defaults = {},
  onProjectChange,
  layout = "grid",
  errors = {},
  showTask = true,
}: {
  /** Hide the task picker (e.g. notes link to a client/project only). */
  showTask?: boolean;
  options: TimeOptions;
  defaults?: { clientId?: string; projectId?: string; taskId?: string };
  /** Called with the project's billable default when the project changes. */
  onProjectChange?: (billable: boolean) => void;
  layout?: "grid" | "inline";
  errors?: { client_id?: string; project_id?: string; task_id?: string };
}) {
  const [clientId, setClientId] = useState(defaults.clientId ?? "");
  const [projectId, setProjectId] = useState(defaults.projectId ?? "");
  const [taskId, setTaskId] = useState(defaults.taskId ?? "");

  const projectById = (id: string) => options.projects.find((p) => p.id === id);
  const taskById = (id: string) => options.tasks.find((t) => t.id === id);
  const clientName = (id: string) => options.clients.find((c) => c.id === id)?.name ?? "";

  const visibleProjects = clientId ? options.projects.filter((p) => p.clientId === clientId) : options.projects;
  // A project's tasks, or (with no project) the standalone tasks.
  const visibleTasks = options.tasks.filter((t) => t.projectId === (projectId || null));

  const chooseClient = (id: string) => {
    setClientId(id);
    const project = projectById(projectId);
    if (project && project.clientId !== id) {
      setProjectId("");
      setTaskId("");
    }
  };

  const chooseProject = (id: string) => {
    setProjectId(id);
    const project = projectById(id);
    if (project) {
      setClientId(project.clientId);
      onProjectChange?.(project.billable);
    } else {
      onProjectChange?.(true);
    }
    const task = taskById(taskId);
    if (task && task.projectId !== (id || null)) setTaskId("");
  };

  const chooseTask = (id: string) => {
    setTaskId(id);
    const task = taskById(id);
    if (task?.projectId && task.projectId !== projectId) chooseProject(task.projectId);
  };

  const cols = showTask ? "sm:grid-cols-3" : "sm:grid-cols-2";
  const wrap = layout === "inline" ? `grid gap-2 ${cols}` : `grid gap-4 ${cols}`;
  const select = (
    name: "client_id" | "project_id" | "task_id",
    label: string,
    value: string,
    onChange: (v: string) => void,
    selectOptions: SelectOption[],
  ) => (
    <div className="grid gap-2">
      <Label htmlFor={name} className={cn(layout === "inline" && "sr-only")}>
        {label}
      </Label>
      <FormSelect
        id={name}
        name={name}
        value={value}
        onValueChange={onChange}
        options={selectOptions}
        aria-invalid={errors[name] ? true : undefined}
      />
      {errors[name] && <p className="text-sm text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <div className={wrap}>
      {select("client_id", "Client", clientId, chooseClient, [
        { value: "", label: "No client (internal)" },
        ...options.clients.map((c) => ({ value: c.id, label: c.name })),
      ])}
      {select("project_id", "Project", projectId, chooseProject, [
        { value: "", label: "No project" },
        ...visibleProjects.map((p) => ({
          value: p.id,
          label: clientId ? p.name : `${p.name} · ${clientName(p.clientId)}`,
        })),
      ])}
      {showTask &&
        select("task_id", "Task", taskId, chooseTask, [
          { value: "", label: "No task" },
          ...visibleTasks.map((t) => ({ value: t.id, label: t.title })),
        ])}
    </div>
  );
}
