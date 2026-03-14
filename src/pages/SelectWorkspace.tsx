import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { TenantPicker } from "@/components/TenantPicker";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const SelectWorkspace = () => {
  const { user, loading: authLoading } = useAuth();
  const { availableTenants, selectTenant, showTenantPicker, tenantId, tenantResolved, membershipCount, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(false);

  // Show loading while auth, tenant, or selection is in progress
  if (authLoading || tenantLoading || !tenantResolved || selecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-2xl animate-pulse">
            🥟
          </div>
          <p className="text-muted-foreground">
            {selecting ? "Switching workspace…" : "Resolving workspace…"}
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Tenant already selected — go to dashboard
  if (tenantId && !showTenantPicker) return <Navigate to="/" replace />;

  // Confirmed zero memberships
  if (membershipCount === 0) return <Navigate to="/onboard" replace />;

  // Edge case fallback
  if (!showTenantPicker || availableTenants.length === 0) {
    return <Navigate to="/" replace />;
  }

  const handleSelect = async (id: string) => {
    setSelecting(true);
    console.log("[SelectWorkspace] User selected tenant:", id);
    await selectTenant(id);
    // selectTenant has already applied state synchronously from cache.
    // Use navigate (not window.location.href) to avoid full reload.
    console.log("[SelectWorkspace] Selection complete, navigating to /");
    navigate("/", { replace: true });
  };

  return (
    <TenantPicker
      tenants={availableTenants}
      onSelect={handleSelect}
    />
  );
};

export default SelectWorkspace;
