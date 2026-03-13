/**
 * Shared role hierarchy — single source of truth.
 * Every component that checks access must import from here.
 */

export type AppRole = "admin" | "manager" | "supervisor" | "staff" | "viewer";

export const ROLE_LEVEL: Record<AppRole, number> = {
  admin: 4,
  manager: 3,
  supervisor: 2,
  staff: 1,
  viewer: 0,
} as const;

/** Returns numeric level for a role string; 0 for unknown roles. */
export function getRoleLevel(role: string | null | undefined): number {
  if (!role) return 0;
  return ROLE_LEVEL[role as AppRole] ?? 0;
}

/** True if `userRole` meets or exceeds `requiredRole`. */
export function meetsMinRole(
  userRole: string | null | undefined,
  requiredRole: AppRole
): boolean {
  return getRoleLevel(userRole) >= ROLE_LEVEL[requiredRole];
}
