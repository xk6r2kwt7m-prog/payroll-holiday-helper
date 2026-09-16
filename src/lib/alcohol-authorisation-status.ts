/**
 * Alcohol-sales authorisation status resolution.
 * Pure functions — no DB access.
 */

export type AlcoholAuthStatus = "pending" | "active" | "revoked" | "archived";

export interface AuthorisationRecord {
  id: string;
  employee_id: string;
  status: string;
  branch?: string | null;
  authorised_at?: string | null;
  authoriser_confirmed_at?: string | null;
  employee_signed_at?: string | null;
  revoked_at?: string | null;
  created_at?: string | null;
}

export interface AuthorisationSubject {
  /** Employee lifecycle status, e.g. "active" | "leaver" | "starter". */
  status?: string | null;
  archived_at?: string | null;
}

/** Roles permitted to approve an alcohol-sales authorisation. */
export const APPROVER_ROLES = ["dps", "personal_licence_holder"] as const;
export type ApproverRole = (typeof APPROVER_ROLES)[number];

export function canApproveAuthorisation(
  appRole: string | null | undefined,
  approverRole: string | null | undefined
): boolean {
  if (appRole !== "admin" && appRole !== "manager") return false;
  return (APPROVER_ROLES as readonly string[]).includes(approverRole ?? "");
}

/**
 * The effective status of an authorisation, taking the employee's
 * lifecycle into account. Leavers and archived staff are never authorised.
 */
export function resolveAuthorisationStatus(
  record: AuthorisationRecord | null | undefined,
  subject?: AuthorisationSubject
): AlcoholAuthStatus | "none" {
  if (!record) return "none";
  const hasLeft = subject?.status === "leaver" || !!subject?.archived_at;
  if (hasLeft) {
    return record.status === "archived" ? "archived" : "revoked";
  }
  if (record.status === "active") {
    // Both signatures required for a live authorisation.
    return record.employee_signed_at && record.authoriser_confirmed_at ? "active" : "pending";
  }
  if (["pending", "revoked", "archived"].includes(record.status)) {
    return record.status as AlcoholAuthStatus;
  }
  return "pending";
}

export function isAuthorisedToSellAlcohol(
  record: AuthorisationRecord | null | undefined,
  subject?: AuthorisationSubject
): boolean {
  return resolveAuthorisationStatus(record, subject) === "active";
}

export function authorisationLabel(status: AlcoholAuthStatus | "none"): string {
  switch (status) {
    case "active":
      return "Authorised to sell alcohol";
    case "pending":
      return "Awaiting authorisation";
    case "revoked":
      return "Authorisation revoked";
    case "archived":
      return "Authorisation archived";
    default:
      return "No authorisation on record";
  }
}

export function authorisationTone(
  status: AlcoholAuthStatus | "none"
): "green" | "amber" | "red" | "grey" {
  switch (status) {
    case "active":
      return "green";
    case "pending":
      return "amber";
    case "revoked":
      return "red";
    default:
      return "grey";
  }
}

/** Picks the most relevant authorisation for an employee (latest live one first). */
export function latestAuthorisation(
  records: AuthorisationRecord[]
): AuthorisationRecord | null {
  if (records.length === 0) return null;
  const rank = (s: string) => (s === "active" ? 0 : s === "pending" ? 1 : 2);
  return [...records].sort((a, b) => {
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  })[0];
}
