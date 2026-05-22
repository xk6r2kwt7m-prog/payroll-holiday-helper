/**
 * Pure helper: staff vs manager visibility rules for shifts.
 *
 * Draft (is_published = false) shifts are manager-only.
 * Published (is_published = true) shifts are visible to staff.
 *
 * Replaced draft shifts are not visible to staff and should not trigger a
 * notification because they were never visible in the first place.
 */

export interface VisibilityShift {
  id?: string;
  is_published?: boolean | null;
  employee_id?: string | null;
}

export function isShiftVisibleToStaff(shift: VisibilityShift): boolean {
  return !!shift?.is_published;
}

export function filterShiftsForStaff<T extends VisibilityShift>(shifts: T[]): T[] {
  return (shifts || []).filter(isShiftVisibleToStaff);
}

export function filterShiftsForManager<T extends VisibilityShift>(shifts: T[]): T[] {
  // Managers see everything (draft + published).
  return shifts || [];
}

/**
 * Determines whether changing this shift requires post-publish change control:
 * an explicit confirmation before persisting.
 */
export function isPublishedChange(shift: VisibilityShift | null | undefined): boolean {
  return !!shift?.is_published;
}

/**
 * Whether a change to a published shift should trigger a staff notification.
 * Draft → draft edits never notify. Replacements of an unpublished shift never
 * notify. Only published shifts that are still visible to the staff member
 * need a notification flag.
 *
 * This helper is intentionally a *signal* — it does not send anything. The
 * caller decides whether to forward to existing notification logic.
 */
export type PublishedChangeKind = "edit" | "reassign" | "cancel" | "delete";

export function shouldNotifyStaffOfChange(
  before: VisibilityShift | null | undefined,
  kind: PublishedChangeKind
): boolean {
  if (!isPublishedChange(before)) return false;
  // For now, every published-shift change is a potential staff-visible change.
  // Caller still controls actual delivery.
  return kind === "edit" || kind === "reassign" || kind === "cancel" || kind === "delete";
}
