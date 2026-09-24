import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { invalidateHolidayDerivedQueries } from "@/lib/holiday-cache";
import {
  LIST_RESTORABLE_RPC,
  RESTORE_RPC,
  describeRecoveryRpcError,
  isRestorable,
  toRestorableDeletion,
  type RestorableDeletion,
} from "@/lib/payroll-period-restore";

/**
 * Draft payroll periods deleted in the last two hours that can still be
 * reversed. Summary details only — the snapshot itself never leaves the
 * database.
 */
export function useRestorablePayrollDeletions() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["payroll_period_restorable", tenantId],
    enabled: !!tenantId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<RestorableDeletion[]> => {
      const { data, error } = await supabase.rpc(LIST_RESTORABLE_RPC as any, {
        _tenant_id: tenantId!,
      });
      if (error) {
        // Not installed yet: nothing can be restored, so show no banner.
        if (error.code === "PGRST202" || /could not find the function/i.test(error.message || "")) {
          return [];
        }
        throw error;
      }
      return ((data as any[]) || []).map(toRestorableDeletion);
    },
  });
}

/**
 * Reverses a deletion inside the two-hour window. The database puts back the
 * exact same rows (same ids) in one transaction, or refuses and changes
 * nothing. Nothing is recalculated or invented, and there is no fallback.
 */
export function useRestorePayrollPeriod() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (deletion: RestorableDeletion) => {
      if (!isRestorable(deletion.deletedAt)) {
        throw new Error("The two-hour window to undo this deletion has passed.");
      }
      const { error } = await supabase.rpc(RESTORE_RPC as any, {
        _recovery_id: deletion.recoveryId,
      });
      if (error) throw new Error(describeRecoveryRpcError(error));
      return deletion.periodId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_period_restorable", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["holiday_payments", tenantId] });
      invalidateHolidayDerivedQueries(queryClient);
    },
  });
}
