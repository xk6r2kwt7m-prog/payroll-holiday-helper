import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";

/* ─── Types ─── */

export interface ServiceChargeRoleRate {
  id: string;
  tenant_id: string;
  role_name: string;
  rate_per_hour: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceChargeEmployeeRate {
  id: string;
  tenant_id: string;
  employee_id: string;
  custom_rate_per_hour: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceChargeLocationSetting {
  id: string;
  tenant_id: string;
  branch: string;
  enabled: boolean;
  calculation_model: string;
  default_rate_per_hour: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Company-level toggle (reads tenants.service_charge_enabled) ─── */

export function useServiceChargeEnabled() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["service-charge-enabled", tenantId],
    queryFn: async () => {
      if (!tenantId) return false;
      const { data } = await supabase
        .from("tenants")
        .select("service_charge_enabled")
        .eq("id", tenantId)
        .single();
      return (data as any)?.service_charge_enabled ?? false;
    },
    enabled: !!tenantId,
  });
}

export function useToggleServiceCharge() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!tenantId) throw new Error("No tenant");
      await assertPermission("access_admin_centre", tenantId);
      const { error } = await supabase
        .from("tenants")
        .update({ service_charge_enabled: enabled } as any)
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-charge-enabled"] });
      qc.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Service charge setting updated");
    },
    onError: (e) => toast.error(e.message),
  });
}

/* ─── Location settings ─── */

export function useServiceChargeLocations() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["sc-location-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("service_charge_location_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("branch");
      if (error) throw error;
      return data as unknown as ServiceChargeLocationSetting[];
    },
    enabled: !!tenantId,
  });
}

export function useUpsertServiceChargeLocation() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ServiceChargeLocationSetting> & { branch: string }) => {
      if (!tenantId) throw new Error("No tenant");
      await assertPermission("access_admin_centre", tenantId);
      const { error } = await supabase
        .from("service_charge_location_settings")
        .upsert(
          { ...input, tenant_id: tenantId } as any,
          { onConflict: "tenant_id,branch" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sc-location-settings"] });
      toast.success("Location service charge updated");
    },
    onError: (e) => toast.error(e.message),
  });
}

/* ─── Role rates ─── */

export function useServiceChargeRoleRates() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["sc-role-rates", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("service_charge_role_rates")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("role_name");
      if (error) throw error;
      return data as unknown as ServiceChargeRoleRate[];
    },
    enabled: !!tenantId,
  });
}

export function useSaveRoleRate() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; role_name: string; rate_per_hour: number; effective_from: string; effective_to?: string | null; notes?: string | null; is_active?: boolean }) => {
      if (!tenantId) throw new Error("No tenant");
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("service_charge_role_rates")
          .update(rest as any)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("service_charge_role_rates")
          .insert({ ...input, tenant_id: tenantId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sc-role-rates"] });
      toast.success("Role rate saved");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteRoleRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_charge_role_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sc-role-rates"] });
      toast.success("Role rate removed");
    },
    onError: (e) => toast.error(e.message),
  });
}

/* ─── Employee rates ─── */

export function useServiceChargeEmployeeRates() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["sc-employee-rates", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("service_charge_employee_rates")
        .select("*, employees(forename, surname)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as (ServiceChargeEmployeeRate & { employees: { forename: string; surname: string } })[];
    },
    enabled: !!tenantId,
  });
}

export function useSaveEmployeeRate() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; employee_id: string; custom_rate_per_hour: number; effective_from: string; effective_to?: string | null; notes?: string | null; is_active?: boolean }) => {
      if (!tenantId) throw new Error("No tenant");
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("service_charge_employee_rates")
          .update(rest as any)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("service_charge_employee_rates")
          .insert({ ...input, tenant_id: tenantId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sc-employee-rates"] });
      toast.success("Employee rate saved");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteEmployeeRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_charge_employee_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sc-employee-rates"] });
      toast.success("Employee rate removed");
    },
    onError: (e) => toast.error(e.message),
  });
}
