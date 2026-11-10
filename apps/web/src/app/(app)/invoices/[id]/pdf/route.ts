import { requireUser } from "@/lib/auth";
import { buildDocument } from "@/lib/invoices/document";
import { getInvoice } from "@/lib/invoices/data";
import { renderInvoicePdf } from "@/lib/invoices/pdf";
import { getProfile } from "@/lib/settings/data";

/** GET /invoices/:id/pdf → the invoice as a PDF (inline; ?download=1 to save). */
export async function GET(request: Request, ctx: RouteContext<"/invoices/[id]/pdf">) {
  await requireUser();
  const { id } = await ctx.params;
  const [invoice, profile] = await Promise.all([getInvoice(id), getProfile()]);
  const doc = buildDocument(invoice, invoice.lines, { profile, client: invoice.client });
  const pdf = await renderInvoicePdf(doc);

  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = `${doc.number.replace(/[^\w.-]+/g, "_")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
