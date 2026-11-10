import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { listClientOptions } from "@/lib/clients/data";
import { STUDIO_DEFAULTS } from "@/lib/studio";
import { createProjectAction } from "../actions";
import { ProjectForm } from "../project-form";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <div className="grid gap-2">
        <Link
          href="/projects"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Projects
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
      </div>
      <Suspense fallback={<div className="h-96 glass animate-pulse rounded-xl" />}>
        <NewProjectForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewProjectForm({ searchParams }: Pick<PageProps<"/projects/new">, "searchParams">) {
  const { client } = await searchParams;
  const clients = await listClientOptions();
  const preselected = clients.find((c) => c.id === client);

  return (
    <ProjectForm
      action={createProjectAction}
      clients={clients}
      defaults={{
        client_id: preselected?.id ?? "",
        currency: preselected?.currency ?? STUDIO_DEFAULTS.currency,
        status: "active",
        billing_type: "hourly",
      }}
      submitLabel="Create project"
      cancelHref={preselected ? `/clients/${preselected.id}` : "/projects"}
    />
  );
}
