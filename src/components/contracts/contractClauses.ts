import type { ContractVariables } from "./contractTemplates";
import type { ContractType } from "./contractTemplates";

// ─── Audit Flags ───
// These identify clauses that should be reviewed before relying on them.
// They do NOT change legal wording — they flag it for human review.

export type ClauseFlag =
  | "review_recommended" // wording may be outdated or incomplete
  | "role_specific_gap"  // same clause used for all roles but shouldn't be
  | "legal_minimum_only" // clause meets minimum but could be stronger
  | "hardcoded_value";   // contains a value that should be configurable

export interface ClauseDefinition {
  id: string;
  number: string;
  title: string;
  /** Whether this clause contains employee-specific inserted values */
  hasEmployeeValues: boolean;
  /** Whether this clause varies (or should vary) by role/department */
  isRoleSpecific: boolean;
  /** Audit flags for manual review */
  flags: { type: ClauseFlag; note: string }[];
  /** Which key terms appear in this clause (for the summary panel) */
  keyTerms?: string[];
}

/**
 * Structured definition of all 17 contract clauses.
 * Separated from rendering so the preview can navigate, highlight, and audit independently.
 */
export const CONTRACT_CLAUSES: ClauseDefinition[] = [
  {
    id: "position",
    number: "1",
    title: "Position",
    hasEmployeeValues: true,
    isRoleSpecific: true,
    keyTerms: ["Job Title"],
    flags: [
      {
        type: "role_specific_gap",
        note: "Duties description is identical for all roles. A Duty Manager and Team Member receive the same generic duties clause. Consider adding role-specific responsibilities.",
      },
    ],
  },
  {
    id: "place_of_work",
    number: "2",
    title: "Place of Work",
    hasEmployeeValues: true,
    isRoleSpecific: false,
    keyTerms: ["Work Location"],
    flags: [
      {
        type: "hardcoded_value",
        note: '"Greater London" is hardcoded as the mobility clause area. This should be configurable per tenant.',
      },
    ],
  },
  {
    id: "probation",
    number: "3",
    title: "Probation Period",
    hasEmployeeValues: true,
    isRoleSpecific: false,
    keyTerms: ["Probation Period"],
    flags: [],
  },
  {
    id: "hours",
    number: "4",
    title: "Hours of Work",
    hasEmployeeValues: true,
    isRoleSpecific: true,
    keyTerms: ["Weekly Hours"],
    flags: [
      {
        type: "role_specific_gap",
        note: "Hours clause is identical for variable-hours and full-time roles. Full-time employees should see fixed hours wording, not rota-based wording.",
      },
    ],
  },
  {
    id: "rota",
    number: "5",
    title: "Rota and Shift Changes",
    hasEmployeeValues: false,
    isRoleSpecific: true,
    flags: [
      {
        type: "role_specific_gap",
        note: "Management roles typically set rotas rather than follow them. This clause reads as team-member-only.",
      },
    ],
  },
  {
    id: "communication",
    number: "6",
    title: "Communication",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    flags: [],
  },
  {
    id: "salary",
    number: "7",
    title: "Salary",
    hasEmployeeValues: true,
    isRoleSpecific: false,
    keyTerms: ["Hourly Rate"],
    flags: [
      {
        type: "review_recommended",
        note: 'Service charge wording is vague ("may be distributed separately according to Company policy"). Consider specifying the tronc policy or referencing the staff handbook.',
      },
    ],
  },
  {
    id: "holiday",
    number: "8",
    title: "Holiday Entitlement",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    keyTerms: ["Holiday"],
    flags: [
      {
        type: "legal_minimum_only",
        note: "No mention of: leave year dates, carryover rules, bank holiday treatment, or holiday pay calculation method (required under UK case law for variable-hours workers).",
      },
    ],
  },
  {
    id: "sickness",
    number: "9",
    title: "Sickness",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    flags: [
      {
        type: "legal_minimum_only",
        note: "No mention of Statutory Sick Pay (SSP) entitlement. The Employment Rights Act 1996 s.1 requires written particulars to include sickness terms.",
      },
    ],
  },
  {
    id: "attendance",
    number: "10",
    title: "Attendance",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    flags: [],
  },
  {
    id: "confidentiality",
    number: "11",
    title: "Confidentiality",
    hasEmployeeValues: false,
    isRoleSpecific: true,
    flags: [
      {
        type: "role_specific_gap",
        note: "Management roles typically have stronger confidentiality obligations (access to financial data, HR records, strategic plans). Consider enhanced wording for management contracts.",
      },
    ],
  },
  {
    id: "secondary_employment",
    number: "12",
    title: "Secondary Employment",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    flags: [],
  },
  {
    id: "deductions",
    number: "13",
    title: "Deductions from Wages",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    flags: [
      {
        type: "review_recommended",
        note: '"Losses caused by negligence" is broad and may be challenged. Consider specifying the conditions more tightly or referencing the ERA 1996 s.13 protections.',
      },
    ],
  },
  {
    id: "data_protection",
    number: "14",
    title: "Data Protection",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    flags: [
      {
        type: "legal_minimum_only",
        note: "Very thin — single sentence. Consider referencing the company privacy notice and data subject rights.",
      },
    ],
  },
  {
    id: "disciplinary",
    number: "15",
    title: "Disciplinary Procedure",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    flags: [
      {
        type: "review_recommended",
        note: 'No mention of a grievance procedure. Written particulars under ERA 1996 s.1(4)(d) must include "any disciplinary and grievance procedures".',
      },
    ],
  },
  {
    id: "termination",
    number: "16",
    title: "Termination",
    hasEmployeeValues: true,
    isRoleSpecific: false,
    keyTerms: ["Notice Period"],
    flags: [],
  },
  {
    id: "entire_agreement",
    number: "17",
    title: "Entire Agreement",
    hasEmployeeValues: false,
    isRoleSpecific: false,
    flags: [],
  },
];

