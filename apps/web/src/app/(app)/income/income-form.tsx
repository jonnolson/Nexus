"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { IncomeFormField } from "@/lib/income/schema";
import { CURRENCIES } from "@/lib/money";
import { deleteIncomeAction, type IncomeFormState } from "./actions";

type Values = Record<IncomeFormField, string>;

export function IncomeForm({
  mode,
  action,
  defaults,
  clients,
  entryId,
}: {
  mode: "create" | "edit";
  action: (prev: IncomeFormState, formData: FormData) => Promise<IncomeFormState>;
  defaults: Values;
  clients: { id: string; name: string }[];
  entryId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values = state?.values ?? defaults;
  const errors = state?.fieldErrors ?? {};
  const [currency, setCurrency] = useState(values.currency || "CAD");
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // New key after a successful add (fresh form) or a failed submit (keep what was typed).
  const formKey = state?.ok ?? (state?.values ? JSON.stringify(state.values) : "initial");

  const field = (name: IncomeFormField, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="grid gap-2">
      <Label htmlFor={`${mode}-income-${name}`}>{label}</Label>
      <Input
        id={`${mode}-income-${name}`}
        name={name}
        defaultValue={values[name] ?? ""}
        aria-invalid={errors[name] ? true : undefined}
        {...props}
      />
      {errors[name] && <p className="text-sm text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <form key={formKey} action={formAction} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        {field("title", "What was it for?", { placeholder: "Website build, Acme Co.", maxLength: 200, autoComplete: "off" })}
        {field("amount", `Total received (${currency})`, { inputMode: "decimal", placeholder: "1,250.00" })}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={`${mode}-income-client_id`}>Client (optional)</Label>
          <FormSelect
            id={`${mode}-income-client_id`}
            name="client_id"
            defaultValue={values.client_id}
            options={[{ value: "", label: "No client" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
            aria-invalid={errors.client_id ? true : undefined}
          />
          {errors.client_id && <p className="text-sm text-destructive">{errors.client_id}</p>}
        </div>
        {field("received_on", "Date received", { type: "date" })}
        <div className="grid gap-2">
          <Label htmlFor={`${mode}-income-currency`}>Currency</Label>
          <FormSelect
            id={`${mode}-income-currency`}
            name="currency"
            value={currency}
            onValueChange={setCurrency}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_3fr]">
        {field("tax", "GST/HST collected (optional)", { inputMode: "decimal", placeholder: "59.52" })}
        <div className="grid gap-2">
          <Label htmlFor={`${mode}-income-notes`}>Notes (optional)</Label>
          <Textarea
            id={`${mode}-income-notes`}
            name="notes"
            rows={1}
            defaultValue={values.notes}
            placeholder="Payment method, reference #…"
            className="min-h-8"
          />
          {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
        </div>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">
        For money received outside Nexus invoices. Paid invoices are counted automatically, so don&apos;t add them here too.
      </p>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {mode === "edit" && entryId && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" disabled={deleting}>
                {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this income entry?</AlertDialogTitle>
                <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    startDelete(async () => {
                      setDeleteError(null);
                      const r = await deleteIncomeAction(entryId);
                      if (r?.error) setDeleteError(r.error);
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {mode === "create" && state?.ok && !pending && (
          <span role="status" className="text-sm text-muted-foreground sm:mr-auto">
            Income recorded.
          </span>
        )}
        {mode === "edit" && (
          <Button asChild variant="outline">
            <Link href="/income">Cancel</Link>
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : mode === "create" && <Plus />}
          {mode === "create" ? "Record income" : "Save"}
        </Button>
      </div>
      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}
    </form>
  );
}
