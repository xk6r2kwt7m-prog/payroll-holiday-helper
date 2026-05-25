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
export interface MissingFromFile {
  employeeId: string;
  fullName: string;
  status: string;
  /** True when this employee already has a draft entry in the target period. */
  linkedToPeriod: boolean;
}

export function findMissingFromFile(
  employees: MatchableEmployee[],
  matchedEmployeeIds: Iterable<string>,
  linkedToPeriodIds: Iterable<string> = [],
): MissingFromFile[] {
  const matched = new Set(matchedEmployeeIds);
  const linked = new Set(linkedToPeriodIds);
  return employees
    .filter(
      (e) =>
        (e.status === "active" || e.status === "starter") &&
        !matched.has(e.id),
    )
    .map((e) => ({
      employeeId: e.id,
      fullName: `${e.forename} ${e.surname}`.trim(),
      status: e.status,
      linkedToPeriod: linked.has(e.id),
    }));
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
