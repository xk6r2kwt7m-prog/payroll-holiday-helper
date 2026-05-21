// Helpers for the contract amendment / versioning flow.
// Pure functions only — no Supabase calls here.

export type ContractState = "draft" | "issued" | "signed" | "superseded" | "terminated";

export type AmendmentType =
  | "salary"
  | "hours"
  | "role"
  | "workplace"
  | "probation"
  | "clauses"
  | "other";

export interface FieldChange {
  field: string;
  label: string;
  previous_value: string | number | null;
  new_value: string | number | null;
  is_material: boolean;
}

/**
 * Fields considered "material" — changing any of these on an issued contract
 * invalidates existing signatures, and on a signed contract always requires
 * employee re-signature on the amendment.
 */
export const MATERIAL_FIELDS: { key: string; label: string }[] = [
  { key: "annual_salary", label: "Annual salary" },
  { key: "hourly_rate", label: "Hourly rate" },
  { key: "weekly_hours", label: "Contracted weekly hours" },
  { key: "role", label: "Role / job title" },
  { key: "workplace", label: "Workplace / location" },
  { key: "start_date", label: "Start date" },
  { key: "probation_months", label: "Probation length" },
  { key: "notice_period", label: "Notice period" },
];

const MATERIAL_KEYS = new Set(MATERIAL_FIELDS.map((f) => f.key));

export function isMaterialField(key: string): boolean {
  return MATERIAL_KEYS.has(key);
}

export function isMaterialChange(changes: FieldChange[]): boolean {
  return changes.some((c) => c.is_material);
}

/** Compare two flat record snapshots and produce a typed diff. */
export function diffContractFields(
  previous: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined,
  fieldLabels: Record<string, string> = {},
): FieldChange[] {
  const prev = previous ?? {};
  const nxt = next ?? {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(nxt)]);
  const changes: FieldChange[] = [];

  for (const key of keys) {
    const a = (prev as Record<string, unknown>)[key];
    const b = (nxt as Record<string, unknown>)[key];
    if (JSON.stringify(a ?? null) === JSON.stringify(b ?? null)) continue;
    const label =
      fieldLabels[key] ??
      MATERIAL_FIELDS.find((f) => f.key === key)?.label ??
      key;
    changes.push({
      field: key,
      label,
      previous_value: (a as string | number | null) ?? null,
      new_value: (b as string | number | null) ?? null,
      is_material: isMaterialField(key),
    });
  }
  return changes;
}

export function nextVersionNumber(currentVersion: number | null | undefined): number {
  return (currentVersion ?? 1) + 1;
}

export function contractStateLabel(state: ContractState | string | null | undefined): string {
  switch (state) {
    case "draft":
      return "Draft";
    case "issued":
      return "Pending signature";
    case "signed":
      return "Active";
    case "superseded":
      return "Superseded";
    case "terminated":
      return "Terminated";
    default:
      return "Unknown";
  }
}

export function amendmentTypeLabel(type: AmendmentType | string | null | undefined): string {
  switch (type) {
    case "salary":
      return "Salary change";
    case "hours":
      return "Hours change";
    case "role":
      return "Role change";
    case "workplace":
      return "Workplace change";
    case "probation":
      return "Probation update";
    case "clauses":
      return "Clause update";
    case "other":
      return "Other";
    default:
      return type || "Amendment";
  }
}
