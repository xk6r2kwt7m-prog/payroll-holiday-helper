import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { AccessDenied } from "@/components/AccessDenied";
import { ModuleUnavailable } from "@/components/ModuleUnavailable";
import { TenantSuspended } from "@/components/TenantSuspended";
import { type AppRole, getRoleLevel } from "@/lib/roles";

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
    const userLevel = getRoleLevel(role);
    const requiredLevel = getRoleLevel(requiredRole);
    if (userLevel < requiredLevel) {
      return <AccessDenied />;
    }
  }

  if (requiredModule && enabledModules && !isPlatformAdmin) {
    const isModuleEnabled = enabledModules[requiredModule] !== false;
    if (!isModuleEnabled) {
      return <ModuleUnavailable moduleName={moduleName} moduleKey={requiredModule} />;
    }
  }

  return <>{children}</>;
}
