import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

/* ── Colour palette ── */
const BRAND = "#4a8c7f";
const DARK = "#1a2630";
const BODY = "#333";
const SUBTLE = "#6b7280";
const RULE = "#d1d5db";
const ACCENT_BG = "#f0f6f4";

/* ── Styles ── */
const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 50,
    paddingHorizontal: 0,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    lineHeight: 1.6,
    color: BODY,
  },

  /* ── Branded header band ── */
  headerBand: {
    backgroundColor: ACCENT_BG,
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  headerTextBlock: {
    flex: 1,
  },
  legalName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    letterSpacing: 0.8,
  },
  tradingAs: {
    fontSize: 8,
    color: SUBTLE,
    marginTop: 2,
    fontFamily: "Helvetica-Oblique",
  },
  headerMeta: {
    fontSize: 7.5,
    color: SUBTLE,
    marginTop: 1,
  },

  /* ── Content area ── */
  content: {
    paddingHorizontal: 56,
  },

  /* ── Date ── */
  date: {
    fontSize: 9.5,
    color: SUBTLE,
    textAlign: "right",
    marginBottom: 20,
  },

  /* ── Title ── */
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  titleAccent: {
    width: 4,
    height: 18,
    backgroundColor: BRAND,
    marginRight: 10,
    borderRadius: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    textTransform: "uppercase",
    letterSpacing: 2,
  },

  /* ── Body ── */
  salutation: {
    marginBottom: 14,
    color: DARK,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: "justify",
    lineHeight: 1.75,
  },

  /* ── Closing + Signature ── */
  closing: {
    marginTop: 24,
    marginBottom: 6,
    color: DARK,
  },
  signatureArea: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 20,
  },
  signatureLeft: {
    flex: 1,
  },
  signatureImage: {
    width: 140,
    height: 50,
    objectFit: "contain",
  },
  signatureLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    width: 200,
    marginBottom: 6,
  },
  signerName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: DARK,
  },
  signerDetail: {
    fontSize: 8.5,
    color: SUBTLE,
    marginTop: 1,
  },

  /* ── Footer ── */
  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
    fontSize: 6.5,
    color: SUBTLE,
  },
});

/* ── Types ── */
export interface ReferenceLetterData {
  employeeName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  bodyParagraphs: string[];
  signerName: string;
  signerTitle: string;
  companyName: string;
  legalName?: string;
  companyAddress?: string;
  companyEmail?: string;
  logoUrl?: string;
  letterDate?: string;
  signatureImageUrl?: string;
}

/* ── Component ── */
export function ReferenceLetterPDF({ data }: { data: ReferenceLetterData }) {
  const fmtDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const now = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const entity = data.legalName || data.companyName;
  const showTrading = data.legalName && data.companyName && data.legalName !== data.companyName;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ═══ HEADER BAND ═══ */}
        <View style={s.headerBand}>
          <View style={s.headerRow}>
            {data.logoUrl && <Image src={data.logoUrl} style={s.logo} />}
            <View style={s.headerTextBlock}>
              <Text style={s.legalName}>{entity.toUpperCase()}</Text>
              {showTrading && (
                <Text style={s.tradingAs}>Trading as {data.companyName}</Text>
              )}
              {data.companyAddress && (
                <Text style={s.headerMeta}>{data.companyAddress}</Text>
              )}
              {data.companyEmail && (
                <Text style={s.headerMeta}>{data.companyEmail}</Text>
              )}
            </View>
          </View>
        </View>

        {/* ═══ CONTENT ═══ */}
        <View style={s.content}>
          {/* Date */}
          <Text style={s.date}>{fmtDate(data.letterDate)}</Text>

          {/* Title with accent bar */}
          <View style={s.titleRow}>
            <View style={s.titleAccent} />
            <Text style={s.title}>Reference Letter</Text>
          </View>

          {/* Salutation */}
          <Text style={s.salutation}>To Whom It May Concern,</Text>

          {/* Body */}
          {data.bodyParagraphs.map((p, i) => (
            <Text key={i} style={s.paragraph}>{p}</Text>
          ))}

          {/* Closing */}
          <Text style={s.closing}>Yours faithfully,</Text>

          {/* Signature block — stays together */}
          <View style={s.signatureArea} wrap={false}>
            <View style={s.signatureLeft}>
              <View style={s.signatureLine} />
              <Text style={s.signerName}>{data.signerName}</Text>
              <Text style={s.signerDetail}>{data.signerTitle}</Text>
              <Text style={s.signerDetail}>{entity}</Text>
            </View>
            {data.signatureImageUrl && (
              <Image src={data.signatureImageUrl} style={s.signatureImage} />
            )}
          </View>
        </View>

        {/* ═══ FOOTER ═══ */}
        <View style={s.footer} fixed>
          <Text>Generated: {now}</Text>
        </View>
      </Page>
    </Document>
  );
}
