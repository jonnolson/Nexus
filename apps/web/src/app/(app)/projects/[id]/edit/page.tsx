import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { listClientOptions } from "@/lib/clients/data";
import { getProject } from "@/lib/projects/data";
import { projectToFormValues } from "@/lib/projects/schema";
import { updateProjectAction } from "../../actions";
import { ProjectForm } from "../../project-form";

export const metadata: Metadata = { title: "Edit project" };

export default function EditProjectPage({ params }: PageProps<"/projects/[id]/edit">) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <Suspense fallback={<div className="h-96 glass animate-pulse rounded-xl" />}>
        <EditProject params={params} />
      </Suspense>
    </div>
  );
}

async function EditProject({ params }: Pick<PageProps<"/projects/[id]/edit">, "params">) {
  const { id } = await params;
  const project = await getProject(id);
  const clients = await listClientOptions(project.client_id);
  const href = `/projects/${project.id}`;

  return (
    <>
      <div className="grid gap-2">
        <Link
          href={href}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {project.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit project</h1>
      </div>
      <ProjectForm
        action={updateProjectAction.bind(null, project.id)}
        clients={clients}
        defaults={projectToFormValues(project)}
        submitLabel="Save changes"
        cancelHref={href}
      />
    </>
  );
}
