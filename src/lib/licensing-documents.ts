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
  if (subject === "dps_authorisation") {
    // The DPS confirms his own personal licence number on the signing page, so a
    // blank personal licence number on the premises record is not a blocker here.
    return missing.filter((m) => m !== "DPS personal licence number").length === 0;
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

/* ─────────── One DPS authorisation covering every site ─────────── */

/**
 * Marker used as the `branch` of the single, all-sites DPS authorisation.
 * Per-site requests keep their own branch, so nothing existing changes.
 */
export const ALL_SITES_BRANCH = "All sites";

/** Premises details each site must have confirmed before the group document is sent. */
export function groupAwaitingConfirmation(sites: LicenceSite[]): string[] {
  const out: string[] = [];
  for (const site of sites) {
    for (const missing of awaitingConfirmation(site)) out.push(`${site.branch}: ${missing}`);
  }
  return out;
}

export function isGroupReadyToSend(sites: LicenceSite[]): boolean {
  return sites.length > 0 && groupAwaitingConfirmation(sites).length === 0;
}

export interface SiteReadiness {
  site: LicenceSite;
  branch: string;
  ready: boolean;
  missing: string[];
}

/**
 * Judges each site on its own, so a signature can be requested for the sites
 * whose licence details are confirmed while the others simply wait. Nothing is
 * inferred: a site is only ready when every field it needs is actually filled in.
 */
export function siteReadiness(sites: LicenceSite[]): SiteReadiness[] {
  return sites.map((site) => {
    const missing = awaitingConfirmation(site);
    return { site, branch: site.branch, ready: missing.length === 0, missing };
  });
}

export function readySites(sites: LicenceSite[]): LicenceSite[] {
  return siteReadiness(sites).filter((s) => s.ready).map((s) => s.site);
}


/**
 * One written authorisation signed once by the DPS, covering the front-of-house
 * staff register at every site he supervises. It is a standing authorisation:
 * it keeps applying as people join or leave until it is withdrawn in writing.
 */
export function buildDpsAuthorisationAllSites(
  sites: LicenceSite[],
  documentDate?: string | null
): LicensingDocument {
  const first = sites[0] ?? { branch: "" };
  const dps = value(first.dps_name);
  const names = sites.map((s) => (s.premises_name?.trim() || s.branch)).join(", ");
  return {
    subject_type: "dps_authorisation",
    title: "DPS WRITTEN AUTHORISATION FOR THE SALE OF ALCOHOL — ALL PREMISES",
    subtitle: "Licensing Act 2003",
    facts: sites.map((s) => ({
      label: s.branch,
      value: [value(s.premises_name), value(s.premises_address), `Licence ${value(s.licence_number)}`].join(" · "),
    })),
    paragraphs: [
      `I, ${dps}, being the Designated Premises Supervisor and holder of a Personal Licence for ${names}, hereby authorise the front-of-house members of staff recorded in the staff register for each of those premises to make sales of alcohol in accordance with each Premises Licence and the Licensing Act 2003.`,
      "This is a standing authorisation. It applies to each person recorded as front of house in the register for these premises, including those who join after the date below, and remains in force until it is withdrawn in writing.",
      "This authorisation applies only while the individual remains employed or engaged at the premises and is subject to compliance with all conditions of the Premises Licence, the premises' age-verification policy and all relevant licensing procedures.",
    ],
    signature_block: [
      { label: "DPS Name", value: dps },
      { label: "Personal Licence Number", value: value(first.dps_personal_licence_number) },
      { label: "Issuing Authority", value: value(first.issuing_authority) },
      { label: "Premises covered", value: names },
    ],
    document_date: documentDate ?? null,
  };
}

/**
 * Names the other premises a staff authorisation also covers, so one signature
 * can stand for every site that person works at. The original wording is kept.
 */
export function withAdditionalSites(
  doc: LicensingDocument,
  otherSiteNames: string[]
): LicensingDocument {
  const names = otherSiteNames.filter((n) => (n ?? "").trim().length > 0);
  if (names.length === 0) return doc;
  return {
    ...doc,
    facts: [...doc.facts, { label: "Also covers", value: names.join(", ") }],
    paragraphs: [
      ...doc.paragraphs,
      `You also work at ${names.join(" and ")}. This authorisation covers the sale of alcohol at those premises on the same terms and under each premises licence, so you only need to sign once.`,
    ],
  };
}

/* ─────────── The DPS signature that every site inherits ─────────── */

/**
 * A signature request as stored, reduced to the fields that decide whether it
 * is the live authorising signature for a site.
 */
export interface DpsSignatureSource {
  subject_type?: string | null;
  branch?: string | null;
  status?: string | null;
  signature?: string | null;
  signed_at?: string | null;
  signer_name?: string | null;
  is_test_record?: boolean | null;
  personal_licence_number?: string | null;
  personal_licence_authority?: string | null;
  document_body?: unknown;
}

export interface DpsAuthoriserSignature {
  signature: string;
  signed_at: string;
  signer_name: string;
  personal_licence_number: string | null;
  personal_licence_authority: string | null;
  /** The branch the request was filed under — the all-sites marker or one site. */
  branch: string;
  covers_all_sites: boolean;
}

/** A test copy or a cancelled request is never treated as an authorisation. */
export function isLiveDpsSignature(r: DpsSignatureSource): boolean {
  return (
    r.subject_type === "dps_authorisation" &&
    !!r.signed_at &&
    !!r.signature &&
    r.is_test_record !== true &&
    r.status !== "cancelled"
  );
}

/**
 * The signature that authorises alcohol sales at a site.
 *
 * A signature given for that very site is used first. Otherwise the standing
 * all-sites authorisation applies, so one signature carries onto every site's
 * document without anything being copied or inferred.
 */
export function liveDpsSignature(
  requests: DpsSignatureSource[],
  branch?: string,
): DpsAuthoriserSignature | null {
  const live = (requests ?? []).filter(isLiveDpsSignature);
  const newest = (rows: DpsSignatureSource[]) =>
    rows.slice().sort((a, b) =>
      new Date(b.signed_at!).getTime() - new Date(a.signed_at!).getTime())[0] ?? null;

  const wanted = (branch ?? "").trim().toLowerCase();
  const own = wanted
    ? newest(live.filter((r) => (r.branch ?? "").trim().toLowerCase() === wanted))
    : null;
  const allSites = newest(live.filter((r) => r.branch === ALL_SITES_BRANCH));
  const chosenRow = own ?? allSites;
  if (!chosenRow) return null;

  return {
    signature: chosenRow.signature!,
    signed_at: chosenRow.signed_at!,
    signer_name: (chosenRow.signer_name ?? "").trim(),
    personal_licence_number: (chosenRow.personal_licence_number ?? "").trim() || null,
    personal_licence_authority: (chosenRow.personal_licence_authority ?? "").trim() || null,
    branch: chosenRow.branch ?? "",
    covers_all_sites: chosenRow.branch === ALL_SITES_BRANCH,
  };
}

/**
 * Prints the personal licence details the supervisor confirmed when signing
 * onto a site document. Details already on the document are only replaced by
 * ones he confirmed himself — nothing is invented.
 */
export function withAuthoriserLicence(
  doc: LicensingDocument,
  sig: DpsAuthoriserSignature | null,
): LicensingDocument {
  if (!sig) return doc;
  const replace = (label: string, next: string | null) =>
    next
      ? (block: { label: string; value: string }) =>
          block.label === label ? { label, value: next } : block
      : (block: { label: string; value: string }) => block;

  let block = doc.signature_block
    .map(replace("Personal Licence Number", sig.personal_licence_number))
    .map(replace("Issuing Authority", sig.personal_licence_authority));

  if (sig.signer_name) {
    block = block.map((f) =>
      (f.label === "DPS Name" || f.label === "Authorised by") && isBlankValue(f.value)
        ? { ...f, value: sig.signer_name }
        : f);
  }
  return { ...doc, signature_block: block };
}

function isBlankValue(v: string): boolean {
  return !v || /^_+$/.test(v.trim());
}
