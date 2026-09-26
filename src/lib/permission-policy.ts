/**
 * Shared, pure permission policy used by both the UI hook and the
 * mutation-time guard. It holds no data access of its own.
 *
 * Rules (A01):
 * - Admin keeps full access (existing policy, unchanged).
 * - For any other role, a stored workspace override wins — an explicit
 *   `false` denies even when the role default would allow.
 * - Only when no override row exists does the role default apply.
 * - A user with several roles is allowed when at least one of their roles
 *   allows (after that role's own override); an explicit deny only affects
 *   the role it was stored for.
 * - Unknown roles have no defaults and are denied.
 * - Permissions that are still loading or failed to load are "unresolved",
 *   never treated as defaults.
 */
export const PERMISSION_KEYS = [
  "view_employees", "edit_employees", "manage_lifecycle",
  "view_schedules", "edit_schedules", "publish_schedules",
  "view_timesheets", "approve_timesheets",
  "view_holidays", "approve_holidays",
  "view_training", "manage_training",
  "view_documents", "manage_documents",
  "view_pay_data", "reveal_sensitive",
  "access_admin_centre",
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

export const FULL_ACCESS_ROLES = ["admin"] as const;

const grant = (keys: PermissionKey[]) =>
  Object.fromEntries(PERMISSION_KEYS.map(k => [k, keys.includes(k)])) as Record<PermissionKey, boolean>;

/** Default permissions by role, used only when no override row exists. */
export const ROLE_DEFAULTS: Record<string, Record<PermissionKey, boolean>> = {
  admin: grant([...PERMISSION_KEYS]),
  manager: grant([
    "view_employees", "edit_employees",
    "view_schedules", "edit_schedules", "publish_schedules",
    "view_timesheets", "approve_timesheets",
    "view_holidays", "approve_holidays",
    "view_training", "manage_training",
    "view_documents", "manage_documents",
  ]),
  supervisor: grant([
    "view_employees", "view_schedules", "view_timesheets",
    "view_holidays", "view_training", "view_documents",
  ]),
  staff: grant(["view_schedules"]),
};

/** role -> permission_key -> granted, for override rows actually stored. */
export type OverrideMap = Record<string, Record<string, boolean>>;

export type PermissionDecision = "allowed" | "denied" | "unresolved";

export function roleAllows(role: string, key: string, overrides: OverrideMap): boolean {
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(role)) return true;
  const stored = overrides[role]?.[key];
  if (typeof stored === "boolean") return stored;
  return ROLE_DEFAULTS[role]?.[key as PermissionKey] ?? false;
}

export function decidePermission(input: {
  roles: readonly string[] | null;
  key: string;
  isPlatformAdmin?: boolean;
  /** undefined/null = overrides not (yet) available */
  overrides: OverrideMap | null | undefined;
  overridesFailed?: boolean;
}): PermissionDecision {
  if (input.isPlatformAdmin) return "allowed";
  const roles = input.roles ?? [];
  if (roles.some(r => (FULL_ACCESS_ROLES as readonly string[]).includes(r))) return "allowed";
  if (!input.roles) return "unresolved";
  if (input.overridesFailed || !input.overrides) return "unresolved";
  if (roles.length === 0) return "denied";
  return roles.some(r => roleAllows(r, input.key, input.overrides!)) ? "allowed" : "denied";
}

/** Build an override map from stored rows (no defaults mixed in). */
export function toOverrideMap(rows: { role: string; permission_key: string; granted: boolean }[]): OverrideMap {
  const map: OverrideMap = {};
  for (const row of rows) {
    (map[row.role] ??= {})[row.permission_key] = row.granted;
  }
  return map;
}

/** Effective map (defaults overlaid with overrides) for the settings screen. */
export function effectivePermissions(overrides: OverrideMap): OverrideMap {
  const result: OverrideMap = {};
  for (const role of Object.keys(ROLE_DEFAULTS)) {
    result[role] = Object.fromEntries(PERMISSION_KEYS.map(k => [k, roleAllows(role, k, overrides)]));
  }
  for (const role of Object.keys(overrides)) {
    if (!result[role]) result[role] = { ...overrides[role] };
  }
  return result;
}
