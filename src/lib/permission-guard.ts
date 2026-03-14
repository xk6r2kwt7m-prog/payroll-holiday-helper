/**
 * Shared defensive permission check for use inside mutation functions.
 * Queries the user's role and the tenant's role_permissions table,
 * then throws if the permission is not granted.
 */
import { supabase } from "@/integrations/supabase/client";

const ADMIN_FULL_ACCESS_ROLES = ["admin"];

/** Throws if user does not hold the given permission key. */
export async function assertPermission(
  permissionKey: string,
  tenantId: string | null
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check role
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const userRoles = (roles || []).map((r: any) => r.role as string);

  // Admin always passes
  if (userRoles.some((r) => ADMIN_FULL_ACCESS_ROLES.includes(r))) return;

  // Platform admin always passes
  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (platformAdmin) return;

  if (!tenantId) throw new Error("Permission denied: no workspace");

  // Check each role the user has for this permission
  for (const role of userRoles) {
    const { data: perm } = await supabase
      .from("role_permissions")
      .select("granted")
      .eq("tenant_id", tenantId)
      .eq("role", role)
      .eq("permission_key", permissionKey)
      .maybeSingle();

    if (perm?.granted) return;
  }

  // Check role defaults (manager defaults etc.)
  const ROLE_DEFAULTS: Record<string, string[]> = {
    manager: [
      "view_employees", "edit_employees",
      "view_schedules", "edit_schedules", "publish_schedules",
      "view_timesheets", "approve_timesheets",
      "view_holidays", "approve_holidays",
      "view_training", "manage_training",
      "view_documents", "manage_documents",
    ],
    supervisor: [
      "view_employees", "view_schedules", "view_timesheets",
      "view_holidays", "view_training", "view_documents",
    ],
  };

  for (const role of userRoles) {
    if (ROLE_DEFAULTS[role]?.includes(permissionKey)) return;
  }

  throw new Error(`Permission denied: ${permissionKey} is required for this action.`);
}
