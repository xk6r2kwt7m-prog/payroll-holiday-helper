import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import {
  PERMISSION_KEYS,
  decidePermission,
  effectivePermissions,
  toOverrideMap,
  type OverrideMap,
  type PermissionDecision,
  type PermissionKey,
} from "@/lib/permission-policy";

export { PERMISSION_KEYS };
export type { PermissionKey, PermissionDecision };

/** Stored overrides only (no defaults), scoped to the active workspace. */
function useRoleOverrides() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["role_permissions", tenantId, "overrides"],
    queryFn: async (): Promise<OverrideMap> => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, permission_key, granted")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return toOverrideMap(data || []);
    },
    enabled: !!tenantId,
  });
}

/** Effective role permissions (defaults + overrides) for the settings screen. */
export function useRolePermissions() {
  const q = useRoleOverrides();
  return { ...q, data: q.data ? effectivePermissions(q.data) : undefined };
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

/** Full decision: allowed, denied, or unresolved (loading / failed read). */
export function usePermissionDecision(key: PermissionKey): PermissionDecision {
  const { role, roleStatus, loading } = useAuth();
  const { isPlatformAdmin } = useTenant();
  const { data, isError } = useRoleOverrides();
  return decidePermission({
    // A failed role lookup is unresolved — never basic staff access.
    // A signed-in user with genuinely no role row keeps the existing staff defaults.
    roles: loading || roleStatus === "failed" || roleStatus === "loading" ? null : [role ?? "staff"],
    key,
    isPlatformAdmin,
    overrides: data,
    overridesFailed: isError,
  });
}

/** True only when the permission is positively resolved as allowed. */
export function usePermission(key: PermissionKey): boolean {
  return usePermissionDecision(key) === "allowed";
}
