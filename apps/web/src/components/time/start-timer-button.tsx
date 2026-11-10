"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Play, Square } from "lucide-react";
import { startTimerForAction, stopTimerAction } from "@/app/(app)/time/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ▶ for a task or project. If this target's timer is already running it becomes ■.
 * Starting here stops any other running timer.
 */
export function StartTimerButton({
  taskId,
  projectId,
  running = false,
  label,
  size = "icon-sm",
  className,
}: {
  taskId?: string;
  projectId?: string;
  running?: boolean;
  label: string;
  size?: "icon-sm" | "sm";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () =>
    startTransition(async () => {
      setError(null);
      const result = running ? await stopTimerAction() : await startTimerForAction({ taskId, projectId });
      if (result.error) setError(result.error);
    });

  const Icon = pending ? LoaderCircle : running ? Square : Play;
  const text = running ? "Stop timer" : "Start timer";

  return (
    <span className="inline-flex flex-col items-end">
      <Button
        type="button"
        variant={running ? "default" : size === "sm" ? "outline" : "ghost"}
        size={size}
        onClick={onClick}
        disabled={pending}
        aria-label={`${text} for ${label}`}
        title={text}
        className={cn(running && "animate-pulse", className)}
      >
        <Icon className={cn(pending && "animate-spin", running && !pending && "fill-current")} />
        {size === "sm" && text}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
