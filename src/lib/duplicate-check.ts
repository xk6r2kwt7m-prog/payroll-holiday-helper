/**
 * Shared duplicate-entry detection for staff records.
 *
 * Warn-only by design (agreed with the administrator): a possible duplicate is
 * always surfaced before saving, but the manager can continue on purpose.
 * This module is pure — it never reads or writes data, so it can be unit
 * tested and reused by any screen that creates a staff record.
 */

export interface DuplicateCandidate {
  forename?: string | null;
  surname?: string | null;
  email?: string | null;
  ni_number?: string | null;
}

export interface ExistingRecord {
  id: string;
  forename?: string | null;
  surname?: string | null;
  preferred_name?: string | null;
  email?: string | null;
  ni_number?: string | null;
  status?: string | null;
  user_id?: string | null;
  archived_at?: string | null;
}

export type DuplicateReason = "email" | "name" | "ni_number";

export interface DuplicateMatch {
  record: ExistingRecord;
  reasons: DuplicateReason[];
  /** True when the existing record already has an app sign-in attached. */
  linkedToAccount: boolean;
  /**
   * True when the same email address is already held by a record that is still
   * current (not archived, not a leaver). Two current records on one address make
   * invitations and details links ambiguous, so this case must be blocked.
   */
  blocking: boolean;
}

/** Records that are still in use — a leaver or archived record is not current. */
export function isCurrentRecord(record: ExistingRecord): boolean {
  return !record.archived_at && String(record.status ?? "") !== "leaver";
}

/** Only the matches that must stop the save (same email, still-current record). */
export function blockingDuplicates(matches: DuplicateMatch[]): DuplicateMatch[] {
  return matches.filter((m) => m.blocking);
}

/**
 * Plain-English reason a save is refused. Names the record holding the address so
 * the manager can go and fix it.
 */
export function blockingMessage(matches: DuplicateMatch[]): string | null {
  const blocked = blockingDuplicates(matches);
  if (blocked.length === 0) return null;
  const r = blocked[0].record;
  const name = `${r.forename ?? ""} ${r.surname ?? ""}`.trim() || "another staff member";
  return `${name} already uses this email address. Two current staff records cannot share one address — joining links and details forms would not know which person they belong to. Open ${name}'s record to fix the address, or use a different one here.`;
}

/** Loose comparison: ignores case, spacing, dashes and dots. */
export function loose(value: string | null | undefined): string {
  return (value ?? "")
    .toString()
    .toLowerCase()
    .replace(/[\s\-.]/g, "")
    .trim();
}

function fullName(record: DuplicateCandidate | ExistingRecord): string {
  return loose(`${record.forename ?? ""}${record.surname ?? ""}`);
}

/**
 * Find existing records that look like the same person.
 * Archived / leaver records are included — re-adding someone who already
 * exists in the archive is the most common source of double entries.
 */
export function findPossibleDuplicates(
  candidate: DuplicateCandidate,
  existing: ExistingRecord[],
  options: { excludeId?: string } = {},
): DuplicateMatch[] {
  const candidateEmail = loose(candidate.email);
  const candidateName = fullName(candidate);
  const candidateNi = loose(candidate.ni_number);

  const matches: DuplicateMatch[] = [];

  for (const record of existing) {
    if (options.excludeId && record.id === options.excludeId) continue;

    const reasons: DuplicateReason[] = [];

    if (candidateEmail && loose(record.email) === candidateEmail) reasons.push("email");
    if (candidateName && fullName(record) === candidateName) reasons.push("name");
    if (candidateNi && loose(record.ni_number) === candidateNi) reasons.push("ni_number");

    if (reasons.length > 0) {
      matches.push({
        record,
        reasons,
        linkedToAccount: !!record.user_id,
        blocking: reasons.includes("email") && isCurrentRecord(record),
      });
    }
  }

  // Blocking clashes first, then records holding a sign-in, then email, then name.
  return matches.sort((a, b) => {
    if (a.blocking !== b.blocking) return a.blocking ? -1 : 1;
    if (a.linkedToAccount !== b.linkedToAccount) return a.linkedToAccount ? -1 : 1;
    const aEmail = a.reasons.includes("email");
    const bEmail = b.reasons.includes("email");
    if (aEmail !== bEmail) return aEmail ? -1 : 1;
    return 0;
  });
}

function describeReasons(reasons: DuplicateReason[]): string {
  const parts: string[] = [];
  if (reasons.includes("email")) parts.push("the same email address");
  if (reasons.includes("name")) parts.push("the same name");
  if (reasons.includes("ni_number")) parts.push("the same National Insurance number");
  if (parts.length <= 1) return parts[0] ?? "matching details";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Plain-English warning for the manager. Never blocks saving. */
export function duplicateWarningMessage(matches: DuplicateMatch[]): string | null {
  if (matches.length === 0) return null;

  const first = matches[0];
  const name = `${first.record.forename ?? ""} ${first.record.surname ?? ""}`.trim() || "an existing record";
  const state = first.record.archived_at
    ? "archived"
    : first.record.status
      ? String(first.record.status)
      : "on file";

  const others = matches.length > 1 ? ` (and ${matches.length - 1} other similar record${matches.length > 2 ? "s" : ""})` : "";
  const account = first.linkedToAccount
    ? " That record already holds their sign-in, so adding another will split their history."
    : "";

  return `${name} (${state}) already has ${describeReasons(first.reasons)}${others}.${account} Check this is not the same person before continuing.`;
}
