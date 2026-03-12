import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ContractVariables } from "./contractTemplates";
import { getEmploymentTypeLabel } from "./contractTemplates";

const TEAL = "#5a9e91";
const DARK = "#1e2a2f";
const GRAY = "#555";
const LIGHT_TEAL = "#eef6f4";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    lineHeight: 1.6,
    color: DARK,
  },
  coverPage: {
    padding: 50,
    fontFamily: "Helvetica",
    color: DARK,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  coverBrand: {
    fontSize: 12,
    letterSpacing: 4,
    color: TEAL,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  coverTradingAs: {
    fontSize: 9,
    color: GRAY,
    marginBottom: 20,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 30,
    color: DARK,
  },
  coverLine: {
    width: 60,
    height: 2,
    backgroundColor: TEAL,
    marginBottom: 30,
  },
  coverField: {
    fontSize: 11,
    marginBottom: 8,
    textAlign: "center",
  },
  coverLabel: {
    fontSize: 9,
    color: GRAY,
    letterSpacing: 1,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    color: TEAL,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  paragraph: {
    marginBottom: 6,
    textAlign: "justify",
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 12,
    color: TEAL,
    fontFamily: "Helvetica-Bold",
  },
  bulletText: {
    flex: 1,
    textAlign: "justify",
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  signatureSection: {
    marginTop: 30,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: DARK,
    width: 180,
    marginTop: 30,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: GRAY,
  },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  col: {
    width: "45%",
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
  pageHeaderText: {
    fontSize: 8,
    color: GRAY,
  },
  pageHeaderBrand: {
    fontSize: 8,
    color: TEAL,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
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
  infoBox: {
    backgroundColor: LIGHT_TEAL,
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    marginVertical: 10,
  },
});

interface ContractPDFProps {
  variables: ContractVariables;
  contractType?: string;
  companyLegalName?: string;
  companyTradingName?: string;
  companyAddress?: string;
}

export function ContractPDF({ variables, companyLegalName = "Your Company", companyTradingName, companyAddress }: ContractPDFProps) {
  const formattedDate = new Date(variables.effectiveDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const PageHeader = () => (
    <View style={styles.pageHeader}>
      <Text style={styles.pageHeaderBrand}>{companyLegalName.toUpperCase()}</Text>
      <Text style={styles.pageHeaderText}>Employment Agreement — {variables.employeeName}</Text>
    </View>
  );

  const PageFooter = () => (
    <View style={styles.footer} fixed>
      <Text>{companyLegalName} — Confidential</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );

  return (
    <Document>
      {/* ─── Cover Page ─── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ marginTop: 160, alignItems: "center" }}>
          <Text style={styles.coverBrand}>{companyLegalName.toUpperCase()}</Text>
          {companyTradingName && <Text style={styles.coverTradingAs}>Trading as {companyTradingName}</Text>}
          <Text style={styles.coverTitle}>Employment Agreement</Text>
          <View style={styles.coverLine} />

          <Text style={styles.coverLabel}>EMPLOYEE</Text>
          <Text style={styles.coverField}>{variables.employeeName}</Text>

          <Text style={styles.coverLabel}>POSITION</Text>
          <Text style={styles.coverField}>{variables.jobTitle}</Text>

          <Text style={styles.coverLabel}>EMPLOYMENT TYPE</Text>
          <Text style={styles.coverField}>{getEmploymentTypeLabel(variables.employmentType)}</Text>

          <Text style={styles.coverLabel}>EFFECTIVE DATE</Text>
          <Text style={styles.coverField}>{formattedDate}</Text>

          <Text style={styles.coverLabel}>PRIMARY LOCATION</Text>
          <Text style={styles.coverField}>{variables.workLocation}</Text>
        </View>
        <PageFooter />
      </Page>

      {/* ─── Preamble + Sections 1–6 ─── */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        <Text style={styles.paragraph}>
          This Employment Agreement is made between:
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>UD Restaurants Ltd</Text>, trading as "Ugly Dumpling", with its registered address at 1 Newburgh Street, London W1F 7RB ("the Company")
        </Text>
        <Text style={styles.paragraph}>and</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>{variables.employeeName}</Text>, residing at {variables.homeAddress || "[Address not provided]"} ("the Employee")
        </Text>
        <Text style={styles.paragraph}>
          The Company and the Employee together referred to as "the Parties".
        </Text>

        <View style={styles.divider} />

        {/* 1. POSITION */}
        <Text style={styles.sectionTitle}>1. Position</Text>
        <Text style={styles.paragraph}>
          The Employee is employed as <Text style={styles.bold}>{variables.jobTitle}</Text>.
        </Text>
        <Text style={styles.paragraph}>
          The Employee agrees to perform all duties reasonably required for the role and any additional duties reasonably requested by management consistent with their skills and experience.
        </Text>
        <Text style={styles.paragraph}>
          The Employee agrees to act with honesty, professionalism, and integrity at all times while representing the Company.
        </Text>

        {/* 2. PLACE OF WORK */}
        <Text style={styles.sectionTitle}>2. Place of Work</Text>
        <Text style={styles.paragraph}>
          The Employee's primary place of work will be:
        </Text>
        <View style={styles.infoBox}>
          <Text style={styles.bold}>{variables.workLocation}</Text>
        </View>
        <Text style={styles.paragraph}>
          Due to the nature of the Company's operations, the Employee may be required to work at any Company location within Greater London where reasonably required by the business.
        </Text>

        {/* 3. PROBATION PERIOD */}
        <Text style={styles.sectionTitle}>3. Probation Period</Text>
        <Text style={styles.paragraph}>
          Employment is subject to a probation period of <Text style={styles.bold}>{variables.probationPeriod}</Text>.
        </Text>
        <Text style={styles.paragraph}>
          During this period the Company will assess performance, reliability, and suitability for the role.
        </Text>
        <Text style={styles.paragraph}>
          The Company may terminate employment during probation with one week's notice.
        </Text>

        {/* 4. HOURS OF WORK */}
        <Text style={styles.sectionTitle}>4. Hours of Work</Text>
        <Text style={styles.paragraph}>
          The Employee's hours will vary depending on the operational needs of the business.
        </Text>
        <Text style={styles.paragraph}>
          Working hours will be organised through the Company's rota system.
        </Text>
        <Text style={styles.paragraph}>
          Average weekly hours are expected to be approximately:
        </Text>
        <View style={styles.infoBox}>
          <Text style={styles.bold}>{variables.weeklyHours} hours per week</Text>
        </View>
        <Text style={styles.paragraph}>
          Due to the nature of hospitality operations, shifts may vary week to week.
        </Text>

        {/* 5. ROTA AND SHIFT CHANGES */}
        <Text style={styles.sectionTitle}>5. Rota and Shift Changes</Text>
        <Text style={styles.paragraph}>
          The Company operates a rota system to allocate shifts. Employees are responsible for checking the rota regularly and attending all scheduled shifts.
        </Text>
        <Text style={styles.paragraph}>
          The Company reserves the right to amend rotas where reasonably required to meet operational needs. Employees may occasionally be asked to adjust shifts at short notice due to operational requirements.
        </Text>

        {/* 6. COMMUNICATION */}
        <Text style={styles.sectionTitle}>6. Communication</Text>
        <Text style={styles.paragraph}>
          Employees are responsible for regularly checking the Company's communication channels including email, rota software, and internal messaging platforms.
        </Text>
        <Text style={styles.paragraph}>
          Important updates regarding shifts, operations, and company policies may be communicated through these systems. Failure to check communications may result in missed instructions or shifts.
        </Text>

        <PageFooter />
      </Page>

      {/* ─── Sections 7–12 ─── */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        {/* 7. SALARY */}
        <Text style={styles.sectionTitle}>7. Salary</Text>
        <View style={styles.infoBox}>
          <Text style={styles.paragraph}>
            The Employee will be paid <Text style={styles.bold}>£{variables.hourlyRate} per hour</Text>.
          </Text>
        </View>
        <Text style={styles.paragraph}>
          Salary will be paid monthly in arrears through the Company's payroll system.
        </Text>
        <Text style={styles.paragraph}>
          Salary will be subject to deductions required by law including income tax and National Insurance.
        </Text>
        <Text style={styles.paragraph}>
          Any service charge or tips may be distributed separately according to Company policy.
        </Text>

        {/* 8. HOLIDAY ENTITLEMENT */}
        <Text style={styles.sectionTitle}>8. Holiday Entitlement</Text>
        <Text style={styles.paragraph}>
          The Employee is entitled to statutory holiday entitlement in accordance with UK law.
        </Text>
        <Text style={styles.paragraph}>
          This is equivalent to 5.6 weeks of paid holiday per year or accrued proportionally depending on hours worked.
        </Text>
        <Text style={styles.paragraph}>
          Holiday must be requested in advance and approved by management.
        </Text>

        {/* 9. SICKNESS */}
        <Text style={styles.sectionTitle}>9. Sickness</Text>
        <Text style={styles.paragraph}>
          Employees must notify the Company as soon as possible if they are unable to attend work due to illness.
        </Text>
        <Text style={styles.paragraph}>
          Notification must be made before the start of the scheduled shift whenever possible.
        </Text>
        <Text style={styles.paragraph}>
          If absence exceeds three consecutive days, a medical certificate may be required.
        </Text>

        {/* 10. ATTENDANCE */}
        <Text style={styles.sectionTitle}>10. Attendance</Text>
        <Text style={styles.paragraph}>
          Employees are expected to attend all scheduled shifts.
        </Text>
        <Text style={styles.paragraph}>
          Failure to attend a shift without valid reason may be treated as unauthorised absence and may result in disciplinary action.
        </Text>

        {/* 11. CONFIDENTIALITY */}
        <Text style={styles.sectionTitle}>11. Confidentiality</Text>
        <Text style={styles.paragraph}>
          Employees must not disclose confidential information relating to the Company including:
        </Text>
        {["recipes", "financial information", "operational procedures", "customer data", "business strategies"].map((item, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
        <Text style={styles.paragraph}>
          This obligation continues after employment ends.
        </Text>

        {/* 12. SECONDARY EMPLOYMENT */}
        <Text style={styles.sectionTitle}>12. Secondary Employment</Text>
        <Text style={styles.paragraph}>
          Employees must obtain written permission from the Company before undertaking other employment that could interfere with their duties or create a conflict of interest.
        </Text>

        <PageFooter />
      </Page>

      {/* ─── Sections 13–17 + Signatures ─── */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        {/* 13. DEDUCTIONS FROM WAGES */}
        <Text style={styles.sectionTitle}>13. Deductions from Wages</Text>
        <Text style={styles.paragraph}>
          The Company reserves the right to deduct from wages any sums owed to the Company including:
        </Text>
        {["salary overpayments", "training costs", "uniform costs", "losses caused by negligence"].map((item, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}

        {/* 14. DATA PROTECTION */}
        <Text style={styles.sectionTitle}>14. Data Protection</Text>
        <Text style={styles.paragraph}>
          The Company will process employee data in accordance with the UK GDPR and Data Protection Act 2018.
        </Text>

        {/* 15. DISCIPLINARY PROCEDURE */}
        <Text style={styles.sectionTitle}>15. Disciplinary Procedure</Text>
        <Text style={styles.paragraph}>
          Employees must comply with Company policies and procedures. Serious misconduct may result in disciplinary action including dismissal.
        </Text>
        <Text style={styles.paragraph}>
          Examples of gross misconduct include but are not limited to:
        </Text>
        {["theft", "violence", "harassment", "serious insubordination", "working while intoxicated", "breach of food safety regulations"].map((item, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}

        {/* 16. TERMINATION */}
        <Text style={styles.sectionTitle}>16. Termination</Text>
        <Text style={styles.paragraph}>
          After probation either party may terminate employment by providing notice of:
        </Text>
        <View style={styles.infoBox}>
          <Text style={styles.bold}>{variables.noticePeriod}</Text>
        </View>
        <Text style={styles.paragraph}>
          The Company reserves the right to make payment in lieu of notice where appropriate.
        </Text>

        {/* 17. ENTIRE AGREEMENT */}
        <Text style={styles.sectionTitle}>17. Entire Agreement</Text>
        <Text style={styles.paragraph}>
          This agreement constitutes the entire agreement between the Parties and supersedes any previous discussions or agreements.
        </Text>

        {/* ─── SIGNATURES ─── */}
        <View style={styles.signatureSection}>
          <View style={styles.divider} />
          <Text style={{ ...styles.sectionTitle, color: DARK }}>Signatures</Text>

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.bold}>Employer</Text>
              <Text>UD Restaurants Ltd</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Signature</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.bold}>Employee</Text>
              <Text>{variables.employeeName}</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Signature</Text>
            </View>
          </View>

          <Text style={{ ...styles.paragraph, marginTop: 20 }}>
            Date: ___________________
          </Text>
        </View>

        <PageFooter />
      </Page>
    </Document>
  );
}
