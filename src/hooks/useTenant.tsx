import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ModuleKey } from "@/components/ProtectedRoute";

interface TenantMembership {
  tenant_id: string;
  tenant_name: string;
  role: string;
}

export type EnabledModules = Record<ModuleKey, boolean>;

interface TenantContextType {
  tenantId: string | null;
  tenantName: string | null;
  tenantCountry: string | null;
  tenantTimezone: string | null;
  tenantStatus: string | null;
  isPlatformAdmin: boolean;
  enabledModules: EnabledModules | null;
  loading: boolean;
  /** True only after tenant membership lookup has fully completed. */
  tenantResolved: boolean;
  /** Number of active memberships found; -1 = unresolved. */
  membershipCount: number;
  showTenantPicker: boolean;
  availableTenants: TenantMembership[];
  setTenantId: (id: string) => void;
  selectTenant: (tenantId: string) => void;
}

const DEFAULT_MODULES: EnabledModules = {
  scheduling: true,
  payroll: true,
  training: true,
  documents: true,
  analytics: true,
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantCountry, setTenantCountry] = useState<string | null>(null);
  const [tenantTimezone, setTenantTimezone] = useState<string | null>(null);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [enabledModules, setEnabledModules] = useState<EnabledModules | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantResolved, setTenantResolved] = useState(false);
  const [membershipCount, setMembershipCount] = useState(-1); // -1 = unresolved
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<TenantMembership[]>([]);

  const applyTenantData = (tenant: any, memberTenantId: string) => {
    setTenantId(memberTenantId);
    setTenantName(tenant?.name || null);
    setTenantCountry(tenant?.country || null);
    setTenantTimezone(tenant?.timezone || null);
    setTenantStatus(tenant?.status || null);

    const modules = tenant?.enabled_modules;
    if (modules && typeof modules === "object") {
      setEnabledModules({
        scheduling: modules.scheduling !== false,
        payroll: modules.payroll !== false,
        training: modules.training !== false,
        documents: modules.documents !== false,
        analytics: modules.analytics !== false,
      });
    } else {
      setEnabledModules(DEFAULT_MODULES);
    }
  };

  const selectTenant = useCallback(async (selectedTenantId: string) => {
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id, tenants(id, name, country, timezone, status, enabled_modules)")
      .eq("user_id", user!.id)
      .eq("tenant_id", selectedTenantId)
      .eq("is_active", true)
      .single();

    if (membership) {
      applyTenantData(membership.tenants as any, membership.tenant_id);
      setShowTenantPicker(false);
      localStorage.setItem("uglo_selected_tenant", selectedTenantId);
    }
  }, [user]);

  useEffect(() => {
    // While auth is still bootstrapping, stay in loading — do NOT touch localStorage
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      // Confirmed logout — clear everything including localStorage
      setTenantId(null);
      setTenantName(null);
      setTenantCountry(null);
      setTenantTimezone(null);
      setTenantStatus(null);
      setIsPlatformAdmin(false);
      setEnabledModules(null);
      setTenantResolved(true);
      setMembershipCount(0);
      setShowTenantPicker(false);
      setAvailableTenants([]);
      setLoading(false);
      localStorage.removeItem("uglo_selected_tenant");
      console.log("[TenantProvider] Auth resolved: no user → cleared state + localStorage");
      return;
    }

    // User is authenticated — reset resolved state and start fetch
    setLoading(true);
    setTenantResolved(false);
    setMembershipCount(-1);

    const fetchTenant = async () => {
      try {
        console.log("[TenantProvider] Resolving workspace for user:", user.id);

        // Check platform admin status
        const { data: platformAdmin } = await supabase
          .from("platform_admins")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        setIsPlatformAdmin(!!platformAdmin);

        // Get ALL active tenant memberships
        const { data: memberships, error: membershipError } = await supabase
          .from("tenant_members")
          .select("tenant_id, role, tenants(id, name, country, timezone, status, enabled_modules)")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (membershipError) {
          console.error("[TenantProvider] Membership lookup failed:", membershipError);
          // On error, mark resolved but with -1 count — ProtectedRoute will show loading
          setMembershipCount(-1);
          setTenantResolved(false); // keep unresolved so we don't redirect to onboard
          setLoading(false);
          return;
        }

        const count = memberships?.length ?? 0;
        setMembershipCount(count);

        const savedTenantId = localStorage.getItem("uglo_selected_tenant");

        console.log(
          "[TenantProvider] Memberships:", count,
          "| Saved tenant:", savedTenantId,
          "| Platform admin:", !!platformAdmin
        );

        if (count === 0) {
          console.log("[TenantProvider] Decision: 0 memberships → onboard");
          setShowTenantPicker(false);
          setTenantResolved(true);
          setLoading(false);
          return;
        }

        if (count === 1) {
          const m = memberships![0];
          console.log("[TenantProvider] Decision: 1 membership → auto-select:", (m.tenants as any)?.name);
          applyTenantData(m.tenants as any, m.tenant_id);
          localStorage.setItem("uglo_selected_tenant", m.tenant_id);
          setShowTenantPicker(false);
        } else {
          // Multiple tenants
          const savedMembership = savedTenantId
            ? memberships!.find((m) => m.tenant_id === savedTenantId)
            : null;

          if (savedMembership) {
            console.log("[TenantProvider] Decision: Restored saved tenant →", (savedMembership.tenants as any)?.name);
            applyTenantData(savedMembership.tenants as any, savedMembership.tenant_id);
            setShowTenantPicker(false);
          } else {
            if (savedTenantId) {
              console.warn("[TenantProvider] Stale saved tenant ID removed:", savedTenantId);
              localStorage.removeItem("uglo_selected_tenant");
            }
            console.log("[TenantProvider] Decision:", count, "tenants, no valid saved → workspace picker");
            setAvailableTenants(
              memberships!.map((m) => ({
                tenant_id: m.tenant_id,
                tenant_name: (m.tenants as any)?.name || "Unknown",
                role: m.role,
              }))
            );
            setShowTenantPicker(true);
          }
        }

        setTenantResolved(true);
      } catch (err) {
        console.error("[TenantProvider] Unexpected error:", err);
        // Keep unresolved to avoid false redirect
        setTenantResolved(false);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [user, authLoading]);

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantName,
        tenantCountry,
        tenantTimezone,
        tenantStatus,
        isPlatformAdmin,
        enabledModules,
        loading,
        tenantResolved,
        membershipCount,
        showTenantPicker,
        availableTenants,
        setTenantId,
        selectTenant,
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
