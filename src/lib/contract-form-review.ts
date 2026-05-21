/**
 * Phase 5F — Pure helpers for contract auto-fill source tracking and
 * missing-field review.
 *
 * Strictly read-only:
 * - No React hooks
 * - No Supabase calls
 * - No mutation of inputs
 * - No side effects
 */
import type { ContractVariables } from "@/components/contracts/contractTemplates";
import {
  mapEmployeeToContractDefaults,
  type ContractDefaultsInput,
} from "@/lib/contract-employee-defaults";

export type ContractFieldSource =
  | "employee_profile"
  | "onboarding"
  | "active_terms"
  | "derived"
  | "manual"
  | "missing";

/** Contract-critical fields used by the warning summary and confirm review. */
export const CRITICAL_CONTRACT_FIELDS: (keyof ContractVariables)[] = [
  "employeeName",
  "homeAddress",
  "jobTitle",
  "employmentType",
  "effectiveDate",
  "baseHourlyRate",
  "weeklyHours",
  "workLocation",
  "noticePeriod",
];

export const CONTRACT_FIELD_LABELS: Partial<Record<keyof ContractVariables, string>> = {
  employeeName: "Full name",
  homeAddress: "Home address",
  jobTitle: "Job title",
  employmentType: "Employment type",
  effectiveDate: "Start date",
  baseHourlyRate: "Base hourly rate",
  weeklyHours: "Weekly contracted hours",
  workLocation: "Work location",
  noticePeriod: "Notice period",
  guaranteedServiceChargeRate: "Guaranteed service charge",
  estimatedServiceChargeRate: "Estimated service charge",
  troncSchemeName: "Tronc scheme",
  serviceChargePolicyNote: "Service charge policy",
  probationPeriod: "Probation period",
  reportingManagerName: "Reporting manager",
  reportingManagerTitle: "Reporting manager title",
};

/**
 * Returns the original source for each field that would be derived from the
 * given inputs, regardless of what is currently in the form. The dialog can
 * combine this with its `userEdited` set to produce the final source map.
 *
 * Sources:
 * - `onboarding` — home address from onboarding personal_info
 * - `active_terms` — anything provided by an active employment-terms row
 * - `employee_profile` — name, start date, pay rate from the employee record
 * - `derived` — values computed from a source (e.g. job title from department)
 */
export function getOriginalFieldSources(
  input: ContractDefaultsInput,
): Partial<Record<keyof ContractVariables, ContractFieldSource>> {
  const sources: Partial<Record<keyof ContractVariables, ContractFieldSource>> = {};
  const emp = input.employee ?? null;
  const ob = input.onboarding ?? null;
  const terms = input.activeTerms ?? null;

  if (emp?.forename || emp?.surname) sources.employeeName = "employee_profile";

  if (ob?.personal_info) {
    const p = ob.personal_info as Record<string, any>;
    if (p.address || p.home_address || p.full_address || p.address_line_1) {
      sources.homeAddress = "onboarding";
    }
  }

  // Job title — explicit role_title is from active terms; otherwise it is
  // derived from the employee's department.
  if (terms?.role_title && terms.role_title.trim()) {
    sources.jobTitle = "active_terms";
  } else if (emp?.department) {
    sources.jobTitle = "derived";
  }

  if (terms?.employment_type) sources.employmentType = "active_terms";

  if (emp?.start_date) sources.effectiveDate = "employee_profile";
  else if (terms?.effective_from) sources.effectiveDate = "active_terms";

  if (terms?.base_hourly_rate != null || terms?.hourly_rate != null) {
    sources.baseHourlyRate = "active_terms";
  } else if (emp?.hourly_rate != null) {
    sources.baseHourlyRate = "employee_profile";
  }

  if (terms?.guaranteed_service_charge_rate != null) {
    sources.guaranteedServiceChargeRate = "active_terms";
  }
  if (terms?.estimated_service_charge_rate != null) {
    sources.estimatedServiceChargeRate = "active_terms";
  } else if (emp?.service_charge != null) {
    sources.estimatedServiceChargeRate = "employee_profile";
  }

  if (terms?.tronc_scheme_name?.trim()) sources.troncSchemeName = "active_terms";
  if (terms?.service_charge_policy_note?.trim()) sources.serviceChargePolicyNote = "active_terms";

  if (terms?.contracted_hours != null) sources.weeklyHours = "active_terms";
  if (terms?.work_location?.trim()) sources.workLocation = "active_terms";
  if (terms?.notice_period_weeks != null) sources.noticePeriod = "active_terms";

  return sources;
}

/**
 * Resolved source map for the form: combines the original auto-fill sources
 * with the user's manual-edit tracking and the current values to produce a
 * field -> source map suitable for UI display.
 */
export function resolveContractFieldSources(args: {
  input: ContractDefaultsInput;
  variables: Partial<ContractVariables>;
  userEdited: Set<keyof ContractVariables> | ReadonlyArray<keyof ContractVariables>;
}): Partial<Record<keyof ContractVariables, ContractFieldSource>> {
  const original = getOriginalFieldSources(args.input);
  const edited =
    args.userEdited instanceof Set
      ? args.userEdited
      : new Set<keyof ContractVariables>(args.userEdited);

  const resolved: Partial<Record<keyof ContractVariables, ContractFieldSource>> = {};
  const allKeys = new Set<keyof ContractVariables>([
    ...(Object.keys(original) as (keyof ContractVariables)[]),
    ...CRITICAL_CONTRACT_FIELDS,
  ]);

  for (const key of allKeys) {
    const value = args.variables[key];
    const hasValue = value !== undefined && value !== null && String(value).trim() !== "";

    if (edited.has(key)) {
      resolved[key] = hasValue ? "manual" : "missing";
      continue;
    }
    if (hasValue && original[key]) {
      resolved[key] = original[key];
      continue;
    }
    resolved[key] = hasValue ? "manual" : "missing";
  }

  return resolved;
}

/** Human-readable badge label for a source. */
export function sourceLabel(source: ContractFieldSource): string {
  switch (source) {
    case "employee_profile":
      return "Auto-filled from employee profile";
    case "onboarding":
      return "Auto-filled from onboarding";
    case "active_terms":
      return "Auto-filled from active employment terms";
    case "derived":
      return "Derived from department";
    case "manual":
      return "Entered manually";
    case "missing":
      return "Missing";
  }
}

export interface MissingContractField {
  field: keyof ContractVariables;
  label: string;
}

/**
 * Returns the list of contract-critical fields that are missing from the
 * current form values. Pure — does not mutate or fetch anything.
 */
export function getMissingContractFields(
  variables: Partial<ContractVariables>,
): MissingContractField[] {
  const missing: MissingContractField[] = [];
  for (const field of CRITICAL_CONTRACT_FIELDS) {
    const value = variables[field];
    const present = value !== undefined && value !== null && String(value).trim() !== "";
    if (!present) {
      missing.push({
        field,
        label: CONTRACT_FIELD_LABELS[field] || String(field),
      });
    }
  }
  return missing;
}

/**
 * Convenience: given the same inputs the dialog uses, return both the
 * resolved source map and the missing-field list in one call.
 */
export function reviewContractForm(args: {
  input: ContractDefaultsInput;
  variables: Partial<ContractVariables>;
  userEdited: Set<keyof ContractVariables> | ReadonlyArray<keyof ContractVariables>;
}) {
  // mapEmployeeToContractDefaults is invoked here only to keep this helper
  // self-contained for tests; it does not mutate args.
  mapEmployeeToContractDefaults(args.input);
  return {
    sources: resolveContractFieldSources(args),
    missing: getMissingContractFields(args.variables),
  };
}
