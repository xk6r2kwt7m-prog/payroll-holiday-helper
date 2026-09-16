/**
 * Document record vocabulary: why a document is held, and where it sits in the
 * approval process. Draft and rejected documents are never given to staff.
 */

export const REQUIREMENT_CLASSIFICATIONS = [
  { value: "legal_requirement", label: "Legal requirement" },
  { value: "premises_licence_condition", label: "Premises licence condition" },
  { value: "council_or_inspector_request", label: "Council or inspector request" },
  { value: "operational_good_practice", label: "Operational good practice" },
  { value: "corrective_action", label: "Corrective action" },
  { value: "staff_training_document", label: "Staff training document" },
] as const;

export const APPROVAL_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "awaiting_approval", label: "Awaiting approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]["value"];

export function requirementLabel(value?: string | null): string {
  return REQUIREMENT_CLASSIFICATIONS.find((r) => r.value === value)?.label ?? "Not classified";
}

export function approvalLabel(value?: string | null): string {
  return APPROVAL_STATUSES.find((a) => a.value === value)?.label ?? "Draft";
}

export function approvalTone(value?: string | null): "green" | "amber" | "red" | "grey" {
  switch (value) {
    case "approved":
      return "green";
    case "awaiting_approval":
      return "amber";
    case "rejected":
      return "red";
    default:
      return "grey";
  }
}

/**
 * Whether a document may be sent to staff or included in an induction pack.
 * Drafts and rejected documents are held back; documents created before the
 * approval process existed are marked "awaiting approval" and stay usable so
 * nothing already in service stops working.
 */
export function isAvailableToStaff(doc: {
  status?: string | null;
  approval_status?: string | null;
}): boolean {
  if (doc.status === "archived") return false;
  const approval = doc.approval_status ?? "draft";
  return approval === "approved" || approval === "awaiting_approval";
}

/** Documents a manager still needs to make an approval decision on. */
export function needsApprovalDecision(doc: {
  status?: string | null;
  approval_status?: string | null;
}): boolean {
  return doc.status !== "archived" && (doc.approval_status ?? "draft") !== "approved";
}
