import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { ProjectsTable } from "@/components/projects/projects-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClient, type Client } from "@/lib/clients/data";
import { countryName } from "@/lib/countries";
import { formatDateOnly, formatTimestamp, todayInStudio } from "@/lib/dates";
import { listProjectsForClient } from "@/lib/projects/data";
import { TimeSection } from "@/components/time/time-section";
import { listEntries } from "@/lib/time/data";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { NotesSection } from "@/components/notes/notes-section";
import { listNotes } from "@/lib/notes/data";
import { listInvoices, unbilledSummaryForClient } from "@/lib/invoices/data";
import { formatDurationLong } from "@/lib/time/format";
import { formatMoney } from "@/lib/money";
import { salesTaxForClient } from "@/lib/tax/canada";
import { ClientActions } from "./client-actions";

export const metadata: Metadata = { title: "Client" };

export default function ClientPage({ params }: PageProps<"/clients/[id]">) {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 p-4 md:p-8">
      <Link
        href="/clients"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Clients
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ClientDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ClientDetail({ params }: Pick<PageProps<"/clients/[id]">, "params">) {
  const { id } = await params;
  const [client, projects, entries, invoices, unbilled, notes] = await Promise.all([
    getClient(id),
    listProjectsForClient(id),
    listEntries({ clientId: id }),
    listInvoices({ view: "all", clientId: id }),
    unbilledSummaryForClient(id),
    listNotes({ clientId: id }),
  ]);
  const today = todayInStudio();
  const outstanding = invoices.filter((i) => i.status === "sent");
  const outstandingTotal = outstanding.reduce((s, i) => s + i.total_minor, 0);
  const unbilledValue = Object.entries(unbilled.value)
    .map(([c, m]) => formatMoney(m, c))
    .join(" + ");
  const archived = client.archived_at !== null;
  const address = formatAddress(client);
  const tax = salesTaxForClient(client);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            {archived && <Badge variant="secondary">Archived</Badge>}
          </div>
          {client.contact_name && (
            <p className="text-sm text-muted-foreground">{client.contact_name}</p>
          )}
        </div>
        <div className="flex items-start gap-2">
          <Button asChild variant="outline">
            <Link href={`/clients/${client.id}/edit`}>
              <Pencil />
              Edit
            </Link>
          </Button>
          <ClientActions id={client.id} name={client.name} archived={archived} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <Detail label="Contact person">{client.contact_name}</Detail>
              <Detail label="Email">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="underline-offset-4 hover:underline">
                    {client.email}
                  </a>
                )}
              </Detail>
              <Detail label="Phone">
                {client.phone && (
                  <a href={`tel:${client.phone.replace(/[^\d+]/g, "")}`} className="underline-offset-4 hover:underline">
                    {client.phone}
                  </a>
                )}
              </Detail>
              <Detail label="Website">
                {client.website && <WebsiteLink value={client.website} />}
              </Detail>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <Detail label="Currency">{client.currency}</Detail>
              <Detail label="Hourly rate">
                {client.default_rate_minor != null &&
                  `${formatMoney(client.default_rate_minor, client.currency)} / hour`}
              </Detail>
              <Detail label="Sales tax">
                <span className={tax.kind === "unknown" ? "text-muted-foreground" : undefined}>
                  {tax.label}
                </span>
                {tax.notes.map((note) => (
                  <span key={note} className="mt-0.5 block text-xs text-muted-foreground">
                    {note}
                  </span>
                ))}
              </Detail>
              <Detail label="Tax / VAT ID">{client.tax_id}</Detail>
              <Detail label="Address">
                {address.length > 0 && (
                  <address className="not-italic">
                    {address.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                )}
              </Detail>
            </dl>
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-3" aria-labelledby="client-projects">
        <div className="flex items-center justify-between gap-4">
          <h2 id="client-projects" className="text-base font-medium">
            Projects
          </h2>
          <div className="flex gap-2">
            {projects.length > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/projects?client=${client.id}&view=all`}>View all</Link>
              </Button>
            )}
            {!archived && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/new?client=${client.id}`}>
                  <Plus />
                  New project
                </Link>
              </Button>
            )}
          </div>
        </div>
        {projects.length > 0 ? (
          <ProjectsTable projects={projects} showClient={false} />
        ) : (
          <p className="glass rounded-xl border-dashed p-6 text-center text-sm text-muted-foreground">
            No projects for this client yet.
          </p>
        )}
      </section>

      <section className="grid gap-3" aria-labelledby="client-invoices">
        <div className="flex items-center justify-between gap-4">
          <h2 id="client-invoices" className="flex items-baseline gap-2 text-base font-medium">
            Invoices
            {outstanding.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {formatMoney(outstandingTotal, client.currency)} outstanding
              </span>
            )}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/invoices/new?client=${client.id}`}>
              <Plus />
              New invoice
            </Link>
          </Button>
        </div>
        {unbilled.minutes > 0 && (
          <p className="rounded-lg border border-dashed px-3 py-2 text-sm">
            <span className="font-medium">{formatDurationLong(unbilled.minutes)} unbilled</span>
            {unbilledValue && <span className="text-muted-foreground"> · {unbilledValue}</span>}
            {" · "}
            <Link href={`/invoices/new?client=${client.id}`} className="underline underline-offset-4">
              Invoice it
            </Link>
          </p>
        )}
        {invoices.length > 0 ? (
          <ul className="divide-y glass rounded-xl">
            {invoices.slice(0, 8).map((i) => (
              <li key={i.id} className="relative flex items-center gap-3 px-3 py-2 text-sm">
                <Link href={`/invoices/${i.id}`} className="font-medium tabular-nums after:absolute after:inset-0">
                  {i.number}
                </Link>
                <span className="hidden text-xs text-muted-foreground sm:inline">{formatDateOnly(i.issue_date)}</span>
                <InvoiceStatusBadge status={i.status} dueDate={i.due_date} today={today} className="ml-auto" />
                <span className="w-24 text-right tabular-nums">{formatMoney(i.total_minor, i.currency)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="glass rounded-xl border-dashed p-6 text-center text-sm text-muted-foreground">No invoices yet.</p>
        )}
        {invoices.length > 8 && (
          <Link href={`/invoices?client=${client.id}&view=all`} className="text-sm underline underline-offset-4">
            All {invoices.length} invoices
          </Link>
        )}
      </section>

      <NotesSection
        notes={notes}
        newHref={`/notes/new?client=${client.id}`}
        allHref={`/notes/work?client=${client.id}`}
        showLinks
      />

      <TimeSection
        entries={entries}
        returnTo={`/clients/${client.id}`}
        action={
          entries.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/time?client=${client.id}`}>This week in Time</Link>
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {client.notes ? (
            <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Added {formatTimestamp(client.created_at)}
        {client.updated_at !== client.created_at && ` · Updated ${formatTimestamp(client.updated_at)}`}
      </p>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

/** Only ever links to http(s); anything else is shown as plain text. */
function WebsiteLink({ value }: { value: string }) {
  let url: URL | null = null;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {}
  if (!url || !/^https?:$/.test(url.protocol)) return <>{value}</>;
  return (
    <a
      href={url.href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline-offset-4 hover:underline"
    >
      {url.host + (url.pathname === "/" ? "" : url.pathname)}
    </a>
  );
}

function formatAddress(c: Client): string[] {
  const cityLine = [c.city, [c.region, c.postal_code].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [c.address_line1, c.address_line2, cityLine, countryName(c.country_code)].filter(
    (l): l is string => Boolean(l),
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 glass animate-pulse rounded-xl" />
        <div className="h-56 glass animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
