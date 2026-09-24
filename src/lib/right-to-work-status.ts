// Pure right-to-work clearance logic. No database or React code.
// Used by onboarding/payroll flows to gate approvals on statutory RTW evidence.

export type RtwStatus =
  | "approved"
  | "rejected"
  | "submitted"
  | "pending_review"
  | "not_submitted";

export type RtwDocumentType =
  | "passport"
  | "visa"
  | "biometric_residence_permit"
  | "right_to_work";

export type RtwDocumentStatus =
  | "verified"
  | "pending"
  | "rejected"
  | "expired";

export interface RtwOnboardingData {
  rtw_status?: RtwStatus | null;
}

export interface RtwDocument {
  document_type: RtwDocumentType;
  document_status: RtwDocumentStatus;
}

export type RightToWorkClearance =
  | "cleared"
  | "rejected"
  | "pending"
  | "missing";

const RTW_DOC_TYPES: ReadonlySet<RtwDocumentType> = new Set([
  "passport",
  "visa",
  "biometric_residence_permit",
  "right_to_work",
]);

/**
 * Determine right-to-work clearance from onboarding data and stored documents.
 *
 * - "cleared" if onboarding rtw_status is approved, or any qualifying document is verified.
 * - "rejected" if rtw_status is rejected and no qualifying document is verified.
 * - "pending" if rtw_status is submitted or pending_review, or a qualifying document
 *   exists but isn't verified.
 * - "missing" otherwise.
 */
export function isRightToWorkCleared(
  onboardingData: RtwOnboardingData | null | undefined,
  documents: RtwDocument[] | null | undefined
): RightToWorkClearance {
  const docs = documents ?? [];
  const qualifying = docs.filter((d) => RTW_DOC_TYPES.has(d.document_type));
  const verified = qualifying.some((d) => d.document_status === "verified");
  const rtwStatus = onboardingData?.rtw_status ?? null;

  if (verified) return "cleared";
  if (rtwStatus === "approved") return "cleared";
  if (rtwStatus === "rejected" && !verified) return "rejected";
  if (rtwStatus === "submitted" || rtwStatus === "pending_review") return "pending";
  if (qualifying.length > 0 && !verified) return "pending";
  return "missing";
}
