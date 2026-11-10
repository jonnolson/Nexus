"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Pencil, Play, Square, Trash2 } from "lucide-react";
import { Elapsed } from "@/components/time/elapsed";
import { EntryPickers } from "@/components/time/entry-pickers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TimeOptions } from "@/lib/time/data";
import { discardTimerAction, startTimerAction, stopTimerAction } from "./actions";

export type RunningEntry = {
  id: string;
  startedAt: string;
  label: string;
  context: string | null;
  billable: boolean;
} | null;

export function TimerPanel({ running, options }: { running: RunningEntry; options: TimeOptions }) {
  return (
    <div className="glass rounded-xl p-4">
      {running ? <Running entry={running} /> : <StartForm options={options} />}
    </div>
  );
}

function Running({ entry }: { entry: NonNullable<RunningEntry> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if (r.error) setError(r.error);
    });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="truncate font-medium">{entry.label}</p>
        <p className="truncate text-sm text-muted-foreground">
          {entry.context ?? "Internal"}
          {!entry.billable && " · Non-billable"}
        </p>
      </div>
      <Elapsed startedAt={entry.startedAt} className="text-3xl font-semibold tabular-nums tracking-tight" />
      <div className="flex gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Edit running timer">
          <Link href={`/time/${entry.id}`}>
            <Pencil />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Discard timer"
          title="Discard (don't save)"
          disabled={pending}
          onClick={() => {
            if (confirm("Discard this timer without saving it?")) run(discardTimerAction);
          }}
        >
          <Trash2 />
        </Button>
        <Button onClick={() => run(stopTimerAction)} disabled={pending} className="min-w-24">
          {pending ? <LoaderCircle className="animate-spin" /> : <Square className="fill-current" />}
          Stop
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:basis-full">
          {error}
        </p>
      )}
    </div>
  );
}

function StartForm({ options }: { options: TimeOptions }) {
  const [state, action, pending] = useActionState(startTimerAction, undefined);
  const [billable, setBillable] = useState(true);

  return (
    <form action={action} className="grid gap-3">
      <div className="flex gap-2">
        <Input
          name="description"
          placeholder="What are you working on?"
          aria-label="Description"
          maxLength={2000}
          autoComplete="off"
          className="flex-1"
        />
        <Button type="submit" disabled={pending} className="min-w-24">
          {pending ? <LoaderCircle className="animate-spin" /> : <Play className="fill-current" />}
          Start
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <EntryPickers options={options} layout="inline" onProjectChange={setBillable} />
        <div className="flex items-center gap-2">
          <Checkbox
            id="timer-billable"
            checked={billable}
            onCheckedChange={(v) => setBillable(v === true)}
          />
          <Label htmlFor="timer-billable" className="font-normal">
            Billable
          </Label>
          {billable && <input type="hidden" name="billable" value="on" />}
        </div>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
