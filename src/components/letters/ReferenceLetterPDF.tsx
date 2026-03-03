import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

const TEAL = "#5a9e91";
const DARK = "#1e2a2f";
const GRAY = "#555";
const LIGHT_GRAY = "#999";

Font.register({
  family: "GreatVibes",
  src: "https://fonts.gstatic.com/s/greatvibes/v18/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlq.ttf",
});

const styles = StyleSheet.create({
  page: {
    padding: 50,
    paddingBottom: 70,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.65,
    color: DARK,
  },
  /* ── Header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 6,
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: TEAL,
    letterSpacing: 1.2,
  },
  companyDetail: {
    fontSize: 7.5,
    color: GRAY,
    marginTop: 1,
  },
  headerLine: {
    height: 1.5,
    backgroundColor: TEAL,
    marginBottom: 22,
    marginTop: 8,
  },
  /* ── Date & Title ── */
  date: {
    fontSize: 9.5,
    color: GRAY,
    marginBottom: 18,
    textAlign: "right",
  },
  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 20,
    color: DARK,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  /* ── Body ── */
  salutation: {
    marginBottom: 12,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: "justify",
  },
  /* ── Closing & Signature Block ── */
  closing: {
    marginTop: 22,
    marginBottom: 4,
  },
  signatureBlock: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 24,
    marginTop: 14,
  },
  signatureTextBlock: {
    flex: 1,
  },
  signatureImage: {
    width: 150,
    height: 55,
    objectFit: "contain",
  },
  signatureLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY,
    width: 180,
    marginBottom: 5,
  },
  signatureName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  signatureTitle: {
    fontSize: 9,
    color: GRAY,
    marginTop: 1,
  },
  signatureCompany: {
    fontSize: 9,
    color: GRAY,
    marginTop: 1,
  },
  /* ── Footer ── */
  footer: {
    position: "absolute",
    bottom: 28,
    left: 50,
    right: 50,
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 6,
    fontSize: 7,
    color: LIGHT_GRAY,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

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

export function ReferenceLetterPDF({ data }: { data: ReferenceLetterData }) {
  const letterDate = data.letterDate
    ? new Date(data.letterDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const now = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          {data.logoUrl && (
            <Image src={data.logoUrl} style={styles.logo} />
          )}
          <View>
            <Text style={styles.companyName}>
              {(data.legalName || data.companyName).toUpperCase()}
            </Text>
            {data.legalName && data.companyName && data.legalName !== data.companyName && (
              <Text style={styles.companyDetail}>Trading as {data.companyName}</Text>
            )}
            {data.companyAddress && (
              <Text style={styles.companyDetail}>{data.companyAddress}</Text>
            )}
            {data.companyEmail && (
              <Text style={styles.companyDetail}>{data.companyEmail}</Text>
            )}
          </View>
        </View>
        <View style={styles.headerLine} />

        {/* ── Date ── */}
        <Text style={styles.date}>{letterDate}</Text>

        {/* ── Title ── */}
        <Text style={styles.title}>Reference Letter</Text>

        {/* ── Salutation ── */}
        <Text style={styles.salutation}>To Whom It May Concern,</Text>

        {/* ── Body ── */}
        {data.bodyParagraphs.map((paragraph, i) => (
          <Text key={i} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}

        {/* ── Closing ── */}
        <Text style={styles.closing}>Yours faithfully,</Text>

        {/* ── Signature block: name/title on left, handwritten sig on right ── */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureTextBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{data.signerName}</Text>
            <Text style={styles.signatureTitle}>{data.signerTitle}</Text>
            <Text style={styles.signatureCompany}>
              {data.legalName || data.companyName}
            </Text>
          </View>
          {data.signatureImageUrl && (
            <Image src={data.signatureImageUrl} style={styles.signatureImage} />
          )}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text>{data.legalName || data.companyName} — Confidential</Text>
          <Text>Generated: {now}</Text>
        </View>
      </Page>
    </Document>
  );
}
