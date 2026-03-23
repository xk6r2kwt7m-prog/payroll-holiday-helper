import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const TEAL = "#5a9e91";
const DARK = "#1e2a2f";
const GRAY = "#555";
const GREEN = "#2d8659";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    lineHeight: 1.6,
    color: DARK,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: TEAL,
    paddingBottom: 8,
    marginBottom: 16,
  },
  pageHeaderText: { fontSize: 8, color: GRAY },
  pageHeaderBrand: { fontSize: 8, color: TEAL, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 6,
    fontSize: 7,
    color: GRAY,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: GRAY,
    textAlign: "center",
    marginBottom: 24,
  },
  statusBadge: {
    backgroundColor: "#e8f5e9",
    borderRadius: 4,
    padding: "6 16",
    alignSelf: "center",
    marginBottom: 24,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: TEAL,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: TEAL,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    paddingVertical: 5,
  },
  label: { width: "40%", fontSize: 9, color: GRAY },
  value: { width: "60%", fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK },
  sigBlock: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#fafffe",
  },
  sigHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sigRole: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  sigBadge: {
    backgroundColor: "#e8f5e9",
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sigBadgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
  },
  sigImage: {
    width: 180,
    height: 60,
    marginVertical: 6,
    objectFit: "contain",
  },
  sigMeta: {
    fontSize: 8,
    color: GRAY,
    marginBottom: 2,
  },
  certBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    padding: 10,
    marginTop: 20,
  },
  certTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },
  certText: {
    fontSize: 7,
    color: GRAY,
    lineHeight: 1.4,
  },
  legalNotice: {
    fontSize: 7,
    color: GRAY,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 1.5,
  },
});

export interface SignatureRecord {
  signer_type: string;
  signer_name: string;
  typed_name: string | null;
  signed_at: string;
  signed_by_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  signature_data: string | null;
  signature_type: string | null;
  consent_text: string;
  consent_given: boolean | null;
  document_hash: string | null;
}

interface SigningCertificatePDFProps {
  documentName: string;
  employeeName: string;
  companyName: string;
  signatures: SignatureRecord[];
  documentId: string;
  finalDocumentHash?: string | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function truncateUA(ua: string | null): string {
  if (!ua) return "Not recorded";
  if (ua.length > 80) return ua.substring(0, 77) + "...";
  return ua;
}

export function SigningCertificatePDF({
  documentName,
  employeeName,
  companyName,
  signatures,
  documentId,
  finalDocumentHash,
}: SigningCertificatePDFProps) {
  const employeeSig = signatures.find((s) => s.signer_type === "employee");
  const employerSig = signatures.find((s) => s.signer_type === "employer");
  const fullyComplete = !!employeeSig && !!employerSig;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderBrand}>{companyName.toUpperCase()}</Text>
          <Text style={styles.pageHeaderText}>Signing Certificate</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Electronic Signing Certificate</Text>
        <Text style={styles.subtitle}>{documentName}</Text>

