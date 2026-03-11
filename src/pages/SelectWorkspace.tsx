import { useTenant } from "@/hooks/useTenant";
import { TenantPicker } from "@/components/TenantPicker";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const SelectWorkspace = () => {
  const { user } = useAuth();
  const { availableTenants, selectTenant, showTenantPicker, tenantId } = useTenant();

  if (!user) return <Navigate to="/auth" replace />;
  if (tenantId && !showTenantPicker) return <Navigate to="/" replace />;
  if (!showTenantPicker || availableTenants.length === 0) return <Navigate to="/onboard" replace />;

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
