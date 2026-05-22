/**
 * Pure helper: classify and summarise changes to published shifts.
 *
 * No React / Supabase imports.
 */

import type { VisibilityShift } from "./schedule-staff-visibility";

export type PublishedChangeType =
  | "time_change"
  | "reassign"
  | "unassign"
  | "delete"
  | "department_change"
  | "notes_change"
  | "no_change";

export interface ShiftSnapshot extends VisibilityShift {
  id?: string;
  shift_date?: string;
  start_time?: string;
  end_time?: string;
  department?: string | null;
  employee_id?: string | null;
  notes?: string | null;
}

export function classifyPublishedChange(
  before: ShiftSnapshot | null | undefined,
  after: ShiftSnapshot | null | undefined
): PublishedChangeType[] {
  if (before && !after) return ["delete"];
  if (!before || !after) return ["no_change"];

  const changes: PublishedChangeType[] = [];
  if (before.start_time !== after.start_time || before.end_time !== after.end_time) {
    changes.push("time_change");
  }
  const beforeEmp = before.employee_id ?? null;
  const afterEmp = after.employee_id ?? null;
  if (beforeEmp !== afterEmp) {
    if (beforeEmp && !afterEmp) changes.push("unassign");
    else changes.push("reassign");
  }
  if ((before.department ?? null) !== (after.department ?? null)) {
    changes.push("department_change");
  }
  if ((before.notes ?? null) !== (after.notes ?? null)) {
    changes.push("notes_change");
  }
  return changes.length === 0 ? ["no_change"] : changes;
}

export interface PublishedChangeSummary {
  added: ShiftSnapshot[];
  removed: ShiftSnapshot[];
  timeChanges: Array<{ before: ShiftSnapshot; after: ShiftSnapshot }>;
  reassigned: Array<{ before: ShiftSnapshot; after: ShiftSnapshot }>;
  affectedEmployeeIds: string[];
}

/**
 * Diff two snapshots of a published week (e.g. before vs after a save).
 * Only considers shifts that were published in the "before" snapshot OR are
 * being published in the "after" snapshot.
 */
export function summarisePublishedChanges(
  before: ShiftSnapshot[],
  after: ShiftSnapshot[]
): PublishedChangeSummary {
  const beforeById = new Map(before.filter((s) => s.id).map((s) => [s.id!, s]));
  const afterById = new Map(after.filter((s) => s.id).map((s) => [s.id!, s]));

  const added: ShiftSnapshot[] = [];
  const removed: ShiftSnapshot[] = [];
  const timeChanges: Array<{ before: ShiftSnapshot; after: ShiftSnapshot }> = [];
  const reassigned: Array<{ before: ShiftSnapshot; after: ShiftSnapshot }> = [];
  const affected = new Set<string>();

  for (const [id, a] of afterById) {
    const b = beforeById.get(id);
    if (!b) {
      if (a.is_published) {
        added.push(a);
        if (a.employee_id) affected.add(a.employee_id);
      }
      continue;
    }
    if (!b.is_published) continue; // only changes to previously-published shifts count
    const kinds = classifyPublishedChange(b, a);
    if (kinds.includes("time_change")) {
      timeChanges.push({ before: b, after: a });
      if (b.employee_id) affected.add(b.employee_id);
    }
    if (kinds.includes("reassign") || kinds.includes("unassign")) {
      reassigned.push({ before: b, after: a });
      if (b.employee_id) affected.add(b.employee_id);
      if (a.employee_id) affected.add(a.employee_id);
    }
  }

  for (const [id, b] of beforeById) {
    if (!b.is_published) continue;
    if (!afterById.has(id)) {
      removed.push(b);
      if (b.employee_id) affected.add(b.employee_id);
    }
  }

  return {
    added,
    removed,
    timeChanges,
    reassigned,
    affectedEmployeeIds: Array.from(affected),
  };
}
