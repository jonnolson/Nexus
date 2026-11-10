"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { EntryPickers } from "@/components/time/entry-pickers";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TimeOptions } from "@/lib/time/data";
import type { EntryFormField } from "@/lib/time/schema";
import { deleteEntryAction, type EntryFormState } from "./actions";

type Values = Partial<Record<EntryFormField, string>>;

/**
 * Manual entry (mode "create": resets after each save) or editing an entry
 * (mode "edit": shows delete; an empty end keeps a running timer running).
 */
export function EntryForm({
  mode,
  action,
  options,
  defaults,
  running = false,
  entryId,
  returnTo = "/time",
}: {
  mode: "create" | "edit";
  action: (prev: EntryFormState, formData: FormData) => Promise<EntryFormState>;
  options: TimeOptions;
  defaults: Values;
  running?: boolean;
  entryId?: string;
  returnTo?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // After a failed submit, show what was typed; after a successful create, start fresh.
  const values: Values = state?.values ?? defaults;
  const errors = state?.fieldErrors ?? {};
  const [billable, setBillable] = useState((values.billable ?? "on") === "on");
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const formKey = state?.ok ?? (state?.values ? JSON.stringify(state.values) : "initial");

  const field = (name: EntryFormField, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="grid gap-2">
      <Label htmlFor={`${mode}-${name}`}>{label}</Label>
      <Input
        id={`${mode}-${name}`}
        name={name}
        defaultValue={values[name] ?? ""}
        aria-invalid={errors[name] ? true : undefined}
        {...props}
      />
      {errors[name] && <p className="text-sm text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <form key={formKey} action={formAction} className="grid gap-4" noValidate>
      {field("description", "Description", { placeholder: "What did you work on?", maxLength: 2000 })}

      <EntryPickers
        options={options}
        defaults={{ clientId: values.client_id, projectId: values.project_id, taskId: values.task_id }}
        onProjectChange={setBillable}
        errors={errors}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {field("date", "Date", { type: "date", required: true })}
        {field("start_time", "Start", { type: "time", required: true })}
        {field("end_time", running ? "End (blank = running)" : "End", { type: "time" })}
        {field("duration", "or Duration", { placeholder: "1:30", inputMode: "decimal" })}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id={`${mode}-billable`} checked={billable} onCheckedChange={(v) => setBillable(v === true)} />
        <Label htmlFor={`${mode}-billable`} className="font-normal">
          Billable
        </Label>
        {billable && <input type="hidden" name="billable" value="on" />}
      </div>

      {state?.formError && (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {mode === "edit" && entryId && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" disabled={deleting}>
                {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this time entry?</AlertDialogTitle>
                <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    startDelete(async () => {
                      setDeleteError(null);
                      const r = await deleteEntryAction(entryId, returnTo);
                      if (r?.error) setDeleteError(r.error);
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {mode === "edit" && (
          <Button asChild variant="outline">
            <Link href={returnTo}>Cancel</Link>
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : mode === "create" && <Plus />}
          {mode === "create" ? "Add entry" : "Save"}
        </Button>
      </div>
      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}
      {mode === "create" && state?.ok && (
        <p role="status" className="text-sm text-muted-foreground">
          Entry added.
        </p>
      )}
    </form>
  );
}
