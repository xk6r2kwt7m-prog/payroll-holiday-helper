import type { ContractVariables } from "./contractTemplates";
import type { ContractType } from "./contractTemplates";
import {
  buildAppointmentReportingSentence,
  defaultFallbackReportingRole,
} from "@/lib/contract-appointment";

// ─── Audit Flags ───
export type ClauseFlag =
  | "review_recommended"
  | "role_specific_gap"
  | "legal_minimum_only"
  | "hardcoded_value"
  | "source_mismatch"     // app wording differs from uploaded original
  | "not_in_original"     // clause exists in app but not in uploaded originals
  | "wording_risk";       // legal wording that should be manually reviewed

export type SourceFidelity = "exact" | "partial" | "missing" | "app_addition";

export interface ClauseDefinition {
  id: string;
  /** Clause number as it appears in the original contracts */
  number: string;
  title: string;
  hasEmployeeValues: boolean;
  isRoleSpecific: boolean;
  flags: { type: ClauseFlag; note: string }[];
  keyTerms?: string[];
  /** How closely this matches the uploaded original contracts */
  sourceFidelity: SourceFidelity;
  /** Sub-clauses in the original */
  subClauses?: string[];
}

// ─── Original 12-clause structure from uploaded contracts ───
// Matches: Chloe Cook (Duty Manager, Sep 2024), Heidy Vallejos (Team Member, Dec 2021), Ruben Pereira (Team Member, Dec 2024)

