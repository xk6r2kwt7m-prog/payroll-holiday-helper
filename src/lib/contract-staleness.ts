/**
 * Contract flow — stale draft detection (pure).
 *
 * If the staff member's details changed after a contract PDF was generated,
 * the draft may carry old data. We never rewrite the draft silently; we warn
 * and ask the manager to review and regenerate.
 */

export const STALE_CONTRACT_WARNING =
  "Staff details changed after this contract was generated. Please review and regenerate before sending.";

export interface StaleContractInput {
  /** When the contract PDF was generated / saved. */
  generatedAt?: string | null;
  /** Latest change to the employee record. */
  employeeUpdatedAt?: string | null;
  /** When the staff member submitted their own details. */
  detailsSubmittedAt?: string | null;
  /** Signed contracts are locked — never flagged as stale. */
  contractState?: string | null;
}

export interface StaleContractResult {
  isStale: boolean;
  warning: string;
  /** Which source changed after generation, for the audit trail. */
  reasons: string[];
}

const LOCKED_STATES = ["signed", "superseded", "terminated", "employer_signed"];

function time(value?: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

export function detectStaleContractDraft(input: StaleContractInput): StaleContractResult {
  const state = (input.contractState || "draft").trim();
  const generated = time(input.generatedAt);

  if (!generated || LOCKED_STATES.includes(state)) {
    return { isStale: false, warning: "", reasons: [] };
  }

  const reasons: string[] = [];
  const employeeChanged = time(input.employeeUpdatedAt);
  const detailsSubmitted = time(input.detailsSubmittedAt);

  if (employeeChanged !== null && employeeChanged > generated) reasons.push("employee_record");
  if (detailsSubmitted !== null && detailsSubmitted > generated) reasons.push("staff_details");

  const isStale = reasons.length > 0;
  return { isStale, warning: isStale ? STALE_CONTRACT_WARNING : "", reasons };
}
