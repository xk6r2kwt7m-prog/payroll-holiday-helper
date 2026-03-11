import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TenantContextType {
  tenantId: string | null;
  tenantName: string | null;
  tenantCountry: string | null;
  tenantTimezone: string | null;
  isPlatformAdmin: boolean;
  loading: boolean;
  setTenantId: (id: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantCountry, setTenantCountry] = useState<string | null>(null);
  const [tenantTimezone, setTenantTimezone] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTenantId(null);
      setTenantName(null);
      setTenantCountry(null);
      setTenantTimezone(null);
      setIsPlatformAdmin(false);
      setLoading(false);
      return;
    }

    const fetchTenant = async () => {
      try {
        // Check platform admin status
        const { data: platformAdmin } = await supabase
          .from("platform_admins")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        setIsPlatformAdmin(!!platformAdmin);

        // Get user's tenant membership (use first active tenant)
        const { data: membership } = await supabase
          .from("tenant_members")
          .select("tenant_id, tenants(id, name, country, timezone)")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (membership) {
          const tenant = membership.tenants as any;
          setTenantId(membership.tenant_id);
          setTenantName(tenant?.name || null);
          setTenantCountry(tenant?.country || null);
          setTenantTimezone(tenant?.timezone || null);
        }
      } catch (err) {
        console.error("Failed to fetch tenant:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [user]);

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantName,
        tenantCountry,
        tenantTimezone,
        isPlatformAdmin,
        loading,
        setTenantId,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

/**
 * Helper to get tenant_id for insert operations.
 * Throws if no tenant is set.
 */
export function useRequiredTenantId(): string {
  const { tenantId } = useTenant();
  if (!tenantId) {
    throw new Error("No tenant selected");
  }
  return tenantId;
}