export const CONTRACT_CLAUSES: ClauseDefinition[] = [
  {
    id: "interpretation",
    number: "1",
    title: "Interpretation",
    hasEmployeeValues: false,
    isRoleSpecific: true,
    sourceFidelity: "missing",
    subClauses: ["1.1 Definitions"],
    flags: [
      {
        type: "source_mismatch",
        note: "Original contracts include a definitions section (Appointment, Business, Employment Act, Managing Director, Operations Manager/General Manager, Remuneration). This is entirely missing from the app.",
      },
      {
        type: "role_specific_gap",
        note: "Duty Manager contract defines 'Operations Manager' as reporting line. Team Member contracts use either 'General Manager' (older) or 'Operations Manager' (newer).",
      },
    ],
  },
  {
    id: "appointment",
    number: "2",
    title: "Appointment",
    hasEmployeeValues: true,
    isRoleSpecific: true,
    sourceFidelity: "partial",
    keyTerms: ["Job Title"],
    flags: [
      {
        type: "role_specific_gap",
        note: "Original Duty Manager contract lists detailed responsibilities under 'Overall', 'As Duty Manager', 'As Front of House', and 'As Chef' headings. Team Member contracts list responsibilities under 'Overall', 'Food Preparation', 'Bar/Premises Maintenance', 'Administrative', and 'Customer Service'. The app uses a single generic duties clause for all roles.",
      },
      {
        type: "source_mismatch",
        note: "Originals specify the reporting line (e.g., 'reporting to the Operations Manager'). The app omits this entirely.",
      },
    ],
  },
  {
    id: "term",
    number: "3",
    title: "Term of the Agreement",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    sourceFidelity: "missing",
    flags: [
      {
        type: "source_mismatch",
        note: "Original clause states the agreement remains 'in force on a permanent basis unless otherwise agreed during employment or terminated while observing the provisions of the Employment Act'. This clause is entirely missing from the app.",
      },
    ],
  },
  {
    id: "duties",
    number: "4",
    title: "Duties During the Appointment",
    hasEmployeeValues: false,
    isRoleSpecific: true,
    sourceFidelity: "missing",
    subClauses: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"],
    flags: [
      {
        type: "source_mismatch",
        note: "Original contracts contain 6 detailed sub-clauses covering: exclusive service obligation (4.1), loyalty/diligence duties (4.2), conduct restrictions (4.3), regulatory compliance (4.4), no undisclosed benefits (4.5), and data protection consent (4.6). All missing from app.",
      },
      {
        type: "role_specific_gap",
        note: "Duty Manager reports to 'Managing Director' in clause 4.1. Team Member reports to 'General Manager' or 'Operations Manager'. Duty Manager has additional sub-clause 4.2 about promoting business interests.",
      },
      {
        type: "wording_risk",
        note: "Clause 4.6 references 'Data Protection Act of 1998' which has been superseded by GDPR/DPA 2018. This appears in both originals and should be updated.",
      },
    ],
  },
  {
    id: "place_of_work",
    number: "5",
    title: "Place of Performance",
    hasEmployeeValues: true,
    isRoleSpecific: true,
    sourceFidelity: "partial",
    keyTerms: ["Work Location"],
    flags: [
      {
        type: "role_specific_gap",
        note: "Duty Manager: 'shall perform their duties at any Ugly Dumpling location' with current location listed. Team Member: 'shall perform their duties at the restaurant located at [specific address]' with mobility clause. Different wording, same effect.",
      },
      {
        type: "source_mismatch",
        note: "Original Duty Manager contract includes travel expense clause: 'Cost of travel cannot be claimed within London but can be discussed should Duty Manager required to venture outside London'. Missing from app.",
      },
      {
        type: "hardcoded_value",
        note: "'Greater London' is hardcoded as the mobility clause area in both originals and the app. Should be configurable per tenant.",
      },
    ],
  },
  {
    id: "hours",
    number: "6",
    title: "Hours of Work",
    hasEmployeeValues: true,
    isRoleSpecific: true,
    sourceFidelity: "partial",
    keyTerms: ["Weekly Hours"],
    flags: [
      {
        type: "role_specific_gap",
        note: "Duty Manager: 'will work 40 hours a week' (fixed) with clause about working more hours to 'positively impact salary through substitution of others' staff cost'. Team Member (Heidy): 'vary according to specific needs'. Team Member (Ruben): 'approximately 40 hours per week' with flexibility. App uses generic rota-based wording for all.",
      },
      {
        type: "source_mismatch",
        note: "App adds 'rota system' and 'shift changes' sections (clauses 5-6 in app) that do not exist in any original contract.",
      },
    ],
  },
  {
    id: "salary",
    number: "7",
    title: "Salary and Other Benefits",
    hasEmployeeValues: true,
    isRoleSpecific: true,
    sourceFidelity: "partial",
    subClauses: ["7.1 Salary", "7.2 National Insurance"],
    keyTerms: ["Hourly Rate"],
    flags: [
      {
        type: "role_specific_gap",
        note: "Duty Manager contract includes: performance bonus up to £2,000/year (monthly distribution), 'including service charge element'. Team Member (Ruben): 'includes a guaranteed service charge'. Team Member (Heidy): 'including service charge'. App omits bonus and varies service charge wording.",
      },
      {
        type: "source_mismatch",
        note: "Original contracts include 7.2 National Insurance sub-clause about company withholding and paying both employer and employee NI. App omits this entirely.",
      },
      {
        type: "source_mismatch",
        note: "Originals include salary confidentiality clause: 'salary is a confidential matter that cannot be disclosed to other parties'. Missing from app.",
      },
    ],
  },
  {
    id: "sickness",
    number: "8",
    title: "Sickness or Injury",
    hasEmployeeValues: false,
    isRoleSpecific: true,
    sourceFidelity: "partial",
    flags: [
      {
        type: "role_specific_gap",
        note: "Ruben's contract (2024) has significantly more detailed sickness wording: fit note requirements, unauthorized absence consequences, right to request second medical opinion, monitoring of repeated absences. Heidy's (2021) and Chloe's contracts are shorter. App uses minimal wording.",
      },
      {
        type: "legal_minimum_only",
        note: "No mention of SSP entitlement in originals or app. ERA 1996 s.1 requires written particulars to include sickness terms.",
      },
    ],
  },
  {
    id: "holiday",
    number: "9",
    title: "Holidays",
    hasEmployeeValues: false,
    isRoleSpecific: true,
    sourceFidelity: "partial",
    keyTerms: ["Holiday"],
    flags: [
      {
        type: "role_specific_gap",
        note: "Duty Manager: '28 days of annual leave per year, including bank holiday. All holidays should be agreed with the Operations Manager in advance.' Team Member: 28 days based on full-time year, pro-rata accrual at 1/12th per month, includes termination pay/deduction clauses. App uses generic statutory wording.",
      },
      {
        type: "source_mismatch",
        note: "Original Team Member contracts include detailed termination holiday pay calculation (pro-rata payment for untaken, deduction for excess taken). Missing from app.",
      },
    ],
  },
  {
    id: "termination",
    number: "10",
    title: "Termination",
    hasEmployeeValues: true,
    isRoleSpecific: true,
    sourceFidelity: "partial",
    subClauses: ["10.1 Notice", "10.2 Return of Property", "10.3 Post-Termination Conduct"],
    keyTerms: ["Notice Period", "Probation Period"],
    flags: [
      {
        type: "role_specific_gap",
        note: "Duty Manager: 3-week notice, 2-month probation with 1-week notice. Team Member (Heidy): 1-month notice, 1-month probation with 1-week notice. Team Member (Ruben): 2-week notice, 1-month probation with no notice required. App uses a single configurable notice period but doesn't reflect the different probation terms per role.",
      },
      {
        type: "source_mismatch",
        note: "Originals include 10.2 (return all company property, no copies/downloads) and 10.3 (no adverse statements, no representing as still employed). App omits both sub-clauses entirely.",
      },
      {
        type: "wording_risk",
        note: "Duty Manager: 'It is the employee's responsibility to inquire whether the probation period has been passed.' This places burden on employee — may be considered unfair. Present in originals but worth reviewing.",
      },
    ],
  },
  {
    id: "confidentiality",
    number: "11",
    title: "Confidentiality and Intellectual Property Rights",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    sourceFidelity: "partial",
    flags: [
      {
        type: "source_mismatch",
        note: "Originals contain detailed confidentiality wording covering: food recipes, customer data, marketing plans, financial info, salary info, employee skills data, plus IP assignment. App has a simplified bullet-point list only. Originals also include: obligation survives termination, breach = immediate termination, exceptions for public knowledge.",
      },
      {
        type: "wording_risk",
        note: "Original wording is identical for Duty Manager and Team Member — both get full access-to-trade-secrets language. This is unusually broad for Team Members who may not actually access financial or strategic data.",
      },
    ],
  },
  {
    id: "non_compete",
    number: "12",
    title: "Non-Compete",
    hasEmployeeValues: false,
    isRoleSpecific: true,
    sourceFidelity: "missing",
    subClauses: ["12.1 Exclusivity", "12.2 Non-Compete Restriction"],
    flags: [
      {
        type: "source_mismatch",
        note: "Original contracts include a 2-year non-compete within Greater London for businesses 'directly competitive with the Company or having a similar concept'. App replaces this entire clause with a generic 'Secondary Employment' clause about written permission. The originals are materially different.",
      },
      {
        type: "role_specific_gap",
        note: "Team Member contracts include 12.1 exclusivity clause ('use their full working capacity exclusively for the Company') PLUS 12.2 non-compete. Duty Manager contract has only the non-compete (no separate exclusivity sub-clause). This is inconsistent.",
      },
      {
        type: "wording_risk",
        note: "2-year non-compete restriction for Team Members may be unenforceable under UK case law. Post-termination restrictions must be reasonable and proportionate. A 2-year non-compete for a kitchen porter or waiter is likely excessive. Recommend legal review.",
      },
    ],
  },
];

