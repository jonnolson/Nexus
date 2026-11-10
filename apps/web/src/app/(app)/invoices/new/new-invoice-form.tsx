"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { formatDateOnly } from "@/lib/dates";
import type { FixedFeeOption, UnbilledGroup } from "@/lib/invoices/data";
import { formatMoney } from "@/lib/money";
import { formatDurationLong } from "@/lib/time/format";
import { createInvoiceAction } from "../actions";

export function ClientPicker({ clients, value }: { clients: { id: string; name: string }[]; value: string }) {
  const router = useRouter();
  return (
    <div className="grid gap-2">
      <Label htmlFor="pick-client">Client</Label>
      <FormSelect
        id="pick-client"
        value={value}
        onValueChange={(v) => router.push(v ? `/invoices/new?client=${v}` : "/invoices/new")}
        placeholder="Select a client…"
        className="sm:w-80"
        options={clients.map((c) => ({ value: c.id, label: c.name }))}
      />
    </div>
  );
}

export function NewInvoiceForm({
  clientId,
  currency,
  today,
  groups,
  fixedFees,
  taxNote,
}: {
  clientId: string;
  currency: string;
  today: string;
  groups: UnbilledGroup[];
  fixedFees: FixedFeeOption[];
  taxNote: string;
}) {
  const [state, action, pending] = useActionState(createInvoiceAction, undefined);
  const usable = (c: string) => c === currency;
  const [pickedGroups, setPickedGroups] = useState(() => new Set(groups.filter((g) => usable(g.currency)).map((g) => g.key)));
  const [pickedFixed, setPickedFixed] = useState(
    () => new Set(fixedFees.filter((f) => usable(f.currency) && f.invoicedMinor < f.feeMinor).map((f) => f.projectId)),
  );

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(key);
    else next.delete(key);
    setter(next);
  };

  const groupValue = (g: UnbilledGroup) => (g.rateMinor == null ? 0 : Math.round(((Math.round((g.minutes / 60) * 100) / 100) * g.rateMinor)));
  const fixedValue = (f: FixedFeeOption) => Math.max(0, f.feeMinor - f.invoicedMinor) || f.feeMinor;
  const subtotal =
    groups.filter((g) => pickedGroups.has(g.key)).reduce((s, g) => s + groupValue(g), 0) +
    fixedFees.filter((f) => pickedFixed.has(f.projectId)).reduce((s, f) => s + fixedValue(f), 0);

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="client_id" value={clientId} />

      <section className="grid gap-3" aria-labelledby="unbilled-time">
        <h2 id="unbilled-time" className="text-sm font-medium">
          Unbilled time
        </h2>
        {groups.length === 0 ? (
          <p className="glass rounded-xl border-dashed p-4 text-sm text-muted-foreground">No unbilled billable time for this client.</p>
        ) : (
          <ul className="divide-y glass rounded-xl">
            {groups.map((g) => {
              const ok = usable(g.currency);
              return (
                <li key={g.key} className="flex items-start gap-3 px-3 py-3">
                  <Checkbox
                    id={`g-${g.key}`}
                    checked={pickedGroups.has(g.key)}
                    disabled={!ok}
                    onCheckedChange={(v) => toggle(pickedGroups, setPickedGroups, g.key, v === true)}
                    className="mt-0.5"
                  />
                  {pickedGroups.has(g.key) && <input type="hidden" name="groups" value={g.key} />}
                  <label htmlFor={`g-${g.key}`} className="grid min-w-0 flex-1 gap-0.5 text-sm">
                    <span className="font-medium">{g.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDurationLong(g.minutes)} · {g.entryIds.length} {g.entryIds.length === 1 ? "entry" : "entries"} ·{" "}
                      {g.from === g.to ? formatDateOnly(g.from) : `${formatDateOnly(g.from, { year: undefined })} – ${formatDateOnly(g.to)}`}
                    </span>
                    {!ok && <span className="text-xs text-destructive">Billed in {g.currency}; invoice separately.</span>}
                    {ok && g.rateMinor == null && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">No hourly rate set; the line will start at $0 for you to edit.</span>
                    )}
                  </label>
                  <span className="shrink-0 text-right text-sm tabular-nums">
                    {g.rateMinor != null ? formatMoney(groupValue(g), g.currency) : "—"}
                    {g.rateMinor != null && (
                      <span className="block text-xs text-muted-foreground">@ {formatMoney(g.rateMinor, g.currency)}/h</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {fixedFees.length > 0 && (
        <section className="grid gap-3" aria-labelledby="fixed-fees">
          <h2 id="fixed-fees" className="text-sm font-medium">
            Fixed-fee projects
          </h2>
          <ul className="divide-y glass rounded-xl">
            {fixedFees.map((f) => {
              const ok = usable(f.currency);
              const fully = f.invoicedMinor >= f.feeMinor;
              return (
                <li key={f.projectId} className="flex items-start gap-3 px-3 py-3">
                  <Checkbox
                    id={`f-${f.projectId}`}
                    checked={pickedFixed.has(f.projectId)}
                    disabled={!ok}
                    onCheckedChange={(v) => toggle(pickedFixed, setPickedFixed, f.projectId, v === true)}
                    className="mt-0.5"
                  />
                  {pickedFixed.has(f.projectId) && <input type="hidden" name="fixed" value={f.projectId} />}
                  <label htmlFor={`f-${f.projectId}`} className="grid min-w-0 flex-1 gap-0.5 text-sm">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Fee {formatMoney(f.feeMinor, f.currency)}
                      {f.invoicedMinor > 0 && ` · ${formatMoney(f.invoicedMinor, f.currency)} already invoiced`}
                    </span>
                    {fully && <span className="text-xs text-amber-600 dark:text-amber-400">Already fully invoiced.</span>}
                    {!ok && <span className="text-xs text-destructive">Billed in {f.currency}; invoice separately.</span>}
                  </label>
                  <span className="shrink-0 text-sm tabular-nums">{formatMoney(fixedValue(f), f.currency)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-4 glass rounded-xl p-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="issue_date">Issue date</Label>
          <Input id="issue_date" name="issue_date" type="date" defaultValue={today} required />
        </div>
        <p className="text-sm text-muted-foreground">{taxNote}</p>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Subtotal (before tax)</p>
          <p className="text-xl font-semibold tabular-nums">{formatMoney(subtotal, currency)}</p>
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          {pickedGroups.size + pickedFixed.size === 0 ? "Create blank draft" : "Create draft invoice"}
        </Button>
      </div>
    </form>
  );
}
