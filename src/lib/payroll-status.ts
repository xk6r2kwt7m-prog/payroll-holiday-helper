// Defensive normalisation for the `payroll_status` DB enum.
// The database column is a Postgres enum with a strict set of values —
// writing "" (empty string) fails with SQLSTATE 22P02. This helper keeps
// blank / undefined / invalid values out of any Supabase write.

export const PAYROLL_STATUS_VALUES = [
  "draft",
  "pending",
  "approved",
  "rejected",
] as const;

export type PayrollStatus = (typeof PAYROLL_STATUS_VALUES)[number];

export function isPayrollStatus(value: unknown): value is PayrollStatus {
  return (
    typeof value === "string" &&
    (PAYROLL_STATUS_VALUES as readonly string[]).includes(value)
  );
}

/**
 * Normalise a value destined for the `payroll_status` column.
 * - valid enum value → returned as-is
 * - "" / null / undefined / whitespace → returns `fallback` (may be undefined)
 * - any other value → throws so callers never silently downgrade status
 */
export function normalisePayrollStatus(
  value: unknown,
  fallback?: PayrollStatus,
): PayrollStatus | undefined {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return fallback;
    if (isPayrollStatus(trimmed)) return trimmed;
  }
  throw new Error(
    `Invalid payroll status value "${String(value)}". Expected one of: ${PAYROLL_STATUS_VALUES.join(", ")}.`,
  );
}

/**
 * Strip any `status` key that would send an invalid value to the DB.
 * Also strips `undefined`-valued keys generally so PostgREST never receives
 * them as an unintended null cast. Returns a new object.
 */
export function sanitisePayrollPeriodUpdate<T extends Record<string, any>>(
  payload: T,
): Partial<T> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (key === "status") {
      const normalised = normalisePayrollStatus(value);
      if (normalised === undefined) continue;
      out[key] = normalised;
      continue;
    }
    out[key] = value;
  }
  return out as Partial<T>;
}

/**
 * True when a payroll period is committed (approved / finalised), meaning its
 * holiday accrual has been posted to the holiday ledger. Anything else (draft,
 * pending, rejected) is an OPEN period whose accrual is still provisional.
 */
export function isCommittedPayrollStatus(value: unknown): boolean {
  const s = String(value ?? "").trim().toLowerCase();
  return s === "approved" || s === "finalised" || s === "finalized";
}
