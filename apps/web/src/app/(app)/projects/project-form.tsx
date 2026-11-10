"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { Textarea } from "@/components/ui/textarea";
import type { ClientOption } from "@/lib/clients/data";
import { CURRENCIES, currencyDecimals, formatMoney } from "@/lib/money";
import { BILLING_TYPES, PROJECT_STATUSES } from "@/lib/projects/constants";
import type { ProjectFormField } from "@/lib/projects/schema";
import { STUDIO_DEFAULTS } from "@/lib/studio";
import type { ProjectFormState } from "./actions";

type Values = Partial<Record<ProjectFormField, string>>;

export function ProjectForm({
  action,
  clients,
  defaults = {},
  submitLabel,
  cancelHref,
}: {
  action: (prev: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  clients: ClientOption[];
  defaults?: Values;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values: Values = state?.values ?? defaults;
  const errors = state?.fieldErrors ?? {};

  const initialClient = clients.find((c) => c.id === values.client_id);
  const [clientId, setClientId] = useState(values.client_id ?? "");
  const [billingType, setBillingType] = useState(values.billing_type || "hourly");
  const [currency, setCurrency] = useState(
    values.currency || initialClient?.currency || STUDIO_DEFAULTS.currency,
  );

  const client = clients.find((c) => c.id === clientId);
  const clientRate =
    client?.default_rate_minor != null && client.currency === currency
      ? formatMoney(client.default_rate_minor, client.currency)
      : null;

  const onClientChange = (id: string) => {
    setClientId(id);
    const next = clients.find((c) => c.id === id);
    if (next) setCurrency(next.currency); // projects bill in the client's currency by default
  };

  const formKey = state?.values ? JSON.stringify(state.values) : "initial";
  const amountPlaceholder = currencyDecimals(currency) === 0 ? "15000" : "120.00";

  const error = (name: ProjectFormField) =>
    errors[name] && (
      <p id={`${name}-error`} className="text-sm text-destructive">
        {errors[name]}
      </p>
    );

  const field = (name: ProjectFormField, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={values[name] ?? ""}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...props}
      />
      {error(name)}
    </div>
  );

  const currencyOptions = CURRENCIES.includes(currency as (typeof CURRENCIES)[number])
    ? CURRENCIES
    : [currency, ...CURRENCIES];

  return (
    <form key={formKey} action={formAction} className="glass grid gap-8 rounded-xl p-4 sm:p-6" noValidate>
      <Section title="Project">
        <div className="grid gap-2">
          <Label htmlFor="client_id">Client</Label>
          <FormSelect
            id="client_id"
            name="client_id"
            value={clientId}
            onValueChange={onClientChange}
            placeholder="Select a client…"
            options={clients.map((c) => ({ value: c.id, label: `${c.name}${c.archived_at ? " (archived)" : ""}` }))}
            aria-invalid={errors.client_id ? true : undefined}
            aria-describedby={errors.client_id ? "client_id-error" : undefined}
          />
          {error("client_id")}
          {clients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No clients yet.{" "}
              <Link href="/clients/new" className="underline underline-offset-4">
                Add a client
              </Link>{" "}
              first.
            </p>
          )}
        </div>
        {field("name", "Project name", { required: true, placeholder: "Website redesign" })}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <FormSelect
              id="status"
              name="status"
              defaultValue={values.status || "active"}
              options={PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            />
            {error("status")}
          </div>
          {field("start_date", "Start date", { type: "date" })}
          {field("due_date", "Due date", { type: "date" })}
        </div>
      </Section>

      <Section title="Billing">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="billing_type">Billing</Label>
            <FormSelect
              id="billing_type"
              name="billing_type"
              value={billingType}
              onValueChange={setBillingType}
              options={BILLING_TYPES.map((b) => ({ value: b.value, label: b.label }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currency">Currency</Label>
            <FormSelect
              id="currency"
              name="currency"
              value={currency}
              onValueChange={setCurrency}
              options={currencyOptions.map((c) => ({ value: c, label: c }))}
            />
            {error("currency")}
          </div>
          {billingType === "hourly" &&
            field("hourly_rate", `Hourly rate (${currency})`, {
              inputMode: "decimal",
              placeholder: clientRate ?? amountPlaceholder,
            })}
          {billingType === "fixed" &&
            field("fixed_fee", `Fixed fee (${currency})`, {
              inputMode: "decimal",
              placeholder: "5000.00",
              required: true,
            })}
        </div>
        {billingType === "hourly" && (
          <p className="-mt-2 text-sm text-muted-foreground">
            {clientRate
              ? `Leave the rate blank to use ${client?.name}'s rate (${clientRate}/h).`
              : "Leave blank if you'll set the rate later."}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {field("budget_hours", "Budget (hours)", { inputMode: "decimal", placeholder: "Optional" })}
        </div>
      </Section>

      <Section title="Description">
        <div className="grid gap-2">
          <Label htmlFor="description" className="sr-only">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={values.description ?? ""}
            placeholder="Scope, deliverables, links…"
            aria-invalid={errors.description ? true : undefined}
          />
          {error("description")}
        </div>
      </Section>

      {state?.formError && (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-4 text-sm font-medium text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}