// ─── App-Added Clauses (exist in app but NOT in any original contract) ───

export interface AppAddedClause {
  id: string;
  number: string;
  title: string;
  note: string;
}

export const APP_ADDED_CLAUSES: AppAddedClause[] = [
  {
    id: "rota",
    number: "A1",
    title: "Rota and Shift Changes",
    note: "Not present in any original contract. Added by the app. Reasonable addition for hospitality but not source-aligned.",
  },
  {
    id: "communication",
    number: "A2",
    title: "Communication",
    note: "Not present in any original contract. Added by the app.",
  },
  {
    id: "attendance",
    number: "A3",
    title: "Attendance",
    note: "Not present in any original contract. Added by the app.",
  },
  {
    id: "deductions",
    number: "A4",
    title: "Deductions from Wages",
    note: "Not present in any original contract. Added by the app. Note: ERA 1996 s.13 restricts deductions — wording should be reviewed.",
  },
  {
    id: "data_protection",
    number: "A5",
    title: "Data Protection",
    note: "Original contracts reference DPA 1998 within clause 4.6 (Duties). App has a separate standalone clause referencing GDPR/DPA 2018. The app version is more current but structurally different.",
  },
  {
    id: "disciplinary",
    number: "A6",
    title: "Disciplinary Procedure",
    note: "Not present in any original contract. Recommended addition under ERA 1996 s.1(4)(d).",
  },
  {
    id: "entire_agreement",
    number: "A7",
    title: "Entire Agreement",
    note: "Not present in any original contract. Standard boilerplate addition.",
  },
];

// ─── Missing from both app AND originals (legally expected) ───

export interface MissingClause {
  title: string;
  reason: string;
  severity: "recommended" | "legally_required" | "best_practice";
}

export const MISSING_CLAUSES: MissingClause[] = [
  {
    title: "Grievance Procedure",
    reason: "ERA 1996 s.1(4)(d) requires written particulars to reference disciplinary AND grievance procedures. Missing from both originals and app.",
    severity: "legally_required",
  },
  {
    title: "Pension / Auto-Enrolment",
    reason: "Pensions Act 2008 requires employers to auto-enrol eligible workers. Missing from both originals and app.",
    severity: "legally_required",
  },
  {
    title: "Collective Agreements",
    reason: "ERA 1996 s.1(4)(j) requires written particulars to state whether any collective agreements apply. Missing from both originals and app.",
    severity: "legally_required",
  },
];

// ─── Role-Specific Content Blocks ───

export interface ContentBlock {
  type: "paragraph" | "highlight" | "bullets" | "subheading";
  text?: string;
  items?: string[];
}

/**
 * Returns the clause content for a given clause ID, contract type, and employee variables.
 * Content is aligned to the original uploaded contracts where possible.
 * Where the app has added clauses not in originals, those are clearly marked.
 */
