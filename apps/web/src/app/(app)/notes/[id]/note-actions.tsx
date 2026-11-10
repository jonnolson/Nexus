"use client";

import { useOptimistic, useState, useTransition } from "react";
import { LoaderCircle, Pin, PinOff, Trash2 } from "lucide-react";
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
import { deleteNoteAction, setNotePinnedAction } from "../actions";

export function NoteActions({ id, pinned, space }: { id: string; pinned: boolean; space: string }) {
  const [pending, startTransition] = useTransition();
  const [isPinned, setOptimisticPinned] = useOptimistic(pinned);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid justify-items-end gap-1">
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setOptimisticPinned(!isPinned);
              const r = await setNotePinnedAction(id, !isPinned);
              if (r.error) setError(r.error);
            })
          }
        >
          {isPinned ? <PinOff /> : <Pin />}
          {isPinned ? "Unpin" : "Pin"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const r = await deleteNoteAction(id, space);
                    if (r?.error) setError(r.error);
                  })
                }
              >
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
