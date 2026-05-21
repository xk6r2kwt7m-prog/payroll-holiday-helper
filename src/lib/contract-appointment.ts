/**
 * Phase 5H — Pure helper that builds the Appointment / Reporting sentence
 * for a draft employment contract.
 *
 * Rules:
 * - Pure. No React, no Supabase, no I/O.
 * - Definitions section stays generic; this helper only affects the
 *   Appointment / Reporting wording.
 * - Never throws on missing data; falls back to a safe generic sentence.
 */

export interface AppointmentReportingInput {
  managerName?: string | null;
  managerTitle?: string | null;
  /** Generic role label used when no manager name is known (e.g. "Operations Manager"). */
  fallbackRole?: string | null;
}

const TRAILING =
  "or such other manager as the Company may reasonably notify to you from time to time.";

export function buildAppointmentReportingSentence(input: AppointmentReportingInput): string {
  const name = (input.managerName ?? "").trim();
  const title = (input.managerTitle ?? "").trim();
  const role = (input.fallbackRole ?? "").trim();

  if (name) {
    return `You will report to ${name}${title ? `, ${title}` : ""}, ${TRAILING}`;
  }
  if (role) {
    return `You will report to the ${role}, ${TRAILING}`;
  }
  return "You will report to such manager as the Company may reasonably notify to you from time to time.";
}

/** Default generic reporting role used as a safe fallback in the draft template. */
export function defaultFallbackReportingRole(isManagement: boolean): string {
  return isManagement ? "Operations Manager" : "Front of House Manager";
}
