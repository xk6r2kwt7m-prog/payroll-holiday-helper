import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ModuleKey } from "@/components/ProtectedRoute";

interface TenantMembership {
  tenant_id: string;
  tenant_name: string;
  role: string;
}

export type EnabledModules = Record<ModuleKey, boolean>;

/** Full tenant data cached from initial fetch, used for synchronous selection. */
interface CachedTenantData {
  tenant_id: string;
  role: string;
  tenants: {
    id: string;
    name: string;
    country: string;
    timezone: string;
    status: string;
    enabled_modules: any;
  };
}

interface TenantContextType {
  tenantId: string | null;
  tenantName: string | null;
  tenantCountry: string | null;
  tenantTimezone: string | null;
  tenantStatus: string | null;
  /** The current user's role within the active tenant (e.g. 'company_admin', 'manager', 'staff'). */
  tenantRole: string | null;
  isPlatformAdmin: boolean;
  /** True if user is company_admin in current tenant OR a platform admin. */
  isTenantAdmin: boolean;
  enabledModules: EnabledModules | null;
  loading: boolean;
  tenantResolved: boolean;
  membershipCount: number;
  showTenantPicker: boolean;
  availableTenants: TenantMembership[];
  setTenantId: (id: string) => void;
  selectTenant: (tenantId: string) => Promise<void>;
  /** Re-enter workspace picker mode without clearing auth. */
  openWorkspacePicker: () => void;
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
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantCountry, setTenantCountry] = useState<string | null>(null);
  const [tenantTimezone, setTenantTimezone] = useState<string | null>(null);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [tenantRole, setTenantRole] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<EnabledModules | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantResolved, setTenantResolved] = useState(false);
  const [membershipCount, setMembershipCount] = useState(-1);
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<TenantMembership[]>([]);

  // Cache full membership data so selectTenant can work synchronously
  const cachedMemberships = useRef<CachedTenantData[]>([]);

  const applyTenantData = useCallback((tenant: any, memberTenantId: string) => {
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
  }, []);

  const commitTenantSelection = useCallback((selectedTenantId: string, tenant: any) => {
    // Nuclear cache clear — prevents cross-tenant data leakage
    queryClient.removeQueries();

    applyTenantData(tenant, selectedTenantId);
    setShowTenantPicker(false);
    setAvailableTenants([]);
    setTenantResolved(true);
    setLoading(false);
    localStorage.setItem("uglo_selected_tenant", selectedTenantId);
    
  }, [applyTenantData, queryClient]);

  /**
   * Select a tenant from the picker.
   * Uses cached membership data for instant state application.
   * Falls back to a DB query only if cache miss.
   */
  const selectTenant = useCallback(async (selectedTenantId: string) => {
    const cached = cachedMemberships.current.find(
      (m) => m.tenant_id === selectedTenantId
    );

    if (cached) {
      commitTenantSelection(cached.tenant_id, cached.tenants);
      return;
    }

    if (!user) {
      throw new Error("Cannot select workspace without authenticated user");
    }

    
    const { data: membership, error: membershipError } = await supabase
      .from("tenant_members")
      .select("tenant_id, tenants(id, name, country, timezone, status, enabled_modules)")
      .eq("user_id", user.id)
      .eq("tenant_id", selectedTenantId)
      .eq("is_active", true)
      .single();

    if (membershipError) {
      console.error("[TenantProvider] selectTenant: DB fetch failed:", membershipError);
      throw membershipError;
    }

    if (!membership?.tenants) {
      console.error("[TenantProvider] selectTenant: tenant not found:", selectedTenantId);
      setShowTenantPicker(true);
      throw new Error("Selected workspace is no longer available");
    }

    commitTenantSelection(membership.tenant_id, membership.tenants as any);
  }, [user, commitTenantSelection]);

  const openWorkspacePicker = useCallback(() => {
    const cached = cachedMemberships.current;
    if (cached.length <= 1) return; // nothing to switch to
    setAvailableTenants(
      cached.map((m) => ({
        tenant_id: m.tenant_id,
        tenant_name: (m.tenants as any)?.name || "Unknown",
        role: m.role,
      }))
    );
    setShowTenantPicker(true);
  }, []);

  useEffect(() => {
    // While auth is still bootstrapping, stay in loading
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      // Confirmed logout — use -1 (unresolved) not 0 to prevent stale redirects
      // when a new user logs in before the effect re-runs
      setTenantId(null);
      setTenantName(null);
      setTenantCountry(null);
      setTenantTimezone(null);
      setTenantStatus(null);
      setIsPlatformAdmin(false);
      setEnabledModules(null);
      setTenantResolved(false);
      setMembershipCount(-1);
      setShowTenantPicker(false);
      setAvailableTenants([]);
      cachedMemberships.current = [];
      setLoading(false);
      localStorage.removeItem("uglo_selected_tenant");
      return;
    }

    // User is authenticated — reset resolved state and start fetch
    setLoading(true);
    setTenantResolved(false);
    setMembershipCount(-1);

    let cancelled = false;

    const fetchTenant = async () => {
      try {
        

        const { data: platformAdmin } = await supabase
          .from("platform_admins")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        setIsPlatformAdmin(!!platformAdmin);

        const { data: memberships, error: membershipError } = await supabase
          .from("tenant_members")
          .select("tenant_id, role, tenants(id, name, country, timezone, status, enabled_modules)")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (cancelled) return;

        if (membershipError) {
          console.error("[TenantProvider] Membership lookup failed:", membershipError);
          setMembershipCount(-1);
          setTenantResolved(false);
          setLoading(false);
          return;
        }

        const count = memberships?.length ?? 0;
        setMembershipCount(count);

        // Cache full membership data for synchronous selection later
        cachedMemberships.current = (memberships || []) as unknown as CachedTenantData[];

        const savedTenantId = localStorage.getItem("uglo_selected_tenant");


        if (count === 0) {
          
          setAvailableTenants([]);
          setShowTenantPicker(false);
          setTenantResolved(true);
          setLoading(false);
          return;
        }

        if (count === 1) {
          const m = memberships![0];
          
          commitTenantSelection(m.tenant_id, m.tenants as any);
        } else {
          const savedMembership = savedTenantId
            ? memberships!.find((m) => m.tenant_id === savedTenantId)
            : null;

          if (savedMembership) {
            
            commitTenantSelection(savedMembership.tenant_id, savedMembership.tenants as any);
          } else {
            if (savedTenantId) {
              console.warn("[TenantProvider] Stale saved tenant ID removed:", savedTenantId);
              localStorage.removeItem("uglo_selected_tenant");
            }
            
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
        setTenantResolved(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTenant();

    return () => { cancelled = true; };
  }, [user, authLoading, commitTenantSelection]);

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
        openWorkspacePicker,
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

export function useRequiredTenantId(): string {
  const { tenantId } = useTenant();
  if (!tenantId) {
    throw new Error("No tenant selected");
  }
  return tenantId;
}
