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
  { key: "phone", label: "Mobile number", hint: "For rotas and urgent contact", group: "Contact", section: "personal" },
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

export interface InfoPreset {
  key: string;
  label: string;
  description: string;
  items: InfoItemKey[];
}

/** Quick starting points — every one is just a set of ticks you can change. */
export const INFO_PRESETS: InfoPreset[] = [
  {
    key: "right_to_work",
    label: "Right to work refresh",
    description: "Nationality, visa or share code, and its expiry date",
    items: ["nationality", "visa", "share_code"],
  },
  {
    key: "contact",
    label: "Contact details check",
    description: "Email, mobile number and home address",
    items: ["email", "phone", "address"],
  },
  { key: "bank", label: "Bank details", description: "For pay — asked twice to catch typing mistakes", items: ["bank"] },
  {
    key: "everything",
    label: "Everything",
    description: "All items — normally only for someone new",
    items: [...INFO_ITEM_KEYS],
  },
];

/** Plain-English list of what was asked for, for emails and the tracking list. */
export const describeRequestedItems = (fields: readonly string[] | null | undefined): string =>
  expandRequestedFields(fields).map(infoItemLabel).join(", ");
