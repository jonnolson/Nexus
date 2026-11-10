import { getRunningEntry, type TimeEntry } from "@/lib/time/data";
import { TimerChip, type RunningSummary } from "./timer-chip";

/** Short label for an entry: description → task → project → client → "Internal". */
export function entryLabel(e: TimeEntry): { label: string; context: string | null } {
  const label = e.description || e.task?.title || e.project?.name || e.client?.name || "Untitled";
  const context =
    [e.task && e.description ? e.task.title : null, e.project?.name, e.client?.name ?? "Internal"]
      .filter((x): x is string => Boolean(x) && x !== label)
      .slice(0, 2)
      .join(" · ") || null;
  return { label, context };
}

/** Server part of the shell timer: reads the running entry (request-time). */
export async function ShellTimer({ compact = false }: { compact?: boolean }) {
  const entry = await getRunningEntry();
  const running: RunningSummary = entry ? { startedAt: entry.started_at, ...entryLabel(entry) } : null;
  return <TimerChip running={running} compact={compact} />;
}
