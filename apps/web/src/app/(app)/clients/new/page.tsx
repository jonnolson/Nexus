import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NEW_CLIENT_DEFAULTS } from "@/lib/clients/schema";
import { createClientAction } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-4 md:p-8">
      <div className="grid gap-2">
        <Link
          href="/clients"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Clients
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New client</h1>
      </div>
      <ClientForm
        action={createClientAction}
        defaults={NEW_CLIENT_DEFAULTS}
        submitLabel="Create client"
        cancelHref="/clients"
      />
    </div>
  );
}
