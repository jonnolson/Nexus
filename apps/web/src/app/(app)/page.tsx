import type { Metadata } from "next";
import { Suspense } from "react";
import { BlockSkeleton } from "@/components/dashboard/block";
import {
  ClientsBlock,
  ExpensesBlock,
  InvoicesBlock,
  NotesBlock,
  ProjectsBlock,
  TasksBlock,
  TimeBlock,
} from "@/components/dashboard/blocks";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Studio overview. Each block loads its own data and streams in behind its own
 * skeleton, so one slow query doesn't hold up the rest.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:p-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your studio at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Suspense fallback={<BlockSkeleton />}>
          <TasksBlock />
        </Suspense>
        <Suspense fallback={<BlockSkeleton />}>
          <TimeBlock />
        </Suspense>
        <Suspense fallback={<BlockSkeleton />}>
          <InvoicesBlock />
        </Suspense>
        <Suspense fallback={<BlockSkeleton />}>
          <ProjectsBlock />
        </Suspense>
        <Suspense fallback={<BlockSkeleton />}>
          <ClientsBlock />
        </Suspense>
        <Suspense fallback={<BlockSkeleton rows={3} />}>
          <ExpensesBlock />
        </Suspense>
        <Suspense fallback={<BlockSkeleton />}>
          <NotesBlock />
        </Suspense>
      </div>
    </div>
  );
}
