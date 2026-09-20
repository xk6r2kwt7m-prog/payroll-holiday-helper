/**
 * What can be asked for when requesting information from a staff member.
 *
 * Two kinds of request exist and must never be blended:
 *  - "onboarding"            → a new starter joining, the full set of details
 *  - "existing_staff_update" → someone already on the team, only the items ticked
 *
 * Requests store item keys in `employee_info_requests.requested_fields`.
 * Older rows hold the four legacy section keys, so every reader expands them
 * first (see `expandRequestedFields`) — nothing historical is rewritten.
 */

export type InfoItemKey =
  | "legal_name"
  | "dob"
  | "phone"
  | "email"
  | "address"
  | "ni_number"
  | "nationality"
  | "passport"
  | "visa"
  | "share_code"
  | "bank"
  | "emergency";

/** Storage section each item belongs to (how answers are grouped on the form). */
export type InfoSectionKey = "personal" | "emergency" | "bank" | "rtw";

export type InfoRequestKind = "onboarding" | "existing_staff_update";

export interface InfoItemDef {
  key: InfoItemKey;
  label: string;
  hint: string;
  group: "Identity" | "Contact" | "Right to work" | "Pay" | "Emergency";
  section: InfoSectionKey;
  /** Items that carry an expiry date the system should track afterwards. */
  expires?: boolean;
}

export const INFO_ITEMS: InfoItemDef[] = [
  { key: "legal_name", label: "Legal name", hint: "Exactly as on their passport or ID", group: "Identity", section: "personal" },
  { key: "dob", label: "Date of birth", hint: "Used for age-related pay checks", group: "Identity", section: "personal" },
  { key: "nationality", label: "Nationality and immigration status", hint: "Nationality, and status if they have one", group: "Identity", section: "rtw" },
  { key: "ni_number", label: "National Insurance number", hint: "Optional for them — they can carry on without it", group: "Identity", section: "personal" },
  { key: "email", label: "Email address", hint: "Where payslips and messages go", group: "Contact", section: "personal" },
  { key: "phone", label: "Mobile number", hint: "Used only for work contact — rotas and urgent messages", group: "Contact", section: "personal" },
  { key: "address", label: "Home address", hint: "Used on contracts and letters", group: "Contact", section: "personal" },
  { key: "passport", label: "Passport", hint: "Number, photo or file, and expiry date", group: "Right to work", section: "rtw", expires: true },
  { key: "visa", label: "Visa or residence permit", hint: "Photo or file, and expiry date", group: "Right to work", section: "rtw", expires: true },
  { key: "share_code", label: "Share code", hint: "Home Office share code and expiry date", group: "Right to work", section: "rtw", expires: true },
  { key: "bank", label: "Bank details for pay", hint: "Account holder, sort code, account number (asked twice)", group: "Pay", section: "bank" },
  { key: "emergency", label: "Emergency contact", hint: "Name, relationship, phone", group: "Emergency", section: "emergency" },
];

export const INFO_ITEM_KEYS = INFO_ITEMS.map((i) => i.key);

const ITEM_BY_KEY = new Map(INFO_ITEMS.map((i) => [i.key, i]));

export const infoItem = (key: string): InfoItemDef | undefined =>
  ITEM_BY_KEY.get(key as InfoItemKey);

export const infoItemLabel = (key: string): string => infoItem(key)?.label ?? key;

/** Legacy section keys, kept working for requests already sent. */
const LEGACY_SECTIONS: Record<string, InfoItemKey[]> = {
  personal: ["legal_name", "dob", "phone", "email", "address", "ni_number"],
  emergency: ["emergency"],
  bank: ["bank"],
  rtw: ["nationality", "passport", "visa", "share_code"],
};

/**
 * Turns whatever is stored on a request into item keys.
 * Old four-section rows expand; new item rows pass through unchanged.
 */
export function expandRequestedFields(fields: readonly string[] | null | undefined): InfoItemKey[] {
  const out: InfoItemKey[] = [];
  for (const raw of fields ?? []) {
    const legacy = LEGACY_SECTIONS[raw];
    if (legacy) {
      for (const k of legacy) if (!out.includes(k)) out.push(k);
      continue;
    }
    const item = infoItem(raw);
    if (item && !out.includes(item.key)) out.push(item.key);
  }
  return out;
}

/** Sections the answers for these items live in. */
export function sectionsForItems(items: readonly string[]): InfoSectionKey[] {
  const out: InfoSectionKey[] = [];
  for (const key of expandRequestedFields(items)) {
    const section = ITEM_BY_KEY.get(key)!.section;
    if (!out.includes(section)) out.push(section);
  }
  return out;
}

