import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { AccessDenied } from "@/components/AccessDenied";
import { ModuleUnavailable } from "@/components/ModuleUnavailable";
import { TenantSuspended } from "@/components/TenantSuspended";

const ROLE_LEVEL: Record<AppRole, number> = {
  admin: 4,
  manager: 3,
  supervisor: 2,
  staff: 1,
  viewer: 0,
};

export type ModuleKey = "scheduling" | "payroll" | "training" | "documents" | "analytics";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
  requiredModule?: ModuleKey;
  moduleName?: string;
  platformAdminOnly?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredModule,
  moduleName,
  platformAdminOnly,
}: ProtectedRouteProps) {
  const { user, role, loading: authLoading } = useAuth();
  const {
    tenantId, isPlatformAdmin, enabledModules,
    loading: tenantLoading, showTenantPicker, tenantStatus,
  } = useTenant();

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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (showTenantPicker) {
    return <Navigate to="/select-workspace" replace />;
  }

  if (!tenantId && !isPlatformAdmin) {
    return <Navigate to="/onboard" replace />;
  }

  // Tenant suspension check — platform admins bypass
  if (tenantStatus === "suspended" && !isPlatformAdmin) {
    return <TenantSuspended />;
  }

  // Cancelled tenant — same treatment
  if (tenantStatus === "cancelled" && !isPlatformAdmin) {
    return <TenantSuspended />;
  }

  if (platformAdminOnly && !isPlatformAdmin) {
    return <AccessDenied />;
  }

  if (requiredRole && !isPlatformAdmin) {
    const userLevel = role ? (ROLE_LEVEL[role] ?? 0) : 0;
    const requiredLevel = ROLE_LEVEL[requiredRole] ?? 0;
    if (userLevel < requiredLevel) {
      return <AccessDenied />;
    }
  }

  if (requiredModule && enabledModules && !isPlatformAdmin) {
    const isModuleEnabled = enabledModules[requiredModule] !== false;
    if (!isModuleEnabled) {
      return <ModuleUnavailable moduleName={moduleName} />;
    }
  }

  return <>{children}</>;
}
