/**
 * Contract next-step resolution (pure).
 *
 * Turns the signing state of a contract into a single, explicit next action for
 * the admin. Deterministic — no inference, no hidden rules.
 */

export type ContractSigningStage =
  | "draft"
  | "scheduled"
  | "sent"
  | "employee_signed"
  | "employer_signed"
  | "fully_signed"
  | "locked";

export type ContractNextStepTone = "action" | "waiting" | "done";

export interface ContractNextStepInput {
  /** Employee has signed. */
  employeeSigned: boolean;
  /** Employer (admin) has signed. */
  employerSigned: boolean;
  /** Contract has been emailed to the employee. */
  sent: boolean;
  /** ISO datetime the contract is scheduled to be sent, if any. */
  scheduledSendAt?: string | null;
  /** Contract lifecycle state from the record (superseded/terminated are terminal). */
  contractState?: string | null;
  /** Whether the completed copy was already emailed to the employee. */
  signedCopySent?: boolean;
  /** Employee first name (or full name) for the message. */
  employeeName?: string;
  /** Now, for scheduled comparisons. */
  now?: Date;
}

export interface ContractNextStep {
  stage: ContractSigningStage;
  tone: ContractNextStepTone;
  /** Short label describing what must happen next. */
  label: string;
  /** Label for the action button, or null when there is nothing to do. */
  actionLabel: string | null;
  /** Which action the button should trigger. */
  action: "send" | "countersign" | "remind" | "send_signed_copy" | "view" | null;
}

const TERMINAL_STATES = ["superseded", "terminated"];

export function resolveContractNextStep(input: ContractNextStepInput): ContractNextStep {
  const name = (input.employeeName || "the employee").trim();
  const state = (input.contractState || "").toLowerCase();

  if (TERMINAL_STATES.includes(state)) {
    return {
      stage: "locked",
      tone: "done",
      label: state === "terminated" ? "Terminated — no action needed" : "Replaced by a newer version",
      actionLabel: "View",
      action: "view",
    };
  }

  if (input.employeeSigned && input.employerSigned) {
    return input.signedCopySent
      ? {
          stage: "fully_signed",
          tone: "done",
          label: "Fully signed — signed copy sent",
          actionLabel: "Send again",
          action: "send_signed_copy",
        }
      : {
          stage: "fully_signed",
          tone: "action",
          label: `Fully signed — send the signed copy to ${name}`,
          actionLabel: "Send signed copy",
          action: "send_signed_copy",
        };
  }

  if (input.employeeSigned && !input.employerSigned) {
    return {
      stage: "employee_signed",
      tone: "action",
      label: `${name} has signed — your signature completes it`,
      actionLabel: "Sign now",
      action: "countersign",
    };
  }

  if (input.employerSigned && !input.employeeSigned) {
    return {
      stage: "employer_signed",
      tone: "waiting",
      label: `You have signed — waiting for ${name}`,
      actionLabel: "Send reminder",
      action: "remind",
    };
  }

  if (input.scheduledSendAt) {
    const when = new Date(input.scheduledSendAt);
    const now = input.now ?? new Date();
    if (!Number.isNaN(when.getTime()) && when.getTime() > now.getTime()) {
      return {
        stage: "scheduled",
        tone: "waiting",
        label: `Scheduled to send on ${when.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
        actionLabel: "Change date",
        action: "view",
      };
    }
  }

  if (input.sent) {
    return {
      stage: "sent",
      tone: "waiting",
      label: `Sent — waiting for ${name} to sign`,
      actionLabel: "Send reminder",
      action: "remind",
    };
  }

  return {
    stage: "draft",
    tone: "action",
    label: `Not sent yet — send it to ${name} to sign`,
    actionLabel: "Send contract",
    action: "send",
  };
}
