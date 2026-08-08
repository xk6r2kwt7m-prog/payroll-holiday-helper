export interface ContractVariables {
  employeeName: string;
  homeAddress: string;
  jobTitle: string;
  effectiveDate: string;
  /**
   * @deprecated Use baseHourlyRate. Retained for backwards compatibility
   * with older drafts; it is now mirrored from baseHourlyRate at save time.
   */
  hourlyRate: string;
  /** Contractual base pay before any service charge / tronc / bonus. NMW is measured against this. */
  baseHourlyRate: string;
  /** Guaranteed service charge top-up paid per hour. Excluded from NMW. */
  guaranteedServiceChargeRate: string;
  /** Indicative only — NOT guaranteed. Excluded from NMW. */
  estimatedServiceChargeRate: string;
  /** Optional. Free-text name of the tronc scheme. */
  troncSchemeName: string;
  /** Optional. Plain-English policy note shown in the contract. */
  serviceChargePolicyNote: string;
  weeklyHours: string;
  noticePeriod: string;
  probationPeriod: string;
  workLocation: string;
  employmentType: EmploymentType;
  /**
   * Optional reporting manager (Phase 5H). Draft-form-only.
   * Used to personalise the Appointment / Reporting sentence.
   * Not persisted back to the employee profile.
   */
  reportingManagerName?: string;
  /** Optional reporting manager job title (Phase 5H). Draft-form-only. */
  reportingManagerTitle?: string;
}

export type EmploymentType = "full_time" | "part_time" | "variable_hours";

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "variable_hours", label: "Variable Hours" },
];

export function getEmploymentTypeLabel(type: EmploymentType): string {
  return EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
}

// Department selection for contract form
export type ContractType = "foh" | "kitchen" | "management" | "supervisor";

export const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string; emoji: string }[] = [
  { value: "foh", label: "Front of House (FOH)", emoji: "🍽️" },
  { value: "kitchen", label: "Kitchen / Back of House (BOH)", emoji: "👨‍🍳" },
  { value: "management", label: "Management", emoji: "👔" },
  { value: "supervisor", label: "Supervisor", emoji: "📋" },
];

// Pre-built job titles grouped by department
export const JOB_TITLES: Record<ContractType, string[]> = {
  foh: [
    "Front of House Team Member",
    "Waiter",
    "Waitress",
    "Wrapper",
    "Wrapper Team Member",
    "Host / Hostess",
    "Runner",
    "Barista",
    "Bar Staff",
    "Cashier",
  ],
  kitchen: [
    "Kitchen Team Member",
    "Chef",
    "Line Chef",
    "Sous Chef",
    "Kitchen Porter",
    "Prep Chef",
    "Commis Chef",
    "Pastry Chef",
  ],
  management: [
    "Restaurant Manager",
    "Assistant Manager",
    "Kitchen Manager",
    "General Manager",
    "Area Manager",
    "Operations Manager",
  ],
  supervisor: [
    "FOH Supervisor",
    "Kitchen Supervisor",
    "Shift Supervisor",
    "Team Leader",
  ],
};

export function getDefaultJobTitle(type: ContractType) {
  return JOB_TITLES[type]?.[0] || "Team Member";
}

export const WORK_LOCATIONS: string[] = [];

/**
 * Defensive helper for older saved drafts that only set `hourlyRate`.
 * Returns a base hourly rate, falling back to `hourlyRate` so existing
 * draft contracts keep rendering. Service charge fields default to 0.
 */
export function resolveContractPayFields(v: Partial<ContractVariables>) {
  const baseStr = (v.baseHourlyRate ?? v.hourlyRate ?? "") as string;
  const base = Number(baseStr) || 0;
  const guaranteed = Number(v.guaranteedServiceChargeRate ?? "") || 0;
  const estimated = Number(v.estimatedServiceChargeRate ?? "") || 0;
  return {
    base,
    guaranteed,
    estimated,
    total: +(base + guaranteed + estimated).toFixed(2),
    baseStr: baseStr || "0.00",
    guaranteedStr: guaranteed ? guaranteed.toFixed(2) : "",
    estimatedStr: estimated ? estimated.toFixed(2) : "",
    troncSchemeName: (v.troncSchemeName || "").trim(),
    serviceChargePolicyNote: (v.serviceChargePolicyNote || "").trim(),
  };
}

/**
 * Party label used throughout the contract body ("hereinafter referred to as ...").
 * Must reflect the employee's actual job title so a FOH Supervisor is never
 * described as a "Duty Manager". Falls back to a generic label when the job
 * title is missing.
 */
export function resolveContractRoleLabel(
  jobTitle?: string | null,
  isManagement = false,
): string {
  const title = (jobTitle || "").replace(/\s+/g, " ").trim();
  if (title) return title;
  return isManagement ? "Manager" : "Team Member";
}
