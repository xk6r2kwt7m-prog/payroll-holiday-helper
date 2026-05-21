/**
 * Phase 5L — Pure helper that decides whether a contract draft can be
 * generated based on a clearly defined required-field list.
 *
 * Hard-required (block generation when missing/invalid):
 *   - employeeName, homeAddress, jobTitle, employmentType, effectiveDate,
 *     workLocation, baseHourlyRate (> 0), weeklyHours (> 0), noticePeriod
 *   - companyLegalName, companyAddress (tenant-side)
 *
 * Soft warnings (do not block):
 *   - reportingManagerName / reportingManagerTitle (template has a safe
 *     fallback sentence — see contract-appointment.ts)
 *   - any manually entered critical fields (review-only)
 *
 * Strictly read-only:
 * - No React hooks
 * - No Supabase / network I/O
 * - No React Query
 * - No mutation of inputs
 * - Does not create, sign, lock, send, or persist anything.
 */
import type { ContractVariables } from "@/components/contracts/contractTemplates";
import {
  CONTRACT_FIELD_LABELS,
  type ContractFieldSource,
  type MissingContractField,
} from "@/lib/contract-form-review";

export type GateFieldKey =
  | keyof ContractVariables
  | "companyLegalName"
  | "companyAddress";

export const HARD_REQUIRED_FIELDS: GateFieldKey[] = [
  "employeeName",
  "homeAddress",
  "jobTitle",
  "employmentType",
  "effectiveDate",
  "workLocation",
  "baseHourlyRate",
  "weeklyHours",
  "noticePeriod",
  "companyLegalName",
  "companyAddress",
];

export const SOFT_WARNING_FIELDS: GateFieldKey[] = [
  "reportingManagerName",
];

const EXTRA_LABELS: Partial<Record<GateFieldKey, string>> = {
  companyLegalName: "Company name",
  companyAddress: "Company address",
  reportingManagerName: "Reporting manager",
};

export function gateFieldLabel(field: GateFieldKey): string {
  return (
    EXTRA_LABELS[field] ||
    CONTRACT_FIELD_LABELS[field as keyof ContractVariables] ||
    String(field)
  );
}

export interface GateField {
  field: GateFieldKey;
  label: string;
}

export interface ContractGenerationGate {
  canGenerate: boolean;
  blockingFields: GateField[];
  warningFields: GateField[];
  manualReviewFields: MissingContractField[];
  message: string;
}

export interface GetContractGenerationGateInput {
  variables: Partial<ContractVariables>;
  companyLegalName?: string | null;
  companyAddress?: string | null;
  fieldSources?: Partial<Record<keyof ContractVariables, ContractFieldSource>>;
  manualReviewFields?: MissingContractField[];
}

function isFilled(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isPositiveNumeric(value: unknown): boolean {
  if (!isFilled(value)) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function valueFor(
  field: GateFieldKey,
  input: GetContractGenerationGateInput,
): unknown {
  if (field === "companyLegalName") return input.companyLegalName ?? "";
  if (field === "companyAddress") return input.companyAddress ?? "";
  return (input.variables as any)[field];
}

function isFieldValid(
  field: GateFieldKey,
  input: GetContractGenerationGateInput,
): boolean {
  const v = valueFor(field, input);
  if (field === "baseHourlyRate" || field === "weeklyHours") {
    return isPositiveNumeric(v);
  }
  return isFilled(v);
}

export function getContractGenerationGate(
  input: GetContractGenerationGateInput,
): ContractGenerationGate {
  const blockingFields: GateField[] = [];
  for (const f of HARD_REQUIRED_FIELDS) {
    if (!isFieldValid(f, input)) {
      blockingFields.push({ field: f, label: gateFieldLabel(f) });
    }
  }

  const warningFields: GateField[] = [];
  for (const f of SOFT_WARNING_FIELDS) {
    if (!isFieldValid(f, input)) {
      warningFields.push({ field: f, label: gateFieldLabel(f) });
    }
  }

  const manualReviewFields = (input.manualReviewFields ?? []).map((m) => ({
    field: m.field,
    label: m.label,
  }));

  const canGenerate = blockingFields.length === 0;
  const message = canGenerate
    ? "All required contract details are present. Please review carefully before generating."
    : "Contract cannot be generated yet. Please complete the required fields listed below.";

  return {
    canGenerate,
    blockingFields,
    warningFields,
    manualReviewFields,
    message,
  };
}
