import { useEffect, useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { TenantPicker } from "@/components/TenantPicker";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const SelectWorkspace = () => {
  const { user, loading: authLoading } = useAuth();
  const { availableTenants, selectTenant, showTenantPicker, tenantId, tenantResolved, membershipCount, loading: tenantLoading } = useTenant();
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (!selecting) return;

    if (tenantId && !showTenantPicker) {
      console.log("[SelectWorkspace] Tenant context applied:", tenantId);
      return;
    }

    if (tenantResolved && showTenantPicker && !tenantId) {
      setSelecting(false);
    }
  }, [selecting, tenantId, showTenantPicker, tenantResolved]);

  // Show loading while auth, tenant, or selection is still unresolved
  if (authLoading || tenantLoading || !tenantResolved || (selecting && (!tenantId || showTenantPicker))) {
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

  // Confirmed zero memberships (membershipCount === -1 means still fetching)
  if (membershipCount === 0 && membershipCount !== -1) return <Navigate to="/onboard" replace />;

  // Edge case fallback
  if (!showTenantPicker || availableTenants.length === 0) {
    return <Navigate to="/" replace />;
  }

  const handleSelect = async (id: string) => {
    setSelecting(true);
    console.log("[SelectWorkspace] User selected tenant:", id);

    try {
      await selectTenant(id);
      console.log("[SelectWorkspace] Selection complete, awaiting guarded redirect");
    } catch (error) {
      console.error("[SelectWorkspace] Selection failed:", error);
      setSelecting(false);
    }
  };

  const lastUsedTenantId = typeof window !== "undefined" ? localStorage.getItem("uglo_selected_tenant") : null;

  return (
    <TenantPicker
      tenants={availableTenants}
      onSelect={handleSelect}
      lastUsedTenantId={lastUsedTenantId}
    />
  );
};

export default SelectWorkspace;
