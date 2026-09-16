/**
 * Contract sending rules — pure, deterministic logic.
 *
 * Decides whether a contract may be emailed to a team member, based on:
 *  - the tenant-level policy (`contract_send_mode`)
 *  - whether the employer has already countersigned
 *  - a per-contract "send later" date chosen by the admin
 *
 * No data is mutated here. Callers use the result to enable/disable the
 * Send action and to explain the reason to the admin.
 */

export type ContractSendMode = "manual" | "after_employer_signs";

export const CONTRACT_SEND_MODE_LABELS: Record<ContractSendMode, string> = {
  manual: "Send only when I press Send",
  after_employer_signs: "Send only after I have signed it",
};

export function normaliseSendMode(value: unknown): ContractSendMode {
  return value === "after_employer_signs" ? "after_employer_signs" : "manual";
}

export interface SendEvaluationInput {
  mode: ContractSendMode;
  employerSigned: boolean;
  /** ISO timestamp of the per-contract scheduled send date, if any. */
  scheduledSendAt?: string | null;
  now?: Date;
}

export type SendBlockReason =
  | "employer_signature_required"
  | "scheduled_for_later"
  | null;

export interface SendEvaluation {
  /** True when the admin may send the contract right now. */
  canSend: boolean;
  reason: SendBlockReason;
  /** Human-readable explanation for the admin (empty when sendable). */
  message: string;
  /** True when a future send date is set and has not yet arrived. */
  scheduledPending: boolean;
  /** True when a send date is set and has now arrived (send is due). */
  scheduledDue: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function evaluateContractSend(input: SendEvaluationInput): SendEvaluation {
  const now = input.now ?? new Date();
  const scheduled = input.scheduledSendAt ? new Date(input.scheduledSendAt) : null;
  const validSchedule = scheduled && !Number.isNaN(scheduled.getTime()) ? scheduled : null;
  const scheduledPending = !!validSchedule && validSchedule.getTime() > now.getTime();
  const scheduledDue = !!validSchedule && validSchedule.getTime() <= now.getTime();

  if (input.mode === "after_employer_signs" && !input.employerSigned) {
    return {
      canSend: false,
      reason: "employer_signature_required",
      message:
        "Your signature is required first. Sign the contract, then it can be sent to the team member.",
      scheduledPending,
      scheduledDue,
    };
  }

  if (scheduledPending && validSchedule) {
    return {
      canSend: false,
      reason: "scheduled_for_later",
      message: `Scheduled to be sent on ${formatDate(validSchedule.toISOString())}. You can send it earlier by clearing the date.`,
      scheduledPending,
      scheduledDue,
    };
  }

  return { canSend: true, reason: null, message: "", scheduledPending, scheduledDue };
}
