import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { FolderKanban, Plus, Search, X } from "lucide-react";
import { ProjectsTable } from "@/components/projects/projects-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getClient } from "@/lib/clients/data";
import { PROJECT_VIEWS, type ProjectView } from "@/lib/projects/constants";
import { listProjects } from "@/lib/projects/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Work in progress, and everything before it.</p>
        </div>
        <Suspense
          fallback={
            <Button disabled>
              <Plus />
              New project
            </Button>
          }
        >
          <NewProjectButton searchParams={searchParams} />
        </Suspense>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <ProjectsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type SP = Awaited<PageProps<"/projects">["searchParams"]>;
const str = (v: SP[string]) => (typeof v === "string" ? v : "");

async function NewProjectButton({ searchParams }: Pick<PageProps<"/projects">, "searchParams">) {
  const client = str((await searchParams).client);
  return (
    <Button asChild>
      <Link href={client ? `/projects/new?client=${encodeURIComponent(client)}` : "/projects/new"}>
        <Plus />
        New project
      </Link>
    </Button>
  );
}

async function ProjectsList({ searchParams }: Pick<PageProps<"/projects">, "searchParams">) {
  const params = await searchParams;
  const q = str(params.q).slice(0, 100);
  const viewParam = str(params.view);
  const view: ProjectView = PROJECT_VIEWS.some((v) => v.value === viewParam)
    ? (viewParam as ProjectView)
    : "open";
  const clientId = str(params.client);

  const [projects, client] = await Promise.all([
    listProjects({ q, view, clientId: clientId || undefined }),
    clientId ? getClient(clientId) : Promise.resolve(null),
  ]);

  const href = (next: { view?: ProjectView; client?: string | null }) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    const v = next.view ?? view;
    if (v !== "open") sp.set("view", v);
    const c = next.client === undefined ? clientId : next.client;
    if (c) sp.set("client", c);
    const s = sp.toString();
    return s ? `/projects?${s}` : "/projects";
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Form action="/projects" className="relative w-full sm:max-w-xs" role="search">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search projects"
              aria-label="Search projects"
              className="pl-8"
            />
            {view !== "open" && <input type="hidden" name="view" value={view} />}
            {clientId && <input type="hidden" name="client" value={clientId} />}
          </Form>
          {client && (
            <Link
              href={href({ client: null })}
              className="flex w-fit items-center gap-1.5 rounded-full border bg-muted/50 py-1 pr-2 pl-3 text-sm hover:bg-muted"
            >
              Client: <span className="font-medium">{client.name}</span>
              <X className="size-3.5" aria-label="Clear client filter" />
            </Link>
          )}
        </div>

        <nav aria-label="Project status" className="flex w-fit gap-1 rounded-lg bg-muted p-1 text-sm">
          {PROJECT_VIEWS.map((v) => (
            <Link
              key={v.value}
              href={href({ view: v.value })}
              aria-current={view === v.value ? "page" : undefined}
              data-sound
              className={cn(
                "rounded-md px-3 py-1 text-muted-foreground transition-colors hover:text-foreground",
                view === v.value && "font-medium text-primary-ink ring-1 ring-primary-ink/60 ring-inset",
              )}
            >
              {v.label}
            </Link>
          ))}
        </nav>
      </div>

      {projects.length === 0 ? (
        <div className="grid min-h-64 place-items-center glass rounded-xl border-dashed p-8 text-center">
          <div className="grid justify-items-center gap-3">
            <FolderKanban className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {q
                ? "No projects match that search."
                : view === "open"
                  ? "No open projects."
                  : "Nothing here."}
            </p>
            {!q && view === "open" && (
              <Button asChild size="sm">
                <Link href={clientId ? `/projects/new?client=${clientId}` : "/projects/new"}>
                  <Plus />
                  New project
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <ProjectsTable projects={projects} showClient={!client} />
      )}
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
