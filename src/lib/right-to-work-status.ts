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

export type RtwCheckResult = "unlimited" | "time_limited" | "no_right_to_work";

export interface RtwCheck {
  check_method?: string;
  checked_on?: string | null;
  created_at?: string | null;
  result: RtwCheckResult;
  permission_expires_on?: string | null;
}

export interface RtwFollowUp {
  dueOn: string;
  daysLeft: number;
  overdue: boolean;
}

const RTW_DOC_TYPES: ReadonlySet<RtwDocumentType> = new Set([
  "passport",
  "visa",
  "biometric_residence_permit",
  "right_to_work",
]);

/**
 * Determine right-to-work clearance from onboarding data, stored documents,
 * and recorded right_to_work_checks rows.
 *
 * If `checks` has any rows, the latest one (by checked_on, then created_at)
 * is the sole authority:
 *   - unlimited → "cleared"
 *   - time_limited → "cleared" if permission_expires_on >= today, else "missing"
 *   - no_right_to_work → "rejected"
 *
 * If `checks` is empty, the original document/onboarding logic is used:
 *   - "cleared" if onboarding rtw_status is approved, or any qualifying document is verified.
 *   - "rejected" if rtw_status is rejected and no qualifying document is verified.
 *   - "pending" if rtw_status is submitted or pending_review, or a qualifying document
 *     exists but isn't verified.
 *   - "missing" otherwise.
 */
export function isRightToWorkCleared(
  onboardingData: RtwOnboardingData | null | undefined,
  documents: RtwDocument[] | null | undefined,
  checks: RtwCheck[] | null | undefined = [],
  today: Date = new Date()
): RightToWorkClearance {
  const checkRows = checks ?? [];
  if (checkRows.length > 0) {
    const latest = [...checkRows].sort((a, b) => {
      const aOn = a.checked_on ?? "";
      const bOn = b.checked_on ?? "";
      if (aOn !== bOn) return bOn.localeCompare(aOn);
      const aCreated = a.created_at ?? "";
      const bCreated = b.created_at ?? "";
      return bCreated.localeCompare(aCreated);
    })[0];

    if (latest.result === "unlimited") return "cleared";
    if (latest.result === "no_right_to_work") return "rejected";
    // time_limited
    const expiry = latest.permission_expires_on;
    if (!expiry) return "missing";
    const todayStr = today.toISOString().slice(0, 10);
    if (expiry >= todayStr) return "cleared";
    return "missing";
  }

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

/**
 * Return follow-up info for a time-limited right-to-work check.
 *
 * Looks at the latest check (by checked_on, then created_at). Returns null
 * unless the latest result is "time_limited", in which case returns
 * { dueOn, daysLeft, overdue } where dueOn is permission_expires_on.
 */
export function rightToWorkFollowUp(
  checks: RtwCheck[] | null | undefined,
  today: Date = new Date()
): RtwFollowUp | null {
  const checkRows = checks ?? [];
  if (checkRows.length === 0) return null;

  const latest = [...checkRows].sort((a, b) => {
    const aOn = a.checked_on ?? "";
    const bOn = b.checked_on ?? "";
    if (aOn !== bOn) return bOn.localeCompare(aOn);
    const aCreated = a.created_at ?? "";
    const bCreated = b.created_at ?? "";
    return bCreated.localeCompare(aCreated);
  })[0];

  if (latest.result !== "time_limited") return null;

  const dueOn = latest.permission_expires_on ?? "";
  const todayStr = today.toISOString().slice(0, 10);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.round(
    (new Date(dueOn).getTime() - new Date(todayStr).getTime()) / msPerDay
  );

  return {
    dueOn,
    daysLeft,
    overdue: daysLeft < 0,
  };
}