export function getClauseContent(
  clauseId: string,
  v: ContractVariables,
  contractType: ContractType
): ContentBlock[] {
  const isManagement = contractType === "management" || contractType === "supervisor";
  const isDutyManager = contractType === "management";
  const roleLabel = isManagement ? "Duty Manager" : "Team Member";
  const reportingTo = isManagement ? "the Operations Manager" : "the Front of House Manager";
  const appointmentReportingSentence = buildAppointmentReportingSentence({
    managerName: v.reportingManagerName,
    managerTitle: v.reportingManagerTitle,
    fallbackRole: defaultFallbackReportingRole(isManagement),
  });

  switch (clauseId) {
    // ─── 1. INTERPRETATION ───
    case "interpretation":
      return [
        { type: "subheading", text: "1.1 Definitions" },
        { type: "paragraph", text: "In this Agreement the following words and phrases shall have the meanings given below:" },
        { type: "bullets", items: [
          `APPOINTMENT means the employment of the ${roleLabel} by the Company on the terms of this Agreement;`,
          "BUSINESS means the restaurant and food & beverage service business of the Company;",
          "EMPLOYMENT ACT means Employment Rights Act 1996;",
          `MANAGING DIRECTOR means the appointed Managing Director or replacement if applicable;`,
          `OPERATIONS MANAGER means the appointed Operations Manager or replacement if applicable;`,
          "REMUNERATION means the remuneration payable under Clause 7.1.",
        ]},
      ];

    // ─── 2. APPOINTMENT ───
    case "appointment":
      if (isManagement) {
        return [
          { type: "paragraph", text: `Upon and subject to the terms of the Appointment, the Company will from the Effective Date employ the Employee as ${v.jobTitle}.` },
          { type: "paragraph", text: appointmentReportingSentence },
          { type: "subheading", text: `The responsibilities of the ${roleLabel} include, but are not limited to:` },
          { type: "subheading", text: "Overall" },
          { type: "bullets", items: [
            "Acting with integrity and honesty, ensuring that the Company is a successful and reputable business",
            "Ensuring compliance with health & safety policies set by the Company",
          ]},
          { type: "subheading", text: `As ${v.jobTitle}` },
          { type: "bullets", items: [
            "Accept ownership of the business operations, ensuring best possible outcomes for all parties",
            "Manage and oversee entire restaurant operation",
            "Staff training and supervision",
            "Staff recruitment",
            "Organise and supervise shifts",
            "Work closely with management to maximise revenue and minimise costs",
            "Maintain safe working conditions",
            "Follow company policies and procedures",
            "Maintain all company property and equipment in perfect condition",
            "Sales analysis",
            "Support of all systems designed to streamline work processes",
          ]},
          { type: "subheading", text: "As Front of House" },
          { type: "bullets", items: [
            "Responding to customer queries and complaints",
            "Providing excellent customer service",
          ]},
        ];
      } else {
        // Team Member — FOH vs Kitchen
        const isKitchen = contractType === "kitchen";
        return [
          { type: "paragraph", text: `Upon and subject to the terms of the Appointment, the Company will from the Effective Date employ the Employee as ${v.jobTitle}.` },
          { type: "paragraph", text: appointmentReportingSentence },
          { type: "subheading", text: `The responsibilities of the ${roleLabel} include, but are not limited to:` },
          { type: "subheading", text: "General Conduct and Compliance" },
          { type: "bullets", items: [
            "Acting with integrity and honesty at all times, ensuring that the Company maintains its reputation as a successful and reputable business",
            "Ensuring full compliance with health and safety policies set by the Company and adhering to all food safety and hygiene regulations",
            "Acting as an ambassador for the Company, maintaining a professional demeanour with both guests and colleagues",
          ]},
          ...(isKitchen ? [
            { type: "subheading" as const, text: "Food Preparation and Kitchen Duties" },
            { type: "bullets" as const, items: [
              "Ingredient preparation, dish assembly according to Head Chef's specifications",
              "Maintaining highest level of food quality and hygiene in line with all applicable legislation",
              "Maintenance of equipment owned or otherwise used by the Company",
              "Ensure basic cleaning jobs are carried out as quickly as possible",
              "Collect and wash up pots and pans",
              "Clean food preparation areas and equipment, in addition to crockery and cutlery",
              "Unload food and equipment deliveries",
              "Keep the storeroom organized and tidy",
              "Keep work surfaces, walls and floors clean and sanitised",
            ]},
          ] : [
            { type: "subheading" as const, text: "Food and Beverage Preparation and Service" },
            { type: "bullets" as const, items: [
              "Assisting with the preparation of food items in accordance with the Company's specifications",
              "Serving food and beverages to customers efficiently and courteously",
              "Taking customer orders, ensuring accuracy and promptly communicating to the kitchen and bar teams",
            ]},
            { type: "subheading" as const, text: "Bar and Premises Maintenance" },
            { type: "bullets" as const, items: [
              "Ensuring the bar area is consistently clean and tidy",
              "Keeping the staff and guest toilets, office, and storage rooms clean and organized",
              "Supervising and following up on the daily cleaning schedule",
            ]},
            { type: "subheading" as const, text: "Administrative and Operational Support" },
            { type: "bullets" as const, items: [
              "Completing daily FOH paperwork related to food orders, stock levels, and shift activities",
              "Assisting with inventory control by reporting stock levels and replenishing items as necessary",
              "Supporting opening and closing procedures",
            ]},
            { type: "subheading" as const, text: "Customer Service" },
            { type: "bullets" as const, items: [
              "Resolving customer queries and complaints promptly and professionally",
              "Assisting with training new staff when required",
            ]},
          ]),
        ];
      }

    // ─── 3. TERM ───
    case "term":
      return [
        { type: "paragraph", text: "This Agreement shall be valid and binding from The Effective Date and shall remain in force on a permanent basis unless otherwise agreed during employment or terminated while observing the provisions of the Employment Act." },
      ];

    // ─── 4. DUTIES DURING APPOINTMENT ───
    case "duties":
      return [
        { type: "paragraph", text: `The ${roleLabel} will (unless prevented by illness or injury) devote the whole of their working time, attention and abilities during the Appointment to the Business and will not without the prior written consent of ${reportingTo} or the Managing Director, as the case may be, accept any other appointment, work for or be directly or indirectly engaged in or concerned with the conduct of any other business.` },
        { type: "subheading", text: "4.2" },
        { type: "paragraph", text: `During the Appointment the ${roleLabel} will:` },
        { type: "bullets", items: [
          `(a) loyally and diligently perform such duties and exercise such powers for the Business as ${reportingTo} or the Managing Director may from time to time reasonably require;`,
          "(b) promote and protect the interests of the Business and the Company, always giving it the full benefit of their knowledge, expertise and skill;",
          `(c) keep ${reportingTo} and the Managing Director properly and regularly informed about the Business and their activities in it;`,
          `(d) comply with the reasonable and lawful directions given from time to time by ${reportingTo} and the Managing Director;`,
          "(e) comply with the Company's Articles of Association, internal codes of conduct, and all relevant policies and co-operate with the Company in complying with its obligations on health and safety.",
        ]},
        { type: "subheading", text: "4.3" },
        { type: "paragraph", text: `The ${roleLabel} shall not engage in activities that would be unsuitable with their capacity as personnel of the Company and shall not act in a way that is in contradiction with interests of the Company.` },
        { type: "subheading", text: "4.4" },
        { type: "paragraph", text: `The ${roleLabel} shall ensure that their conduct abides in all cases by the statutory and regulatory obligations imposed on the Company under the applicable laws and regulations in the United Kingdom.` },
        { type: "subheading", text: "4.5" },
        { type: "paragraph", text: `Unless they have the prior written consent of ${reportingTo} and the Managing Director, the ${roleLabel} will not directly or indirectly receive or retain any payment or benefit in respect of any business transacted by or on behalf of the Business.` },
        { type: "subheading", text: "4.6" },
        { type: "paragraph", text: `The ${roleLabel} agrees to the Company holding and processing, both electronically and manually, personal data about them (including any sensitive personal data) for the operations, management, security and administration of the Company and complying with applicable laws, regulations and procedures. The Company will not disclose personal data about the ${roleLabel} outside the Company without their prior consent.` },
      ];

    // ─── 5. PLACE OF PERFORMANCE ───
    case "place_of_work":
      if (isManagement) {
        return [
          { type: "paragraph", text: `The ${roleLabel} shall perform their duties at any Company location. Current location is:` },
          { type: "highlight", text: v.workLocation || "[Not specified]" },
          { type: "paragraph", text: "Cost of travel cannot be claimed within London but can be discussed should the employee be required to venture outside London or outside of the United Kingdom on Company business." },
        ];
      }
      return [
        { type: "paragraph", text: `The ${roleLabel} shall perform their duties at the restaurant located at:` },
        { type: "highlight", text: v.workLocation || "[Not specified]" },
        { type: "paragraph", text: `However, the ${roleLabel} hereby accepts in advance that they may be required to work in another location within Greater London to meet the reasonable requirements of their position at the sole discretion of the Company.` },
      ];

    // ─── 6. HOURS OF WORK ───
    case "hours":
      if (isManagement) {
        return [
          { type: "paragraph", text: `It is understood that the ${roleLabel} will work ${v.weeklyHours} hours a week.` },
          { type: "highlight", text: `${v.weeklyHours} hours per week` },
          { type: "paragraph", text: `The ${roleLabel} may choose to work more hours, as it may positively impact their salary through substitution of others' staff cost.` },
        ];
      }
      return [
        { type: "paragraph", text: `The ${roleLabel} shall work approximately ${v.weeklyHours} hours per week, with specific days and hours to be mutually agreed upon, based on the needs of the business.` },
        { type: "highlight", text: `${v.weeklyHours} hours per week (approximate)` },
        { type: "paragraph", text: "Due to the nature of the business, the required hours of work may vary, and the Team Member acknowledges that, at times, they may be asked to work fewer or more hours based on operational requirements. Any changes to the agreed hours will be made with mutual consent and will be in line with the Employment Rights Act 1996." },
      ];

    // ─── 7. SALARY (Phase 3 — base vs service charge split) ───
    case "salary": {
      const base = Number(v.baseHourlyRate || v.hourlyRate) || 0;
      const guaranteedSc = Number(v.guaranteedServiceChargeRate) || 0;
      const estimatedSc = Number(v.estimatedServiceChargeRate) || 0;
      const tronc = (v.troncSchemeName || "").trim();
      const policy = (v.serviceChargePolicyNote || "").trim();
      const blocks: ContentBlock[] = [
        { type: "subheading", text: "7.1 Salary" },
        { type: "paragraph", text: `The Company will pay the ${roleLabel} a base hourly rate from the Effective Date as set out below:` },
        { type: "highlight", text: `£${base.toFixed(2)} per hour (base hourly rate)` },
        { type: "paragraph", text: `Your base hourly rate is £${base.toFixed(2)} per hour. This is your contractual hourly rate before any service charge, tronc payment, bonus, or discretionary payment.` },
      ];
      if (guaranteedSc > 0) {
        blocks.push({ type: "paragraph", text: `In addition to your base hourly rate of £${base.toFixed(2)} per hour, you will receive a guaranteed service charge payment of £${guaranteedSc.toFixed(2)} per hour, where applicable. This service charge payment is separate from your base hourly rate and does not form part of the calculation for National Minimum Wage compliance.` });
      }
      if (estimatedSc > 0) {
        blocks.push({ type: "paragraph", text: `You may also receive service charge or tronc payments. The estimated service charge of £${estimatedSc.toFixed(2)} per hour shown in this contract is indicative only and is not guaranteed unless expressly stated as guaranteed. Service charge and tronc payments are separate from your base hourly rate and must not be used to satisfy National Minimum Wage.` });
      }
      if (tronc) {
        blocks.push({ type: "paragraph", text: `Service charge or tronc payments may be administered under the following scheme: ${tronc}. The rules of that scheme may be updated from time to time, subject to applicable law and company policy.` });
      }
      if (policy) {
        blocks.push({ type: "paragraph", text: `Service charge policy note: ${policy}` });
      }
      blocks.push({ type: "paragraph", text: "The salary will be paid in equal monthly instalments, payable in arrears, subject to any deductions required by law including tax and National Insurance contributions." });
      blocks.push({ type: "paragraph", text: `Any potential increase to the base hourly rate is at the sole discretion of the Company.` });
      blocks.push({ type: "paragraph", text: `The ${roleLabel} acknowledges and agrees that their pay details are confidential and must not be disclosed to other parties without the prior consent of the Company.` });
      blocks.push({ type: "subheading", text: "7.2 National Insurance" });
      blocks.push({ type: "paragraph", text: `The Company shall be responsible to withhold, where appropriate, and pay both the Company and the ${roleLabel} national insurance contributions. National insurance contributions payable by the ${roleLabel} shall be deducted from their salary.` });
      return blocks;
    }

    // ─── 8. SICKNESS ───
    case "sickness":
      return [
        { type: "paragraph", text: `In the event that the ${roleLabel} is unable to attend work due to sickness or injury, they must notify the Company as soon as possible, and no later than the start of their scheduled shift, stating the nature of their condition and the expected duration of their absence.` },
        { type: "paragraph", text: `If the ${roleLabel}'s absence exceeds three consecutive working days, they are required to provide a fit note (or medical certificate) from a registered healthcare professional. This note must clearly state the nature of the illness or injury and confirm the expected duration of the absence.` },
        { type: "paragraph", text: "Failure to provide a fit note within the required timeframe will result in the absence being treated as unauthorized, and the Company may withhold pay until satisfactory medical evidence is provided." },
      ];

    // ─── 9. HOLIDAYS ───
    case "holiday":
      if (isManagement) {
        return [
          { type: "paragraph", text: `The ${roleLabel} will be entitled to 28 days of annual leave per year, including bank holidays. All holidays should be agreed with the Operations Manager in advance.` },
        ];
      }
      return [
        { type: "paragraph", text: `The ${roleLabel} is entitled to annual paid leave based on ${v.weeklyHours} hours of work per week. Annual leave will accrue on a pro-rata basis, at the rate of 1/12th of the annual entitlement for each complete month of full-time work during the holiday year.` },
        { type: "paragraph", text: `The ${roleLabel} shall take their annual leave at mutually agreed times, subject to the operational needs of the Company, and in accordance with the provisions of the Employment Act and Company policy.` },
        { type: "paragraph", text: `Upon termination of the Appointment for any reason, the ${roleLabel} will be entitled to a payment corresponding to the pro rata salary for each day of holiday accrued due but not taken. If they have taken holiday in excess of their accrued entitlement, the Company may deduct a day's salary for each excess day taken from any monies owed to them by the Company.` },
      ];

    // ─── 10. TERMINATION ───
    case "termination":
      if (isManagement) {
        return [
          { type: "subheading", text: "10.1" },
          { type: "paragraph", text: `Each Party may terminate the Agreement by serving a ${v.noticePeriod} prior written termination notice to the other party. A party failing to comply with the notification periods is required to pay to the other party an amount of compensation equal to the wage corresponding to the applicable notice period.` },
          { type: "paragraph", text: "It is agreed that the contract can be terminated at any time through mutual agreement of both parties." },
          { type: "paragraph", text: `A probation period of ${v.probationPeriod} will also be in place. During this period, both parties can terminate the contract with one week's notice or immediately if agreed mutually.` },
          { type: "paragraph", text: "It is the employee's responsibility to inquire whether the probation period has been passed." },
          { type: "subheading", text: "10.2" },
          { type: "paragraph", text: `Upon the termination of the Appointment the ${roleLabel} will hand over to the Company all property belonging to the Company or relating to its business which may be in their possession or under their control, without keeping copies of any reproducible items or extracts and without having downloaded any information stored on any computer storage medium.` },
          { type: "subheading", text: "10.3" },
          { type: "paragraph", text: `After the termination of the Appointment the ${roleLabel} will not at any time make any adverse, untrue or misleading statement about the Company or any Group Company or its officers or employees or represent themselves as being employed by or connected with the Company.` },
        ];
      }
      return [
        { type: "subheading", text: "10.1 Termination of Agreement" },
        { type: "paragraph", text: `Either Party may terminate this Agreement by providing ${v.noticePeriod} written notice to the other Party. If either Party fails to comply with the notice period, they will be required to pay the other Party an amount equal to the wage corresponding to the applicable notice period.` },
        { type: "paragraph", text: `Probation Period: ${v.probationPeriod} will be in place. During this period, either Party may terminate the contract without prior notice. It is the ${roleLabel}'s responsibility to confirm whether the probation period has been successfully completed.` },
        { type: "subheading", text: "10.2 Return of Company Property" },
        { type: "paragraph", text: `Upon termination of the Appointment, the ${roleLabel} must return to the Company all property belonging to the Company or related to its business. The ${roleLabel} must ensure that no copies of any Company materials are retained, and must not have downloaded or stored any Company information on any personal device.` },
        { type: "subheading", text: "10.3 Non-Disparagement" },
        { type: "paragraph", text: `After the termination of the Appointment, the ${roleLabel} agrees not to make any adverse, untrue, or misleading statements about the Company, any Group Company, or any of its officers or employees. The ${roleLabel} also agrees not to represent themselves as being employed by or connected with the Company.` },
      ];

    // ─── 11. CONFIDENTIALITY ───
    case "confidentiality":
      return [
        { type: "paragraph", text: `The Company has and will have developed valuable technical and non-technical information for itself and its customers, which is safeguarded as trade secrets and confidential information and must be protected from direct or indirect disclosure. The ${roleLabel} is expected to treat and shall receive and have access to confidential, proprietary and/or trade secret information concerning the Company, including but not limited to:` },
        { type: "bullets", items: [
          "food recipes whether introduced by the Company or the Head Chef",
          "names, profiles and service need histories of clients",
          "the Company's marketing and business plans",
          "information about costs, profits and other financial matters",
          "information about the skills, expertise, experience and salaries of employees",
          "any document marked 'confidential'",
          "any information which the employee has been told is confidential or which they might reasonably expect the Company would regard as confidential",
          "confidential or proprietary information of clients and other third parties",
        ]},
        { type: "paragraph", text: `The ${roleLabel} hereby undertakes and warrants that both during their employment and after termination thereof, they shall keep such Confidential Information in strict confidence at all times and will not disclose it to any third party and will not use it for any purpose other than as necessary and appropriate in carrying out their work for the Company.` },
        { type: "paragraph", text: "This restriction shall not apply to information that becomes public knowledge or is disclosed by a third party without restriction or was known prior to its disclosure by the Company." },
        { type: "paragraph", text: `In case of breach of these confidentiality conditions, the Company may immediately terminate this Agreement in accordance with the Employment Act.` },
      ];

    // ─── 12. NON-COMPETE ───
    case "non_compete":
      if (isManagement) {
        return [
          { type: "subheading", text: "12.1" },
          { type: "paragraph", text: `The ${roleLabel} accepts and undertakes that during the course of their employment in the Company, as well as for a period of two years after the termination of their employment in the Company, unless explicitly approved in writing by the Company, they shall not, directly or indirectly, carry on or be employed or self-employed, engaged or interested in any capacity in any business within the Greater London area which is directly competitive with the Company or having a similar concept with the Company's restaurant.` },
        ];
      }
      return [
        { type: "subheading", text: "12.1" },
        { type: "paragraph", text: `The ${roleLabel} undertakes to use their full working capacity exclusively for the Company. The acceptance of any additional work either paid or unpaid requires the explicit approval in writing by the Company. This does not include any commitments during the ${roleLabel}'s days off.` },
        { type: "subheading", text: "12.2" },
        { type: "paragraph", text: `The ${roleLabel} accepts and undertakes that during the course of their employment in the Company, as well as for a period of two years after the termination of their employment in the Company, unless explicitly approved in writing by the Company, they shall not, directly or indirectly, carry on or be employed or self-employed, engaged or interested in any capacity in any business within the Greater London area which is directly competitive with the Company or having a similar concept with the Company's restaurant.` },
      ];

    // ─── APP-ADDED CLAUSES (not in originals) ───
    case "rota":
      return [
        { type: "paragraph", text: "The Company operates a rota system to allocate shifts. Employees are responsible for checking the rota regularly and attending all scheduled shifts." },
        { type: "paragraph", text: "The Company reserves the right to amend rotas where reasonably required to meet operational needs." },
      ];
    case "communication":
      return [
        { type: "paragraph", text: "Employees are responsible for regularly checking the Company's communication channels including email, rota software, and internal messaging platforms." },
      ];
    case "attendance":
      return [
        { type: "paragraph", text: "Employees are expected to attend all scheduled shifts. Failure to attend without valid reason may be treated as unauthorised absence and may result in disciplinary action." },
      ];
    case "deductions":
      return [
        { type: "paragraph", text: "The Company reserves the right to deduct from wages any sums owed to the Company including:" },
        { type: "bullets", items: ["salary overpayments", "training costs", "uniform costs", "losses caused by negligence"] },
      ];
    case "data_protection":
      return [
        { type: "paragraph", text: "The Company will process employee data in accordance with the UK GDPR and Data Protection Act 2018." },
      ];
    case "disciplinary":
      return [
        { type: "paragraph", text: "Employees must comply with Company policies and procedures. Serious misconduct may result in disciplinary action including dismissal." },
        { type: "paragraph", text: "Examples of gross misconduct include but are not limited to:" },
        { type: "bullets", items: ["theft", "violence", "harassment", "serious insubordination", "working while intoxicated", "breach of food safety regulations"] },
      ];
    case "entire_agreement":
      return [
        { type: "paragraph", text: "This agreement constitutes the entire agreement between the Parties and supersedes any previous discussions or agreements." },
      ];

    default:
      return [{ type: "paragraph", text: "[Clause content not found]" }];
  }
}

