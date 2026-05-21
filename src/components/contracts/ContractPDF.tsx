import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ContractVariables } from "./contractTemplates";
import type { ContractType } from "./contractTemplates";
import { getEmploymentTypeLabel } from "./contractTemplates";
import {
  buildAppointmentReportingSentence,
  defaultFallbackReportingRole,
} from "@/lib/contract-appointment";

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
  subSectionTitle: {
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
  contractType?: ContractType;
  companyLegalName?: string;
  companyTradingName?: string;
  companyAddress?: string;
}

export function ContractPDF({
  variables,
  contractType = "foh",
  companyLegalName = "Your Company",
  companyTradingName,
  companyAddress,
}: ContractPDFProps) {
  const isManagement = contractType === "management" || contractType === "supervisor";
  const roleLabel = isManagement ? "Duty Manager" : "Team Member";
  const reportingTo = isManagement ? "the Operations Manager" : "the Front of House Manager";
  const appointmentReportingSentence = buildAppointmentReportingSentence({
    managerName: variables.reportingManagerName,
    managerTitle: variables.reportingManagerTitle,
    fallbackRole: defaultFallbackReportingRole(isManagement),
  });

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

  const BulletItem = ({ text }: { text: string }) => (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
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

      {/* ─── Preamble + Clauses 1-2 ─── */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        <Text style={styles.paragraph}>
          This Employment Agreement (hereinafter referred to as "Agreement") is made and entered into on the Effective Date, by and between:
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>{companyLegalName}</Text>
          {companyTradingName ? `, trading as "${companyTradingName}"` : ""}
          {companyAddress ? ` with registered office at ${companyAddress}` : ""}
          {" "}(hereinafter referred to as the "Company")
        </Text>
        <Text style={styles.paragraph}>and</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>{variables.employeeName}</Text>
          {variables.homeAddress ? `, residing at ${variables.homeAddress}` : ""}
          {` (hereinafter referred to as "${roleLabel}")`}
        </Text>
        <Text style={styles.paragraph}>
          The Company and the {roleLabel} shall hereinafter collectively be referred to as the "Parties" and individually as the "Party".
        </Text>

        <View style={styles.divider} />

        {/* 1. INTERPRETATION */}
        <Text style={styles.sectionTitle}>1. Interpretation</Text>
        <Text style={styles.subSectionTitle}>1.1 Definitions</Text>
        <Text style={styles.paragraph}>
          In this Agreement the following words and phrases shall have the meanings given below:
        </Text>
        <BulletItem text={`APPOINTMENT means the employment of the ${roleLabel} by the Company on the terms of this Agreement;`} />
        <BulletItem text="BUSINESS means the restaurant and food & beverage service business of the Company;" />
        <BulletItem text="EMPLOYMENT ACT means Employment Rights Act 1996;" />
        <BulletItem text="MANAGING DIRECTOR means the appointed Managing Director or replacement if applicable;" />
        <BulletItem text="OPERATIONS MANAGER means the appointed Operations Manager or replacement if applicable;" />
        <BulletItem text="REMUNERATION means the remuneration payable under Clause 7.1." />

        {/* 2. APPOINTMENT */}
        <Text style={styles.sectionTitle}>2. Appointment</Text>
        <Text style={styles.paragraph}>
          Upon and subject to the terms of the Appointment, the Company will from the Effective Date employ the Employee as{" "}
          <Text style={styles.bold}>{variables.jobTitle}</Text>, reporting to {reportingTo}, as the case may be.
        </Text>
        <Text style={styles.subSectionTitle}>
          The responsibilities of the {roleLabel} include, but are not limited to:
        </Text>

        {/* Role-specific responsibilities */}
        {isManagement ? (
          <>
            <Text style={styles.subSectionTitle}>Overall</Text>
            <BulletItem text="Acting with integrity and honesty, ensuring that the Company is a successful and reputable business" />
            <BulletItem text="Ensuring compliance with health & safety policies set by the Company" />
            <Text style={styles.subSectionTitle}>As {variables.jobTitle}</Text>
            <BulletItem text="Accept ownership of the business operations, ensuring best possible outcomes for all parties" />
            <BulletItem text="Manage and oversee entire restaurant operation" />
            <BulletItem text="Staff training and supervision" />
            <BulletItem text="Staff recruitment" />
            <BulletItem text="Organise and supervise shifts" />
            <BulletItem text="Work closely with management to maximise revenue and minimise costs" />
            <BulletItem text="Maintain safe working conditions" />
            <BulletItem text="Follow company policies and procedures" />
            <BulletItem text="Maintain all company property and equipment in perfect condition" />
            <BulletItem text="Sales analysis" />
            <BulletItem text="Support of all systems designed to streamline work processes" />
            <Text style={styles.subSectionTitle}>As Front of House</Text>
            <BulletItem text="Responding to customer queries and complaints" />
            <BulletItem text="Providing excellent customer service" />
          </>
        ) : contractType === "kitchen" ? (
          <>
            <Text style={styles.subSectionTitle}>Overall</Text>
            <BulletItem text="Acting with integrity and honesty at all times, ensuring the Company maintains its reputation" />
            <BulletItem text="Ensuring full compliance with health and safety policies and food safety regulations" />
            <Text style={styles.subSectionTitle}>Food Preparation and Kitchen Duties</Text>
            <BulletItem text="Ingredient preparation, dish assembly according to Head Chef's specifications" />
            <BulletItem text="Maintaining highest level of food quality and hygiene in line with all applicable legislation" />
            <BulletItem text="Maintenance of equipment owned or otherwise used by the Company" />
            <BulletItem text="Ensure basic cleaning jobs are carried out as quickly as possible" />
            <BulletItem text="Collect and wash up pots and pans" />
            <BulletItem text="Clean food preparation areas and equipment" />
            <BulletItem text="Unload food and equipment deliveries" />
            <BulletItem text="Keep the storeroom organized and tidy" />
            <BulletItem text="Keep work surfaces, walls and floors clean and sanitised" />
          </>
        ) : (
          <>
            <Text style={styles.subSectionTitle}>General Conduct and Compliance</Text>
            <BulletItem text="Acting with integrity and honesty at all times, ensuring the Company maintains its reputation" />
            <BulletItem text="Ensuring full compliance with health and safety policies and food safety regulations" />
            <BulletItem text="Acting as an ambassador for the Company, maintaining a professional demeanour" />
            <Text style={styles.subSectionTitle}>Food and Beverage Preparation and Service</Text>
            <BulletItem text="Assisting with the preparation of food items in accordance with the Company's specifications" />
            <BulletItem text="Serving food and beverages to customers efficiently and courteously" />
            <BulletItem text="Taking customer orders, ensuring accuracy and promptly communicating to the kitchen" />
            <Text style={styles.subSectionTitle}>Bar and Premises Maintenance</Text>
            <BulletItem text="Ensuring the bar area is consistently clean and tidy" />
            <BulletItem text="Keeping the staff and guest toilets, office, and storage rooms clean and organized" />
            <BulletItem text="Supervising and following up on the daily cleaning schedule" />
            <Text style={styles.subSectionTitle}>Administrative and Operational Support</Text>
            <BulletItem text="Completing daily FOH paperwork related to food orders, stock levels, and shift activities" />
            <BulletItem text="Assisting with inventory control by reporting stock levels" />
            <BulletItem text="Supporting opening and closing procedures" />
            <Text style={styles.subSectionTitle}>Customer Service</Text>
            <BulletItem text="Resolving customer queries and complaints promptly and professionally" />
            <BulletItem text="Assisting with training new staff when required" />
          </>
        )}

        <PageFooter />
      </Page>

      {/* ─── Clauses 3-6 ─── */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        {/* 3. TERM */}
        <Text style={styles.sectionTitle}>3. Term of the Agreement</Text>
        <Text style={styles.paragraph}>
          This Agreement shall be valid and binding from The Effective Date and shall remain in force on a permanent basis unless otherwise agreed during employment or terminated while observing the provisions of the Employment Act.
        </Text>

        {/* 4. DUTIES DURING APPOINTMENT */}
        <Text style={styles.sectionTitle}>4. Duties During the Appointment</Text>
        <Text style={styles.subSectionTitle}>4.1</Text>
        <Text style={styles.paragraph}>
          The {roleLabel} will (unless prevented by illness or injury) devote the whole of their working time, attention and abilities during the Appointment to the Business and will not without the prior written consent of {reportingTo} or the Managing Director, as the case may be, accept any other appointment, work for or be directly or indirectly engaged in or concerned with the conduct of any other business.
        </Text>
        <Text style={styles.subSectionTitle}>4.2</Text>
        <Text style={styles.paragraph}>
          During the Appointment the {roleLabel} will:
        </Text>
        <BulletItem text={`(a) loyally and diligently perform such duties and exercise such powers for the Business as ${reportingTo} or the Managing Director may from time to time reasonably require;`} />
        <BulletItem text="(b) promote and protect the interests of the Business and the Company, always giving it the full benefit of their knowledge, expertise and skill;" />
        <BulletItem text={`(c) keep ${reportingTo} and the Managing Director properly and regularly informed about the Business and their activities in it;`} />
        <BulletItem text={`(d) comply with the reasonable and lawful directions given from time to time by ${reportingTo} and the Managing Director;`} />
        <BulletItem text="(e) comply with the Company's Articles of Association, internal codes of conduct, and all relevant policies and co-operate with the Company in complying with its obligations on health and safety." />
        <Text style={styles.subSectionTitle}>4.3</Text>
        <Text style={styles.paragraph}>
          The {roleLabel} shall not engage in activities that would be unsuitable with their capacity as personnel of the Company and shall not act in a way that is in contradiction with interests of the Company.
        </Text>
        <Text style={styles.subSectionTitle}>4.4</Text>
        <Text style={styles.paragraph}>
          The {roleLabel} shall ensure that their conduct abides in all cases by the statutory and regulatory obligations imposed on the Company under the applicable laws and regulations in the United Kingdom.
        </Text>
        <Text style={styles.subSectionTitle}>4.5</Text>
        <Text style={styles.paragraph}>
          Unless they have the prior written consent of {reportingTo} and the Managing Director, the {roleLabel} will not directly or indirectly receive or retain any payment or benefit in respect of any business transacted by or on behalf of the Business.
        </Text>
        <Text style={styles.subSectionTitle}>4.6</Text>
        <Text style={styles.paragraph}>
          The {roleLabel} agrees to the Company holding and processing, both electronically and manually, personal data about them (including any sensitive personal data) for the operations, management, security and administration of the Company and complying with applicable data protection laws and regulations. The Company will not disclose personal data about the {roleLabel} outside the Company without their prior consent.
        </Text>

        {/* 5. PLACE OF PERFORMANCE */}
        <Text style={styles.sectionTitle}>5. Place of Performance</Text>
        {isManagement ? (
          <>
            <Text style={styles.paragraph}>
              The {roleLabel} shall perform their duties at any Company location. Current location is:
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.bold}>{variables.workLocation}</Text>
            </View>
            <Text style={styles.paragraph}>
              Cost of travel cannot be claimed within London but can be discussed should the employee be required to venture outside London or outside of the United Kingdom on Company business.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.paragraph}>
              The {roleLabel} shall perform their duties at the restaurant located at:
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.bold}>{variables.workLocation}</Text>
            </View>
            <Text style={styles.paragraph}>
              However, the {roleLabel} hereby accepts in advance that they may be required to work in another location within Greater London to meet the reasonable requirements of their position at the sole discretion of the Company.
            </Text>
          </>
        )}

        {/* 6. HOURS OF WORK */}
        <Text style={styles.sectionTitle}>6. Hours of Work</Text>
        {isManagement ? (
          <>
            <Text style={styles.paragraph}>
              It is understood that the {roleLabel} will work{" "}
              <Text style={styles.bold}>{variables.weeklyHours} hours a week</Text>.
            </Text>
            <Text style={styles.paragraph}>
              The {roleLabel} may choose to work more hours, as it may positively impact their salary through substitution of others' staff cost.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.paragraph}>
              The {roleLabel} shall work approximately{" "}
              <Text style={styles.bold}>{variables.weeklyHours} hours per week</Text>, with specific days and hours to be mutually agreed upon, based on the needs of the business.
            </Text>
            <Text style={styles.paragraph}>
              Due to the nature of the business, the required hours of work may vary, and the {roleLabel} acknowledges that, at times, they may be asked to work fewer or more hours based on operational requirements. Any changes to the agreed hours will be made with mutual consent and will be in line with the Employment Rights Act 1996.
            </Text>
          </>
        )}

        <PageFooter />
      </Page>

      {/* ─── Clauses 7-9 ─── */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        {/* 7. SALARY */}
        <Text style={styles.sectionTitle}>7. Salary and Other Benefits</Text>
        <Text style={styles.subSectionTitle}>7.1 Salary</Text>
        {(() => {
          const base = Number(variables.baseHourlyRate || variables.hourlyRate) || 0;
          const guaranteedSc = Number(variables.guaranteedServiceChargeRate) || 0;
          const estimatedSc = Number(variables.estimatedServiceChargeRate) || 0;
          const tronc = (variables.troncSchemeName || "").trim();
          const policy = (variables.serviceChargePolicyNote || "").trim();
          return (
            <>
              <Text style={styles.paragraph}>
                The Company will pay the {roleLabel} a base hourly rate from the Effective Date as set out below:
              </Text>
              <View style={styles.infoBox}>
                <Text style={styles.bold}>£{base.toFixed(2)} per hour (base hourly rate)</Text>
              </View>
              <Text style={styles.paragraph}>
                Your base hourly rate is £{base.toFixed(2)} per hour. This is your contractual hourly rate before any service charge, tronc payment, bonus, or discretionary payment.
              </Text>
              {guaranteedSc > 0 && (
                <Text style={styles.paragraph}>
                  In addition to your base hourly rate of £{base.toFixed(2)} per hour, you will receive a guaranteed service charge payment of £{guaranteedSc.toFixed(2)} per hour, where applicable. This service charge payment is separate from your base hourly rate and does not form part of the calculation for National Minimum Wage compliance.
                </Text>
              )}
              {estimatedSc > 0 && (
                <Text style={styles.paragraph}>
                  You may also receive service charge or tronc payments. The estimated service charge of £{estimatedSc.toFixed(2)} per hour shown in this contract is indicative only and is not guaranteed unless expressly stated as guaranteed. Service charge and tronc payments are separate from your base hourly rate and must not be used to satisfy National Minimum Wage.
                </Text>
              )}
              {tronc && (
                <Text style={styles.paragraph}>
                  Service charge or tronc payments may be administered under the following scheme: {tronc}. The rules of that scheme may be updated from time to time, subject to applicable law and company policy.
                </Text>
              )}
              {policy && (
                <Text style={styles.paragraph}>Service charge policy note: {policy}</Text>
              )}
              {isManagement && (
                <Text style={styles.paragraph}>
                  In addition to the base hourly rate, after the successful completion of the probation period, the {roleLabel} will be eligible for a performance bonus of up to £2,000 per year, subject to individual and company performance metrics as determined by the Company at its sole discretion. Any such bonus is separate from base pay and does not count toward National Minimum Wage compliance.
                </Text>
              )}
            </>
          );
        })()}
        <Text style={styles.subSectionTitle}>7.2 National Insurance</Text>
        <Text style={styles.paragraph}>
          The Company shall be responsible to withhold, where appropriate, and pay both the Company and the {roleLabel} national insurance contributions. National insurance contributions payable by the {roleLabel} shall be deducted from their salary.
        </Text>

        {/* 8. SICKNESS */}
        <Text style={styles.sectionTitle}>8. Sickness or Injury</Text>
        <Text style={styles.paragraph}>
          In the event that the {roleLabel} is unable to attend work due to sickness or injury, they must notify the Company as soon as possible, and no later than the start of their scheduled shift, stating the nature of their condition and the expected duration of their absence.
        </Text>
        <Text style={styles.paragraph}>
          If the {roleLabel}'s absence exceeds three consecutive working days, they are required to provide a fit note (or medical certificate) from a registered healthcare professional.
        </Text>
        <Text style={styles.paragraph}>
          Failure to provide a fit note within the required timeframe will result in the absence being treated as unauthorized, and the Company may withhold pay until satisfactory medical evidence is provided.
        </Text>

        {/* 9. HOLIDAYS */}
        <Text style={styles.sectionTitle}>9. Holidays</Text>
        {isManagement ? (
          <Text style={styles.paragraph}>
            The {roleLabel} will be entitled to 28 days of annual leave per year, including bank holidays. All holidays should be agreed with the Operations Manager in advance.
          </Text>
        ) : (
          <>
            <Text style={styles.paragraph}>
              The {roleLabel} is entitled to annual paid leave based on {variables.weeklyHours} hours of work per week. Annual leave will accrue on a pro-rata basis, at the rate of 1/12th of the annual entitlement for each complete month of full-time work during the holiday year.
            </Text>
            <Text style={styles.paragraph}>
              The {roleLabel} shall take their annual leave at mutually agreed times, subject to the operational needs of the Company, and in accordance with the provisions of the Employment Act and Company policy.
            </Text>
            <Text style={styles.paragraph}>
              Upon termination of the Appointment for any reason, the {roleLabel} will be entitled to a payment corresponding to the pro rata salary for each day of holiday accrued due but not taken. If they have taken holiday in excess of their accrued entitlement, the Company may deduct a day's salary for each excess day taken from any monies owed to them by the Company.
            </Text>
          </>
        )}

        <PageFooter />
      </Page>

      {/* ─── Clauses 10-12 + Signatures ─── */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        {/* 10. TERMINATION */}
        <Text style={styles.sectionTitle}>10. Termination</Text>
        <Text style={styles.subSectionTitle}>10.1</Text>
        {isManagement ? (
          <>
            <Text style={styles.paragraph}>
              Each Party may terminate the Agreement by serving a{" "}
              <Text style={styles.bold}>{variables.noticePeriod}</Text>{" "}
              prior written termination notice to the other party. A party failing to comply with the notification periods is required to pay to the other party an amount of compensation equal to the wage corresponding to the applicable notice period.
            </Text>
            <Text style={styles.paragraph}>
              It is agreed that the contract can be terminated at any time through mutual agreement of both parties.
            </Text>
            <Text style={styles.paragraph}>
              A probation period of{" "}
              <Text style={styles.bold}>{variables.probationPeriod}</Text>{" "}
              will also be in place. During this period, both parties can terminate the contract with one week's notice or immediately if agreed mutually.
            </Text>
            <Text style={styles.paragraph}>
              It is the employee's responsibility to inquire whether the probation period has been passed.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.paragraph}>
              Either Party may terminate this Agreement by providing{" "}
              <Text style={styles.bold}>{variables.noticePeriod}</Text>{" "}
              written notice to the other Party. If either Party fails to comply with the notice period, they will be required to pay the other Party an amount equal to the wage corresponding to the applicable notice period.
            </Text>
            <Text style={styles.paragraph}>
              Probation Period:{" "}
              <Text style={styles.bold}>{variables.probationPeriod}</Text>{" "}
              will be in place. During this period, either Party may terminate the contract without prior notice. It is the {roleLabel}'s responsibility to confirm whether the probation period has been successfully completed.
            </Text>
          </>
        )}
        <Text style={styles.subSectionTitle}>10.2</Text>
        <Text style={styles.paragraph}>
          Upon the termination of the Appointment the {roleLabel} will hand over to the Company all property belonging to the Company or relating to its business which may be in their possession or under their control, without keeping copies of any reproducible items or extracts and without having downloaded any information stored on any computer storage medium.
        </Text>
        <Text style={styles.subSectionTitle}>10.3</Text>
        <Text style={styles.paragraph}>
          After the termination of the Appointment the {roleLabel} will not at any time make any adverse, untrue or misleading statement about the Company or any Group Company or its officers or employees or represent themselves as being employed by or connected with the Company.
        </Text>

        {/* 11. CONFIDENTIALITY */}
        <Text style={styles.sectionTitle}>11. Confidentiality and Intellectual Property Rights</Text>
        <Text style={styles.paragraph}>
          The Company has and will have developed valuable technical and non-technical information for itself and its customers, which is safeguarded as trade secrets and confidential information and must be protected from direct or indirect disclosure. The {roleLabel} is expected to treat and shall receive and have access to confidential, proprietary and/or trade secret information concerning the Company, including but not limited to:
        </Text>
        {[
          "food recipes whether introduced by the Company or the Head Chef",
          "names, profiles and service need histories of clients",
          "the Company's marketing and business plans",
          "information about costs, profits and other financial matters",
          "information about the skills, expertise, experience and salaries of employees",
          "any document marked 'confidential'",
          "confidential or proprietary information of clients and other third parties",
        ].map((item, i) => (
          <BulletItem key={i} text={item} />
        ))}
        <Text style={styles.paragraph}>
          The {roleLabel} hereby undertakes and warrants that both during their employment and after termination thereof, they shall keep such Confidential Information in strict confidence at all times and will not disclose it to any third party and will not use it for any purpose other than as necessary and appropriate in carrying out their work for the Company.
        </Text>
        <Text style={styles.paragraph}>
          In case of breach of these confidentiality conditions, the Company may immediately terminate this Agreement in accordance with the Employment Act.
        </Text>

        <PageFooter />
      </Page>

      {/* ─── Clause 12 + Signatures ─── */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        {/* 12. NON-COMPETE */}
        <Text style={styles.sectionTitle}>12. Non-Compete</Text>
        {isManagement ? (
          <>
            <Text style={styles.subSectionTitle}>12.1</Text>
            <Text style={styles.paragraph}>
              The {roleLabel} accepts and undertakes that during the course of their employment in the Company, as well as for a period of two years after the termination of their employment in the Company, unless explicitly approved in writing by the Company, they shall not, directly or indirectly, carry on or be employed or self-employed, engaged or interested in any capacity in any business within the Greater London area which is directly competitive with the Company or having a similar concept with the Company's restaurant.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.subSectionTitle}>12.1</Text>
            <Text style={styles.paragraph}>
              The {roleLabel} undertakes to use their full working capacity exclusively for the Company. The acceptance of any additional work either paid or unpaid requires the explicit approval in writing by the Company. This does not include any commitments during the {roleLabel}'s days off.
            </Text>
            <Text style={styles.subSectionTitle}>12.2</Text>
            <Text style={styles.paragraph}>
              The {roleLabel} accepts and undertakes that during the course of their employment in the Company, as well as for a period of two years after the termination of their employment in the Company, unless explicitly approved in writing by the Company, they shall not, directly or indirectly, carry on or be employed or self-employed, engaged or interested in any capacity in any business within the Greater London area which is directly competitive with the Company or having a similar concept with the Company's restaurant.
            </Text>
          </>
        )}

        {/* ─── SIGNATURES ─── */}
        <View style={styles.signatureSection}>
          <View style={styles.divider} />
          <Text style={styles.paragraph}>
            IN WITNESS WHEREOF, the Parties hereto have executed this Agreement, the day and year written below, which shall be applicable as of its execution by both of the Parties.
          </Text>

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.bold}>Employer</Text>
              <Text>{companyLegalName}</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Signature</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.bold}>{roleLabel}</Text>
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
