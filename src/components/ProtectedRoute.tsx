import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { AccessDenied } from "@/components/AccessDenied";
import { ModuleUnavailable } from "@/components/ModuleUnavailable";
import { TenantSuspended } from "@/components/TenantSuspended";
import { type AppRole, getRoleLevel } from "@/lib/roles";
import { usePermission, type PermissionKey } from "@/hooks/useRolePermissions";

export type ModuleKey = "scheduling" | "payroll" | "training" | "documents" | "analytics";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
  requiredModule?: ModuleKey;
  moduleName?: string;
  platformAdminOnly?: boolean;
  /** Optional permission key check (enforced after role check) */
  requiredPermission?: PermissionKey;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredModule,
  moduleName,
  platformAdminOnly,
  requiredPermission,
}: ProtectedRouteProps) {
  const { user, role, loading: authLoading } = useAuth();
  const {
    tenantId, isPlatformAdmin, enabledModules,
    loading: tenantLoading, tenantResolved, membershipCount,
    showTenantPicker, tenantStatus,
  } = useTenant();

  // Permission check (safe to call unconditionally — returns true for admin/platform admin)
  const hasPermission = usePermission(requiredPermission || "view_employees");

  // ─── GATE 1: Auth or tenant still loading ───
  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-2xl animate-pulse">
            🥟
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // ─── GATE 2: Not authenticated ───
  if (!user) {
    console.log("[ProtectedRoute] No user → /auth");
    return <Navigate to="/auth" replace />;
  }

  // ─── GATE 3: Tenant resolution not yet complete ───
  if (!tenantResolved) {
    console.log("[ProtectedRoute] Tenant not yet resolved — showing resolving screen");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-2xl animate-pulse">
            🥟
          </div>
          <p className="text-muted-foreground">Resolving workspace…</p>
        </div>
      </div>
    );
  }

  // ─── GATE 4: Multiple tenants, none selected yet ───
  if (showTenantPicker && membershipCount > 1 && !tenantId) {
    return <Navigate to="/select-workspace" replace />;
  }

  // ─── GATE 5: Zero memberships — only now redirect to onboard ───
  if (membershipCount === 0 && !tenantId && !isPlatformAdmin) {
    return <Navigate to="/onboard" replace />;
  }

  // ─── GATE 6: Tenant suspended or cancelled ───
  if ((tenantStatus === "suspended" || tenantStatus === "cancelled") && !isPlatformAdmin) {
    return <TenantSuspended />;
  }

  // ─── GATE 7: Platform admin only routes ───
  if (platformAdminOnly && !isPlatformAdmin) {
    return <AccessDenied />;
  }

  // ─── GATE 8: Role check ───
  if (requiredRole && !isPlatformAdmin) {
    const userLevel = getRoleLevel(role);
    const requiredLevel = getRoleLevel(requiredRole);
    if (userLevel < requiredLevel) {
      return <AccessDenied />;
    }
  }

  // ─── GATE 9: Permission key check ───
  if (requiredPermission && !isPlatformAdmin && !hasPermission) {
    return <AccessDenied />;
  }

  // ─── GATE 10: Module check ───
  if (requiredModule && enabledModules && !isPlatformAdmin) {
    const isModuleEnabled = enabledModules[requiredModule] !== false;
    if (!isModuleEnabled) {
      return <ModuleUnavailable moduleName={moduleName} moduleKey={requiredModule} />;
    }
  }

  return <>{children}</>;
}
