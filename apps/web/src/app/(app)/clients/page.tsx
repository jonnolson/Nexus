import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listClients } from "@/lib/clients/data";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage({ searchParams }: PageProps<"/clients">) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Everyone you do work for.</p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus />
            New client
          </Link>
        </Button>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <ClientsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ClientsList({ searchParams }: Pick<PageProps<"/clients">, "searchParams">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const archived = params.view === "archived";
  const clients = await listClients({ q, archived });

  const viewHref = (view: "active" | "archived") => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (view === "archived") sp.set("view", "archived");
    const s = sp.toString();
    return s ? `/clients?${s}` : "/clients";
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Form action="/clients" className="relative w-full sm:max-w-xs" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search name, contact, email"
            aria-label="Search clients"
            className="pl-8"
          />
          {archived && <input type="hidden" name="view" value="archived" />}
        </Form>

        <nav aria-label="Client status" className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
          {(["active", "archived"] as const).map((view) => {
            const current = archived === (view === "archived");
            return (
              <Link
                key={view}
                href={viewHref(view)}
                aria-current={current ? "page" : undefined}
                data-sound
                className={cn(
                  "rounded-md px-3 py-1 capitalize text-muted-foreground transition-colors hover:text-foreground",
                  current && "font-medium text-primary-ink ring-1 ring-primary-ink/60 ring-inset",
                )}
              >
                {view}
              </Link>
            );
          })}
        </nav>
      </div>

      {clients.length === 0 ? (
        <EmptyState searching={Boolean(q)} archived={archived} />
      ) : (
        <div className="glass rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="pr-4 text-right">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id} className="relative">
                  <TableCell className="pl-4">
                    {/* The link's ::after covers the whole row, so any cell is clickable. */}
                    <Link
                      href={`/clients/${c.id}`}
                      className="font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                    >
                      {c.name}
                    </Link>
                    {c.contact_name && (
                      <p className="text-xs text-muted-foreground md:hidden">{c.contact_name}</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.contact_name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {c.email ?? "—"}
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums text-muted-foreground">
                    {c.default_rate_minor != null
                      ? `${formatMoney(c.default_rate_minor, c.currency)}/h`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function EmptyState({ searching, archived }: { searching: boolean; archived: boolean }) {
  return (
    <div className="grid min-h-64 place-items-center glass rounded-xl border-dashed p-8 text-center">
      <div className="grid justify-items-center gap-3">
        <Users className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {searching
            ? "No clients match that search."
            : archived
              ? "No archived clients."
              : "No clients yet. Add your first one to get started."}
        </p>
        {!searching && !archived && (
          <Button asChild size="sm">
            <Link href="/clients/new">
              <Plus />
              New client
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="h-8 w-full animate-pulse rounded-lg bg-muted sm:max-w-xs" />
      <div className="h-64 glass animate-pulse rounded-xl" />
    </div>
  );
}
