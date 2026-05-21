/**
 * Phase 3 — Contract NMW gate override.
 *
 * Writes an INSERT-ONLY audit row into `contract_minimum_wage_overrides`
 * when a manager chooses to issue a contract whose `base_hourly_rate`
 * is below the applicable UK National Minimum Wage.
 *
 * Service charge is NEVER considered when checking NMW. This hook is
 * only used after a manager has explicitly justified the override.
 */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { assertPermission } from "@/lib/permission-guard";

export interface NmwOverrideInput {
  employee_id: string;
  contract_id?: string | null;
  base_hourly_rate: number;
  required_minimum_rate: number;
  age_band?: string | null;
  override_reason: string;
}

export function useCreateNmwOverride() {
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (input: NmwOverrideInput) => {
      if (!tenantId) throw new Error("No workspace");
      if (!input.override_reason?.trim()) {
        throw new Error("An override reason is required.");
      }
      // Manager-level minimum. Falls back to admin/platform-admin internally.
      await assertPermission("edit_employees", tenantId);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("contract_minimum_wage_overrides")
        .insert({
          tenant_id: tenantId,
          employee_id: input.employee_id,
          contract_id: input.contract_id ?? null,
          base_hourly_rate: input.base_hourly_rate,
          required_minimum_rate: input.required_minimum_rate,
          age_band: input.age_band ?? null,
          override_reason: input.override_reason.trim(),
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });
}
