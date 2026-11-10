export const TASK_STATUSES = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];
export const TASK_STATUS_VALUES = TASK_STATUSES.map((s) => s.value) as [TaskStatus, ...TaskStatus[]];
export const OPEN_TASK_STATUSES: TaskStatus[] = ["todo", "in_progress"];

export const taskStatusLabel = (s: string) => TASK_STATUSES.find((x) => x.value === s)?.label ?? s;

export const TASK_PRIORITIES = [
  { value: 3, label: "High" },
  { value: 2, label: "Normal" },
  { value: 1, label: "Low" },
] as const;

export const priorityLabel = (p: number) => TASK_PRIORITIES.find((x) => x.value === p)?.label ?? "Normal";

export const TASK_VIEWS = [
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
] as const;

export type TaskView = (typeof TASK_VIEWS)[number]["value"];

/** Groups for the Open view, relative to today in the studio's time zone. */
export type DueGroup = "overdue" | "today" | "upcoming" | "none";
export const DUE_GROUPS: { value: DueGroup; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "none", label: "No due date" },
];

/**
 * Where a task page may send you back to: only our own /tasks or /projects/<id>
 * pages (with a plain query string). Anything else falls back to /tasks, so the
 * `from` parameter can't be used as an open redirect.
 */
export function safeTaskReturnTo(value: unknown): string {
  return typeof value === "string" &&
    /^\/(tasks|projects\/[0-9a-f-]{36})(\?[\w=&%+.-]*)?$/i.test(value)
    ? value
    : "/tasks";
}

export function dueGroup(due: string | null, today: string): DueGroup {
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}
