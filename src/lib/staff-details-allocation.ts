/**
 * Staff-supplied details → employee record allocation rules.
 *
 * When a staff member completes their details link, the answers must land in
 * the right part of the system automatically so the same information is never
 * asked for twice. Payroll and identity fields, however, may never be
 * silently overwritten (no silent changes rule), so this module splits the
 * submission into:
 *
 *  - updates   : safe to write to the employee record now
 *  - conflicts : a value already exists and differs — needs admin confirmation
 *
 * Pure module: no React, no Supabase, no I/O, never mutates inputs.
 *
 * NOTE: `supabase/functions/staff-details-portal/allocation.ts` is a byte-for-byte
 * copy of this file so the edge function applies exactly the same rules.
 * Keep them identical (a test enforces this).
 */

export interface StaffFieldRule {
  /** Column on the employees table. */
  column: string;
  /** Plain-English label shown to the admin. */
  label: string;
  /**
   * true  = identity / payroll critical. Only written when currently empty;
   *         a different existing value becomes a confirmation item.
   * false = descriptive. The newest answer from the staff member wins.
   */
  critical: boolean;
  /**
   * true = never written automatically, even when the record is blank. Bank
   * details always wait for an administrator, who must confirm the change
   * directly with the employee before pay uses the new account.
   */
  alwaysReview?: boolean;
}

export const STAFF_FIELD_RULES: StaffFieldRule[] = [
  { column: "forename", label: "Legal first name", critical: true },
  { column: "surname", label: "Legal surname", critical: true },
  { column: "preferred_name", label: "Preferred name", critical: false },
  { column: "email", label: "Email address", critical: true },
  { column: "date_of_birth", label: "Date of birth", critical: true },
  { column: "ni_number", label: "National Insurance number", critical: true, alwaysReview: true },
  { column: "nationality", label: "Nationality", critical: false },
  { column: "passport_no", label: "Passport number", critical: false },
  { column: "sharing_code", label: "Share code", critical: false },
  { column: "settlement_status", label: "Immigration status", critical: false },
  { column: "bank_account_no", label: "Bank account number", critical: true, alwaysReview: true },
  { column: "sort_code", label: "Sort code", critical: true, alwaysReview: true },
];

export interface StaffDetailConflict {
  field: string;
  label: string;
  current: string;
  submitted: string;
}

export interface StaffAllocationResult {
  /** Values to write straight onto the employee record. */
  updates: Record<string, string>;
  /** Fields that were empty and have now been filled in automatically. */
  filled: { field: string; label: string; value: string }[];
  /** Fields where the staff answer differs from what is already on record. */
  conflicts: StaffDetailConflict[];
  /**
   * Fields held back on purpose — bank details, whether new or changed. They
   * are stored as submitted but never applied to the employee record until an
   * administrator confirms them directly with the employee.
   */
  held: StaffDetailConflict[];
}

const clean = (v: unknown): string => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

/** Loose comparison so spacing / casing / punctuation noise is not a conflict. */
function sameValue(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[\s-]/g, "");
  return norm(a) === norm(b);
}

/**
 * Decide where each staff-supplied value goes.
 *
 * @param candidates keyed by employees column name (missing / blank = not answered)
 * @param existing   the current employee row values
 */
export function allocateStaffDetails(
  candidates: Record<string, unknown>,
  existing: Record<string, unknown>,
): StaffAllocationResult {
  const updates: Record<string, string> = {};
  const filled: StaffAllocationResult["filled"] = [];
  const conflicts: StaffDetailConflict[] = [];
  const held: StaffDetailConflict[] = [];

  for (const rule of STAFF_FIELD_RULES) {
    const submitted = clean(candidates[rule.column]);
    if (!submitted) continue;

    const current = clean(existing[rule.column]);

    if (rule.alwaysReview) {
      if (!sameValue(current, submitted)) {
        held.push({ field: rule.column, label: rule.label, current, submitted });
      }
      continue;
    }

    if (!current) {
      updates[rule.column] = submitted;
      filled.push({ field: rule.column, label: rule.label, value: submitted });
      continue;
    }

    if (sameValue(current, submitted)) continue;

    if (rule.critical) {
      conflicts.push({ field: rule.column, label: rule.label, current, submitted });
    } else {
      updates[rule.column] = submitted;
      filled.push({ field: rule.column, label: rule.label, value: submitted });
    }
  }

  return { updates, filled, conflicts, held };
}

/**
 * Every key shape the rest of the system reads an address / phone from, so
 * contracts, letters and the staff profile all resolve without re-asking.
 */
export function buildContactAliases(input: {
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  postcode?: unknown;
  phone?: unknown;
  email?: unknown;
}): Record<string, string | null> {
  const line1 = clean(input.line1) || null;
  const line2 = clean(input.line2) || null;
  const city = clean(input.city) || null;
  const postcode = clean(input.postcode) || null;
  const phone = clean(input.phone) || null;
  const email = clean(input.email) || null;
  const address = [line1, line2, city, postcode].filter(Boolean).join(", ") || null;

  return {
    address,
    home_address: address,
    full_address: address,
    address_line_1: line1,
    address_line_2: line2,
    address_line1: line1,
    address_line2: line2,
    city,
    postcode,
    post_code: postcode,
    phone,
    mobile: phone,
    phone_number: phone,
    email,
  };
}