        {fullyComplete && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>✓ FULLY SIGNED AND COMPLETE</Text>
          </View>
        )}

        {/* Document Details */}
        <Text style={styles.sectionTitle}>Document Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Document</Text>
          <Text style={styles.value}>{documentName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Employee</Text>
          <Text style={styles.value}>{employeeName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Company</Text>
          <Text style={styles.value}>{companyName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Document Reference</Text>
          <Text style={styles.value}>{documentId.substring(0, 8).toUpperCase()}</Text>
        </View>
        {finalDocumentHash && (
          <View style={styles.row}>
            <Text style={styles.label}>Document Hash (SHA-256)</Text>
            <Text style={{ ...styles.value, fontSize: 7, fontFamily: "Courier" }}>
              {finalDocumentHash.substring(0, 32)}...
            </Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Signing Order</Text>
          <Text style={styles.value}>Employee first, then Employer</Text>
        </View>

        {/* Signatures */}
        <Text style={styles.sectionTitle}>Signatures</Text>

        {/* Employee Signature */}
        {employeeSig && (
          <View style={styles.sigBlock}>
            <View style={styles.sigHeader}>
              <Text style={styles.sigRole}>Employee Signature</Text>
              <View style={styles.sigBadge}>
                <Text style={styles.sigBadgeText}>✓ SIGNED</Text>
              </View>
            </View>

            {employeeSig.signature_data && (
              <Image src={employeeSig.signature_data} style={styles.sigImage} />
            )}

            <Text style={styles.sigMeta}>Signed by: {employeeSig.signer_name}</Text>
            <Text style={styles.sigMeta}>Typed name: {employeeSig.typed_name || employeeSig.signer_name}</Text>
            <Text style={styles.sigMeta}>Email: {employeeSig.signed_by_email || "Not provided"}</Text>
            <Text style={styles.sigMeta}>Date & Time: {formatDateTime(employeeSig.signed_at)}</Text>
            <Text style={styles.sigMeta}>IP Address: {employeeSig.ip_address || "Not recorded"}</Text>
            <Text style={styles.sigMeta}>Device: {truncateUA(employeeSig.user_agent)}</Text>
            <Text style={styles.sigMeta}>Signature type: {employeeSig.signature_type || "drawn"}</Text>
            {employeeSig.document_hash && (
              <Text style={styles.sigMeta}>Document hash at signing: {employeeSig.document_hash.substring(0, 16)}...</Text>
            )}
          </View>
        )}

        {/* Employer Signature */}
        {employerSig && (
          <View style={styles.sigBlock}>
            <View style={styles.sigHeader}>
              <Text style={styles.sigRole}>Employer Signature</Text>
              <View style={styles.sigBadge}>
                <Text style={styles.sigBadgeText}>✓ SIGNED</Text>
              </View>
            </View>

            {employerSig.signature_data && (
              <Image src={employerSig.signature_data} style={styles.sigImage} />
            )}

            <Text style={styles.sigMeta}>Signed by: {employerSig.signer_name}</Text>
            <Text style={styles.sigMeta}>Typed name: {employerSig.typed_name || employerSig.signer_name}</Text>
            <Text style={styles.sigMeta}>Email: {employerSig.signed_by_email || "Not provided"}</Text>
            <Text style={styles.sigMeta}>Date & Time: {formatDateTime(employerSig.signed_at)}</Text>
            <Text style={styles.sigMeta}>IP Address: {employerSig.ip_address || "Not recorded"}</Text>
            <Text style={styles.sigMeta}>Device: {truncateUA(employerSig.user_agent)}</Text>
            <Text style={styles.sigMeta}>Signature type: {employerSig.signature_type || "drawn"}</Text>
            {employerSig.document_hash && (
              <Text style={styles.sigMeta}>Document hash at signing: {employerSig.document_hash.substring(0, 16)}...</Text>
            )}
          </View>
        )}

        {!employeeSig && (
          <View style={{ ...styles.sigBlock, backgroundColor: "#fff8e1" }}>
            <Text style={{ ...styles.sigRole, color: "#f57c00" }}>Employee Signature — Pending</Text>
          </View>
        )}

        {!employerSig && (
          <View style={{ ...styles.sigBlock, backgroundColor: "#fff8e1" }}>
            <Text style={{ ...styles.sigRole, color: "#f57c00" }}>Employer Signature — Pending</Text>
          </View>
        )}

        {/* Consent Record */}
        {(employeeSig || employerSig) && (
          <>
            <Text style={styles.sectionTitle}>Consent Records</Text>
            {employeeSig && (
              <View style={styles.certBox}>
                <Text style={styles.certTitle}>Employee Consent</Text>
                <Text style={styles.certText}>{employeeSig.consent_text}</Text>
                <Text style={{ ...styles.certText, marginTop: 2 }}>
                  Consent given: {employeeSig.consent_given ? "Yes" : "No"}
                </Text>
              </View>
            )}
            {employerSig && (
              <View style={styles.certBox}>
                <Text style={styles.certTitle}>Employer Consent</Text>
                <Text style={styles.certText}>{employerSig.consent_text}</Text>
                <Text style={{ ...styles.certText, marginTop: 2 }}>
                  Consent given: {employerSig.consent_given ? "Yes" : "No"}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Legal Notice */}
        <Text style={styles.legalNotice}>
          This document constitutes a legally binding electronic signing certificate under the{"\n"}
          UK Electronic Communications Act 2000 and eIDAS Regulation.{"\n"}
          All signature data, timestamps, and device information have been recorded and stored securely.{"\n"}
          This certificate should be retained alongside the original contract document.
        </Text>

        <View style={styles.footer} fixed>
          <Text>{companyName} — Signing Certificate — Confidential</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
