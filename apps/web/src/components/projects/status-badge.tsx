import { Badge } from "@/components/ui/badge";
import { statusMeta } from "@/lib/projects/constants";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  lead: "bg-sky-500",
  active: "bg-emerald-500",
  on_hold: "bg-amber-500",
  completed: "bg-muted-foreground",
  cancelled: "bg-muted-foreground/50",
};

export function ProjectStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT[meta.value])} />
      {meta.label}
    </Badge>
  );
}
