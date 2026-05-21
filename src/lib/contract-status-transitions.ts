/**
 * Phase 5N — Pure status-transition helper for contract workflow.
 *
 * Combines the DB-aligned ContractState model from `contract-amendments.ts`
 * with the conceptual workflow statuses introduced in Phase 5M.
 *
 * Allowed conceptual transitions:
 *   draft      → generated
 *   generated  → issued
 *   issued     → signed
 *   signed     → locked
 *   signed     → superseded   (only via new version / amendment)
 *   generated  → voided
 *   issued     → voided
 *
 * Blocked transitions:
 *   signed     → draft / generated / issued
 *   locked     → anything (terminal except superseded via amendment chain)
 *   issued     → draft (without controlled void/reissue)
 *   any        → signed without `hasSignature`
 *   any        → generated without `hasGeneratedDocument`
 *
 * Strictly read-only:
 * - No React, Supabase, React Query
 * - No mutation of inputs
 * - No side effects
 */

export type ContractWorkflowStatus =
  | "draft"
  | "generated"
  | "issued"
  | "signed"
  | "locked"
  | "superseded"
  | "voided";

export interface CanTransitionInput {
  fromStatus: ContractWorkflowStatus;
  toStatus: ContractWorkflowStatus;
  hasSignature?: boolean;
  hasGeneratedDocument?: boolean;
  /** Optional role hint; reserved for future role-gated transitions. */
  userRole?: string | null;
}

export interface TransitionResult {
  allowed: boolean;
  reason: string | null;
}

const ALLOWED_BASE: Record<ContractWorkflowStatus, ContractWorkflowStatus[]> = {
  draft: ["generated", "voided"],
  generated: ["issued", "voided"],
  issued: ["signed", "voided"],
  signed: ["locked", "superseded"],
  locked: ["superseded"],
  superseded: [],
  voided: [],
};

export function canTransitionContractStatus(
  input: CanTransitionInput,
): TransitionResult {
  const { fromStatus, toStatus, hasSignature, hasGeneratedDocument } = input;

  if (fromStatus === toStatus) {
    return { allowed: false, reason: "Already in this status." };
  }

  const allowedTargets = ALLOWED_BASE[fromStatus] ?? [];
  if (!allowedTargets.includes(toStatus)) {
    return {
      allowed: false,
      reason: `Transition from "${fromStatus}" to "${toStatus}" is not allowed.`,
    };
  }

  if (toStatus === "generated" && hasGeneratedDocument === false) {
    return {
      allowed: false,
      reason: "Cannot mark as generated without a generated PDF document.",
    };
  }

  if (toStatus === "signed" && hasSignature !== true) {
    return {
      allowed: false,
      reason:
        "Cannot mark as signed without a completed signature. Signing must come from the real signature flow.",
    };
  }

  return { allowed: true, reason: null };
}

/** Locked terminal statuses — never silently editable. */
export const LOCKED_STATUSES: ReadonlySet<ContractWorkflowStatus> = new Set([
  "signed",
  "locked",
  "superseded",
  "voided",
]);

export function isContractLocked(status: ContractWorkflowStatus): boolean {
  return LOCKED_STATUSES.has(status);
}

/** Map the DB-aligned ContractState enum onto the workflow status concept. */
export function workflowStatusFromContractState(
  state: string | null | undefined,
): ContractWorkflowStatus {
  switch (state) {
    case "draft":
      return "draft";
    case "issued":
      return "issued";
    case "signed":
      return "signed";
    case "superseded":
      return "superseded";
    case "terminated":
      return "voided";
    default:
      return "draft";
  }
}
