"use client";

import { useState, useTransition } from "react";
import { Ban, CircleCheck, Download, LoaderCircle, Mail, RotateCcw, Send, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { playSuccess } from "@/lib/sound";
import {
  deleteDraftAction,
  emailInvoiceAction,
  markPaidAction,
  markSentAction,
  markUnpaidAction,
  voidInvoiceAction,
  type ActionResult,
} from "../actions";

export function InvoiceActions({
  id,
  number,
  status,
  clientEmail,
  emailReady,
}: {
  id: string;
  number: string;
  status: string;
  clientEmail: string | null;
  emailReady: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [to, setTo] = useState(clientEmail ?? "");

  const run = (fn: () => Promise<ActionResult>, onSuccess?: () => void) =>
    startTransition(async () => {
      setMessage(null);
      const r = await fn();
      if (r?.error) setMessage({ kind: "error", text: r.error });
      else {
        onSuccess?.();
        if (r?.ok) setMessage({ kind: "ok", text: r.ok });
      }
    });

  const confirm = (
    trigger: React.ReactNode,
    title: string,
    description: string,
    actionLabel: string,
    onConfirm: () => void,
    destructive = false,
  ) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const emailDialog = status !== "void" && (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={status === "draft" ? "default" : "outline"} disabled={pending}>
          <Mail />
          {status === "draft" ? "Email to client" : "Email again"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Email invoice {number}</AlertDialogTitle>
          <AlertDialogDescription>
            {emailReady
              ? `The PDF is attached.${status === "draft" ? " The invoice will be marked as sent and locked." : ""}`
              : "Email isn't set up yet (it needs a Resend API key). Download the PDF and send it from your own email for now."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {emailReady && (
          <div className="grid gap-2">
            <Label htmlFor="email-to">To</Label>
            <Input id="email-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {emailReady && (
            <AlertDialogAction onClick={() => run(() => emailInvoiceAction(id, to))} disabled={!to.trim()}>
              Send
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {pending && <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-label="Working" />}

        {status === "draft" && (
          <>
            {emailDialog}
            {confirm(
              <Button variant="outline" disabled={pending}>
                <Send />
                Mark as sent
              </Button>,
              `Mark ${number} as sent?`,
              "Use this if you sent the invoice yourself. Its amounts, lines and billed time are locked from then on (void it to make changes).",
              "Mark as sent",
              () => run(() => markSentAction(id)),
            )}
          </>
        )}

        {status === "sent" && (
          <>
            <Button onClick={() => run(() => markPaidAction(id), playSuccess)} disabled={pending}>
              <CircleCheck />
              Mark as paid
            </Button>
            {emailDialog}
          </>
        )}

        {status === "paid" && (
          <Button variant="outline" onClick={() => run(() => markUnpaidAction(id))} disabled={pending}>
            <RotateCcw />
            Mark as unpaid
          </Button>
        )}

        <Button asChild variant="outline">
          <a href={`/invoices/${id}/pdf?download=1`} download>
            <Download />
            PDF
          </a>
        </Button>

        {(status === "sent" || status === "paid") &&
          confirm(
            <Button variant="ghost" className="text-destructive" disabled={pending}>
              <Ban />
              Void
            </Button>,
            `Void ${number}?`,
            "The invoice stays on record as void (its number isn't reused) and its time goes back to unbilled so you can bill it again.",
            "Void invoice",
            () => run(() => voidInvoiceAction(id)),
            true,
          )}

        {status === "draft" &&
          confirm(
            <Button variant="ghost" className="text-destructive" disabled={pending}>
              <Trash2 />
              Delete draft
            </Button>,
            `Delete draft ${number}?`,
            "Its time goes back to unbilled. This can't be undone.",
            "Delete",
            () => run(() => deleteDraftAction(id)),
            true,
          )}
      </div>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
