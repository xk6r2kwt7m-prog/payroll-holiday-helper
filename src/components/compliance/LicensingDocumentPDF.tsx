import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { LicensingDocument } from "@/lib/licensing-documents";

/**
 * Printed licensing paperwork. Deliberately plain: black on white, ruled
 * headings and a formal execution block, so it reads as an official document
 * when printed or shown to a licensing officer.
 */
const INK = "#111111";
const BODY = "#1f1f1f";
const SUBTLE = "#555555";
const RULE = "#9a9a9a";
const HAIRLINE = "#cccccc";

const s = StyleSheet.create({
  page: {
    paddingTop: 42, paddingBottom: 44, paddingHorizontal: 52,
    fontSize: 9.5, fontFamily: "Helvetica", lineHeight: 1.45, color: BODY,
  },
  header: { borderBottomWidth: 1.2, borderBottomColor: INK, paddingBottom: 8, marginBottom: 14 },
  title: { fontSize: 12.5, fontFamily: "Helvetica-Bold", color: INK, textAlign: "center", letterSpacing: 0.8 },
  subtitle: { fontSize: 8.5, color: SUBTLE, textAlign: "center", marginTop: 4, letterSpacing: 0.6 },

  sectionTitle: {
    fontSize: 8.5, fontFamily: "Helvetica-Bold", color: INK, letterSpacing: 1,
    marginTop: 14, marginBottom: 5, borderBottomWidth: 0.5, borderBottomColor: HAIRLINE, paddingBottom: 3,
  },
  factRow: { flexDirection: "row", marginBottom: 2.5 },
  factLabel: { width: 138, fontFamily: "Helvetica-Bold", color: INK, fontSize: 9 },
  factValue: { flex: 1 },
  para: { marginTop: 8, textAlign: "justify" },
  nominee: { marginBottom: 2.5 },

  table: { marginTop: 8, borderWidth: 0.7, borderColor: RULE },
  headRow: { flexDirection: "row", borderBottomWidth: 0.7, borderBottomColor: RULE, backgroundColor: "#f2f2f2" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: HAIRLINE, minHeight: 20, alignItems: "center" },
  trLast: { flexDirection: "row", minHeight: 20, alignItems: "center" },
  th: { fontFamily: "Helvetica-Bold", color: INK, fontSize: 8, padding: 5, letterSpacing: 0.3 },
  td: { padding: 5, fontSize: 8.5 },
  colName: { width: "40%", borderRightWidth: 0.5, borderRightColor: HAIRLINE },
  colRole: { width: "22%", borderRightWidth: 0.5, borderRightColor: HAIRLINE },
  colSig: { width: "24%", borderRightWidth: 0.5, borderRightColor: HAIRLINE },
  colDate: { width: "14%" },
  sigImage: { width: 78, height: 24, objectFit: "contain" },

  signBlock: { marginTop: 18, borderWidth: 0.7, borderColor: RULE, padding: 10 },
  signHeading: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: INK, letterSpacing: 1, marginBottom: 6 },
  sigLine: { marginTop: 10, borderTopWidth: 0.7, borderTopColor: INK, width: 190, paddingTop: 3, fontSize: 8, color: SUBTLE },

  statement: { marginTop: 12, padding: 8, borderWidth: 0.7, borderColor: RULE, fontSize: 8.5 },
  summary: { marginTop: 8, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: INK },
  note: { marginTop: 5, fontSize: 8, color: SUBTLE, lineHeight: 1.35 },

  footNote: {
    marginTop: 14, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: HAIRLINE,
    fontSize: 7.5, color: SUBTLE, lineHeight: 1.3,
  },
  pageNo: { position: "absolute", bottom: 24, left: 52, right: 52, textAlign: "center", fontSize: 7.5, color: SUBTLE },
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
  /** The all-sites authorisation carries no per-premises staff register. */
  showStaffRegister?: boolean;
}

export function LicensingDocumentPDF({
  doc, staff = [], summaryLine, warningLine, authoriserSignature, authoriserSignedAt, auditLine,
  showStaffRegister = true,
}: Props) {

  const rows: SignedStaffRow[] = staff.length > 0
    ? staff
    : Array.from({ length: 7 }, () => ({ name: "", signature: null, signed_at: null }));

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>{doc.title}</Text>
          {doc.subtitle && <Text style={s.subtitle}>{doc.subtitle.toUpperCase()}</Text>}
        </View>

        {doc.facts.filter((f) => !isBlank(f.value)).length > 0 && (
          <View>
            <Text style={s.sectionTitle}>PREMISES DETAILS</Text>
            {doc.facts.filter((f) => !isBlank(f.value)).map((f) => (
              <View key={f.label} style={s.factRow}>
                <Text style={s.factLabel}>{f.label}</Text>
                <Text style={s.factValue}>{f.value}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.sectionTitle}>AUTHORISATION</Text>
        {doc.paragraphs.map((p, i) => (
          <Text key={i} style={s.para}>{p}</Text>
        ))}

        {doc.nominated && doc.nominated.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {doc.nominated.map((n, i) => (
              <Text key={i} style={s.nominee}>{n.name} — {n.job_title}</Text>
            ))}
          </View>
        )}

        {doc.subject_type === "dps_authorisation" && showStaffRegister && (
          <View>
            <Text style={s.sectionTitle}>STAFF REGISTER FOR THIS PREMISES</Text>
            {summaryLine && <Text style={s.summary}>{summaryLine}</Text>}
            {warningLine && <Text style={s.note}>{warningLine}</Text>}
            <View style={s.table}>
              <View style={s.headRow}>
                <Text style={[s.th, s.colName]}>Name of staff member</Text>
                <Text style={[s.th, s.colRole]}>Role</Text>
                <Text style={[s.th, s.colSig]}>Signature</Text>
                <Text style={[s.th, s.colDate]}>Date</Text>
              </View>
              {rows.map((r, i) => (
                <View key={i} style={i === rows.length - 1 ? s.trLast : s.tr}>
                  <Text style={[s.td, s.colName]}>{r.name || ""}</Text>
                  <Text style={[s.td, s.colRole]}>{r.job_title || ""}</Text>
                  <View style={[s.td, s.colSig]}>
                    {r.signature
                      ? <Image src={r.signature} style={s.sigImage} />
                      : <Text> </Text>}
                  </View>
                  <Text style={[s.td, s.colDate]}>{gbDate(r.signed_at) || ""}</Text>
                </View>
              ))}
            </View>
            <Text style={s.note}>
              The people named above are authorised to sell alcohol by the Designated Premises
              Supervisor's signature below. Individual staff signatures are not required by law and
              are shown only where one has been collected.
            </Text>
          </View>
        )}

        {doc.statement && <Text style={s.statement}>{doc.statement}</Text>}

        <View style={s.signBlock}>
          <Text style={s.signHeading}>SIGNED BY THE DESIGNATED PREMISES SUPERVISOR</Text>
          {doc.signature_block.filter((f) => !isBlank(f.value)).map((f) => (
            <View key={f.label} style={s.factRow}>
              <Text style={s.factLabel}>{f.label}</Text>
              <Text style={s.factValue}>{f.value}</Text>
            </View>
          ))}

          <View style={{ marginTop: 10 }}>
            {authoriserSignature && <Image src={authoriserSignature} style={s.sigImage} />}
            <Text style={s.sigLine}>Signature</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Text style={s.sigLine}>
              Date: {gbDate(authoriserSignedAt || doc.document_date) || ""}
            </Text>
          </View>
        </View>

        {auditLine && <Text style={s.footNote}>{auditLine}</Text>}
        <Text style={s.pageNo} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
