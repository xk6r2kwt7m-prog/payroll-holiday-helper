import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { LicensingDocument } from "@/lib/licensing-documents";

const DARK = "#1a2630";
const BODY = "#333";
const SUBTLE = "#6b7280";
const RULE = "#d1d5db";

const s = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 48, paddingHorizontal: 48, fontSize: 10, fontFamily: "Helvetica", lineHeight: 1.5, color: BODY },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "center", letterSpacing: 0.4 },
  subtitle: { fontSize: 9, color: SUBTLE, textAlign: "center", marginTop: 3, marginBottom: 16 },
  factRow: { flexDirection: "row", marginBottom: 2 },
  factLabel: { width: 150, fontFamily: "Helvetica-Bold", color: DARK },
  factValue: { flex: 1 },
  para: { marginTop: 10 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginTop: 16, marginBottom: 6 },
  nominee: { marginBottom: 3 },
  table: { marginTop: 10, borderWidth: 1, borderColor: RULE },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: RULE },
  trLast: { flexDirection: "row" },
  th: { fontFamily: "Helvetica-Bold", color: DARK, fontSize: 9, padding: 6 },
  td: { padding: 6, fontSize: 9 },
  colName: { width: "40%", borderRightWidth: 1, borderRightColor: RULE },
  colRole: { width: "22%", borderRightWidth: 1, borderRightColor: RULE },
  colSig: { width: "24%", borderRightWidth: 1, borderRightColor: RULE },
  colDate: { width: "14%" },
  sigImage: { width: 80, height: 26, objectFit: "contain" },
  signBlock: { marginTop: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: RULE },
  statement: { marginTop: 14, padding: 8, borderWidth: 1, borderColor: RULE, fontSize: 9 },
  summary: { marginTop: 12, fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK },
  note: { marginTop: 6, fontSize: 9, color: SUBTLE },

  footNote: { marginTop: 18, fontSize: 8, color: SUBTLE },
});

export interface SignedStaffRow {
  name: string;
  job_title?: string | null;
  signature?: string | null;
  signed_at?: string | null;
}

function gbDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB");
}

/** A detail we do not hold is left off the document rather than printed blank. */
const isBlank = (v?: string | null) => !v || /^_+$/.test(v.trim());

interface Props {
  doc: LicensingDocument;
  /** The site register — everyone front of house at this premises. */
  staff?: SignedStaffRow[];
  /** Plain sentence stating how many of the listed staff have signed. */
  summaryLine?: string | null;
  /** Neutral note about signatures still outstanding. */
  warningLine?: string | null;

  /** Signature captured from the licence holder / DPS. */
  authoriserSignature?: string | null;
  authoriserSignedAt?: string | null;
  /** Extra audit line shown at the foot of the page. */
  auditLine?: string | null;
}

export function LicensingDocumentPDF({
  doc, staff = [], summaryLine, warningLine, authoriserSignature, authoriserSignedAt, auditLine,
}: Props) {

  const rows: SignedStaffRow[] = staff.length > 0
    ? staff
    : Array.from({ length: 7 }, () => ({ name: "", signature: null, signed_at: null }));

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{doc.title}</Text>
        {doc.subtitle && <Text style={s.subtitle}>{doc.subtitle}</Text>}

        {doc.facts.filter((f) => !isBlank(f.value)).map((f) => (
          <View key={f.label} style={s.factRow}>
            <Text style={s.factLabel}>{f.label}:</Text>
            <Text style={s.factValue}>{f.value}</Text>
          </View>
        ))}


        {doc.paragraphs.map((p, i) => (
          <Text key={i} style={s.para}>{p}</Text>
        ))}

        {doc.nominated && doc.nominated.length > 0 && (
          <View>
            {doc.nominated.map((n, i) => (
              <Text key={i} style={s.nominee}>{n.name} — {n.job_title}</Text>
            ))}
          </View>
        )}

        {doc.subject_type === "dps_authorisation" && (
          <View>
            <Text style={s.sectionTitle}>Staff register for this premises</Text>
            {summaryLine && <Text style={s.summary}>{summaryLine}</Text>}
            {warningLine && <Text style={s.note}>{warningLine}</Text>}
            <View style={s.table}>
              <View style={s.tr}>
                <Text style={[s.th, s.colName]}>Name of Staff Member</Text>
                <Text style={[s.th, s.colRole]}>Role</Text>
                <Text style={[s.th, s.colSig]}>Signature</Text>
                <Text style={[s.th, s.colDate]}>Date</Text>
              </View>
              {rows.map((r, i) => (
                <View key={i} style={i === rows.length - 1 ? s.trLast : s.tr}>
                  <Text style={[s.td, s.colName]}>{r.name || "______________________"}</Text>
                  <Text style={[s.td, s.colRole]}>{r.job_title || "____________"}</Text>
                  <View style={[s.td, s.colSig]}>
                    {r.signature
                      ? <Image src={r.signature} style={s.sigImage} />
                      : <Text>______________</Text>}
                  </View>
                  <Text style={[s.td, s.colDate]}>{gbDate(r.signed_at) || "________"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}



        {doc.statement && <Text style={s.statement}>{doc.statement}</Text>}

        <View style={s.signBlock}>
          <Text style={{ fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 6 }}>AUTHORISED BY</Text>
          {doc.signature_block.filter((f) => !isBlank(f.value)).map((f) => (
            <View key={f.label} style={s.factRow}>
              <Text style={s.factLabel}>{f.label}:</Text>
              <Text style={s.factValue}>{f.value}</Text>
            </View>
          ))}

          <View style={{ marginTop: 10 }}>
            {authoriserSignature
              ? <Image src={authoriserSignature} style={s.sigImage} />
              : <Text>Signature: __________________________</Text>}
          </View>
          <Text style={{ marginTop: 6 }}>
            Date: {gbDate(authoriserSignedAt || doc.document_date) || "__________"}
          </Text>
        </View>

        {auditLine && <Text style={s.footNote}>{auditLine}</Text>}
      </Page>
    </Document>
  );
}