/** Whether a document upload (and expiry date) is part of the request. */
export const needsDocumentUpload = (items: readonly string[]) =>
  expandRequestedFields(items).some((k) => ITEM_BY_KEY.get(k)?.expires);

/** Which document the upload should be filed as. */
export function documentKindForItems(items: readonly string[]): "visa" | "passport" | "right_to_work" {
  const keys = expandRequestedFields(items);
  if (keys.includes("visa")) return "visa";
  if (keys.includes("passport")) return "passport";
  return "right_to_work";
}

/**
 * How someone is entitled to work in the UK. Only some of these run out, so the
 * expiry date is only asked for where there is genuinely something to expire.
 */
export const RTW_BASIS_OPTIONS = [
  { value: "british_irish", label: "British or Irish citizen", expires: false },
  { value: "settled", label: "Settled status (EU Settlement Scheme)", expires: false },
  { value: "pre_settled", label: "Pre-settled status (EU Settlement Scheme)", expires: true },
  { value: "visa", label: "Visa or immigration permission", expires: true },
  { value: "other", label: "Other / not sure", expires: true },
] as const;

export type RtwBasis = (typeof RTW_BASIS_OPTIONS)[number]["value"];

/** True when the person must give the date their permission runs out. */
export const rtwBasisNeedsExpiry = (basis: string | null | undefined): boolean => {
  const found = RTW_BASIS_OPTIONS.find((o) => o.value === basis);
  return found ? found.expires : false;
};

export const rtwBasisLabel = (basis: string | null | undefined): string =>
  RTW_BASIS_OPTIONS.find((o) => o.value === basis)?.label ?? "";

/** The documents a person may send in as evidence, and how each one is filed. */
export const RTW_DOCUMENT_TYPES = [
  { value: "passport", label: "Passport", filedAs: "passport" },
  { value: "national_id", label: "National identity card", filedAs: "id_document" },
  { value: "birth_certificate", label: "Birth certificate (with proof of National Insurance number)", filedAs: "id_document" },
  { value: "brp", label: "Biometric residence permit", filedAs: "visa" },
  { value: "brc", label: "Biometric residence card", filedAs: "visa" },
  { value: "visa", label: "Visa or entry clearance", filedAs: "visa" },
  { value: "share_code", label: "Share code confirmation", filedAs: "right_to_work" },
  { value: "naturalisation", label: "Certificate of naturalisation or registration", filedAs: "id_document" },
  { value: "right_of_abode", label: "Right-of-abode certificate", filedAs: "right_to_work" },
  { value: "status_document", label: "Immigration status document", filedAs: "right_to_work" },
  { value: "other", label: "Other document", filedAs: "right_to_work" },
] as const;

export type RtwDocumentType = (typeof RTW_DOCUMENT_TYPES)[number]["value"];

export const rtwDocumentLabel = (value: string | null | undefined): string =>
  RTW_DOCUMENT_TYPES.find((d) => d.value === value)?.label ?? "";

/** Which of the stored document kinds a chosen document is filed under. */
export const rtwDocumentFiledAs = (
  value: string | null | undefined,
): "passport" | "visa" | "id_document" | "right_to_work" =>
  (RTW_DOCUMENT_TYPES.find((d) => d.value === value)?.filedAs ?? "right_to_work") as
    | "passport"
    | "visa"
    | "id_document"
    | "right_to_work";

export interface InfoPreset {
  key: string;
  label: string;
  description: string;
  items: InfoItemKey[];
}

/**
 * The five things a manager can ask for. Each one is just a set of ticks,
 * so anything can be added or removed before sending.
 */
export const INFO_PRESETS: InfoPreset[] = [
  {
    key: "new_starter",
    label: "New starter details",
    description: "Everything needed to add someone to the team and to payroll",
    items: [
      "legal_name", "dob", "email", "phone", "address", "ni_number",
      "nationality", "share_code", "bank", "emergency",
    ],
  },
  {
    key: "payroll",
    label: "Payroll details",
    description: "Bank details for pay, and National Insurance number",
    items: ["bank", "ni_number"],
  },
  {
    key: "right_to_work",
    label: "Right to work information",
    description: "Nationality, immigration status, and the document or share code",
    items: ["nationality", "passport", "visa", "share_code"],
  },
  {
    key: "emergency",
    label: "Emergency contact",
    description: "Someone to call if something happens at work",
    items: ["emergency"],
  },
  {
    key: "correction",
    label: "Correct existing information",
    description: "Ask them to check and correct the details we already hold",
    items: ["legal_name", "dob", "email", "address"],
  },
];

/** Plain-English list of what was asked for, for emails and the tracking list. */
export const describeRequestedItems = (fields: readonly string[] | null | undefined): string =>
  expandRequestedFields(fields).map(infoItemLabel).join(", ");
