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
import { CATEGORY_OPTIONS } from "@/lib/expenses/categories";
import type { ExpenseFormField } from "@/lib/expenses/schema";
import { CURRENCIES } from "@/lib/money";
import { deleteExpenseAction, type ExpenseFormState } from "./actions";

type Values = Record<ExpenseFormField, string>;

export function ExpenseForm({
  mode,
  action,
  defaults,
  expenseId,
}: {
  mode: "create" | "edit";
  action: (prev: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
  defaults: Values;
  expenseId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values = state?.values ?? defaults;
  const errors = state?.fieldErrors ?? {};
  const [currency, setCurrency] = useState(values.currency || "CAD");
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // New key after a successful add (fresh form) or a failed submit (keep what was typed).
  const formKey = state?.ok ?? (state?.values ? JSON.stringify(state.values) : "initial");

  const field = (name: ExpenseFormField, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="grid gap-2">
      <Label htmlFor={`${mode}-${name}`}>{label}</Label>
      <Input
        id={`${mode}-${name}`}
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
        {field("title", "Expense", { placeholder: "Adobe Creative Cloud", maxLength: 200, autoComplete: "off" })}
        {field("amount", `Total paid (${currency})`, { inputMode: "decimal", placeholder: "49.99" })}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor={`${mode}-category`}>Category</Label>
          <FormSelect
            id={`${mode}-category`}
            name="category"
            defaultValue={values.category}
            options={CATEGORY_OPTIONS}
            placeholder="Choose a category…"
            aria-invalid={errors.category ? true : undefined}
          />
          {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
        </div>
        {field("spent_on", "Date", { type: "date" })}
        <div className="grid gap-2">
          <Label htmlFor={`${mode}-currency`}>Currency</Label>
          <FormSelect
            id={`${mode}-currency`}
            name="currency"
            value={currency}
            onValueChange={setCurrency}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_3fr]">
        <div className="grid gap-2">
          {field("tax", "GST/HST paid (optional)", { inputMode: "decimal", placeholder: "2.38" })}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${mode}-notes`}>Notes (optional)</Label>
          <Textarea id={`${mode}-notes`} name="notes" rows={1} defaultValue={values.notes} placeholder="Receipt #, what it was for…" className="min-h-8" />
          {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
        </div>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">
        The GST/HST included in the total. Tracking it lets you claim input tax credits once you&apos;re registered.
      </p>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {mode === "edit" && expenseId && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" disabled={deleting}>
                {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
                <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    startDelete(async () => {
                      setDeleteError(null);
                      const r = await deleteExpenseAction(expenseId);
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
            Expense added.
          </span>
        )}
        {mode === "edit" && (
          <Button asChild variant="outline">
            <Link href="/expenses">Cancel</Link>
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : mode === "create" && <Plus />}
          {mode === "create" ? "Add expense" : "Save"}
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
