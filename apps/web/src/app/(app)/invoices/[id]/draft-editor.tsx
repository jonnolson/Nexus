"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { Textarea } from "@/components/ui/textarea";
import { TAX_OPTIONS } from "@/lib/invoices/constants";
import type { DetailsField, LineField } from "@/lib/invoices/schema";
import {
  addLineAction,
  deleteLineAction,
  updateDetailsAction,
  updateLineAction,
  type DetailsState,
  type LineState,
} from "../actions";

export type EditableLine = { id: string; description: string; quantity: string; unitPrice: string; billedEntries: number };

export function DraftEditor({
  invoiceId,
  currency,
  details,
  lines,
  gstRegistered,
}: {
  invoiceId: string;
  currency: string;
  details: Record<DetailsField, string>;
  lines: EditableLine[];
  gstRegistered: boolean;
}) {
  return (
    <div className="grid gap-6 glass rounded-xl p-4 sm:p-6">
      <div className="grid gap-1">
        <h2 className="text-base font-medium">Edit draft</h2>
        <p className="text-sm text-muted-foreground">Changes show in the preview below as you save.</p>
      </div>
      <DetailsForm invoiceId={invoiceId} defaults={details} gstRegistered={gstRegistered} />
      <div className="grid gap-3">
        <h3 className="text-sm font-medium">Lines</h3>
        {lines.length > 0 && (
          <div className="hidden grid-cols-[1fr_5rem_7rem_auto] gap-2 px-1 text-xs text-muted-foreground sm:grid">
            <span>Description</span>
            <span>Qty</span>
            <span>Rate ({currency})</span>
            <span className="w-[4.5rem]" />
          </div>
        )}
        {lines.map((l) => (
          <LineRow key={l.id} invoiceId={invoiceId} line={l} />
        ))}
        <AddLine invoiceId={invoiceId} currency={currency} />
      </div>
    </div>
  );
}

function DetailsForm({
  invoiceId,
  defaults,
  gstRegistered,
}: {
  invoiceId: string;
  defaults: Record<DetailsField, string>;
  gstRegistered: boolean;
}) {
  const [state, action, pending] = useActionState<DetailsState, FormData>(updateDetailsAction.bind(null, invoiceId), undefined);
  const values = state?.values ?? defaults;
  const errors = state?.fieldErrors ?? {};

  return (
    <form key={state?.saved ?? JSON.stringify(state?.values ?? "")} action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="issue_date">Issue date</Label>
          <Input id="issue_date" name="issue_date" type="date" defaultValue={values.issue_date} aria-invalid={errors.issue_date ? true : undefined} />
          {errors.issue_date && <p className="text-sm text-destructive">{errors.issue_date}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" name="due_date" type="date" defaultValue={values.due_date} aria-invalid={errors.due_date ? true : undefined} />
          {errors.due_date && <p className="text-sm text-destructive">{errors.due_date}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tax">Sales tax</Label>
          <FormSelect
            id="tax"
            name="tax"
            defaultValue={values.tax}
            options={TAX_OPTIONS.map((o) => ({ value: o.key, label: o.label, disabled: !gstRegistered && o.rateBps > 0 }))}
          />
          {!gstRegistered && <p className="text-xs text-muted-foreground">Add your GST/HST number in Settings to charge tax.</p>}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes on the invoice</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={values.notes} placeholder="Thanks for your business!" />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        {state?.saved && !pending && (
          <span role="status" className="flex items-center gap-1 text-sm text-muted-foreground">
            <Check className="size-4" /> Saved
          </span>
        )}
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save details
        </Button>
      </div>
    </form>
  );
}

function LineFields({
  values,
  errors,
  idPrefix,
}: {
  values: Partial<Record<LineField, string>>;
  errors: Partial<Record<LineField, string>>;
  idPrefix: string;
}) {
  return (
    <>
      <div className="grid gap-1">
        <Label htmlFor={`${idPrefix}-description`} className="sr-only">Description</Label>
        <Input id={`${idPrefix}-description`} name="description" defaultValue={values.description ?? ""} placeholder="Description" maxLength={500} aria-invalid={errors.description ? true : undefined} />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${idPrefix}-quantity`} className="sr-only">Quantity</Label>
        <Input id={`${idPrefix}-quantity`} name="quantity" defaultValue={values.quantity ?? "1"} inputMode="decimal" placeholder="Qty" aria-invalid={errors.quantity ? true : undefined} />
        {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${idPrefix}-unit_price`} className="sr-only">Rate</Label>
        <Input id={`${idPrefix}-unit_price`} name="unit_price" defaultValue={values.unit_price ?? ""} inputMode="decimal" placeholder="Rate" aria-invalid={errors.unit_price ? true : undefined} />
        {errors.unit_price && <p className="text-xs text-destructive">{errors.unit_price}</p>}
      </div>
    </>
  );
}

function LineRow({ invoiceId, line }: { invoiceId: string; line: EditableLine }) {
  const [state, action, pending] = useActionState<LineState, FormData>(updateLineAction.bind(null, line.id, invoiceId), undefined);
  const [removing, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const values = state?.values ?? { description: line.description, quantity: line.quantity, unit_price: line.unitPrice };

  return (
    <div className="grid gap-1 rounded-lg border p-2 sm:border-0 sm:p-0">
      <form key={state?.ok ?? JSON.stringify(state?.values ?? "")} action={action} className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto] sm:items-start">
        <LineFields values={values} errors={state?.fieldErrors ?? {}} idPrefix={`line-${line.id}`} />
        <div className="flex gap-1">
          <Button type="submit" variant="ghost" size="icon" disabled={pending} aria-label="Save line" title="Save line">
            {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={removing}
            aria-label="Remove line"
            title={line.billedEntries ? `Remove line (its ${line.billedEntries} time entries go back to unbilled)` : "Remove line"}
            onClick={() =>
              startRemove(async () => {
                setRemoveError(null);
                const r = await deleteLineAction(line.id);
                if (r.error) setRemoveError(r.error);
              })
            }
          >
            {removing ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
          </Button>
        </div>
      </form>
      {line.billedEntries > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          Bills {line.billedEntries} time {line.billedEntries === 1 ? "entry" : "entries"}
        </p>
      )}
      {(state?.error || removeError) && (
        <p role="alert" className="px-1 text-xs text-destructive">
          {state?.error ?? removeError}
        </p>
      )}
    </div>
  );
}

function AddLine({ invoiceId, currency }: { invoiceId: string; currency: string }) {
  const [state, action, pending] = useActionState<LineState, FormData>(addLineAction.bind(null, invoiceId), undefined);
  return (
    <form
      key={state?.ok ?? JSON.stringify(state?.values ?? "")}
      action={action}
      className="grid gap-2 rounded-lg border border-dashed p-2 sm:grid-cols-[1fr_5rem_7rem_auto] sm:items-start"
    >
      <LineFields values={state?.values ?? {}} errors={state?.fieldErrors ?? {}} idPrefix="new-line" />
      <Button type="submit" variant="outline" disabled={pending} className="sm:w-[4.5rem]" aria-label={`Add line (${currency})`}>
        {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
        Add
      </Button>
      {state?.error && (
        <p role="alert" className="text-xs text-destructive sm:col-span-4">
          {state.error}
        </p>
      )}
    </form>
  );
}
