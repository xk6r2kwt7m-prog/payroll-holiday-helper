/**
 * Payroll Timesheet Import — Trace, Missing-From-File and Zero-Hour Detection
 *
 * Pure helpers used by the import preview to make matching auditable.
 *
 * SAFETY:
 * - Does NOT mutate any employee profile, legal name, rate, bonus or service charge.
 * - Does NOT change payroll calculation, NMW, holiday, service-charge or approval logic.
 * - Never silently drops rows: an unmatched row stays in the trace with reason "unmatched".
 */
import {
  matchEmployeeRow,
  normaliseAliasName,
  type MatchableEmployee,
  type SavedAlias,
  type MatchMethod,
} from "./payroll-matching";

export interface TimesheetParsedRow {
  csvName: string;
  hours: number;
  /** Optional location label so the trace mirrors the parser's view. */
  location?: string;
}

export type TraceMatchSource =
  | "employee_id"
  | "email"
  | "saved_alias"
  | "exact"
  | "case_insensitive"
  | "likely_match"
  | "short_name"
  | "manual"
  | "ambiguous"
  | "unmatched";

export interface ImportRowTrace {
  rawName: string;
  normalisedName: string;
  matchedEmployeeId?: string;
  matchedEmployeeName?: string;
  matchSource: TraceMatchSource;
  hours: number;
  reasonNotImported?: string;
  requiresReview: boolean;
}

const STRONG_LIKELY: MatchMethod[] = ["import_alias", "preferred_name", "legacy_name_map"];

function classify(method: MatchMethod, hasEmployee: boolean): TraceMatchSource {
  if (!hasEmployee) return "unmatched";
  if (method === "employee_id") return "employee_id";
  if (method === "email") return "email";
  if (method === "saved_alias") return "saved_alias";
  if (method === "exact") return "exact";
  if (method === "case_insensitive") return "case_insensitive";
  if (STRONG_LIKELY.includes(method)) return "likely_match";
  if (method === "manual") return "manual";
  return "ambiguous";
}

/**
 * Build a deterministic per-row trace for the uploaded timesheet rows.
 *
 * - Uses the full priority matcher (`matchEmployeeRow`) so saved aliases are honoured.
 * - Rows that match a leaver / inactive employee are flagged `requiresReview = true`
 *   with a non-empty `reasonNotImported`, so the UI can surface them without
 *   silently importing into a leaver.
 */
export function buildRowTrace(
  rows: TimesheetParsedRow[],
  employees: MatchableEmployee[],
  savedAliases: SavedAlias[] = [],
): ImportRowTrace[] {
  return rows.map((row) => {
    const result = matchEmployeeRow(
      { name: row.csvName },
      employees,
      savedAliases,
    );
    const source = classify(result.method, !!result.employee);
    const reason =
      source === "unmatched"
        ? "No safe match — manager must select an employee, create one, or exclude."
        : result.requiresReview
        ? result.reviewReason ?? "Match requires manager review."
        : undefined;

    return {
      rawName: row.csvName,
      normalisedName: normaliseAliasName(row.csvName),
      matchedEmployeeId: result.employee?.id,
      matchedEmployeeName: result.employee
        ? `${result.employee.forename} ${result.employee.surname}`
        : undefined,
      matchSource: source,
      hours: row.hours,
      reasonNotImported: reason,
      requiresReview: !!result.requiresReview || source === "unmatched",
    };
  });
}

/**
 * Active/starter employees who are linked to the target payroll period but
 * have no safe matching row in the uploaded timesheet file.
 *
 * The preview must surface these as a warning so the manager confirms the
 * "0.00 hours" is intentional (e.g. genuinely no shifts that period), and not
 * silently import zero hours for somebody who should have hours.
 */
/**
 * Employees who are genuinely EXPECTED to appear in the uploaded timesheet
 * for the selected payroll period but did not match any row.
 *
 * Period-aware rules (no employee status is mutated):
 * - archived employees are always excluded
 * - employees whose end_date is before the period start are excluded
 *   (former staff — they only reappear if they have current-period activity,
 *    which the caller can express by pre-adding them to `matchedEmployeeIds`
 *    or via the `activityEmployeeIds` set)
 * - employees whose start_date is after the period end are excluded
 *   (not yet started)
 * - leaver / active / starter status alone does NOT qualify an employee —
 *   the period window is authoritative
 * - if `branchId` is provided, employees whose `branch_id` is set and
 *   differs from the selected branch are excluded
 */
