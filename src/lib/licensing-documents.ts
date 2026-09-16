/**
 * Licensing document wording and signature-request rules.
 * Pure functions — no DB access, no side effects.
 *
 * The wording mirrors the Fitzrovia paper documents so that each site produces
 * the same document with its own premises details filled in. Nothing is
 * inferred: a field the site has not confirmed stays blank and is reported by
 * `awaitingConfirmation` so the screen can say so plainly.
 */

export type LicenceSubjectType = "dps_authorisation" | "section_57" | "staff_alcohol";

export interface LicenceSite {
  branch: string;
  premises_name?: string | null;
  premises_address?: string | null;
  licence_number?: string | null;
  licence_holder?: string | null;
  issuing_authority?: string | null;
  dps_name?: string | null;
  dps_personal_licence_number?: string | null;
}

export interface NominatedPerson {
  name: string;
  job_title: string;
}

export interface LicensingDocument {
  subject_type: LicenceSubjectType;
  title: string;
  subtitle?: string;
  facts: { label: string; value: string }[];
  paragraphs: string[];
  statement?: string;
  nominated?: NominatedPerson[];
  signature_block: { label: string; value: string }[];
  document_date?: string | null;
}

const BLANK = "________________________";

function value(v?: string | null): string {
  const trimmed = (v ?? "").trim();
  return trimmed.length > 0 ? trimmed : BLANK;
}

/** Fields that only a person can confirm from the premises licence itself. */
export function awaitingConfirmation(site: LicenceSite): string[] {
  const missing: string[] = [];
  if (!site.premises_address?.trim()) missing.push("Premises address");
  if (!site.licence_number?.trim()) missing.push("Premises licence number");
  if (!site.licence_holder?.trim()) missing.push("Premises licence holder");
  if (!site.issuing_authority?.trim()) missing.push("Issuing authority");
  if (!site.dps_name?.trim()) missing.push("Designated Premises Supervisor");
  if (!site.dps_personal_licence_number?.trim()) missing.push("DPS personal licence number");
  return missing;
}

export function isReadyToSend(site: LicenceSite, subject: LicenceSubjectType): boolean {
  const missing = awaitingConfirmation(site);
  if (subject === "section_57") {
    // A Section 57 notice needs the premises, the holder and where the licence is kept.
    return !missing.includes("Premises address") && !missing.includes("Premises licence holder");
  }
  return missing.length === 0;
}

function siteFacts(site: LicenceSite): { label: string; value: string }[] {
  return [
    { label: "Premises", value: value(site.premises_name) },
    { label: "Address", value: value(site.premises_address) },
    { label: "Premises Licence Number", value: value(site.licence_number) },
  ];
}

/** DPS written authorisation for the sale of alcohol (Licensing Act 2003). */
export function buildDpsAuthorisation(site: LicenceSite, documentDate?: string | null): LicensingDocument {
  const dps = value(site.dps_name);
  return {
    subject_type: "dps_authorisation",
    title: "DPS WRITTEN AUTHORISATION FOR THE SALE OF ALCOHOL",
    subtitle: "Licensing Act 2003",
    facts: siteFacts(site),
    paragraphs: [
      `I, ${dps}, being the Designated Premises Supervisor and holder of a Personal Licence, hereby authorise the members of staff listed below to make sales of alcohol at the above premises in accordance with the Premises Licence and the Licensing Act 2003.`,
      "This authorisation applies only while the individual remains employed or engaged at the premises and is subject to compliance with all conditions of the Premises Licence, the premises' age-verification policy and all relevant licensing procedures.",
    ],
    signature_block: [
      { label: "DPS Name", value: dps },
      { label: "Personal Licence Number", value: value(site.dps_personal_licence_number) },
      { label: "Issuing Authority", value: value(site.issuing_authority) },
    ],
    document_date: documentDate ?? null,
  };
}

/**
 * Section 57 notice. The premises licence holder is the company named on the
 * licence — the DPS signs on its behalf rather than being described as holder.
 */
export function buildSection57(
  site: LicenceSite,
  nominated: NominatedPerson[],
  documentDate?: string | null,
  partALocation = "the office folder of the restaurant"
): LicensingDocument {
  const holder = value(site.licence_holder);
  const signer = value(site.dps_name);
  return {
    subject_type: "section_57",
    title: "SECTION 57 NOTICE",
    subtitle: "Licensing Act 2003",
    facts: siteFacts(site),
    paragraphs: [
      `The premises licence holder for ${value(site.premises_name)}, ${value(site.premises_address)} is ${holder}. I, ${signer}, signing on behalf of the premises licence holder, nominate the people below to know where Part A of the premises licence is kept and to be able to produce it upon request.`,
      `Part A of the licence, or a certified copy, can be located in ${partALocation}.`,
      "In the absence of the Designated Premises Supervisor, the persons named below shall be able to assist relevant persons in having knowledge of the contents and location of Part A of the premises licence:",
    ],
    nominated,
    signature_block: [
      { label: "Signed on behalf of", value: holder },
      { label: "Name", value: signer },
      { label: "Personal Licence Number", value: value(site.dps_personal_licence_number) },
    ],
    document_date: documentDate ?? null,
  };
}

