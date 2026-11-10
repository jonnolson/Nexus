"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { Textarea } from "@/components/ui/textarea";
import type { ClientFormField } from "@/lib/clients/schema";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { CURRENCIES, currencyDecimals } from "@/lib/money";
import { STUDIO_DEFAULTS } from "@/lib/studio";
import { PROVINCE_OPTIONS, salesTaxForClient, type SalesTax } from "@/lib/tax/canada";
import type { ClientFormState } from "./actions";

type Values = Partial<Record<ClientFormField, string>>;

export function ClientForm({
  action,
  defaults = {},
  submitLabel,
  cancelHref,
}: {
  action: (prev: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  defaults?: Values;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values: Values = state?.values ?? defaults;
  const errors = state?.fieldErrors ?? {};
  const [currency, setCurrency] = useState(values.currency || STUDIO_DEFAULTS.currency);
  const [country, setCountry] = useState(values.country_code || STUDIO_DEFAULTS.country);
  const [province, setProvince] = useState(values.country_code === "CA" ? (values.region ?? "") : "");

  // Re-mount inputs with the echoed values after a failed submit.
  const formKey = state?.values ? JSON.stringify(state.values) : "initial";

  const field = (name: ClientFormField, label: string, props: React.ComponentProps<"input"> = {}) => (
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
      {errors[name] && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {errors[name]}
        </p>
      )}
    </div>
  );

  const currencyOptions = CURRENCIES.includes(currency as (typeof CURRENCIES)[number])
    ? CURRENCIES
    : [currency, ...CURRENCIES];

  return (
    <form key={formKey} action={formAction} className="glass grid gap-8 rounded-xl p-4 sm:p-6" noValidate>
      <Section title="Client">
        {field("name", "Name", { required: true, autoFocus: !values.name, placeholder: "Acme Inc." })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("contact_name", "Contact person", { autoComplete: "off" })}
          {field("email", "Email", { type: "email", autoComplete: "off" })}
          {field("phone", "Phone", { type: "tel", autoComplete: "off" })}
          {field("website", "Website", { placeholder: "acme.com" })}
        </div>
      </Section>

      <Section title="Billing">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="currency">Currency</Label>
            <FormSelect
              id="currency"
              name="currency"
              value={currency}
              onValueChange={setCurrency}
              options={currencyOptions.map((c) => ({ value: c, label: c }))}
              aria-invalid={errors.currency ? true : undefined}
            />
            {errors.currency && <p className="text-sm text-destructive">{errors.currency}</p>}
          </div>
          {field("default_rate", `Hourly rate (${currency})`, {
            inputMode: "decimal",
            placeholder: currencyDecimals(currency) === 0 ? "15000" : "120.00",
          })}
          {field("tax_id", "Tax / VAT ID")}
        </div>
      </Section>

      <Section title="Address">
        <div className="grid gap-2">
          <Label htmlFor="country_code">Country</Label>
          <FormSelect
            id="country_code"
            name="country_code"
            value={country}
            onValueChange={setCountry}
            options={COUNTRY_OPTIONS}
            aria-invalid={errors.country_code ? true : undefined}
          />
          {errors.country_code && <p className="text-sm text-destructive">{errors.country_code}</p>}
        </div>
        {field("address_line1", "Address line 1", { autoComplete: "off" })}
        {field("address_line2", "Address line 2", { autoComplete: "off" })}
        <div className="grid gap-4 sm:grid-cols-3">
          {field("city", "City", { autoComplete: "off" })}
          {country === "CA" ? (
            <div className="grid gap-2">
              <Label htmlFor="region">Province / territory</Label>
              <FormSelect
                id="region"
                name="region"
                value={province}
                onValueChange={setProvince}
                options={PROVINCE_OPTIONS}
                placeholder="Select…"
                aria-invalid={errors.region ? true : undefined}
              />
              {errors.region && <p className="text-sm text-destructive">{errors.region}</p>}
            </div>
          ) : (
            field("region", country === "US" ? "State" : "State / region", { autoComplete: "off" })
          )}
          {field("postal_code", country === "US" ? "ZIP code" : "Postal code", { autoComplete: "off" })}
        </div>
        <TaxPreview tax={salesTaxForClient({ country_code: country, region: country === "CA" ? province || null : null })} />
      </Section>

      <Section title="Notes">
        <div className="grid gap-2">
          <Label htmlFor="notes" className="sr-only">
            Notes
          </Label>
          <Textarea
            id="notes"
            name="notes"
            rows={5}
            defaultValue={values.notes ?? ""}
            placeholder="Anything worth remembering about this client"
            aria-invalid={errors.notes ? true : undefined}
          />
          {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
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

function TaxPreview({ tax }: { tax: SalesTax }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
      <p>
        <span className="text-muted-foreground">Sales tax on invoices: </span>
        <span className="font-medium">{tax.label}</span>
      </p>
      {tax.notes.map((note) => (
        <p key={note} className="mt-1 text-xs text-muted-foreground">
          {note}
        </p>
      ))}
    </div>
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