// ─── Missing Clauses (not in current template but commonly expected) ───

export interface MissingClause {
  title: string;
  reason: string;
  severity: "recommended" | "legally_required" | "best_practice";
}

export const MISSING_CLAUSES: MissingClause[] = [
  {
    title: "Grievance Procedure",
    reason: "ERA 1996 s.1(4)(d) requires written particulars to reference disciplinary AND grievance procedures. Only disciplinary is covered.",
    severity: "legally_required",
  },
  {
    title: "Pension / Auto-Enrolment",
    reason: "The Pensions Act 2008 requires employers to auto-enrol eligible workers. No mention of pension scheme or opt-out.",
    severity: "legally_required",
  },
  {
    title: "Collective Agreements",
    reason: "ERA 1996 s.1(4)(j) requires written particulars to state whether any collective agreements apply. Even if none apply, it should say so.",
    severity: "legally_required",
  },
  {
    title: "Uniform / Appearance",
    reason: "Common in hospitality contracts. Clarifies employer expectations and who bears costs.",
    severity: "best_practice",
  },
  {
    title: "Right to Search",
    reason: "Common in food-service/hospitality to protect stock. Should be mentioned if practiced.",
    severity: "best_practice",
  },
  {
    title: "Restrictive Covenants / Non-Compete",
    reason: "Management-level contracts often include non-compete or non-solicitation clauses. Not currently offered for management roles.",
    severity: "recommended",
  },
];

/**
 * Extract the key terms summary from contract variables for display.
 */
export function getKeyTermsSummary(variables: ContractVariables, contractType: ContractType) {
  return [
    { label: "Employee", value: variables.employeeName },
    { label: "Job Title", value: variables.jobTitle },
    { label: "Start Date", value: new Date(variables.effectiveDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
    { label: "Hourly Rate", value: `£${variables.hourlyRate}/hr` },
    { label: "Weekly Hours", value: `${variables.weeklyHours}h (approx.)` },
    { label: "Notice Period", value: variables.noticePeriod },
    { label: "Probation", value: variables.probationPeriod },
    { label: "Work Location", value: variables.workLocation || "Not specified" },
    { label: "Employment Type", value: variables.employmentType.replace(/_/g, " ") },
    { label: "Department", value: contractType.toUpperCase() },
  ];
}

/**
 * Count audit flags by severity for the summary.
 */
export function getAuditSummary() {
  const allFlags = CONTRACT_CLAUSES.flatMap((c) => c.flags);
  return {
    total: allFlags.length,
    roleGaps: allFlags.filter((f) => f.type === "role_specific_gap").length,
    reviewRecommended: allFlags.filter((f) => f.type === "review_recommended").length,
    legalMinimum: allFlags.filter((f) => f.type === "legal_minimum_only").length,
    hardcoded: allFlags.filter((f) => f.type === "hardcoded_value").length,
    missingClauses: MISSING_CLAUSES.length,
    legallyRequired: MISSING_CLAUSES.filter((m) => m.severity === "legally_required").length,
  };
}
