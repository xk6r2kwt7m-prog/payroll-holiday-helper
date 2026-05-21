/**
 * Phase 5N — Pure helpers protecting signed/locked contracts from silent edits.
 *
 * These helpers are advisory and used by UI guards. The authoritative lock is
 * still enforced by the database (RLS + signed-contract triggers).
 *
 * Strictly read-only:
 * - No React, Supabase, React Query
 * - No mutation of inputs
 * - No side effects
 */
import {
  isContractLocked,
  workflowStatusFromContractState,
  type ContractWorkflowStatus,
} from "@/lib/contract-status-transitions";

export interface ContractLockGuard {
  isLocked: boolean;
  workflowStatus: ContractWorkflowStatus;
  warningTitle: string | null;
  warningMessage: string | null;
  allowedActions: ReadonlyArray<
    "view" | "amend" | "supersede" | "terminate" | "edit_draft"
  >;
}

const LOCKED_WARNING = {
  title: "Signed contract — protected from edits",
  message:
    "This contract has already been signed. Changes must be made through a new version or amendment.",
};

const SUPERSEDED_WARNING = {
  title: "Contract has been superseded",
  message:
    "A newer version of this contract exists. The original is preserved as a historical record.",
};

const VOIDED_WARNING = {
  title: "Contract voided",
  message:
    "This contract has been voided and is kept only as a historical record.",
};

export function getContractLockGuard(
  contractState: string | null | undefined,
): ContractLockGuard {
  const status = workflowStatusFromContractState(contractState);
  const locked = isContractLocked(status);

  let warningTitle: string | null = null;
  let warningMessage: string | null = null;
  let allowedActions: ContractLockGuard["allowedActions"] = ["view", "edit_draft"];

  if (status === "signed" || status === "locked") {
    warningTitle = LOCKED_WARNING.title;
    warningMessage = LOCKED_WARNING.message;
    allowedActions = ["view", "amend", "supersede", "terminate"];
  } else if (status === "superseded") {
    warningTitle = SUPERSEDED_WARNING.title;
    warningMessage = SUPERSEDED_WARNING.message;
    allowedActions = ["view"];
  } else if (status === "voided") {
    warningTitle = VOIDED_WARNING.title;
    warningMessage = VOIDED_WARNING.message;
    allowedActions = ["view"];
  } else if (status === "issued") {
    warningTitle = "Contract has been issued";
    warningMessage =
      "This contract has already been issued. Editing it may require reissue.";
    allowedActions = ["view", "amend"];
  } else if (status === "generated") {
    allowedActions = ["view", "edit_draft"];
  }

  return {
    isLocked: locked,
    workflowStatus: status,
    warningTitle,
    warningMessage,
    allowedActions,
  };
}

/**
 * Returns true if the given draft form values are safe to apply to a contract
 * in the given state. Signed/locked contracts must NEVER receive silent edits.
 */
export function canApplyDraftEdits(
  contractState: string | null | undefined,
): boolean {
  const guard = getContractLockGuard(contractState);
  return !guard.isLocked && guard.workflowStatus !== "issued";
}
