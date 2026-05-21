/**
 * Phase 5J — Pure helper that derives a contract draft readiness status from
 * the existing review primitives (missing critical fields + resolved
 * field sources).
 *
 * Strictly read-only:
 * - No React hooks
 * - No Supabase / network I/O
 * - No mutation of inputs
 * - Does not generate, sign, lock, send, or issue a contract.
 */
import type { ContractVariables } from "@/components/contracts/contractTemplates";
import {
  CRITICAL_CONTRACT_FIELDS,
  CONTRACT_FIELD_LABELS,
  type ContractFieldSource,
  type MissingContractField,
} from "@/lib/contract-form-review";

export type ContractReadinessStatus =
  | "ready"
  | "missing_details"
  | "needs_review";

export interface ContractReadinessResult {
  status: ContractReadinessStatus;
  missing: MissingContractField[];
  manualCriticalFields: MissingContractField[];
  bannerTitle: string;
  bannerDescription: string;
  bannerTone: "info" | "warning";
}

const STATUS_COPY: Record<
  ContractReadinessStatus,
  { title: string; description: string; tone: "info" | "warning" }
> = {
  ready: {
    title: "Ready to generate",
    description:
      "Please review the details before creating the contract.",
    tone: "info",
  },
  missing_details: {
    title: "Some important contract details are missing",
    description:
      "Please review and complete the missing fields before generating.",
    tone: "warning",
  },
  needs_review: {
    title: "This contract contains manually entered details",
    description:
      "Please check the manually entered fields carefully before generating.",
    tone: "warning",
  },
};

export function deriveContractReadiness(args: {
  missing: MissingContractField[];
  sources: Partial<Record<keyof ContractVariables, ContractFieldSource>>;
}): ContractReadinessResult {
  const manualCriticalFields: MissingContractField[] = [];
  for (const field of CRITICAL_CONTRACT_FIELDS) {
    if (args.sources[field] === "manual") {
      manualCriticalFields.push({
        field,
        label: CONTRACT_FIELD_LABELS[field] || String(field),
      });
    }
  }

  let status: ContractReadinessStatus;
  if (args.missing.length > 0) {
    status = "missing_details";
  } else if (manualCriticalFields.length > 0) {
    status = "needs_review";
  } else {
    status = "ready";
  }

  const copy = STATUS_COPY[status];
  return {
    status,
    missing: args.missing,
    manualCriticalFields,
    bannerTitle: copy.title,
    bannerDescription: copy.description,
    bannerTone: copy.tone,
  };
}
