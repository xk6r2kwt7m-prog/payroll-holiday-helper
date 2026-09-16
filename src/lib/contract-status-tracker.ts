/**
 * Contract flow — plain-English status tracker (pure).
 *
 * Maps the stored contract state (plus the details-first flags) onto one of
 * the statuses the admin sees. Display only: it never mutates a contract and
 * never changes payroll, holiday, NMW or service-charge logic.
 */

export type ContractTrackerStatus =
  | "draft"
  | "waiting_for_staff_details"
  | "ready_to_send"
  | "sent_for_signing"
  | "signed_by_staff"
  | "awaiting_company_review"
  | "accepted_and_countersigned"
  | "completed"
  | "rejected";

export interface ContractTrackerInput {
  contractState?: string | null;
  requiresDetailsFirst?: boolean | null;
  detailsSubmittedAt?: string | null;
  contractSendStatus?: string | null;
  reviewAcceptedAt?: string | null;
  employeeSigned?: boolean;
  employerSigned?: boolean;
}

export interface ContractTrackerResult {
  status: ContractTrackerStatus;
  label: string;
  tone: "neutral" | "action" | "waiting" | "done" | "warning";
}

const LABELS: Record<ContractTrackerStatus, { label: string; tone: ContractTrackerResult["tone"] }> = {
  draft: { label: "Draft", tone: "neutral" },
  waiting_for_staff_details: { label: "Waiting for staff details", tone: "waiting" },
  ready_to_send: { label: "Ready to send", tone: "action" },
  sent_for_signing: { label: "Sent for signing", tone: "waiting" },
  signed_by_staff: { label: "Signed by staff", tone: "action" },
  awaiting_company_review: { label: "Awaiting company review", tone: "action" },
  accepted_and_countersigned: { label: "Accepted and countersigned", tone: "done" },
  completed: { label: "Completed", tone: "done" },
  rejected: { label: "Rejected — needs correction", tone: "warning" },
};

export function resolveContractTrackerStatus(input: ContractTrackerInput): ContractTrackerResult {
  const state = (input.contractState || "draft").trim();

  let status: ContractTrackerStatus;

  if (state === "rejected") {
    status = "rejected";
  } else if (state === "signed" || state === "superseded" || state === "terminated") {
    status = input.reviewAcceptedAt ? "completed" : "accepted_and_countersigned";
  } else if (state === "employer_signed") {
    status = "accepted_and_countersigned";
  } else if (state === "employee_signed") {
    status = "awaiting_company_review";
  } else if (state === "sent" || input.contractSendStatus === "sent") {
    // Details-first contracts stay "waiting for staff details" until submitted.
    status =
      input.requiresDetailsFirst && !input.detailsSubmittedAt
        ? "waiting_for_staff_details"
        : "sent_for_signing";
  } else if (input.requiresDetailsFirst && !input.detailsSubmittedAt) {
    status = "draft";
  } else {
    status = "ready_to_send";
  }

  return { status, ...LABELS[status] };
}

export function contractTrackerLabel(status: ContractTrackerStatus): string {
  return LABELS[status].label;
}
