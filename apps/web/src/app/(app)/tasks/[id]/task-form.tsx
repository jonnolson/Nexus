"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { Textarea } from "@/components/ui/textarea";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks/constants";
import type { ProjectOption } from "@/lib/tasks/data";
import type { TaskFormField } from "@/lib/tasks/schema";
import { deleteTaskAction, updateTaskAction, type TaskFormState } from "../actions";

type Values = Partial<Record<TaskFormField, string>>;

export function TaskForm({
  id,
  returnTo,
  defaults,
  projects,
}: {
  id: string;
  returnTo: string;
  defaults: Values;
  projects: ProjectOption[];
}) {
  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(
    updateTaskAction.bind(null, id, returnTo),
    undefined,
  );
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const values: Values = state?.values ?? defaults;
  const errors = state?.fieldErrors ?? {};
  const formKey = state?.values ? JSON.stringify(state.values) : "initial";

  const error = (name: TaskFormField) =>
    errors[name] && (
      <p id={`${name}-error`} className="text-sm text-destructive">
        {errors[name]}
      </p>
    );

  const select = (
    name: TaskFormField,
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <FormSelect
        id={name}
        name={name}
        defaultValue={values[name] ?? ""}
        options={options}
        aria-invalid={errors[name] ? true : undefined}
      />
      {error(name)}
    </div>
  );

  return (
    <div className="grid gap-6">
      <form key={formKey} action={formAction} className="glass grid gap-6 rounded-xl p-4 sm:p-6" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="title">Task</Label>
          <Input
            id="title"
            name="title"
            defaultValue={values.title ?? ""}
            required
            maxLength={300}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "title-error" : undefined}
          />
          {error("title")}
        </div>

        {select("project_id", "Project", [
          { value: "", label: "No project" },
          ...projects.map((p) => ({
            value: p.id,
            label: `${p.name} · ${p.clientName}${["completed", "cancelled"].includes(p.status) ? ` (${p.status})` : ""}`,
          })),
        ])}

        <div className="grid gap-4 sm:grid-cols-2">
          {select("status", "Status", TASK_STATUSES.map((s) => ({ value: s.value, label: s.label })))}
          {select("priority", "Priority", TASK_PRIORITIES.map((p) => ({ value: String(p.value), label: p.label })))}
          <div className="grid gap-2">
            <Label htmlFor="due_date">Due date</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={values.due_date ?? ""}
              aria-invalid={errors.due_date ? true : undefined}
            />
            {error("due_date")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="estimate_hours">Estimate (hours)</Label>
            <Input
              id="estimate_hours"
              name="estimate_hours"
              inputMode="decimal"
              placeholder="Optional"
              defaultValue={values.estimate_hours ?? ""}
              aria-invalid={errors.estimate_hours ? true : undefined}
            />
            {error("estimate_hours")}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={6}
            defaultValue={values.notes ?? ""}
            placeholder="Details, links, acceptance criteria…"
            aria-invalid={errors.notes ? true : undefined}
          />
          {error("notes")}
        </div>

        {state?.formError && (
          <p role="alert" className="text-sm text-destructive">
            {state.formError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" disabled={deleting}>
                {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    startDelete(async () => {
                      setDeleteError(null);
                      const result = await deleteTaskAction(id, returnTo);
                      if (result?.error) setDeleteError(result.error);
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button asChild variant="outline">
            <Link href={returnTo}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            Save
          </Button>
        </div>
      </form>
      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}
    </div>
  );
}
