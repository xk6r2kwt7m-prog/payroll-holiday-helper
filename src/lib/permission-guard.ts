/**
 * Shared defensive permission check for use inside mutation functions.
 * Reads the user's roles and the workspace's stored overrides, then applies
 * the shared policy in `permission-policy.ts`. Any failed read refuses the
 * action rather than falling back to defaults. RLS still enforces each action.
 */
import { supabase } from "@/integrations/supabase/client";
import { decidePermission, permissionRoleForMembership, toOverrideMap } from "@/lib/permission-policy";

/** Throws if user does not hold the given permission key. */
export async function assertPermission(
  permissionKey: string,
  tenantId: string | null
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: platformAdmin, error: paError } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (platformAdmin) return;
  if (paError) throw new Error("Could not check your permissions. Please try again.");

  if (!tenantId) throw new Error("Permission denied: no workspace");
  const { data: membership, error: membershipError } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (membershipError) throw new Error("Could not check your permissions. Please try again.");
  const role = permissionRoleForMembership(membership?.role ?? null);
  if (!role) throw new Error(`Permission denied: ${permissionKey} is required for this action.`);
  if (role === "admin") return;

  const { data: rows, error: permError } = await supabase
    .from("role_permissions")
    .select("role, permission_key, granted")
    .eq("tenant_id", tenantId)
    .eq("permission_key", permissionKey)
    .eq("role", role);
  if (permError) throw new Error("Could not check your permissions. Please try again.");

  const decision = decidePermission({
    roles: [role],
    key: permissionKey,
    overrides: toOverrideMap((rows || []) as any),
  });
  if (decision === "allowed") return;

  throw new Error(`Permission denied: ${permissionKey} is required for this action.`);
}
