"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Square, Timer } from "lucide-react";
import { stopTimerAction } from "@/app/(app)/time/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Elapsed } from "./elapsed";

export type RunningSummary = { startedAt: string; label: string; context: string | null } | null;

/** Running timer in the app shell. `compact` is the mobile header version. */
export function TimerChip({ running, compact = false }: { running: RunningSummary; compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!running) {
    return compact ? null : (
      <Link
        href="/time"
        className="flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Timer className="size-4" />
        Start a timer
      </Link>
    );
  }

  const stop = () =>
    startTransition(async () => {
      setError(null);
      const r = await stopTimerAction();
      if (r.error) setError(r.error);
    });

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-primary-ink/60",
        compact ? "h-9 px-2" : "p-2",
      )}
    >
      <span className="relative flex size-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-ink opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-primary-ink" />
      </span>
      <Link href="/time" className="grid min-w-0 flex-1" aria-label="Running timer: open Time">
        <Elapsed startedAt={running.startedAt} className="text-sm font-medium tabular-nums" />
        {!compact && (
          <span className="truncate text-xs text-muted-foreground">
            {running.label}
            {running.context && ` · ${running.context}`}
          </span>
        )}
      </Link>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={stop}
        disabled={pending}
        aria-label="Stop timer"
        title="Stop timer"
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <Square className="fill-current" />}
      </Button>
      {error && <span className="sr-only" role="alert">{error}</span>}
    </div>
  );
}