export interface MissingFromFile {
  employeeId: string;
  fullName: string;
  status: string;
  /** True when this employee already has a draft entry in the target period. */
  linkedToPeriod: boolean;
  /** Short reason this employee was expected in the selected period. */
  reason:
    | "active_in_period"
    | "current_starter"
    | "current_onboarding"
    | "current_leaver"
    | "current_activity";
  department?: string;
  branchId?: string | null;
  /**
   * Unresolved CSV names from the same file that likely refer to this
   * employee (based on forename token overlap). Populated by
   * `linkMissingToUnresolvedRows` — never used to auto-match.
   */
  likelyUnresolvedNames?: string[];
}

export interface FindMissingOptions {
  /**
   * @deprecated The `employees` table has no `branch_id` column, so this
   * filter is a no-op. Kept only to avoid breaking existing callers; will be
   * removed once every caller is updated.
   */
  branchId?: string | null;
  /** Employee ids with current-period activity (entries, holiday pay, adjustments). */
  activityEmployeeIds?: Iterable<string>;
}

export function findMissingFromFile(
  employees: MatchableEmployee[],
  matchedEmployeeIds: Iterable<string>,
  linkedToPeriodIds: Iterable<string> = [],
  period?: { start_date: string; end_date: string } | null,
  options: FindMissingOptions = {},
): MissingFromFile[] {
  const matched = new Set(matchedEmployeeIds);
  const linked = new Set(linkedToPeriodIds);
  const activity = new Set(options.activityEmployeeIds ?? []);
  // NOTE: options.branchId is deprecated and intentionally NOT applied — the
  // employees table does not persist a branch_id column so any filter here
  // would be a no-op that silently excludes real people. Kept in the type
  // signature only for backward compatibility.
  const periodStart = period?.start_date ?? null;
  const periodEnd = period?.end_date ?? null;

  const out: MissingFromFile[] = [];
  for (const e of employees) {
    if (matched.has(e.id)) continue;

    const anyE = e as any;
    if (anyE.archived_at) continue;
    if (e.status === "archived") continue;

    const startDate: string | null = anyE.start_date ?? null;
    const endDate: string | null = anyE.end_date ?? null;

    // Period-aware exclusions (only when we have a period window)
    let reason: MissingFromFile["reason"] = "active_in_period";
    if (periodStart && periodEnd) {
      const hasActivity = activity.has(e.id);
      const startsAfter = startDate && startDate > periodEnd;
      const endedBefore = endDate && endDate < periodStart;
      const startsInPeriod = startDate && startDate >= periodStart && startDate <= periodEnd;
      const endsInPeriod = endDate && endDate >= periodStart && endDate <= periodEnd;

      if (!hasActivity) {
        if (startsAfter) continue;
        if (endedBefore) continue;
        // Leaver / status=leaver without current-period end and no activity => skip
        if (e.status === "leaver" && !endsInPeriod) continue;
        // Onboarding without in-period start and no activity => not relevant to this period
        if (e.status === "onboarding" && !startsInPeriod) continue;
      }

      if (hasActivity) reason = "current_activity";
      else if (endsInPeriod) reason = "current_leaver";
      else if (startsInPeriod) {
        reason = e.status === "onboarding" ? "current_onboarding" : "current_starter";
      }
      // Only treat status=starter as current_starter when there is NO start_date
      // recorded (unknown lifecycle). A stale status=starter with an old
      // start_date must fall through to "active_in_period".
      else if (!startDate && e.status === "starter") reason = "current_starter";
      else if (!startDate && e.status === "onboarding") reason = "current_onboarding";
      else reason = "active_in_period";
    } else {
      // No period context — legacy behaviour: only active/starter/onboarding qualify.
      if (
        e.status !== "active" &&
        e.status !== "starter" &&
        e.status !== "onboarding"
      ) {
        continue;
      }
    }

    // Employees with no lifecycle signals at all: require active/starter/onboarding status
    if (periodStart && periodEnd && !startDate && !endDate) {
      if (
        e.status !== "active" &&
        e.status !== "starter" &&
        e.status !== "onboarding"
      ) {
        if (!activity.has(e.id)) continue;
      }
    }

    out.push({
      employeeId: e.id,
      fullName: `${e.forename} ${e.surname}`.replace(/\s+/g, " ").trim(),
      status: e.status,
      linkedToPeriod: linked.has(e.id),
      reason,
      department: e.department,
      branchId: null,
    });
  }
  return out;
}

