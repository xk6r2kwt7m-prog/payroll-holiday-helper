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

// Register a cursive Google Font for signatures
Font.register({
  family: "GreatVibes",
  src: "https://fonts.gstatic.com/s/greatvibes/v18/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlq.ttf",
});

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    lineHeight: 1.7,
    color: DARK,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  logo: {
    width: 50,
    height: 50,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: TEAL,
    letterSpacing: 1,
  },
  companyDetail: {
    fontSize: 8,
    color: GRAY,
  },
  headerLine: {
    height: 2,
    backgroundColor: TEAL,
    marginBottom: 30,
    marginTop: 8,
  },
  date: {
    fontSize: 10,
    color: GRAY,
    marginBottom: 24,
    textAlign: "right",
  },
  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 24,
    color: DARK,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  salutation: {
    marginBottom: 16,
  },
  paragraph: {
    marginBottom: 12,
    textAlign: "justify",
  },
  closing: {
    marginTop: 30,
    marginBottom: 6,
  },
  signatureHandwriting: {
    fontFamily: "GreatVibes",
    fontSize: 26,
    color: "#1a1a2e",
    marginTop: 20,
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY,
    width: 200,
    marginTop: 2,
    marginBottom: 6,
  },
  signatureName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
  },
  signatureTitle: {
    fontSize: 9.5,
    color: GRAY,
  },
  signatureCompany: {
    fontSize: 9.5,
    color: GRAY,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 60,
    right: 60,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 6,
    fontSize: 7,
    color: GRAY,
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
  companyAddress?: string;
  companyEmail?: string;
  logoUrl?: string;
  letterDate?: string;
  signatureText?: string;
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
        {/* Header with logo */}
        <View style={styles.header}>
          {data.logoUrl && (
            <Image src={data.logoUrl} style={styles.logo} />
          )}
          <View>
            <Text style={styles.companyName}>{data.companyName.toUpperCase()}</Text>
            {data.companyAddress && (
              <Text style={styles.companyDetail}>{data.companyAddress}</Text>
            )}
            {data.companyEmail && (
              <Text style={styles.companyDetail}>{data.companyEmail}</Text>
            )}
          </View>
        </View>
        <View style={styles.headerLine} />

        {/* Date */}
        <Text style={styles.date}>{letterDate}</Text>

        {/* Title */}
        <Text style={styles.title}>Reference Letter</Text>

        {/* Salutation */}
        <Text style={styles.salutation}>To Whom It May Concern,</Text>

        {/* Body paragraphs */}
        {data.bodyParagraphs.map((paragraph, i) => (
          <Text key={i} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}

        {/* Closing */}
        <Text style={styles.closing}>Yours faithfully,</Text>

        {/* Handwritten signature */}
        {data.signatureText ? (
          <Text style={styles.signatureHandwriting}>{data.signatureText}</Text>
        ) : (
          <View style={{ marginTop: 20 }} />
        )}
        <View style={styles.signatureLine} />

        {/* Printed name & title */}
        <Text style={styles.signatureName}>{data.signerName}</Text>
        <Text style={styles.signatureTitle}>{data.signerTitle}</Text>
        <Text style={styles.signatureCompany}>{data.companyName}</Text>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{data.companyName} — Confidential</Text>
          <Text>Generated: {now}</Text>
        </View>
      </Page>
    </Document>
  );
}
