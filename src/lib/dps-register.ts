/**
 * The site alcohol register that the DPS written authorisation prints.
 *
 * Pure functions — no database access, no side effects, nothing inferred.
 *
 * Rules that must not be broken:
 *  - Everyone front of house at a site is covered by the licence holder's
 *    written authorisation for that site, so nobody front of house is ever
 *    presented as barred from selling.
 *  - What varies is the paperwork: a person has either signed the authorisation
 *    (their own signature, with the licence holder's approval where recorded) or
 *    their signature is still outstanding.
 *  - Test records never appear on a licensing document.
 */


import {
  belongsOnAlcoholList, needsRoleDecision, decisionFor, classifyRole,
  type AlcoholListDecision,
} from "@/lib/alcohol-automation";
import {
  latestAuthorisation,
  resolveAuthorisationStatus,
  type AuthorisationRecord,
} from "@/lib/alcohol-authorisation-status";

export type RegisterStatus = "signed" | "awaiting_signature";


export interface RegisterEmployee {
  id: string;
  forename?: string | null;
  surname?: string | null;
  department?: string | null;
  job_title?: string | null;
  status?: string | null;
  archived_at?: string | null;
  is_test_record?: boolean | null;
  /** Sites the person is assigned to (from employee_branches). */
  branches?: string[] | null;
}

export interface RegisterAuthorisation extends AuthorisationRecord {
  employee_signature?: string | null;
  authoriser_name?: string | null;
  authoriser_licence_number?: string | null;
  revoked_reason?: string | null;
  is_test_record?: boolean | null;
}

export interface RegisterRow {
  employee_id: string;
  name: string;
  role: string | null;
  status: RegisterStatus;
  status_label: string;
  signature: string | null;
  signed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approver_licence: string | null;
  revoked_reason: string | null;
  /** Why the person is on the register. */
  listed_because: "front_of_house" | "authorisation_on_record" | "manager_added";
  /** True when the person has left or been archived but a record still exists. */
  no_longer_employed: boolean;
}

export interface RegisterSummary {
  /** Everyone listed for the site — all covered by the written authorisation. */
  covered: number;
  signed: number;
  awaitingSignature: number;
  /** True when nobody at the site has signed yet. Missing paperwork, not a ban. */
  noneSigned: boolean;
}


const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();

export const REGISTER_STATUS_LABELS: Record<RegisterStatus, string> = {
  signed: "Signed",
  awaiting_signature: "Awaiting signature",
};


function personName(e: RegisterEmployee): string {
  const name = `${e.forename ?? ""} ${e.surname ?? ""}`.trim();
  return name || "Staff member";
}

function worksAtSite(e: RegisterEmployee, branch: string): boolean {
  const wanted = norm(branch);
  if (!wanted) return true;
  return (e.branches ?? []).some((b) => norm(b) === wanted);
}

function stillEmployed(e: RegisterEmployee): boolean {
  return !e.archived_at && norm(e.status) !== "leaver";
}

/**
 * Paperwork state of one person, from their own records only.
 *
 * "Signed" means that person put their own signature to the authorisation and
 * it has not been withdrawn. Everything else is an outstanding signature.
 */
export function registerStatusFor(
  employee: RegisterEmployee,
  records: RegisterAuthorisation[],
): { status: RegisterStatus; record: RegisterAuthorisation | null } {
  const record = latestAuthorisation(records) as RegisterAuthorisation | null;
  if (!record) return { status: "awaiting_signature", record: null };
  const effective = resolveAuthorisationStatus(record, {
    status: employee.status ?? null,
    archived_at: employee.archived_at ?? null,
  });
  const live = effective === "active" || effective === "pending";
  const signed = !!record.employee_signed_at && live;

  return { status: signed ? "signed" : "awaiting_signature", record };
}

const ORDER: RegisterStatus[] = ["signed", "awaiting_signature"];


