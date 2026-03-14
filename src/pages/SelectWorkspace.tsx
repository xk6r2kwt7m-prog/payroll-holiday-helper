import { useTenant } from "@/hooks/useTenant";
import { TenantPicker } from "@/components/TenantPicker";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const SelectWorkspace = () => {
  const { user, loading: authLoading } = useAuth();
  const { availableTenants, selectTenant, showTenantPicker, tenantId, tenantResolved, membershipCount, loading: tenantLoading } = useTenant();

  if (authLoading || tenantLoading || !tenantResolved) {
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

  if (!user) return <Navigate to="/auth" replace />;
  if (tenantId && !showTenantPicker) return <Navigate to="/" replace />;

  // Only redirect to onboard when we've confirmed zero memberships
  if (membershipCount === 0) return <Navigate to="/onboard" replace />;

  if (!showTenantPicker || availableTenants.length === 0) {
    // Edge case: resolved but no picker and no tenant — stay on resolving
    return <Navigate to="/" replace />;
  }

  return (
    <TenantPicker
      tenants={availableTenants}
      onSelect={(id) => {
        selectTenant(id);
        window.location.href = "/";
      }}
    />
  );
};

export default SelectWorkspace;
