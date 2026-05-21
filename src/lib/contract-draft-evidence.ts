/**
 * Phase 5K — Pure, typed evidence model describing how a contract draft was
 * prepared (data sources, missing fields, manual edits, readiness).
 *
 * TODO(phase-future): This evidence object is a future candidate for
 * immutable contract-generation audit persistence. Persistence is
 * intentionally not implemented in this phase.
 *
 * Strictly read-only:
 * - No React hooks
 * - No Supabase / network I/O
 * - No React Query
 * - No mutation of inputs
 * - Does not create, sign, lock, send or persist anything.
 */
import type {
  ContractVariables,
  ContractType,
  EmploymentType,
} from "@/components/contracts/contractTemplates";
import {
  CRITICAL_CONTRACT_FIELDS,
  CONTRACT_FIELD_LABELS,
  type ContractFieldSource,
  type MissingContractField,
} from "@/lib/contract-form-review";
import type { ContractReadinessStatus } from "@/lib/contract-readiness";

export type ReportingManagerStatus = "provided" | "missing";
export type PayDetailsStatus =
  | "base_only"
  | "with_guaranteed_sc"
  | "with_estimated_sc"
  | "with_tronc"
  | "missing";

export interface ContractDraftEvidence {
  employeeId: string | null;
  employeeName: string;
  contractType: ContractType;
  employmentType: EmploymentType | "";
  startDate: string;
  readinessStatus: ContractReadinessStatus;
  missingCriticalFields: MissingContractField[];
  manuallyEnteredCriticalFields: MissingContractField[];
  autoFilledFields: (keyof ContractVariables)[];
  autoFilledCount: number;
  fieldSources: Partial<Record<keyof ContractVariables, ContractFieldSource>>;
  reportingManagerStatus: ReportingManagerStatus;
  payDetailsStatus: PayDetailsStatus;
  generatedFromEmployeeCreationFlow: boolean;
  preparedAtIso: string;
}

export interface BuildContractDraftEvidenceInput {
  employee: { id?: string | null } | null;
  contractType: ContractType;
  contractValues: Partial<ContractVariables>;
  fieldSources: Partial<Record<keyof ContractVariables, ContractFieldSource>>;
  missingFields: MissingContractField[];
  readinessStatus: ContractReadinessStatus;
  fromEmployeeCreationFlow: boolean;
  /** Optional: defaults to new Date(). Accepts a fixed date for tests. */
  now?: Date;
}

const AUTO_SOURCES: ReadonlyArray<ContractFieldSource> = [
  "employee_profile",
  "onboarding",
  "active_terms",
  "derived",
];

function isNonEmpty(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function buildContractDraftEvidence(
  input: BuildContractDraftEvidenceInput,
): ContractDraftEvidence {
  const sources = input.fieldSources || {};
  const values = input.contractValues || {};

  const autoFilledFields = (Object.keys(sources) as (keyof ContractVariables)[])
    .filter((k) => AUTO_SOURCES.includes(sources[k] as ContractFieldSource))
    .sort();

  const manuallyEnteredCriticalFields: MissingContractField[] = [];
  for (const field of CRITICAL_CONTRACT_FIELDS) {
    if (sources[field] === "manual") {
      manuallyEnteredCriticalFields.push({
        field,
        label: CONTRACT_FIELD_LABELS[field] || String(field),
      });
    }
  }

  const hasReportingManager =
    isNonEmpty(values.reportingManagerName) || isNonEmpty(values.reportingManagerTitle);

  let payDetailsStatus: PayDetailsStatus;
  if (!isNonEmpty(values.baseHourlyRate) || Number(values.baseHourlyRate) <= 0) {
    payDetailsStatus = "missing";
  } else if (isNonEmpty(values.troncSchemeName)) {
    payDetailsStatus = "with_tronc";
  } else if (Number(values.guaranteedServiceChargeRate) > 0) {
    payDetailsStatus = "with_guaranteed_sc";
  } else if (Number(values.estimatedServiceChargeRate) > 0) {
    payDetailsStatus = "with_estimated_sc";
  } else {
    payDetailsStatus = "base_only";
  }

  const now = input.now ?? new Date();

  return {
    employeeId: input.employee?.id ?? null,
    employeeName: String(values.employeeName ?? "").trim(),
    contractType: input.contractType,
    employmentType: (values.employmentType as EmploymentType) ?? "",
    startDate: String(values.effectiveDate ?? "").trim(),
    readinessStatus: input.readinessStatus,
    missingCriticalFields: [...input.missingFields],
    manuallyEnteredCriticalFields,
    autoFilledFields,
    autoFilledCount: autoFilledFields.length,
    fieldSources: { ...sources },
    reportingManagerStatus: hasReportingManager ? "provided" : "missing",
    payDetailsStatus,
    generatedFromEmployeeCreationFlow: !!input.fromEmployeeCreationFlow,
    preparedAtIso: now.toISOString(),
  };
}

/** Human-readable label for pay details status. */
export function payDetailsStatusLabel(s: PayDetailsStatus): string {
  switch (s) {
    case "base_only":
      return "Base hourly rate only";
    case "with_guaranteed_sc":
      return "Base + guaranteed service charge";
    case "with_estimated_sc":
      return "Base + estimated service charge";
    case "with_tronc":
      return "Base + tronc scheme";
    case "missing":
      return "Missing pay details";
  }
}

/** Human-readable label for reporting manager status. */
export function reportingManagerStatusLabel(s: ReportingManagerStatus): string {
  return s === "provided" ? "Reporting manager provided" : "Reporting manager not set";
}