/**
 * Extract the key terms summary from contract variables for display.
 */
export function getKeyTermsSummary(variables: ContractVariables, contractType: ContractType) {
  const isManagement = contractType === "management" || contractType === "supervisor";
  const base = Number(variables.baseHourlyRate || variables.hourlyRate) || 0;
  const guaranteedSc = Number(variables.guaranteedServiceChargeRate) || 0;
  const estimatedSc = Number(variables.estimatedServiceChargeRate) || 0;
  const totalEstimated = +(base + guaranteedSc + estimatedSc).toFixed(2);
  const terms = [
    { label: "Employee", value: variables.employeeName },
    { label: "Job Title", value: variables.jobTitle },
    { label: "Role Type", value: isManagement ? "Management" : "Team Member" },
    { label: "Start Date", value: new Date(variables.effectiveDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
    { label: "Base hourly rate", value: `£${base.toFixed(2)}/hr` },
    { label: "Guaranteed service charge", value: `£${guaranteedSc.toFixed(2)}/hr` },
    { label: "Estimated service charge", value: estimatedSc > 0 ? `£${estimatedSc.toFixed(2)}/hr (not guaranteed)` : "—" },
    { label: "Total estimated hourly value", value: `£${totalEstimated.toFixed(2)}/hr` },
    { label: "Weekly Hours", value: `${variables.weeklyHours}h` },
    { label: "Notice Period", value: variables.noticePeriod },
    { label: "Probation", value: variables.probationPeriod },
    { label: "Work Location", value: variables.workLocation || "Not specified" },
    { label: "Department", value: contractType.toUpperCase() },
  ];
  if (variables.troncSchemeName?.trim()) {
    terms.push({ label: "Tronc scheme", value: variables.troncSchemeName.trim() });
  }
  return terms;
}

/**
 * Count audit flags by severity for the summary.
 */
export function getAuditSummary() {
  const allFlags = CONTRACT_CLAUSES.flatMap((c) => c.flags);
  return {
    total: allFlags.length,
    sourceMismatch: allFlags.filter((f) => f.type === "source_mismatch").length,
    roleGaps: allFlags.filter((f) => f.type === "role_specific_gap").length,
    wordingRisks: allFlags.filter((f) => f.type === "wording_risk").length,
    reviewRecommended: allFlags.filter((f) => f.type === "review_recommended").length,
    legalMinimum: allFlags.filter((f) => f.type === "legal_minimum_only").length,
    hardcoded: allFlags.filter((f) => f.type === "hardcoded_value").length,
    missingClauses: MISSING_CLAUSES.length,
    appAddedClauses: APP_ADDED_CLAUSES.length,
  };
}
