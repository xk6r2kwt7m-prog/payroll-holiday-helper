/**
 * Works out which requested items the system ALREADY holds for a staff member,
 * so we only ever ask them for what is genuinely missing.
 *
 * Read-only: nothing here writes, changes or clears any stored detail. It only
 * reports "held" or "not held" per item so the request screens can pre-tick
 * the missing ones and label the rest as already on file.
 *
 * Accepted identity and pay details come from employees. Contact details are
 * held in employee_onboarding_data. Pending reviews suppress repeat requests
 * without marking the underlying detail as accepted.
 */

import { INFO_ITEM_KEYS, type InfoItemKey } from "@/lib/info-request-items";

export interface CoverageEmployee {
  forename?: string | null;
  surname?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  settlement_status?: string | null;
  /**
   * Whether a protected value is held. The values themselves (National
   * Insurance number, bank details, identity document numbers) are never read
   * here — only whether they exist — so nothing sensitive passes through this
   * calculation.
   */
  has_ni_number?: boolean | null;
  has_passport?: boolean | null;
  has_share_code?: boolean | null;
  has_bank_details?: boolean | null;
}

export interface CoverageOnboarding {
  personal_info?: Record<string, any> | null;
  bank_details?: Record<string, any> | null;
  emergency_contact?: Record<string, any> | null;
}

/** A value only counts as held when it is a non-empty, non-placeholder string. */
const has = (v: unknown): boolean => {
  if (typeof v === "number") return true;
  if (typeof v !== "string") return false;
  const t = v.trim();
  return t.length > 0 && !["n/a", "na", "none", "-", "unknown", "tbc"].includes(t.toLowerCase());
};

const pick = (bag: Record<string, any> | null | undefined, ...keys: string[]): boolean => {
  if (!bag) return false;
  return keys.some((k) => has(bag[k]));
};

export type InfoCoverage = Record<InfoItemKey, boolean> & { pendingItems?: InfoItemKey[] };
export function withPendingCoverage(coverage: InfoCoverage, fields: string[], niPending = false): InfoCoverage {
  const map: Record<string, InfoItemKey> = { ni_number: "ni_number", bank_account_no: "bank", sort_code: "bank", forename: "legal_name", surname: "legal_name", date_of_birth: "dob", email: "email", passport_no: "passport", sharing_code: "share_code" };
  return { ...coverage, pendingItems: [...new Set([...fields.map(f => map[f]).filter(Boolean), ...(niPending ? ["ni_number" as const] : [])])] };
}

export function computeInfoCoverage(
  employee: CoverageEmployee | null | undefined,
  onboarding: CoverageOnboarding | null | undefined,
): InfoCoverage {
  const personal = onboarding?.personal_info ?? null;
  // Pending sensitive onboarding values must never satisfy accepted coverage.
  const emergency = onboarding?.emergency_contact ?? null;

  const held: InfoCoverage = {
    legal_name:
      (has(employee?.forename) && has(employee?.surname)),
    dob: has(employee?.date_of_birth),
    phone: pick(personal, "phone", "mobile", "phone_number"),
    email: has(employee?.email),
    address: pick(personal, "address", "home_address", "full_address", "address_line1"),
    ni_number: !!employee?.has_ni_number,
    nationality: has(employee?.nationality) || pick(personal, "nationality"),
    passport: !!employee?.has_passport,
    visa: has(employee?.settlement_status) || pick(personal, "residence_permit", "visa_number"),
    share_code: !!employee?.has_share_code,
    bank:
      !!employee?.has_bank_details,
    emergency: pick(emergency, "name", "contact_name") && pick(emergency, "phone", "contact_number"),
  };

  return held;
}

/** Items from `wanted` that are not already held. */
export const missingItems = (
  wanted: readonly InfoItemKey[],
  coverage: InfoCoverage,
): InfoItemKey[] => wanted.filter((k) => !coverage[k] && !coverage.pendingItems?.includes(k));

/** Every item we could ask for that is still missing. */
export const allMissingItems = (coverage: InfoCoverage): InfoItemKey[] =>
  (INFO_ITEM_KEYS as InfoItemKey[]).filter((k) => !coverage[k] && !coverage.pendingItems?.includes(k));

/**
 * Right-to-work items expire, so "held" is not the same as "still valid".
 * These may always be asked for again even when a value exists.
 */
export const REASKABLE_ITEMS: InfoItemKey[] = ["passport", "visa", "share_code"];
