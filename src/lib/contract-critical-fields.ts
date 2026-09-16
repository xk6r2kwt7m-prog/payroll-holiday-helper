/**
 * Contract flow — critical detail gating (pure).
 *
 * "Send straight away" is only allowed when every critical field a UK
 * employment contract needs is already known. Otherwise the manager must
 * choose "Ask for details first" (the default) or fill the gaps.
 *
 * Pure: no React, no Supabase, no I/O. Nothing here changes payroll,
 * holiday, NMW or service-charge logic — it only decides what may be sent.
 */

export type ContractDetailsMode = "details_first" | "send_now";

export interface CriticalContractInput {
  fullLegalName?: string | null;
  email?: string | null;
  homeAddress?: string | null;
  jobTitle?: string | null;
  workLocation?: string | null;
  startDate?: string | null;
  employmentType?: string | null;
  /** Only required when the employment type has fixed weekly hours. */
  weeklyHours?: string | number | null;
  baseHourlyRate?: string | number | null;
  reportingManagerName?: string | null;
}

export interface CriticalFieldResult {
  /** Human labels of the missing critical fields, in display order. */
  missing: string[];
  /** True when nothing critical is missing. */
  canSendStraightAway: boolean;
  /** Message to show when something is missing (empty when complete). */
  message: string;
  /** Safe default mode for this contract. */
  defaultMode: ContractDetailsMode;
}

export const MISSING_DETAILS_MESSAGE =
  "Some required details are missing. Ask staff for details first or complete the missing fields.";

function blank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return String(value).trim().length === 0;
}

function positiveNumber(value: unknown): boolean {
  if (blank(value)) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/** Weekly hours only matter when the contract has fixed hours. */
export function weeklyHoursRequired(employmentType?: string | null): boolean {
  return (employmentType || "").trim() !== "variable_hours";
}

export function evaluateCriticalContractDetails(
  input: CriticalContractInput
): CriticalFieldResult {
  const missing: string[] = [];

  if (blank(input.fullLegalName)) missing.push("Full legal name");
  if (blank(input.email)) missing.push("Email address");
  if (blank(input.homeAddress)) missing.push("Home address");
  if (blank(input.jobTitle)) missing.push("Job title");
  if (blank(input.workLocation)) missing.push("Work location");
  if (blank(input.startDate)) missing.push("Start date");
  if (blank(input.employmentType)) missing.push("Employment type");
  if (weeklyHoursRequired(input.employmentType) && !positiveNumber(input.weeklyHours)) {
    missing.push("Weekly hours");
  }
  if (!positiveNumber(input.baseHourlyRate)) missing.push("Base hourly rate");
  if (blank(input.reportingManagerName)) missing.push("Reporting manager");

  const canSendStraightAway = missing.length === 0;

  return {
    missing,
    canSendStraightAway,
    message: canSendStraightAway ? "" : MISSING_DETAILS_MESSAGE,
    // Details-first is always the default; sending straight away is opt-in.
    defaultMode: "details_first",
  };
}
