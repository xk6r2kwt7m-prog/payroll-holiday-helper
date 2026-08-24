import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { PeriodDeleteImpact } from "@/lib/payroll-period-delete-impact";

/**
 * Read-only pre-flight report for deleting a draft payroll period.
 * Reads only — nothing is modified by this hook.
 */
export function usePayrollPeriodDeleteImpact(periodId?: string, enabled = true) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["payroll_period_delete_impact", tenantId, periodId],
    enabled: !!tenantId && !!periodId && enabled,
    queryFn: async (): Promise<PeriodDeleteImpact | null> => {
      if (!tenantId || !periodId) return null;

      const { data: period, error: periodError } = await supabase
        .from("payroll_periods")
        .select("id, period_name, status")
        .eq("id", periodId)
        .maybeSingle();
      if (periodError) throw periodError;
      if (!period) return null;

      const { data: entries, error: entriesError } = await supabase
        .from("payroll_entries")
        .select("id")
        .eq("payroll_period_id", periodId);
      if (entriesError) throw entriesError;
      const entryIds = (entries || []).map((e) => e.id);

      const { data: payments, error: paymentsError } = await supabase
        .from("holiday_payments")
        .select("id, hours_paid")
        .eq("payroll_period_id", periodId);
      if (paymentsError) throw paymentsError;
      const paymentIds = (payments || []).map((p) => p.id);

      const sumHours = (rows: { hours: number | null }[] | null) =>
        (rows || []).reduce((sum, r) => sum + Math.abs(Number(r.hours) || 0), 0);

      let ledgerFromPayments: { hours: number | null }[] = [];
      if (paymentIds.length > 0) {
        const { data, error } = await supabase
          .from("holiday_ledger")
          .select("id, hours")
          .eq("source_table", "holiday_payments")
          .in("source_id", paymentIds);
        if (error) throw error;
        ledgerFromPayments = data || [];
      }

      let ledgerFromEntries: { hours: number | null }[] = [];
      if (entryIds.length > 0) {
        const { data, error } = await supabase
          .from("holiday_ledger")
          .select("id, hours")
          .eq("source_table", "payroll_entries")
          .in("source_id", entryIds);
        if (error) throw error;
        ledgerFromEntries = data || [];
      }

      const { count: noteCount } = await supabase
        .from("payroll_period_notes")
        .select("id", { count: "exact", head: true })
        .eq("payroll_period_id", periodId);

      let locationSplitCount = 0;
      if (entryIds.length > 0) {
        const { count } = await supabase
          .from("payroll_entry_locations")
          .select("id", { count: "exact", head: true })
          .in("payroll_entry_id", entryIds);
        locationSplitCount = count || 0;
      }

      return {
        periodId: period.id,
        periodName: period.period_name,
        status: String(period.status ?? ""),
        entryCount: entryIds.length,
        holidayPaymentCount: paymentIds.length,
        holidayPaymentHours: (payments || []).reduce(
          (sum, p) => sum + Math.abs(Number(p.hours_paid) || 0),
          0,
        ),
        ledgerFromPaymentsCount: ledgerFromPayments.length,
        ledgerFromPaymentsHours: sumHours(ledgerFromPayments),
        ledgerFromEntriesCount: ledgerFromEntries.length,
        ledgerFromEntriesHours: sumHours(ledgerFromEntries),
        noteCount: noteCount || 0,
        locationSplitCount,
      };
    },
  });
}
