"use client";

import { useOptimistic, useState, useTransition } from "react";
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
import { FormSelect } from "@/components/ui/form-select";
import { PROJECT_STATUSES } from "@/lib/projects/constants";
import { deleteProjectAction, setProjectStatusAction, type ActionResult } from "../actions";

export function ProjectActions({ id, name, status }: { id: string; name: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<ActionResult>, before?: () => void) =>
    startTransition(async () => {
      setError(null);
      before?.();
      const result = await fn();
      if (result?.error) setError(result.error);
    });

  return (
    <div className="grid justify-items-end gap-1">
      <div className="flex gap-2">
        <div className="relative">
          <FormSelect
            aria-label="Project status"
            value={optimisticStatus}
            disabled={pending}
            className="w-36"
            onValueChange={(next) => run(() => setProjectStatusAction(id, next), () => setOptimisticStatus(next))}
            options={PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />
          {pending && (
            <LoaderCircle className="absolute top-1/2 -left-6 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Delete project" disabled={pending}>
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the project and all of its tasks, and can&apos;t be
                undone. To keep it for your records, mark it Completed or Cancelled instead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => run(() => deleteProjectAction(id))}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
