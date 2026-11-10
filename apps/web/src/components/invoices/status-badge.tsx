import { Badge } from "@/components/ui/badge";
import { displayStatus } from "@/lib/invoices/constants";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  draft: "bg-muted-foreground/60",
  sent: "bg-sky-500",
  overdue: "bg-destructive",
  paid: "bg-emerald-500",
  void: "bg-muted-foreground/30",
};

export function InvoiceStatusBadge({
  status,
  dueDate,
  today,
  className,
}: {
  status: string;
  dueDate: string;
  today: string;
  className?: string;
}) {
  const s = displayStatus(status, dueDate, today);
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-normal", s.tone === "overdue" && "border-destructive/50 text-destructive", className)}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", TONE[s.tone])} />
      {s.label}
    </Badge>
  );
}
