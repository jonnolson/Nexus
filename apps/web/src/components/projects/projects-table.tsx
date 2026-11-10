import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateOnly, todayInStudio } from "@/lib/dates";
import { OPEN_STATUSES, type ProjectStatus } from "@/lib/projects/constants";
import type { Project } from "@/lib/projects/data";
import { cn } from "@/lib/utils";
import { billingSummary } from "./billing-summary";
import { ProjectStatusBadge } from "./status-badge";

export function ProjectsTable({
  projects,
  showClient = true,
}: {
  projects: Project[];
  showClient?: boolean;
}) {
  const today = todayInStudio();

  return (
    <div className="glass rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Project</TableHead>
            {showClient && <TableHead className="hidden md:table-cell">Client</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Billing</TableHead>
            <TableHead className="pr-4 text-right">Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((p) => {
            const overdue =
              p.due_date !== null &&
              p.due_date < today &&
              OPEN_STATUSES.includes(p.status as ProjectStatus);
            return (
              <TableRow key={p.id} className="relative">
                <TableCell className="pl-4">
                  {/* The link's ::after covers the whole row, so any cell is clickable. */}
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                  >
                    {p.name}
                  </Link>
                  {showClient && (
                    <p className="text-xs text-muted-foreground md:hidden">{p.client.name}</p>
                  )}
                </TableCell>
                {showClient && (
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {p.client.name}
                  </TableCell>
                )}
                <TableCell>
                  <ProjectStatusBadge status={p.status} />
                </TableCell>
                <TableCell className="hidden tabular-nums text-muted-foreground lg:table-cell">
                  {billingSummary(p)}
                </TableCell>
                <TableCell
                  className={cn(
                    "pr-4 text-right tabular-nums text-muted-foreground",
                    overdue && "font-medium text-destructive",
                  )}
                >
                  {p.due_date ? formatDateOnly(p.due_date) : "—"}
                  {overdue && <span className="sr-only"> (overdue)</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
