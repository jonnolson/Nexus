"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addDays, formatDateOnly } from "@/lib/dates";
import { sendEmail } from "@/lib/email/resend";
import { defaultTaxFor } from "@/lib/invoices/constants";
import { buildDocument, clientSnapshotFrom, issuerFromProfile } from "@/lib/invoices/document";
import { getInvoice, getUnbilledForClient, hoursQuantity } from "@/lib/invoices/data";
import { renderInvoicePdf } from "@/lib/invoices/pdf";
import {
  invoiceDetailsSchema,
  lineSchema,
  newInvoiceSchema,
  type DetailsField,
  type LineField,
} from "@/lib/invoices/schema";
import { formatMoney } from "@/lib/money";
import { getProfile } from "@/lib/settings/data";
import { emailConfigured } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";

/** Errors are returned, not thrown (production hides thrown action messages). */
export type ActionResult = { error?: string; ok?: string };

const idSchema = z.uuid();
/** Postgres check_violation: raised by the invoice lock triggers with a readable message. */
const CHECK_VIOLATION = "23514";

const revalidateAll = () => revalidatePath("/", "layout");
const dbError = (e: { code?: string; message: string }, fallback: string) =>
  e.code === CHECK_VIOLATION && !e.message.includes("violates") ? e.message : fallback;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export type NewInvoiceState = { error?: string } | undefined;

export async function createInvoiceAction(_prev: NewInvoiceState, formData: FormData): Promise<NewInvoiceState> {
  await requireUser();
  const parsed = newInvoiceSchema.safeParse({
    client_id: formData.get("client_id"),
    issue_date: formData.get("issue_date"),
    groups: formData.getAll("groups").map(String),
    fixed: formData.getAll("fixed").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const input = parsed.data;

  const supabase = await createClient();
  const [{ data: client }, profile, unbilled] = await Promise.all([
    supabase.from("clients").select("*").eq("id", input.client_id).maybeSingle(),
    getProfile(),
    getUnbilledForClient(input.client_id),
  ]);
  if (!client) return { error: "That client no longer exists." };

  // Re-derive everything server-side; the form only says which groups to include.
  const groups = unbilled.groups.filter((g) => input.groups.includes(g.key));
  const fixed = unbilled.fixedFees.filter((f) => input.fixed.includes(f.projectId));
  const wrongCurrency = [...groups, ...fixed].find((x) => x.currency !== client.currency);
  if (wrongCurrency) {
    return { error: `Some selected work is billed in ${wrongCurrency.currency}, but ${client.name} is invoiced in ${client.currency}. Invoice it separately.` };
  }

  const { data: number, error: numberError } = await supabase.rpc("allocate_invoice_number");
  if (numberError || !number) return { error: "Couldn't assign an invoice number. Try again." };

  const tax = defaultTaxFor(client, Boolean(profile.gst_number));
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_id: client.id,
      number,
      currency: client.currency,
      issue_date: input.issue_date,
      due_date: addDays(input.issue_date, profile.payment_terms_days),
      tax_name: tax.name,
      tax_rate_bps: tax.rateBps,
    })
    .select("id")
    .single();
  if (error || !invoice) {
    return { error: error?.code === "23505" ? `Invoice number ${number} is already used. Check "Next number" in Settings.` : "Couldn't create the invoice. Try again." };
  }

  const range = (from: string, to: string) =>
    from === to ? formatDateOnly(from) : `${formatDateOnly(from, { year: undefined })} – ${formatDateOnly(to)}`;

  try {
    let position = 0;
    for (const g of groups) {
      const { data: line, error: lineError } = await supabase
        .from("invoice_lines")
        .insert({
          invoice_id: invoice.id,
          project_id: g.projectId,
          position: position++,
          description: `${g.label} · ${range(g.from, g.to)}`,
          quantity: hoursQuantity(g.minutes) || 0.01,
          unit_price_minor: g.rateMinor ?? 0,
        })
        .select("id")
        .single();
      if (lineError || !line) throw lineError ?? new Error("line");
      const { error: linkError } = await supabase
        .from("time_entries")
        .update({ invoice_line_id: line.id })
        .in("id", g.entryIds)
        .is("invoice_line_id", null);
      if (linkError) throw linkError;
    }
    for (const f of fixed) {
      const { error: lineError } = await supabase.from("invoice_lines").insert({
        invoice_id: invoice.id,
        project_id: f.projectId,
        position: position++,
        description: `${f.name} · fixed fee`,
        quantity: 1,
        unit_price_minor: Math.max(0, f.feeMinor - f.invoicedMinor) || f.feeMinor,
      });
      if (lineError) throw lineError;
    }
  } catch (e) {
    console.error("createInvoice: adding lines failed", e);
    // Roll back the half-built draft (lines cascade; their time is released).
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return { error: "Couldn't add the selected work. Nothing was saved. Try again." };
  }

  revalidateAll();
  redirect(`/invoices/${invoice.id}`);
}

