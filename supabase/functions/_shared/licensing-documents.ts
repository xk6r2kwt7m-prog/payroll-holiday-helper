/**
 * Server mirror of the licensing document wording.
 * Kept identical to src/lib/licensing-documents.ts so a document snapshot
 * stored at send time reads the same as the one shown on screen.
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

function siteFacts(site: LicenceSite) {
  return [
    { label: "Premises", value: value(site.premises_name) },
    { label: "Address", value: value(site.premises_address) },
    { label: "Premises Licence Number", value: value(site.licence_number) },
  ];
}

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

export function buildSection57(
  site: LicenceSite,
  nominated: NominatedPerson[],
  documentDate?: string | null,
  partALocation = "the office folder of the restaurant",
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

export function buildStaffAlcoholAuthorisation(
  site: LicenceSite,
  staffName: string,
  documentDate?: string | null,
): LicensingDocument {
  return {
    subject_type: "staff_alcohol",
    title: "AUTHORISATION TO SELL ALCOHOL",
    subtitle: "Licensing Act 2003",
    facts: [...siteFacts(site), { label: "Staff member", value: value(staffName) }],
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


/* ─────────── One DPS authorisation covering every site ─────────── */

export const ALL_SITES_BRANCH = "All sites";

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
