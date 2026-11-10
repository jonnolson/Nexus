"use client";

import { useActionState, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import type { SettingsField } from "@/lib/settings/schema";
import { PROVINCE_OPTIONS } from "@/lib/tax/canada";
import { saveSettingsAction } from "./actions";

type Values = Partial<Record<SettingsField, string>>;

export function SettingsForm({ defaults }: { defaults: Values }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  const values: Values = state?.values ?? defaults;
  const errors = state?.fieldErrors ?? {};
  const [country, setCountry] = useState(values.country_code || "CA");
  const [prefix, setPrefix] = useState(values.invoice_prefix ?? "INV-");
  const [next, setNext] = useState(values.next_invoice_number ?? "1");
  const formKey = state?.values ? JSON.stringify(state.values) + (state.saved ?? "") : "initial";

  const field = (name: SettingsField, label: string, props: React.ComponentProps<"input"> = {}, hint?: string) => (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={values[name] ?? ""}
        aria-invalid={errors[name] ? true : undefined}
        {...props}
      />
      {hint && !errors[name] && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors[name] && <p className="text-sm text-destructive">{errors[name]}</p>}
    </div>
  );

  const preview = `${prefix}${String(Number(next) || 1).padStart(4, "0")}`;

  return (
    <form key={formKey} action={action} className="glass grid gap-8 rounded-xl p-4 sm:p-6" noValidate>
      <Section title="Business" description="Shown at the top of every invoice.">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("business_name", "Business name", { placeholder: "Your Studio Inc." })}
          {field("display_name", "Your name", { autoComplete: "name" })}
          {field("business_email", "Email", { type: "email", autoComplete: "email" }, "Clients reply here; also the reply-to on invoice emails.")}
          {field("business_phone", "Phone", { type: "tel", autoComplete: "tel" })}
        </div>
      </Section>

      <Section title="Address">
        <div className="grid gap-2">
          <Label htmlFor="country_code">Country</Label>
          <FormSelect id="country_code" name="country_code" value={country} onValueChange={setCountry} options={COUNTRY_OPTIONS} />
        </div>
        {field("address_line1", "Address line 1", { autoComplete: "address-line1" })}
        {field("address_line2", "Address line 2", { autoComplete: "address-line2" })}
        <div className="grid gap-4 sm:grid-cols-3">
          {field("city", "City", { autoComplete: "address-level2" })}
          {country === "CA" ? (
            <div className="grid gap-2">
              <Label htmlFor="region">Province / territory</Label>
              <FormSelect
                id="region"
                name="region"
                defaultValue={values.region ?? ""}
                options={PROVINCE_OPTIONS}
                placeholder="Select…"
                aria-invalid={errors.region ? true : undefined}
              />
              {errors.region && <p className="text-sm text-destructive">{errors.region}</p>}
            </div>
          ) : (
            field("region", "State / region")
          )}
          {field("postal_code", "Postal code", { autoComplete: "postal-code" })}
        </div>
      </Section>

      <Section title="Sales tax">
        {field(
          "gst_number",
          "GST/HST registration number",
          { placeholder: "123456789 RT0001" },
          "Leave blank if you're not registered: invoices won't charge GST/HST. Once set, it's printed on every invoice and tax is added based on each client's province.",
        )}
      </Section>

      <Section title="Invoicing">
        <div className="grid gap-4 sm:grid-cols-3">
          {field("invoice_prefix", "Number prefix", { value: prefix, onChange: (e) => setPrefix(e.target.value), defaultValue: undefined })}
          {field("next_invoice_number", "Next number", { inputMode: "numeric", value: next, onChange: (e) => setNext(e.target.value), defaultValue: undefined }, `Next invoice: ${preview}`)}
          {field("payment_terms_days", "Payment terms (days)", { inputMode: "numeric" }, "Due date = issue date + this many days.")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invoice_footer">Payment instructions</Label>
          <Textarea
            id="invoice_footer"
            name="invoice_footer"
            rows={4}
            defaultValue={values.invoice_footer ?? ""}
            placeholder={"Interac e-Transfer to billing@yourstudio.ca\nor direct deposit: Transit 12345, Inst 001, Acct 1234567"}
          />
          <p className="text-xs text-muted-foreground">Printed at the bottom of every invoice.</p>
        </div>
      </Section>

      {state?.formError && (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {state?.saved && !pending && (
          <span role="status" className="flex items-center gap-1 text-sm text-muted-foreground">
            <Check className="size-4" /> Saved
          </span>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save settings
        </Button>
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-4">
        <span className="text-sm font-medium">{title}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </legend>
      {children}
    </fieldset>
  );
}
