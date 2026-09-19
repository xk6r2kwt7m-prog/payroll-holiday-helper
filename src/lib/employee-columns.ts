/**
 * Which columns of a staff record ordinary screens may read.
 *
 * Bank details, National Insurance numbers and identity document numbers are
 * deliberately absent. The database refuses to return them to anyone, so a
 * query asking for them — including `select("*")` — fails outright. Screens
 * use the `has_…` flags below to tell whether something is held, and
 * administrators read the real values through `useSensitiveEmployeeFields`.
 */
export const EMPLOYEE_COLUMNS = [
  "id",
  "employee_ref",
  "forename",
  "surname",
  "preferred_name",
  "email",
  "department",
  "status",
  "hourly_rate",
  "service_charge",
  "service_charge_eligible",
  "nationality",
  "settlement_status",
  "start_date",
  "end_date",
  "notes",
  "created_at",
  "updated_at",
  "user_id",
  "archived_at",
  "tenant_id",
  "employing_entity",
  "contract_country",
  "work_country",
  "work_region",
  "pay_type",
  "pay_amount",
  "holiday_entitlement_method",
  "public_holiday_calendar",
  "overtime_model",
  "onboarding_token",
  "onboarding_token_expires_at",
  "date_of_birth",
  "import_aliases",
  "is_test_record",
  "has_ni_number",
  "has_bank_details",
  "has_passport",
  "has_share_code",
].join(", ");

/** The values only administrators may read. */
export const SENSITIVE_EMPLOYEE_COLUMNS = [
  "ni_number",
  "bank_account_no",
  "sort_code",
  "passport_no",
  "sharing_code",
  "residence_permit",
] as const;

export type SensitiveEmployeeColumn = (typeof SENSITIVE_EMPLOYEE_COLUMNS)[number];

/** Shows only the last two characters, for example ••••••78. */
export function maskTail(value: string | null | undefined, keep = 2): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  if (raw.length <= keep) return "•".repeat(raw.length);
  return "•".repeat(Math.max(4, raw.length - keep)) + raw.slice(-keep);
}