export const CHALLENGE_25_TITLE = "Challenge 25 age-verification notice";

export const CHALLENGE_25_TEXT = [
  "LOOK UNDER 25? PLEASE PREPARE YOUR ID.",
  "Ugly Dumpling operates a Challenge 25 policy for all sales of alcohol. Any customer who appears to be under 25 years of age will be asked to provide acceptable proof of age before being served alcohol.",
];

/** What a staff member reads and signs before being authorised to sell alcohol. */
export function buildStaffAlcoholAuthorisation(
  site: LicenceSite,
  staffName: string,
  documentDate?: string | null
): LicensingDocument {
  return {
    subject_type: "staff_alcohol",
    title: "AUTHORISATION TO SELL ALCOHOL",
    subtitle: "Licensing Act 2003",
    facts: [
      ...siteFacts(site),
      { label: "Staff member", value: value(staffName) },
    ],
    paragraphs: [
      `${value(site.dps_name)}, the Designated Premises Supervisor and holder of a Personal Licence, authorises you to make sales of alcohol at ${value(site.premises_name)} in accordance with the Premises Licence and the Licensing Act 2003.`,
      "This authorisation applies only while you remain employed or engaged at the premises and is subject to compliance with all conditions of the Premises Licence, the premises' age-verification policy and all relevant licensing procedures.",
      "The premises operates Challenge 25: any customer who appears to be under 25 years of age must provide acceptable proof of age before being served alcohol. Acceptable identification is a passport, a photo driving licence or a PASS-accredited card.",
      "You must refuse the sale where identification is not produced or you are not satisfied with it, and record the refusal in the incident book. If you are ever unsure, ask a manager before serving.",
    ],
    statement:
      "I confirm that I have read and understood this authorisation, the Challenge 25 age-verification policy and the refusal procedure. I agree to follow them on every sale of alcohol.",
    signature_block: [
      { label: "Authorised by", value: value(site.dps_name) },
      { label: "Personal Licence Number", value: value(site.dps_personal_licence_number) },
    ],
    document_date: documentDate ?? null,
  };
}

export const SUBJECT_LABELS: Record<LicenceSubjectType, string> = {
  dps_authorisation: "DPS written authorisation to sell alcohol",
  section_57: "Section 57 notice",
  staff_alcohol: "Staff alcohol-sales authorisation",
};

/* ─────────────── Signature-request rules ─────────────── */

export type RequestStatus = "sent" | "viewed" | "read" | "signed" | "declined" | "cancelled" | "expired";

export interface SignatureRequest {
  status: string;
  read_at?: string | null;
  signed_at?: string | null;
  expires_at?: string | null;
}

/** Resolves the effective status, taking expiry into account. */
export function resolveRequestStatus(r: SignatureRequest, now: Date = new Date()): RequestStatus {
  if (r.signed_at) return "signed";
  if (r.status === "cancelled") return "cancelled";
  if (r.status === "declined") return "declined";
  if (r.expires_at && new Date(r.expires_at).getTime() < now.getTime()) return "expired";
  if (r.read_at) return "read";
  if (r.status === "viewed") return "viewed";
  return "sent";
}

export function requestStatusLabel(status: RequestStatus): string {
  switch (status) {
    case "signed": return "Signed";
    case "read": return "Read — not signed yet";
    case "viewed": return "Opened";
    case "declined": return "Not ready to sign yet";
    case "cancelled": return "Cancelled";
    case "expired": return "Link expired";
    default: return "Waiting to be opened";
  }
}

export function requestStatusTone(status: RequestStatus): "green" | "amber" | "red" | "grey" {
  switch (status) {
    case "signed": return "green";
    case "read":
    case "viewed":
    case "declined":
    case "sent": return "amber";
    case "expired": return "red";
    default: return "grey";
  }
}

/** A link can still be used to sign while it is unsigned, live and not cancelled. */
export function canSignRequest(r: SignatureRequest, now: Date = new Date()): boolean {
  const status = resolveRequestStatus(r, now);
  return status === "sent" || status === "viewed" || status === "read" || status === "declined";
}

/** Signing is only offered once the reader has confirmed they have read it. */
export function mayReachSignatureStep(r: SignatureRequest): boolean {
  return !!r.read_at;
}

/** A signed licensing document is never edited — a change means a new version. */
export function isRequestLocked(r: SignatureRequest): boolean {
  return !!r.signed_at;
}

export const SIGNING_EXPIRY_DAYS_DEFAULT = 30;

export function clampExpiryDays(days: unknown): number {
  const n = Number(days);
  if (!Number.isFinite(n)) return SIGNING_EXPIRY_DAYS_DEFAULT;
  return Math.min(90, Math.max(1, Math.round(n)));
}