// ---------------------------------------------------------------------------
// Draft editing
// ---------------------------------------------------------------------------

export type DetailsState =
  | { error?: string; fieldErrors?: Partial<Record<DetailsField, string>>; values?: Record<DetailsField, string>; saved?: number }
  | undefined;

export async function updateDetailsAction(id: string, _prev: DetailsState, formData: FormData): Promise<DetailsState> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown invoice." };
  const values = {
    issue_date: String(formData.get("issue_date") ?? ""),
    due_date: String(formData.get("due_date") ?? ""),
    tax: String(formData.get("tax") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
  const parsed = invoiceDetailsSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<DetailsField, string>> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0] as DetailsField | undefined;
      if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { fieldErrors, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update(parsed.data).eq("id", id);
  if (error) return { error: dbError(error, "Couldn't save. Try again."), values };
  revalidateAll();
  return { saved: Date.now(), values };
}

export type LineState =
  | { error?: string; fieldErrors?: Partial<Record<LineField, string>>; values?: Record<LineField, string>; ok?: number }
  | undefined;

async function invoiceCurrency(invoiceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("invoices").select("currency, status").eq("id", invoiceId).maybeSingle();
  return data;
}

function lineInput(formData: FormData): Record<LineField, string> {
  return {
    description: String(formData.get("description") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    unit_price: String(formData.get("unit_price") ?? ""),
  };
}

function lineErrors(error: z.ZodError) {
  const fieldErrors: Partial<Record<LineField, string>> = {};
  for (const i of error.issues) {
    const k = i.path[0] as LineField | undefined;
    if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
  }
  return fieldErrors;
}

export async function addLineAction(invoiceId: string, _prev: LineState, formData: FormData): Promise<LineState> {
  await requireUser();
  if (!idSchema.safeParse(invoiceId).success) return { error: "Unknown invoice." };
  const inv = await invoiceCurrency(invoiceId);
  if (!inv) return { error: "This invoice no longer exists." };

  const values = lineInput(formData);
  const parsed = lineSchema(inv.currency).safeParse(values);
  if (!parsed.success) return { fieldErrors: lineErrors(parsed.error), values };

  const supabase = await createClient();
  const { count } = await supabase.from("invoice_lines").select("id", { count: "exact", head: true }).eq("invoice_id", invoiceId);
  const { error } = await supabase.from("invoice_lines").insert({ invoice_id: invoiceId, position: count ?? 0, ...parsed.data });
  if (error) return { error: dbError(error, "Couldn't add the line. Try again."), values };
  revalidateAll();
  return { ok: Date.now() };
}

export async function updateLineAction(
  lineId: string,
  invoiceId: string,
  _prev: LineState,
  formData: FormData,
): Promise<LineState> {
  await requireUser();
  if (!idSchema.safeParse(lineId).success || !idSchema.safeParse(invoiceId).success) return { error: "Unknown line." };
  const inv = await invoiceCurrency(invoiceId);
  if (!inv) return { error: "This invoice no longer exists." };

  const values = lineInput(formData);
  const parsed = lineSchema(inv.currency).safeParse(values);
  if (!parsed.success) return { fieldErrors: lineErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.from("invoice_lines").update(parsed.data).eq("id", lineId).eq("invoice_id", invoiceId);
  if (error) return { error: dbError(error, "Couldn't save the line. Try again."), values };
  revalidateAll();
  return { ok: Date.now(), values };
}

/** Removing a line releases any time it billed back to "unbilled". */
export async function deleteLineAction(lineId: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(lineId).success) return { error: "Unknown line." };
  const supabase = await createClient();
  const { error } = await supabase.from("invoice_lines").delete().eq("id", lineId);
  if (error) return { error: dbError(error, "Couldn't remove the line. Try again.") };
  revalidateAll();
  return {};
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** Draft → Sent: freezes your details and the client's onto the invoice. */
async function finalize(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const [invoice, profile] = await Promise.all([getInvoice(id), getProfile()]);
  if (invoice.status !== "draft") return {};
  if (invoice.lines.length === 0) return { error: "Add at least one line before sending." };

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "sent",
      issuer_snapshot: issuerFromProfile(profile),
      client_snapshot: clientSnapshotFrom(invoice.client),
    })
    .eq("id", id)
    .eq("status", "draft");
  if (error) return { error: dbError(error, "Couldn't mark the invoice as sent. Try again.") };
  return {};
}

export async function markSentAction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown invoice." };
  const r = await finalize(id);
  if (r.error) return r;
  revalidateAll();
  return {};
}

