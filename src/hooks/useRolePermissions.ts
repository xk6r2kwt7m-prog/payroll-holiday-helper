import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";

/** All permission keys used across the app */
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

/** Default permissions by role (used when no DB overrides exist) */
const ROLE_DEFAULTS: Record<string, Record<string, boolean>> = {
  admin: Object.fromEntries(PERMISSION_KEYS.map(k => [k, true])),
  manager: {
    view_employees: true, edit_employees: true, manage_lifecycle: false,
    view_schedules: true, edit_schedules: true, publish_schedules: true,
    view_timesheets: true, approve_timesheets: true,
    view_holidays: true, approve_holidays: true,
    view_training: true, manage_training: true,
    view_documents: true, manage_documents: true,
    view_pay_data: false, reveal_sensitive: false,
    access_admin_centre: false,
  },
  supervisor: {
    view_employees: true, edit_employees: false, manage_lifecycle: false,
    view_schedules: true, edit_schedules: false, publish_schedules: false,
    view_timesheets: true, approve_timesheets: false,
    view_holidays: true, approve_holidays: false,
    view_training: true, manage_training: false,
    view_documents: true, manage_documents: false,
    view_pay_data: false, reveal_sensitive: false,
    access_admin_centre: false,
  },
  staff: {
    view_employees: false, edit_employees: false, manage_lifecycle: false,
    view_schedules: true, edit_schedules: false, publish_schedules: false,
    view_timesheets: false, approve_timesheets: false,
    view_holidays: false, approve_holidays: false,
    view_training: false, manage_training: false,
    view_documents: false, manage_documents: false,
    view_pay_data: false, reveal_sensitive: false,
    access_admin_centre: false,
  },
};

type PermMap = Record<string, Record<string, boolean>>;

/** Load all role permissions for the current tenant */
export function useRolePermissions() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["role_permissions", tenantId],
    queryFn: async (): Promise<PermMap> => {
      if (!tenantId) return { ...ROLE_DEFAULTS };

      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, permission_key, granted")
        .eq("tenant_id", tenantId);

      if (error) throw error;

      // Start with defaults, overlay DB values
      const result: PermMap = JSON.parse(JSON.stringify(ROLE_DEFAULTS));
      for (const row of data || []) {
        if (!result[row.role]) result[row.role] = {};
        result[row.role][row.permission_key] = row.granted;
      }
      return result;
    },
    enabled: !!tenantId,
  });
}

/** Save permissions for a single role */
export function useSaveRolePermissions() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ role, permissions }: { role: string; permissions: Record<string, boolean> }) => {
      if (!tenantId || !user) throw new Error("No tenant or user");

      const rows = Object.entries(permissions).map(([key, granted]) => ({
        tenant_id: tenantId,
        role,
        permission_key: key,
        granted,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("role_permissions")
        .upsert(rows, { onConflict: "tenant_id,role,permission_key" });

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role_permissions"] }),
  });
}

/** Check if the current user's role has a specific permission */
export function usePermission(key: PermissionKey): boolean {
  const { role } = useAuth();
  const { isPlatformAdmin } = useTenant();
  const { data: perms } = useRolePermissions();

  // Platform admin and app admin always have full access
  if (isPlatformAdmin) return true;
  if (role === "admin") return true;

  if (!role || !perms) {
    // Fallback to defaults if permissions haven't loaded
    const defaults = ROLE_DEFAULTS[role || "staff"] || ROLE_DEFAULTS.staff;
    return defaults[key] ?? false;
  }

  const rolePerms = perms[role];
  if (!rolePerms) return false;

  return rolePerms[key] ?? false;
}