/**
 * Builds the register for one site: everyone front of house there, anyone the
 * manager has added by hand, plus anyone else at that site who already holds an
 * authorisation record.
 *
 * A recorded manager decision always beats the guess from the job title, and a
 * role nobody has settled yet is never silently dropped — it comes back from
 * `unclassifiedForSite` for the manager to decide.
 */
export function buildDpsRegister(opts: {
  branch: string;
  employees: RegisterEmployee[];
  authorisations: RegisterAuthorisation[];
  decisions?: AlcoholListDecision[];
}): RegisterRow[] {
  const { branch, employees, authorisations, decisions = [] } = opts;
  const wanted = norm(branch);

  const siteAuths = authorisations.filter(
    (a) => !a.is_test_record && (!wanted || norm(a.branch) === wanted),
  );
  const byEmployee = new Map<string, RegisterAuthorisation[]>();
  for (const a of siteAuths) {
    const list = byEmployee.get(a.employee_id) ?? [];
    list.push(a);
    byEmployee.set(a.employee_id, list);
  }

  const rows: RegisterRow[] = [];

  for (const e of employees) {
    if (e.is_test_record) continue;
    const records = byEmployee.get(e.id) ?? [];
    const hasRecord = records.length > 0;
    const atSite = worksAtSite(e, branch) && stillEmployed(e);
    const listed = atSite && belongsOnAlcoholList(e, branch, decisions);
    const addedByManager =
      listed && decisionFor(e.id, branch, decisions) === "front_of_house";

    if (!listed && !hasRecord) continue;
    // Someone who has left only appears while a record still exists, so the
    // document shows the officer that their authorisation has ended.
    if (!stillEmployed(e) && !hasRecord) continue;

    const { status, record } = registerStatusFor(e, records);
    rows.push({
      employee_id: e.id,
      name: personName(e),
      role: (e.job_title || e.department || "").trim() || null,
      status,
      status_label: REGISTER_STATUS_LABELS[status],
      signature: record?.employee_signature ?? null,
      signed_at: record?.employee_signed_at ?? null,
      approved_at: record?.authoriser_confirmed_at ?? record?.authorised_at ?? null,
      approved_by: record?.authoriser_name ?? null,
      approver_licence: record?.authoriser_licence_number ?? null,
      revoked_reason: record?.revoked_reason ?? null,
      listed_because: addedByManager
        ? "manager_added"
        : listed
          ? "front_of_house"
          : "authorisation_on_record",
      no_longer_employed: !stillEmployed(e),
    });
  }

  return rows.sort((a, b) => {
    const r = ORDER.indexOf(a.status) - ORDER.indexOf(b.status);
    if (r !== 0) return r;
    return a.name.localeCompare(b.name);
  });
}

export interface UnclassifiedPerson {
  employee_id: string;
  name: string;
  role: string | null;
}

/**
 * Staff at this site whose role does not say whether they serve alcohol and who
 * nobody has decided about yet. They are shown to the manager to decide rather
 * than being left off the register quietly.
 */
