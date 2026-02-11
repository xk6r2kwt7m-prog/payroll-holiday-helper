import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ContractVariables, ContractType } from "./contractTemplates";
import {
  getResponsibilities,
  getGeneralDuties,
  getReportingLine,
} from "./contractTemplates";

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
  // Cover page
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
    marginBottom: 6,
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
  // Section headers
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    color: TEAL,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 4,
    color: DARK,
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
  // Signature
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
  // Header bar for content pages
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
  // Footer
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
  // Info box
  infoBox: {
    backgroundColor: LIGHT_TEAL,
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
});

interface ContractPDFProps {
  variables: ContractVariables;
  contractType: ContractType;
}

export function ContractPDF({ variables, contractType }: ContractPDFProps) {
  const responsibilities = getResponsibilities(contractType);
  const generalDuties = getGeneralDuties(contractType);
  const reportingLine = getReportingLine(contractType);

  const PageHeader = () => (
    <View style={styles.pageHeader}>
      <Text style={styles.pageHeaderBrand}>UD RESTAURANTS LTD</Text>
      <Text style={styles.pageHeaderText}>Employment Agreement — {variables.employeeName}</Text>
    </View>
  );

  const PageFooter = () => (
    <View style={styles.footer} fixed>
      <Text>UD Restaurants Ltd — Confidential</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ marginTop: 160, alignItems: "center" }}>
          <Text style={styles.coverBrand}>UD RESTAURANTS LTD</Text>
          <Text style={styles.coverTitle}>Employment Agreement</Text>
          <View style={styles.coverLine} />

          <Text style={styles.coverLabel}>POSITION</Text>
          <Text style={styles.coverField}>{variables.jobTitle}</Text>

          <Text style={styles.coverLabel}>EMPLOYEE</Text>
          <Text style={styles.coverField}>{variables.employeeName}</Text>

          <Text style={styles.coverLabel}>EFFECTIVE DATE</Text>
          <Text style={styles.coverField}>
            {new Date(variables.effectiveDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>

          <Text style={styles.coverLabel}>LOCATION</Text>
          <Text style={styles.coverField}>{variables.workLocation}</Text>
        </View>
        <PageFooter />
      </Page>

      {/* Main Contract */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        <Text style={styles.paragraph}>
          This Employment Agreement (hereinafter referred to as "Agreement") is
          made and entered into on the date specified on the last page of the
          Agreement, by and between,
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>UD RESTAURANTS LTD</Text>, trading as "Ugly Dumpling" with registered office
          in 1 Newburgh St, London, W1F 7RB (hereinafter referred to as the
          "Company") and
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>THE EMPLOYEE</Text>, residing at {variables.homeAddress} (hereinafter referred
          to as "Team Member") in accordance with the following terms and
          conditions.
        </Text>
        <Text style={styles.paragraph}>
          The Company and the Team Member shall hereinafter collectively be
          referred to as the "Parties" and individually as the "Party".
        </Text>
        <Text style={styles.paragraph}>
          WHEREAS, the purpose of the Company is to develop "Ugly Dumpling"
          concept in London and turn it into a successful sit-down and takeaway
          business.
        </Text>
        <Text style={styles.paragraph}>It is agreed as follows:</Text>

        <Text style={styles.sectionTitle}>1. Interpretation</Text>
        <Text style={styles.subTitle}>1.1 Definitions</Text>
        <Text style={styles.paragraph}>
          In this Agreement the following words and phrases shall have the
          meanings given below:
        </Text>
        {[
          '"APPOINTMENT" means the employment of the Team Member by the Company on the terms of this Agreement;',
          '"BUSINESS" means the restaurant and food & beverage service business of the Company;',
          '"EMPLOYMENT ACT" means Employment Rights Act 1996;',
          '"OPERATIONS MANAGER" means Aderito Barros or appointed replacement if applicable;',
          '"MANAGING DIRECTOR" Philipp Chaykin or appointed replacement if applicable;',
          '"REMUNERATION" means the remuneration payable under Clause 7.1.',
        ].map((def, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{def}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>2. Appointment</Text>
        <View style={styles.infoBox}>
          <Text style={styles.paragraph}>
            Upon and subject to the terms of the Appointment, the Company will from
            the Effective Date employ the Employee as <Text style={styles.bold}>{variables.jobTitle}</Text>,{" "}
            {reportingLine}.
          </Text>
        </View>
        <Text style={styles.paragraph}>
          The responsibilities of the Team Member include, but are not limited
          to:
        </Text>

        {contractType === "foh" && (
          <>
            <Text style={styles.subTitle}>Overall Duties</Text>
            {generalDuties.map((duty, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{duty}</Text>
              </View>
            ))}
            <Text style={styles.subTitle}>Role Specifics</Text>
          </>
        )}
        {contractType === "kitchen" && (
          <Text style={styles.subTitle}>Key Responsibilities</Text>
        )}
        {responsibilities.map((resp, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{resp}</Text>
          </View>
        ))}
        {contractType === "kitchen" && (
          <>
            <Text style={styles.subTitle}>General Duties</Text>
            {generalDuties.map((duty, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{duty}</Text>
              </View>
            ))}
          </>
        )}
        <PageFooter />
      </Page>

      {/* Terms Page */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        <Text style={styles.sectionTitle}>3. Term of the Agreement</Text>
        <Text style={styles.paragraph}>
          This Agreement shall be valid and binding from The Effective Date and
          shall remain in force on the permanent basis unless otherwise agreed
          during employment or terminated while observing the provisions of the
          Employment Act.
        </Text>

        <Text style={styles.sectionTitle}>4. Duties During the Appointment</Text>
        <Text style={styles.paragraph}>
          4.1 The Team Member will (unless prevented by illness or injury)
          devote the whole of their working time, attention and abilities during
          the Appointment to the Business and will not without the prior written
          consent of the Operations Manager or the Managing Director, as the
          case may be, accept any other appointment, work for or be directly or
          indirectly engaged in or concerned with the conduct of any other
          business.
        </Text>
        <Text style={styles.paragraph}>
          4.2 During the Appointment the Team Member will loyally and diligently
          perform such duties and exercise such powers for the Business as
          required; promote and protect the interests of the Business; keep the
          management properly informed; comply with reasonable and lawful
          directions; and comply with internal codes of conduct, policies and
          health and safety obligations.
        </Text>
        <Text style={styles.paragraph}>
          4.3 The Team Member shall not engage in activities that would be
          unsuitable with their capacity as personnel of the Company.
        </Text>
        <Text style={styles.paragraph}>
          4.4 The Team Member shall ensure that their conduct abides by
          statutory and regulatory obligations under applicable UK laws.
        </Text>
        <Text style={styles.paragraph}>
          4.5 Unless they have prior written consent, the Team Member will not
          directly or indirectly receive or retain any payment or benefit in
          respect of any business transacted by or on behalf of the Business.
        </Text>
        <Text style={styles.paragraph}>
          4.6 The Team Member agrees to the Company holding and processing
          personal data in compliance with UK GDPR and Data Protection Act 2018.
        </Text>

        <Text style={styles.sectionTitle}>5. Place of Performance</Text>
        <View style={styles.infoBox}>
          <Text style={styles.paragraph}>
            The Team Member shall perform their duties at: <Text style={styles.bold}>{variables.workLocation}</Text>.
          </Text>
        </View>
        <Text style={styles.paragraph}>
          However, the Team Member hereby accepts that they may be required to
          work in another location within Greater London at the sole discretion
          of the Company.
        </Text>

        <Text style={styles.sectionTitle}>6. Hours of Work</Text>
        <Text style={styles.paragraph}>
          The Team Member shall work on days and during hours to be mutually
          agreed between the Parties, taking into account the operational needs
          of the Business and in accordance with the Employment Rights Act 1996.
          The expected average working hours shall be approximately{" "}
          <Text style={styles.bold}>{variables.weeklyHours} hours per week</Text>.
        </Text>
        <Text style={styles.paragraph}>
          Due to the nature of the hospitality industry, working hours may vary
          from week to week depending on business demands.
        </Text>
        <PageFooter />
      </Page>

      {/* Salary, Holiday, Termination */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        <Text style={styles.sectionTitle}>7. Salary and Other Benefits</Text>
        <Text style={styles.subTitle}>7.1 Salary</Text>
        <View style={styles.infoBox}>
          <Text style={styles.paragraph}>
            The Company will pay to the Team Member a salary from the Effective
            Date in the amount of <Text style={styles.bold}>£{variables.hourlyRate} per hour</Text> (including
            service charge, which is paid separately and is not used to meet
            minimum wage obligations).
          </Text>
        </View>
        <Text style={styles.paragraph}>
          The Salary will be payable by equal monthly instalments in arrears and
          will be subject to such deductions as may be required by law.
        </Text>
        <Text style={styles.paragraph}>
          Any increase in salary is related to both Company and individual
          performance and is at the sole discretion of the Company.
        </Text>
        <Text style={styles.paragraph}>
          The Team Member acknowledges and agrees that their salary is a
          confidential matter.
        </Text>

        <Text style={styles.subTitle}>7.2 National Insurance</Text>
        <Text style={styles.paragraph}>
          The Company shall be responsible to withhold, where appropriate, and
          pay both the Company and the Team Member national insurance
          contributions.
        </Text>

        <Text style={styles.sectionTitle}>8. Sickness or Injury</Text>
        <Text style={styles.paragraph}>
          In the event of absence or lateness, the Team Member must notify the
          Company without delay. If absence exceeds 3 working days, a medical
          report must be provided.
        </Text>

        <Text style={styles.sectionTitle}>9. Holidays</Text>
        <Text style={styles.paragraph}>
          The Team Member shall be entitled to annual paid leave calculated based
          on {variables.weeklyHours} hours of work per week. The Team Member
          shall accrue annual holidays on the basis of 1/12th of the annual
          entitlement for each complete month of work in the holiday year.
        </Text>
        <Text style={styles.paragraph}>
          Holiday shall be taken at times mutually convenient to the Company and
          the Team Member, according to the Employment Act and Company policy.
        </Text>
        <Text style={styles.paragraph}>
          On termination, the Team Member will be entitled to payment for
          accrued but untaken holiday. If holiday has been taken in excess, the
          Company may deduct accordingly.
        </Text>

        <Text style={styles.sectionTitle}>10. Termination</Text>
        <View style={styles.infoBox}>
          <Text style={styles.paragraph}>
            10.1 Each Party may terminate the Agreement by serving{" "}
            <Text style={styles.bold}>{variables.noticePeriod}</Text> prior written termination notice. A probation period of{" "}
            <Text style={styles.bold}>{variables.probationPeriod}</Text> will be in place. During this period, both parties can terminate with reduced notice.
          </Text>
        </View>
        <Text style={styles.paragraph}>
          10.2 Upon termination, the Team Member will hand over all Company
          property and not retain copies.
        </Text>
        <Text style={styles.paragraph}>
          10.3 After termination, the Team Member will not make adverse or untrue
          statements about the Company.
        </Text>
        <PageFooter />
      </Page>

      {/* Confidentiality, Non-Compete, Signatures */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        <Text style={styles.sectionTitle}>
          11. Confidentiality and Intellectual Property
        </Text>
        <Text style={styles.paragraph}>
          The Team Member shall keep all Confidential Information in strict
          confidence at all times, both during employment and after termination,
          and will not disclose it to any third party or use it for any purpose
          other than carrying out their work for the Company. This includes food
          recipes, client information, marketing plans, financial matters, and
          employee information.
        </Text>
        <Text style={styles.paragraph}>
          This restriction shall not apply to information that becomes public
          knowledge or was known prior to disclosure.
        </Text>
        <Text style={styles.paragraph}>
          Breach of confidentiality may result in immediate termination.
        </Text>

        <Text style={styles.sectionTitle}>12. Non-Compete</Text>
        <Text style={styles.paragraph}>
          12.1 The Team Member undertakes to use their full working capacity
          exclusively for the Company. Additional work requires explicit written
          approval.
        </Text>
        <Text style={styles.paragraph}>
          12.2 The Team Member undertakes that during employment and for two
          years after termination, they shall not be engaged in any directly
          competitive business within Greater London.
        </Text>

        <View style={styles.signatureSection}>
          <Text style={styles.paragraph}>
            IN WITNESS WHEREOF, the Parties hereto have executed this Agreement.
          </Text>

          <Text style={{ ...styles.paragraph, marginTop: 10 }}>
            Date: ___________________
          </Text>

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.bold}>UD RESTAURANTS LTD</Text>
              <Text>By: Aderito P. Barros</Text>
              <Text>Title: Operations Manager</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Signature</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.bold}>Team Member</Text>
              <Text>{variables.employeeName}</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Signature</Text>
            </View>
          </View>
        </View>
        <PageFooter />
      </Page>

      {/* Additional Clauses */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        <Text style={styles.sectionTitle}>Pension Enrolment</Text>
        <Text style={styles.paragraph}>
          You will be automatically enrolled into a qualifying workplace pension
          scheme if eligible, in accordance with the Pensions Act 2008.
        </Text>

        <Text style={styles.sectionTitle}>
          Grievance and Disciplinary Procedures
        </Text>
        <Text style={styles.paragraph}>
          You are subject to the Company's grievance and disciplinary procedures,
          updated as necessary in accordance with UK employment law.
        </Text>

        <Text style={styles.sectionTitle}>Right to Work</Text>
        <Text style={styles.paragraph}>
          Your employment is subject to confirmation that you have the legal
          right to work in the United Kingdom.
        </Text>

        <Text style={styles.sectionTitle}>
          Holiday Entitlement (Clarification)
        </Text>
        <Text style={styles.paragraph}>
          This includes your statutory entitlement under the Working Time
          Regulations 1998, currently 5.6 weeks' paid leave (inclusive of public
          holidays), pro rata.
        </Text>

        {contractType === "kitchen" && (
          <>
            <Text style={styles.sectionTitle}>Uniform and Dress Code</Text>
            <Text style={styles.paragraph}>
              You are required to wear the uniform provided by the Company while
              on duty and to maintain its cleanliness and presentation.
            </Text>

            <Text style={styles.sectionTitle}>
              Training and Certification
            </Text>
            <Text style={styles.paragraph}>
              You agree to undertake any reasonable training required for the
              role, including food hygiene, safety, allergen management, and
              first aid.
            </Text>

            <Text style={styles.sectionTitle}>Performance Reviews</Text>
            <Text style={styles.paragraph}>
              You will be subject to regular performance reviews and development
              meetings.
            </Text>

            <Text style={styles.sectionTitle}>
              Service Charge and Minimum Wage Guarantee
            </Text>
            <Text style={styles.paragraph}>
              Your basic rate of pay will always meet or exceed the National
              Minimum Wage as set by UK law.
            </Text>

            <Text style={styles.sectionTitle}>
              Notice Period Post-Probation
            </Text>
            <Text style={styles.paragraph}>
              Following successful completion of the probation period, the
              notice period required from either party shall remain{" "}
              {variables.noticePeriod}, unless otherwise agreed in writing.
            </Text>
          </>
        )}
        <PageFooter />
      </Page>
    </Document>
  );
}