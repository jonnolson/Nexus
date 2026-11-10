"use client";

import { useActionState, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { EntryPickers } from "@/components/time/entry-pickers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NoteLinkOptions } from "@/lib/notes/data";
import { NOTE_SPACES, type NoteFormField } from "@/lib/notes/schema";
import { cn } from "@/lib/utils";
import type { NoteFormState } from "./actions";

type Values = Record<NoteFormField, string>;

export function NoteEditor({
  action,
  defaults,
  options,
  submitLabel,
}: {
  action: (prev: NoteFormState, formData: FormData) => Promise<NoteFormState>;
  defaults: Values;
  options: NoteLinkOptions;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values = state?.values ?? defaults;
  const errors = state?.fieldErrors ?? {};
  const [space, setSpace] = useState(values.space || "work");
  const formRef = useRef<HTMLFormElement>(null);
  // Keep typed text after a failed save; after a successful save the saved values come back.
  const formKey = state?.values ? JSON.stringify(state.values) : "initial";

  return (
    <form
      ref={formRef}
      key={formKey}
      action={formAction}
      className="glass grid gap-4 rounded-xl p-4 sm:p-6"
      noValidate
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          formRef.current?.requestSubmit();
        }
      }}
    >
      <fieldset className="flex w-fit gap-1 rounded-lg bg-muted p-1 text-sm">
        <legend className="sr-only">Space</legend>
        {NOTE_SPACES.map((s) => (
          <label
            key={s.value}
            data-sound
            className={cn(
              "cursor-pointer rounded-md px-3 py-1 text-muted-foreground transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              space === s.value && "font-medium text-primary-ink ring-1 ring-primary-ink/60 ring-inset",
            )}
          >
            <input
              type="radio"
              name="space"
              value={s.value}
              checked={space === s.value}
              onChange={() => setSpace(s.value)}
              className="sr-only"
            />
            {s.label}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-1">
        <Label htmlFor="note-title" className="sr-only">
          Title
        </Label>
        <Input
          id="note-title"
          name="title"
          defaultValue={values.title}
          placeholder="Title"
          maxLength={300}
          autoFocus={!values.title && !values.body}
          className="h-11 text-lg font-medium"
          aria-invalid={errors.title ? true : undefined}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="note-body" className="sr-only">
          Note
        </Label>
        <Textarea
          id="note-body"
          name="body"
          defaultValue={values.body}
          placeholder="Write anything…"
          rows={16}
          className="min-h-72 font-[inherit] leading-relaxed"
          aria-invalid={errors.body ? true : undefined}
        />
        {errors.body && <p className="text-sm text-destructive">{errors.body}</p>}
      </div>

      {space === "work" ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium">Linked to</p>
          <EntryPickers
            showTask={false}
            options={{
              clients: options.clients,
              projects: options.projects.map((p) => ({ ...p, billable: true })),
              tasks: [],
            }}
            defaults={{ clientId: values.client_id, projectId: values.project_id }}
            errors={errors}
          />
          <p className="text-xs text-muted-foreground">Linked notes also appear on that client&apos;s and project&apos;s pages.</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Personal notes stay private to this space and aren&apos;t linked to clients.</p>
      )}

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {state?.saved && !pending && (
          <span role="status" className="flex items-center gap-1 text-sm text-muted-foreground">
            <Check className="size-4" /> Saved
          </span>
        )}
        <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl/⌘ + S</span>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
