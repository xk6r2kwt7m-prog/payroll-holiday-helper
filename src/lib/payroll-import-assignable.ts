/**
 * Which staff records may be offered when a timesheet name could not be matched.
 *
 * Archived records, practice records and anyone who has left are never offered:
 * hours must not be attached to a record that is no longer in use. The single
 * exception is someone whose last day falls inside the period being imported —
 * their final pay is still owed, so they remain selectable and are labelled.
 *
 * Read-only: this decides what the picker shows and changes no records.
 */
import { leaverPayableInPeriod } from "@/lib/payroll-matching";

export interface AssignableCandidate {
  id: string;
  forename: string;
  surname?: string | null;
  department?: string | null;
  status: string;
  end_date?: string | null;
  archived_at?: string | null;
  is_test_record?: boolean | null;
}

export interface AssignablePeriod {
  start_date?: string | null;
  end_date?: string | null;
}

const EMPLOYABLE = new Set(["active", "starter", "onboarding"]);

/** Everyone still in use who could legitimately be paid in this period. */
export function availableForMatching<T extends AssignableCandidate>(
  employees: T[],
  period?: AssignablePeriod | null,
): T[] {
  return employees
    .filter((e) => {
      if (e.archived_at) return false;
      if (e.is_test_record === true) return false;
      if (EMPLOYABLE.has(e.status)) return true;
      if (e.status === "leaver") {
        return leaverPayableInPeriod({ end_date: e.end_date ?? null }, period ?? null);
      }
      return false;
    })
    .sort((a, b) => a.forename.localeCompare(b.forename));
}

/** The above, minus anyone already attached to another row in this upload. */
export function remainingForMatching<T extends AssignableCandidate>(
  employees: T[],
  period: AssignablePeriod | null | undefined,
  alreadyMatchedIds: Iterable<string>,
): T[] {
  const taken = new Set(alreadyMatchedIds);
  return availableForMatching(employees, period).filter((e) => !taken.has(e.id));
}