export function unclassifiedForSite(opts: {
  branch: string;
  employees: RegisterEmployee[];
  authorisations: RegisterAuthorisation[];
  decisions?: AlcoholListDecision[];
}): UnclassifiedPerson[] {
  const { branch, employees, authorisations, decisions = [] } = opts;
  const wanted = norm(branch);
  const withRecord = new Set(
    authorisations
      .filter((a) => !a.is_test_record && (!wanted || norm(a.branch) === wanted))
      .map((a) => a.employee_id),
  );

  return employees
    .filter((e) => !e.is_test_record)
    .filter((e) => worksAtSite(e, branch) && stillEmployed(e))
    .filter((e) => !withRecord.has(e.id))
    .filter((e) => needsRoleDecision(e, branch, decisions))
    .map((e) => ({
      employee_id: e.id,
      name: personName(e),
      role: (e.job_title || e.department || "").trim() || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function registerSummary(rows: RegisterRow[]): RegisterSummary {
  const count = (s: RegisterStatus) => rows.filter((r) => r.status === s).length;
  const signed = count("signed");
  return {
    covered: rows.length,
    signed,
    awaitingSignature: count("awaiting_signature"),
    noneSigned: signed === 0,
  };
}

export function registerSummaryLine(rows: RegisterRow[], branch: string): string {
  const s = registerSummary(rows);
  if (s.covered === 0) {
    return `No front-of-house staff are recorded for ${branch} yet.`;
  }
  return `${s.signed} of ${s.covered} front-of-house staff listed for ${branch} have signed this authorisation.`;
}

/** Plain note about outstanding signatures. Never a statement that selling must stop. */
export function outstandingSignatureLine(rows: RegisterRow[], branch: string): string | null {
  const s = registerSummary(rows);
  if (s.awaitingSignature === 0) return null;
  return `${s.awaitingSignature} of ${s.covered} front-of-house staff at ${branch} have not signed this authorisation yet.`;
}


function gbDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB");
}

/** Register as CSV — suitable to hand to a licensing officer. */
export function registerCsv(rows: RegisterRow[], branch: string): string {
  const out: string[][] = [[
    "Site", "Name", "Role", "Status", "Signed", "Authorised", "Authorised by",
    "Personal licence number", "Listed because", "Still employed",
  ]];
  for (const r of rows) {
    out.push([
      branch,
      r.name,
      r.role ?? "",
      r.status_label,
      gbDate(r.signed_at),
      gbDate(r.approved_at),
      r.approved_by ?? "",
      r.approver_licence ?? "",
      r.listed_because === "front_of_house"
        ? "Front of house"
        : r.listed_because === "manager_added"
          ? "Added by the manager"
          : "Authorisation on record",
      r.no_longer_employed ? "No" : "Yes",
    ]);
  }
  return out
    .map((line) => line.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}

/**
 * Rows in the shape the licensing PDF prints — name, role, signature and date
 * only. People who have left are not printed, and no status wording is shown.
 */
export function registerPdfRows(rows: RegisterRow[]) {
  return rows
    .filter((r) => !r.no_longer_employed)
    .map((r) => ({
      name: r.name,
      job_title: r.role,
      signature: r.status === "signed" ? r.signature : null,
      signed_at: r.status === "signed" ? r.signed_at : null,
    }));
}


/* ─────────────── Issued copies ─────────────── */

export type DeliveryMethod = "download" | "email_attachment" | "email_link" | "email_both";

export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  download: "Downloaded",
  email_attachment: "Emailed — PDF attached",
  email_link: "Emailed — secure link",
  email_both: "Emailed — PDF and secure link",
};

export const LINK_EXPIRY_DAYS_DEFAULT = 14;

export function clampLinkExpiryDays(days: unknown): number {
  const n = Number(days);
  if (!Number.isFinite(n)) return LINK_EXPIRY_DAYS_DEFAULT;
  return Math.min(90, Math.max(1, Math.round(n)));
}

export function deliveryMethodFor(attachPdf: boolean, includeLink: boolean): DeliveryMethod {
  if (attachPdf && includeLink) return "email_both";
  if (includeLink) return "email_link";
  return "email_attachment";
}

export interface IssuedCopy {
  access_token?: string | null;
  token_expires_at?: string | null;
  revoked_at?: string | null;
}

export type LinkState = "no_link" | "live" | "expired" | "revoked";

export function linkState(issue: IssuedCopy, now: Date = new Date()): LinkState {
  if (!issue.access_token) return "no_link";
  if (issue.revoked_at) return "revoked";
  if (issue.token_expires_at && new Date(issue.token_expires_at).getTime() < now.getTime()) {
    return "expired";
  }
  return "live";
}

export function linkStateLabel(state: LinkState): string {
  switch (state) {
    case "live": return "Link live";
    case "expired": return "Link expired";
    case "revoked": return "Link revoked";
    default: return "No link";
  }
}

/** A link only opens while it is live. */
export function canOpenLink(issue: IssuedCopy, now: Date = new Date()): boolean {
  return linkState(issue, now) === "live";
}
