import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { getClient } from "@/lib/clients/data";
import { clientToFormValues } from "@/lib/clients/schema";
import { updateClientAction } from "../../actions";
import { ClientForm } from "../../client-form";

export const metadata: Metadata = { title: "Edit client" };

export default function EditClientPage({ params }: PageProps<"/clients/[id]/edit">) {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <Suspense fallback={<div className="h-96 glass animate-pulse rounded-xl" />}>
        <EditClient params={params} />
      </Suspense>
    </div>
  );
}

async function EditClient({ params }: Pick<PageProps<"/clients/[id]/edit">, "params">) {
  const { id } = await params;
  const client = await getClient(id);
  const href = `/clients/${client.id}`;

  return (
    <>
      <div className="grid gap-2">
        <Link
          href={href}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {client.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit client</h1>
      </div>
      <ClientForm
        action={updateClientAction.bind(null, client.id)}
        defaults={clientToFormValues(client)}
        submitLabel="Save changes"
        cancelHref={href}
      />
    </>
  );
}