/**
 * Enrich each `MissingFromFile` entry with unresolved CSV names from the same
 * file that share a forename token with the expected employee. Never
 * auto-matches — this only provides a manager-facing hint ("Likely appears in
 * file as: Carlos") plus an id list the UI can use for a "Match to this row"
 * action.
 */
export function linkMissingToUnresolvedRows(
  missing: MissingFromFile[],
  unresolvedCsvNames: string[],
  employees: MatchableEmployee[],
): MissingFromFile[] {
  if (missing.length === 0 || unresolvedCsvNames.length === 0) return missing;

  const tokenise = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3);

  const empById = new Map(employees.map((e) => [e.id, e]));
  const unresolvedTokens = unresolvedCsvNames.map((raw) => ({
    raw,
    tokens: new Set(tokenise(raw)),
  }));

  // How many employees own each token across the workforce. A token owned by
  // exactly one employee is a strong, unambiguous signal; a token shared by
  // many (a common surname like "Martins" / "Bezerra") is not.
  const tokenOwners = new Map<string, Set<string>>();
  for (const e of employees) {
    const eTokens = new Set([
      ...tokenise(e.forename),
      ...tokenise(e.preferred_name ?? ""),
      ...tokenise(e.surname),
      ...(e.import_aliases ?? []).flatMap(tokenise),
    ]);
    for (const t of eTokens) {
      if (!tokenOwners.has(t)) tokenOwners.set(t, new Set());
      tokenOwners.get(t)!.add(e.id);
    }
  }

  return missing.map((m) => {
    const emp = empById.get(m.employeeId);
    if (!emp) return m;
    const forenameTokens = new Set([
      ...tokenise(emp.forename),
      ...tokenise(emp.preferred_name ?? ""),
      ...(emp.import_aliases ?? []).flatMap(tokenise),
    ]);
    const surnameTokens = new Set(tokenise(emp.surname));
    if (forenameTokens.size === 0 && surnameTokens.size === 0) return m;

    const hits: string[] = [];
    for (const u of unresolvedTokens) {
      let forenameOverlap = 0;
      let surnameOverlap = 0;
      let uniqueOverlap = false;
      for (const t of u.tokens) {
        const fore = forenameTokens.has(t);
        const sur = surnameTokens.has(t);
        if (fore) forenameOverlap++;
        if (sur) surnameOverlap++;
        // A shared token owned by exactly one employee across the workforce
        // is unambiguous even if it happens to be a surname.
        if ((fore || sur) && (tokenOwners.get(t)?.size ?? 0) === 1) {
          uniqueOverlap = true;
        }
      }

      // Safety rule: surname alone shared by more than one employee must NOT
      // produce a hint. Otherwise two people sharing "Bezerra" would both be
      // suggested for the same unresolved row.
      const surnameSharedByMultiple = [...surnameTokens].some(
        (t) => (tokenOwners.get(t)?.size ?? 0) > 1,
      );
      const safe =
        uniqueOverlap ||
        forenameOverlap >= 1 ||
        (surnameOverlap >= 1 && !surnameSharedByMultiple);

      if (safe) hits.push(u.raw);
    }
    return hits.length > 0 ? { ...m, likelyUnresolvedNames: hits } : m;
  });
}


/** Rows where the file explicitly recorded 0.00 hours — shown for transparency. */
export function findZeroHourRows(trace: ImportRowTrace[]): ImportRowTrace[] {
  return trace.filter((t) => t.hours === 0);
}

/** Rows that must NOT be imported until the manager resolves them. */
export function findBlockingRows(trace: ImportRowTrace[]): ImportRowTrace[] {
  return trace.filter(
    (t) => t.matchSource === "unmatched" || t.matchSource === "ambiguous" || t.requiresReview,
  );
}
