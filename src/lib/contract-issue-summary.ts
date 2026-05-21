/**
 * Phase 5M — Pure helper that builds an "Issue contract" confirmation
 * summary from the current draft state.
 *
 * The summary is presented to the manager BEFORE they issue/send the
 * contract to the employee. It does not send, sign, lock, persist, or
 * mutate anything.
 *
 * The conceptual workflow this supports:
 *
 *   draft  ─►  generated  ─►  issued  ─►  signed  ─►  locked
 *
 * - draft       : being prepared in the form
 * - generated   : PDF created + stored, but not yet sent to the employee
 * - issued      : manager has explicitly confirmed and sent for signature
 * - signed      : actual signature(s) completed via the existing signing flow
 * - locked      : reserved for Phase 5N (immutable post-signature lock)
 *
 * Generating a contract is intentionally NOT the same as issuing it.
 *
 * Strictly read-only:
 * - No React hooks
 * - No Supabase / network I/O
 * - No React Query
 * - No mutation of inputs
 */
import type { ContractVariables } from "@/components/contracts/contractTemplates";
import { getEmploymentTypeLabel } from "@/components/contracts/contractTemplates";
import {
  CONTRACT_FIELD_LABELS,
  type MissingContractField,
} from "@/lib/contract-form-review";
import type { ContractGenerationGate } from "@/lib/contract-generation-gate";
import {
  payDetailsStatusLabel,
  reportingManagerStatusLabel,
  type ContractDraftEvidence,
} from "@/lib/contract-draft-evidence";

export type ContractWorkflowStatus =
  | "draft"
  | "generated"
  | "issued"
  | "signed"
  | "locked"
  | "voided";

export function contractWorkflowStatusLabel(s: ContractWorkflowStatus): string {
  switch (s) {
    case "draft":
      return "Draft";
    case "generated":
      return "Generated (not yet issued)";
    case "issued":
      return "Issued — awaiting signature";
    case "signed":
      return "Signed";
    case "locked":
      return "Locked";
    case "voided":
      return "Voided";
  }
}

export interface ContractIssueSummary {
  employeeName: string;
  jobTitle: string;
  employmentTypeLabel: string;
  startDate: string;
  workLocation: string;
  reportingManagerLine: string;
  paySummary: string;
  payDetailsStatusLabel: string;
  reportingManagerStatusLabel: string;
  hasSoftWarnings: boolean;
  softWarningLabels: string[];
  hasManualCriticalFields: boolean;
  manualCriticalFieldLabels: string[];
  manualCriticalFields: MissingContractField[];
  canIssue: boolean;
  blockingReason: string | null;
  confirmationMessage: string;
}

export interface BuildContractIssueSummaryInput {
  variables: Partial<ContractVariables>;
  contractTypeLabel?: string;
  gate: ContractGenerationGate;
  evidence: ContractDraftEvidence;
  /**
   * Whether a generated/saved contract already exists. The issue action is
   * only available after generation has happened.
   */
  isGenerated: boolean;
}

function trim(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function buildPaySummary(v: Partial<ContractVariables>): string {
  const base = trim(v.baseHourlyRate);
  const hours = trim(v.weeklyHours);
  const parts: string[] = [];
  if (base) parts.push(`£${base}/hour base`);
  if (hours) parts.push(`${hours} hrs/week`);
  const gsc = Number(v.guaranteedServiceChargeRate);
  const esc = Number(v.estimatedServiceChargeRate);
  if (Number.isFinite(gsc) && gsc > 0) parts.push(`+ £${gsc}/hr guaranteed SC`);
  else if (Number.isFinite(esc) && esc > 0) parts.push(`+ £${esc}/hr estimated SC`);
  const tronc = trim(v.troncSchemeName);
  if (tronc) parts.push(`tronc: ${tronc}`);
  return parts.length ? parts.join(" · ") : "Pay details missing";
}

function buildReportingManagerLine(v: Partial<ContractVariables>): string {
  const name = trim(v.reportingManagerName);
  const title = trim(v.reportingManagerTitle);
  if (name && title) return `${name} (${title})`;
  if (name) return name;
  if (title) return title;
  return "Not set";
}

export function buildContractIssueSummary(
  input: BuildContractIssueSummaryInput,
): ContractIssueSummary {
  const v = input.variables || {};
  const softWarningLabels = input.gate.warningFields.map((w) => w.label);
  const manualCriticalFields = input.evidence.manuallyEnteredCriticalFields.map(
    (m) => ({
      field: m.field,
      label: CONTRACT_FIELD_LABELS[m.field] || m.label || String(m.field),
    }),
  );

  let canIssue = true;
  let blockingReason: string | null = null;
  if (!input.isGenerated) {
    canIssue = false;
    blockingReason = "Contract must be generated before it can be issued.";
  } else if (!input.gate.canGenerate) {
    canIssue = false;
    blockingReason = input.gate.message;
  }

  return {
    employeeName: trim(v.employeeName) || "Unnamed employee",
    jobTitle: trim(v.jobTitle) || "Not set",
    employmentTypeLabel: v.employmentType
      ? getEmploymentTypeLabel(v.employmentType)
      : "Not set",
    startDate: trim(v.effectiveDate) || "Not set",
    workLocation: trim(v.workLocation) || "Not set",
    reportingManagerLine: buildReportingManagerLine(v),
    paySummary: buildPaySummary(v),
    payDetailsStatusLabel: payDetailsStatusLabel(input.evidence.payDetailsStatus),
    reportingManagerStatusLabel: reportingManagerStatusLabel(
      input.evidence.reportingManagerStatus,
    ),
    hasSoftWarnings: softWarningLabels.length > 0,
    softWarningLabels,
    hasManualCriticalFields: manualCriticalFields.length > 0,
    manualCriticalFieldLabels: manualCriticalFields.map((m) => m.label),
    manualCriticalFields,
    canIssue,
    blockingReason,
    confirmationMessage:
      "You are about to issue this contract to the employee. Please confirm the details have been reviewed.",
  };
}
