import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatDateOnly } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { formatQuantity, type InvoiceDocument } from "./document";

const ink = "#111827";
const muted = "#6b7280";
const rule = "#e5e7eb";

const s = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: ink, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  issuerName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  muted: { color: muted },
  small: { fontSize: 8.5 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  label: { fontSize: 8, color: muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: ink, paddingBottom: 5, marginBottom: 2 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: rule, paddingVertical: 7 },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 50, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cAmt: { width: 85, textAlign: "right" },
  totals: { marginTop: 12, marginLeft: "auto", width: 215 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { borderTopWidth: 1, borderTopColor: ink, marginTop: 4, paddingTop: 6, fontSize: 12, fontFamily: "Helvetica-Bold" },
  section: { marginTop: 28 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: muted, textAlign: "center" },
  stamp: { position: "absolute", top: 160, right: 48, fontSize: 28, fontFamily: "Helvetica-Bold", opacity: 0.15, transform: "rotate(-12deg)" },
});

function InvoicePdf({ doc }: { doc: InvoiceDocument }) {
  const money = (minor: number) => formatMoney(minor, doc.currency);
  const stamp = doc.status === "paid" ? "PAID" : doc.status === "void" ? "VOID" : doc.status === "draft" ? "DRAFT" : null;

  return (
    <Document title={`Invoice ${doc.number}`} author={doc.issuer.name} subject={`Invoice ${doc.number} for ${doc.client.name}`}>
      <Page size="LETTER" style={s.page}>
        {stamp && <Text style={s.stamp}>{stamp}</Text>}

        <View style={s.header}>
          <View>
            <Text style={s.issuerName}>{doc.issuer.name}</Text>
            {doc.issuer.contact && <Text style={s.muted}>{doc.issuer.contact}</Text>}
            {doc.issuer.address.map((l) => (
              <Text key={l} style={s.muted}>{l}</Text>
            ))}
            {doc.issuer.email && <Text style={s.muted}>{doc.issuer.email}</Text>}
            {doc.issuer.phone && <Text style={s.muted}>{doc.issuer.phone}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>INVOICE</Text>
            <Text style={[s.bold, { marginTop: 4 }]}>{doc.number}</Text>
          </View>
        </View>

        <View style={s.meta}>
          <View style={{ maxWidth: 260 }}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.bold}>{doc.client.name}</Text>
            {doc.client.contact && <Text>{doc.client.contact}</Text>}
            {doc.client.address.map((l) => (
              <Text key={l}>{l}</Text>
            ))}
            {doc.client.email && <Text style={s.muted}>{doc.client.email}</Text>}
            {doc.client.taxId && <Text style={s.muted}>Tax ID: {doc.client.taxId}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>Issued</Text>
            <Text style={{ marginBottom: 8 }}>{formatDateOnly(doc.issueDate)}</Text>
            <Text style={s.label}>Due</Text>
            <Text style={[s.bold, { marginBottom: 8 }]}>{formatDateOnly(doc.dueDate)}</Text>
            <Text style={s.label}>Amount due</Text>
            <Text style={s.bold}>
              {money(doc.status === "paid" ? 0 : doc.totalMinor)} {doc.currency}
            </Text>
          </View>
        </View>

        <View style={s.tableHead}>
          <Text style={[s.cDesc, s.label, { marginBottom: 0 }]}>Description</Text>
          <Text style={[s.cQty, s.label, { marginBottom: 0 }]}>Qty</Text>
          <Text style={[s.cPrice, s.label, { marginBottom: 0 }]}>Rate</Text>
          <Text style={[s.cAmt, s.label, { marginBottom: 0 }]}>Amount</Text>
        </View>
        {doc.lines.map((l) => (
          <View key={l.id} style={s.row} wrap={false}>
            <Text style={s.cDesc}>{l.description}</Text>
            <Text style={s.cQty}>{formatQuantity(l.quantity)}</Text>
            <Text style={s.cPrice}>{money(l.unitPriceMinor)}</Text>
            <Text style={s.cAmt}>{money(l.amountMinor)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{money(doc.subtotalMinor)}</Text>
          </View>
          {doc.taxLabel && (
            <View style={s.totalRow}>
              <Text style={s.muted}>{doc.taxLabel}</Text>
              <Text>{money(doc.taxMinor)}</Text>
            </View>
          )}
          <View style={[s.totalRow, s.grand]}>
            <Text>Total {doc.currency}</Text>
            <Text>{money(doc.totalMinor)}</Text>
          </View>
        </View>

        {doc.notes && (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Notes</Text>
            <Text>{doc.notes}</Text>
          </View>
        )}
        {doc.issuer.footer && (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>How to pay</Text>
            <Text>{doc.issuer.footer}</Text>
          </View>
        )}

        <Text style={s.footer} fixed>
          {[doc.issuer.gstNumber && `GST/HST No. ${doc.issuer.gstNumber}`, `${doc.issuer.name} · Invoice ${doc.number}`]
            .filter(Boolean)
            .join("   ·   ")}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(doc: InvoiceDocument): Promise<Buffer> {
  return renderToBuffer(<InvoicePdf doc={doc} />);
}
