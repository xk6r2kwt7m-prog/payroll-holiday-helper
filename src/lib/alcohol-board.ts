/**
 * Live "who can sell alcohol" board.
 * Pure functions — grouping and counting only, no database access.
 *
 * Authorisation status itself is resolved by alcohol-authorisation-status.ts;
 * this file only arranges the records for display and for an inspection list.
 */

import {
  resolveAuthorisationStatus,
  type AlcoholAuthStatus,
} from "@/lib/alcohol-authorisation-status";

export interface BoardRecord {
  id: string;
  branch?: string | null;
  employee_id: string;
  status: string;
  employee_signed_at?: string | null;
  authoriser_confirmed_at?: string | null;
  authoriser_name?: string | null;
  authoriser_role?: string | null;
  authoriser_licence_number?: string | null;
  authorised_at?: string | null;
  revoked_at?: string | null;
  revoked_reason?: string | null;
  created_at?: string | null;
  employees?: {
    forename?: string | null;
    surname?: string | null;
    department?: string | null;
    status?: string | null;
    archived_at?: string | null;
  } | null;
}

export interface BoardEntry {
  id: string;
  name: string;
  jobTitle: string | null;
  branch: string;
  effective: AlcoholAuthStatus | "none";
  signedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approverLicence: string | null;
  revokedReason: string | null;
}

export interface BoardSite {
  branch: string;
  dpsName: string | null;
  dpsLicenceNumber: string | null;
  authorised: BoardEntry[];
  awaitingSignature: BoardEntry[];
  awaitingApproval: BoardEntry[];
  notAuthorised: BoardEntry[];
}

export interface SiteLicence {
  branch?: string | null;
  dps_name?: string | null;
  dps_personal_licence_number?: string | null;
}

function fullName(r: BoardRecord): string {
  const e = r.employees;
  const name = `${e?.forename ?? ""} ${e?.surname ?? ""}`.trim();
  return name || "Staff member";
}

export function toEntry(r: BoardRecord): BoardEntry {
  const effective = resolveAuthorisationStatus(r as any, {
    status: r.employees?.status ?? null,
    archived_at: r.employees?.archived_at ?? null,
  });
  return {
    id: r.id,
    name: fullName(r),
    jobTitle: r.employees?.department ?? null,
    branch: (r.branch || "").trim() || "No site recorded",
    effective,
    signedAt: r.employee_signed_at ?? null,
    approvedAt: r.authoriser_confirmed_at ?? r.authorised_at ?? null,
    approvedBy: r.authoriser_name ?? null,
    approverLicence: r.authoriser_licence_number ?? null,
    revokedReason: r.revoked_reason ?? null,
  };
}

/** Groups the live picture by site, newest signature first inside each group. */
export function buildAlcoholBoard(records: BoardRecord[], licences: SiteLicence[] = []): BoardSite[] {
  const licenceByBranch = new Map(
    licences.map((l) => [(l.branch || "").trim().toLowerCase(), l])
  );
  const sites = new Map<string, BoardSite>();

  for (const record of records) {
    const entry = toEntry(record);
    const key = entry.branch.toLowerCase();
    if (!sites.has(key)) {
      const licence = licenceByBranch.get(key);
      sites.set(key, {
        branch: entry.branch,
        dpsName: licence?.dps_name ?? null,
        dpsLicenceNumber: licence?.dps_personal_licence_number ?? null,
        authorised: [],
        awaitingSignature: [],
        awaitingApproval: [],
        notAuthorised: [],
      });
    }
    const site = sites.get(key)!;
    if (entry.effective === "active") site.authorised.push(entry);
    else if (entry.effective === "pending" && !entry.signedAt) site.awaitingSignature.push(entry);
    else if (entry.effective === "pending") site.awaitingApproval.push(entry);
    else site.notAuthorised.push(entry);
  }

  const sortByName = (a: BoardEntry, b: BoardEntry) => a.name.localeCompare(b.name);
  const list = [...sites.values()];
  for (const site of list) {
    site.authorised.sort(sortByName);
    site.awaitingSignature.sort(sortByName);
    site.awaitingApproval.sort(sortByName);
    site.notAuthorised.sort(sortByName);
  }
  return list.sort((a, b) => a.branch.localeCompare(b.branch));
}

export function boardTotals(sites: BoardSite[]) {
  return sites.reduce(
    (acc, s) => ({
      authorised: acc.authorised + s.authorised.length,
      awaitingSignature: acc.awaitingSignature + s.awaitingSignature.length,
      awaitingApproval: acc.awaitingApproval + s.awaitingApproval.length,
      notAuthorised: acc.notAuthorised + s.notAuthorised.length,
    }),
    { authorised: 0, awaitingSignature: 0, awaitingApproval: 0, notAuthorised: 0 }
  );
}

/** Sites with nobody authorised — alcohol must not be sold there. */
export function sitesWithNobodyAuthorised(sites: BoardSite[]): string[] {
  return sites.filter((s) => s.authorised.length === 0).map((s) => s.branch);
}

/** CSV list suitable to hand to an inspector: name, role, site, dates, approver. */
export function authorisedListCsv(sites: BoardSite[]): string {
  const rows: string[][] = [[
    "Site", "Name", "Job title", "Signed", "Authorised", "Authorised by", "Personal licence number",
  ]];
  for (const site of sites) {
    for (const e of site.authorised) {
      rows.push([
        site.branch,
        e.name,
        e.jobTitle ?? "",
        e.signedAt ? new Date(e.signedAt).toLocaleDateString("en-GB") : "",
        e.approvedAt ? new Date(e.approvedAt).toLocaleDateString("en-GB") : "",
        e.approvedBy ?? "",
        e.approverLicence ?? site.dpsLicenceNumber ?? "",
      ]);
    }
  }
  return rows
    .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}
