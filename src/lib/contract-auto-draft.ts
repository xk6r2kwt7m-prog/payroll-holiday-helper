/**
 * When is a contract ready to be prepared on its own?
 *
 * Pure decision helper — no hooks, no network, nothing written anywhere. It
 * answers one question: has everything a manager must approve been approved,
 * so the contract can be prepared from the approved details?
 *
 * Nothing here signs, sends or emails anything. Preparing a contract produces a
 * draft only; issuing it stays a separate, manual decision.
 */

export interface AutoDraftChange {
  field_name: string;
  field_label: string;
  state: "pending" | "accepted" | "rejected";
  needs_review: boolean;
}

export interface ContractAutoDraftInput {
  /** Everything the person submitted, with its decision state. */
  changes: readonly AutoDraftChange[];
  /** Right-to-work state on the record: requested / submitted / verified / rejected / expired. */
  rtwStatus?: string | null;
  /** True when a bank change is accepted but not yet confirmed directly with the employee. */
  bankAwaitingDirectConfirmation?: boolean;
  /** Contract fields still missing from the record (labels, from the existing gate). */
  missingContractFields?: readonly string[];
  /** True when this person already has a contract on file. */
  hasContract?: boolean;
}

export interface ContractAutoDraftResult {
  /** True when the draft can be prepared now. */
  ready: boolean;
  /** Plain-English list of what is still outstanding. */
  outstanding: string[];
}

export function evaluateContractAutoDraft(
  input: ContractAutoDraftInput,
): ContractAutoDraftResult {
  const outstanding: string[] = [];

  const pending = input.changes.filter((c) => c.state === "pending" && c.needs_review);
  for (const c of pending) outstanding.push(`${c.field_label} is waiting for your decision`);

  if (input.bankAwaitingDirectConfirmation) {
    outstanding.push("Bank details still need confirming directly with the employee");
  }

  const rtw = (input.rtwStatus ?? "").trim();
  if (rtw !== "verified") {
    outstanding.push(
      rtw === "rejected" || rtw === "expired"
        ? "Right to work is not acceptable — new evidence is needed"
        : "Right to work has not been checked yet",
    );
  }

  for (const label of input.missingContractFields ?? []) {
    outstanding.push(`${label} is still missing`);
  }

  if (input.hasContract) {
    outstanding.push("This person already has a contract on file");
  }

  return { ready: outstanding.length === 0, outstanding };
}
