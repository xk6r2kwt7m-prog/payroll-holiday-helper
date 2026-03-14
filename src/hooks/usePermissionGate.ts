/**
 * Permission gate utilities for Phase 2 enforcement.
 * Wraps usePermission from useRolePermissions for convenient consumption.
 */
import { usePermission, type PermissionKey } from "@/hooks/useRolePermissions";

/** Returns true if the current user has the given permission */
export { usePermission } from "@/hooks/useRolePermissions";
export type { PermissionKey } from "@/hooks/useRolePermissions";

/** Check multiple permissions at once */
export function usePermissions(keys: PermissionKey[]): Record<PermissionKey, boolean> {
  // We can't call hooks in a loop, so we use the underlying data directly
  const results = {} as Record<PermissionKey, boolean>;
  for (const key of keys) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[key] = usePermission(key);
  }
  return results;
}

/** Map nav items to permission keys */
export const NAV_PERMISSION_MAP: Record<string, PermissionKey> = {
  "/employees": "view_employees",
  "/onboarding": "manage_lifecycle",
  "/disciplinary": "manage_lifecycle",
  "/schedule": "view_schedules",
  "/schedule/report": "view_schedules",
  "/schedule/analytics": "view_schedules",
  "/schedule/labour-cost": "view_schedules",
  "/timesheets": "view_timesheets",
  "/holidays": "view_holidays",
  "/holidays/manage": "approve_holidays",
  "/holidays/audit": "approve_holidays",
  "/absences": "view_employees",
  "/payroll": "view_pay_data",
  "/payroll/calendar": "view_pay_data",
  "/payroll/analytics": "view_pay_data",
  "/payroll/comparison": "view_pay_data",
  "/payroll/overpayments": "view_pay_data",
  "/payroll/audit": "view_pay_data",
  "/training": "view_training",
  "/contracts": "manage_documents",
  "/settings": "access_admin_centre",
  "/reports": "view_employees",
};
