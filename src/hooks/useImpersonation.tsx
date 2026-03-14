import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/lib/roles";

interface SandboxUser {
  label: string;
  role: AppRole;
  department?: string;
  branch?: string;
}

interface ImpersonationState {
  active: boolean;
  sandboxTenantId: string | null;
  sandboxTenantName: string | null;
  impersonatedRole: AppRole | null;
  impersonatedUserLabel: string | null;
  logId: string | null;
}

interface ImpersonationContextType extends ImpersonationState {
  startImpersonation: (tenantId: string, tenantName: string, user: SandboxUser) => Promise<void>;
  switchRole: (user: SandboxUser) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<ImpersonationState>({
    active: false,
    sandboxTenantId: null,
    sandboxTenantName: null,
    impersonatedRole: null,
    impersonatedUserLabel: null,
    logId: null,
  });

  const startImpersonation = useCallback(async (tenantId: string, tenantName: string, sandboxUser: SandboxUser) => {
    if (!user) return;

    // End previous session if active
    if (state.logId) {
      await supabase.from("impersonation_log").update({ ended_at: new Date().toISOString() }).eq("id", state.logId);
    }

    const { data } = await supabase.from("impersonation_log").insert({
      platform_admin_id: user.id,
      sandbox_tenant_id: tenantId,
      impersonated_role: sandboxUser.role,
      impersonated_user_label: sandboxUser.label,
    }).select("id").single();

    setState({
      active: true,
      sandboxTenantId: tenantId,
      sandboxTenantName: tenantName,
      impersonatedRole: sandboxUser.role,
      impersonatedUserLabel: sandboxUser.label,
      logId: data?.id || null,
    });
  }, [user, state.logId]);

  const switchRole = useCallback(async (sandboxUser: SandboxUser) => {
    if (!user || !state.sandboxTenantId) return;

    if (state.logId) {
      await supabase.from("impersonation_log").update({ ended_at: new Date().toISOString() }).eq("id", state.logId);
    }

    const { data } = await supabase.from("impersonation_log").insert({
      platform_admin_id: user.id,
      sandbox_tenant_id: state.sandboxTenantId,
      impersonated_role: sandboxUser.role,
      impersonated_user_label: sandboxUser.label,
    }).select("id").single();

    setState(prev => ({
      ...prev,
      impersonatedRole: sandboxUser.role,
      impersonatedUserLabel: sandboxUser.label,
      logId: data?.id || null,
    }));
  }, [user, state.sandboxTenantId, state.logId]);

  const stopImpersonation = useCallback(async () => {
    if (state.logId) {
      await supabase.from("impersonation_log").update({ ended_at: new Date().toISOString() }).eq("id", state.logId);
    }
    setState({
      active: false,
      sandboxTenantId: null,
      sandboxTenantName: null,
      impersonatedRole: null,
      impersonatedUserLabel: null,
      logId: null,
    });
  }, [state.logId]);

  return (
    <ImpersonationContext.Provider value={{ ...state, startImpersonation, switchRole, stopImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return context;
}