export async function emailInvoiceAction(id: string, to: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown invoice." };
  if (!emailConfigured()) return { error: "Email isn't set up yet. Download the PDF and send it yourself for now." };
  const email = z.email().safeParse(to.trim());
  if (!email.success) return { error: "Enter a valid email address." };

  const before = await getInvoice(id);
  if (before.status === "void") return { error: "This invoice has been voided." };
  if (before.status === "draft") {
    const r = await finalize(id);
    if (r.error) return r;
  }

  const [invoice, profile] = await Promise.all([getInvoice(id), getProfile()]);
  const doc = buildDocument(invoice, invoice.lines, { profile, client: invoice.client });
  const pdf = await renderInvoicePdf(doc);
  const total = `${formatMoney(doc.totalMinor, doc.currency)} ${doc.currency}`;
  const due = formatDateOnly(doc.dueDate);
  const greeting = doc.client.contact ? `Hi ${doc.client.contact.split(" ")[0]},` : "Hello,";
  const text = [
    greeting,
    "",
    `Please find attached invoice ${doc.number} for ${total}, due ${due}.`,
    doc.issuer.footer ? `\nHow to pay:\n${doc.issuer.footer}` : "",
    "",
    "Thank you,",
    doc.issuer.contact ?? doc.issuer.name,
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">${text
    .split("\n")
    .map((l) => (l ? escapeHtml(l) : "&nbsp;"))
    .join("<br>")}</div>`;

  const result = await sendEmail({
    to: email.data,
    subject: `Invoice ${doc.number} from ${doc.issuer.name}`,
    text,
    html,
    replyTo: doc.issuer.email,
    attachments: [{ filename: `${doc.number}.pdf`, content: pdf }],
  });
  revalidateAll();
  if (result.error) return { error: `${result.error} The invoice is marked as sent; you can download the PDF instead.` };
  return { ok: `Sent to ${email.data}.` };
}

async function setStatus(id: string, status: "paid" | "sent" | "void"): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown invoice." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").update({ status }).eq("id", id).select("id").maybeSingle();
  if (error) return { error: dbError(error, "Couldn't update the invoice. Try again.") };
  if (!data) return { error: "This invoice no longer exists." };
  revalidateAll();
  return {};
}

export const markPaidAction = async (id: string) => setStatus(id, "paid");
export const markUnpaidAction = async (id: string) => setStatus(id, "sent");
export const voidInvoiceAction = async (id: string) => setStatus(id, "void");

export async function deleteDraftAction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { error: "Unknown invoice." };
  const supabase = await createClient();
  // RLS only allows deleting drafts; lines cascade and their time is released.
  const { data, error } = await supabase.from("invoices").delete().eq("id", id).select("id").maybeSingle();
  if (error) return { error: "Couldn't delete the draft. Try again." };
  if (!data) return { error: "Only drafts can be deleted. Void a sent invoice instead." };
  revalidateAll();
  redirect("/invoices?view=draft");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
