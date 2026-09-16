/**
 * Documents & Compliance — shared taxonomy.
 * Pure constants and helpers. No side effects, no DB access.
 */

export const COMPLIANCE_CATEGORIES = [
  "Staff induction",
  "Allergens",
  "Food safety",
  "Health and safety",
  "Fire safety",
  "Alcohol licensing",
  "Age verification",
  "HR policies",
  "Cleaning procedures",
  "Opening and closing procedures",
  "Certificates",
  "Licences and permits",
  "Inspection records",
  "Council correspondence",
] as const;

export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number];

/** Staff role buckets used to target documents. */
export const STAFF_ROLES = [
  "Front of House",
  "Kitchen",
  "Supervisor",
  "Manager",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ALL_ROLES_LABEL = "All staff";
export const ALL_BRANCHES_LABEL = "All branches";

export const DOCUMENT_STATUSES = ["active", "expired", "archived"] as const;
export type ComplianceDocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/**
 * Best-effort mapping from a free-text department / job title to a role bucket.
 * Used only to pre-select the role in the induction wizard — the manager can change it.
 */
export function suggestStaffRole(
  department?: string | null,
  jobTitle?: string | null
): StaffRole | null {
  const haystack = `${department ?? ""} ${jobTitle ?? ""}`.toLowerCase();
  if (!haystack.trim()) return null;
  if (/(general manager|operations manager|\bmanager\b)/.test(haystack)) return "Manager";
  if (/(supervisor|team leader|shift lead)/.test(haystack)) return "Supervisor";
  if (/(kitchen|chef|boh|back of house|kp|porter)/.test(haystack)) return "Kitchen";
  if (/(front of house|foh|waiter|waitress|server|bar|host|runner)/.test(haystack))
    return "Front of House";
  return null;
}

/** Roles that may be authorised to sell alcohol. */
export function roleMaySellAlcohol(role?: string | null): boolean {
  if (!role) return false;
  return ["Front of House", "Supervisor", "Manager"].includes(role);
}
