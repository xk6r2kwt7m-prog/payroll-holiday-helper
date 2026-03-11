import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { AccessDenied } from "@/components/AccessDenied";
import { ModuleUnavailable } from "@/components/ModuleUnavailable";

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
  /** Minimum role required to access this route */
  requiredRole?: AppRole;
  /** Module that must be enabled for the tenant */
  requiredModule?: ModuleKey;
  /** Human-readable module name for the unavailable message */
  moduleName?: string;
  /** If true, only platform admins can access (overrides requiredRole) */
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
  const { tenantId, isPlatformAdmin, enabledModules, loading: tenantLoading, showTenantPicker } = useTenant();

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

  // Show tenant picker if user has multiple tenants and none selected yet
  if (showTenantPicker) {
    return <Navigate to="/select-workspace" replace />;
  }

  // User is logged in but doesn't belong to any tenant — send to onboarding
  if (!tenantId && !isPlatformAdmin) {
    return <Navigate to="/onboard" replace />;
  }

  // Platform admin only routes
  if (platformAdminOnly && !isPlatformAdmin) {
    return <AccessDenied />;
  }

  // Role-based access check (skip for platform admins viewing tenant routes)
  if (requiredRole && !isPlatformAdmin) {
    const userLevel = role ? (ROLE_LEVEL[role] ?? 0) : 0;
    const requiredLevel = ROLE_LEVEL[requiredRole] ?? 0;

    if (userLevel < requiredLevel) {
      return <AccessDenied />;
    }
  }

  // Module-based access check
  if (requiredModule && enabledModules && !isPlatformAdmin) {
    const isModuleEnabled = enabledModules[requiredModule] !== false;
    if (!isModuleEnabled) {
      return <ModuleUnavailable moduleName={moduleName} />;
    }
  }

  return <>{children}</>;
}
