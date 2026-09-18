/**
 * Works out which requested items the system ALREADY holds for a staff member,
 * so we only ever ask them for what is genuinely missing.
 *
 * Read-only: nothing here writes, changes or clears any stored detail. It only
 * reports "held" or "not held" per item so the request screens can pre-tick
 * the missing ones and label the rest as already on file.
 *
 * Sources, in order of authority:
 *  1. the staff record itself (employees)
 *  2. details the member of staff previously submitted (employee_onboarding_data)
 */

import { INFO_ITEM_KEYS, type InfoItemKey } from "@/lib/info-request-items";

export interface CoverageEmployee {
  forename?: string | null;
  surname?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  ni_number?: string | null;
  nationality?: string | null;
  passport_no?: string | null;
  residence_permit?: string | null;
  sharing_code?: string | null;
  sort_code?: string | null;
  bank_account_no?: string | null;
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

export type InfoCoverage = Record<InfoItemKey, boolean>;

export function computeInfoCoverage(
  employee: CoverageEmployee | null | undefined,
  onboarding: CoverageOnboarding | null | undefined,
): InfoCoverage {
  const personal = onboarding?.personal_info ?? null;
  const bank = onboarding?.bank_details ?? null;
  const emergency = onboarding?.emergency_contact ?? null;

  const held: InfoCoverage = {
    legal_name:
      (has(employee?.forename) && has(employee?.surname)) ||
      pick(personal, "full_name", "legal_name"),
    dob: has(employee?.date_of_birth) || pick(personal, "date_of_birth", "dob"),
    phone: pick(personal, "phone", "mobile", "phone_number"),
    email: has(employee?.email) || pick(personal, "email"),
    address: pick(personal, "address", "home_address", "full_address", "address_line1"),
    ni_number: has(employee?.ni_number) || pick(personal, "national_insurance", "ni_number"),
    nationality: has(employee?.nationality) || pick(personal, "nationality"),
    passport: has(employee?.passport_no) || pick(personal, "passport_no", "passport_number"),
    visa: has(employee?.residence_permit) || pick(personal, "residence_permit", "visa_number"),
    share_code: has(employee?.sharing_code) || pick(personal, "share_code", "sharing_code"),
    bank:
      (has(employee?.sort_code) && has(employee?.bank_account_no)) ||
      (pick(bank, "sort_code") && pick(bank, "account_number", "account_no")),
    emergency: pick(emergency, "name", "contact_name") && pick(emergency, "phone", "contact_number"),
  };

  return held;
}

/** Items from `wanted` that are not already held. */
export const missingItems = (
  wanted: readonly InfoItemKey[],
  coverage: InfoCoverage,
): InfoItemKey[] => wanted.filter((k) => !coverage[k]);

/** Every item we could ask for that is still missing. */
export const allMissingItems = (coverage: InfoCoverage): InfoItemKey[] =>
  (INFO_ITEM_KEYS as InfoItemKey[]).filter((k) => !coverage[k]);

/**
 * Right-to-work items expire, so "held" is not the same as "still valid".
 * These may always be asked for again even when a value exists.
 */
export const REASKABLE_ITEMS: InfoItemKey[] = ["passport", "visa", "share_code"];
