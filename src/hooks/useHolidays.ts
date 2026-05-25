import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/useTenant";
import { assertPermission } from "@/lib/permission-guard";

export type HolidayPayment = Tables<"holiday_payments">;
export type HolidayPaymentInsert = TablesInsert<"holiday_payments">;
export type HolidayPaymentUpdate = TablesUpdate<"holiday_payments">;

export type HolidayBalance = Tables<"holiday_balances">;
export type HolidayBalanceInsert = TablesInsert<"holiday_balances">;
export type HolidayBalanceUpdate = TablesUpdate<"holiday_balances">;

export function useHolidayPayments(periodId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["holiday_payments", tenantId, periodId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from("holiday_payments")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department
          ),
          payroll_periods (
            id,
            period_name,
            start_date,
            end_date
          )
        `)
        .eq("tenant_id", tenantId)
        .order("total", { ascending: false });
      
      if (periodId) {
        query = query.eq("payroll_period_id", periodId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

// Get all holiday payments for all employees across all periods
export function useAllHolidayPayments() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["holiday_payments", tenantId, "all"],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("holiday_payments")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department,
            hourly_rate,
            start_date
          ),
          payroll_periods (
            id,
            period_name,
            start_date,
            end_date
          )
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useHolidayBalances(employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["holiday_balances", tenantId, employeeId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from("holiday_balances")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department,
            status
          )
        `)
        .eq("tenant_id", tenantId)
        .order("leave_year_start", { ascending: false });
      
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

// Get holiday balances for a specific leave year
export function useHolidayBalancesByYear(year: number) {
  const { tenantId } = useTenant();
  const leaveYearStart = `${year}-01-01`;
  const leaveYearEnd = `${year}-12-31`;
  
  return useQuery({
    queryKey: ["holiday_balances", tenantId, "year", year],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("holiday_balances")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department,
            status,
            hourly_rate
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("leave_year_start", leaveYearStart)
        .eq("leave_year_end", leaveYearEnd)
        .order("hours_accrued", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

// Get holiday payments for a specific leave year (by holiday_taken_date)
export function useHolidayPaymentsByYear(year: number) {
  const { tenantId } = useTenant();
  const leaveYearStart = `${year}-01-01`;
  const leaveYearEnd = `${year}-12-31`;
  
  return useQuery({
    queryKey: ["holiday_payments", tenantId, "year", year],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("holiday_payments")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department
          ),
          payroll_periods (
            id,
            period_name,
            start_date,
            end_date
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("leave_year_start", leaveYearStart)
        .eq("leave_year_end", leaveYearEnd)
        .order("holiday_taken_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

// Get all payroll entries with holiday accrual data — paginated to avoid 1000-row cap
export function useAllPayrollEntriesWithHoliday() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["payroll_entries", tenantId, "holiday_summary"],
    queryFn: async () => {
      if (!tenantId) return [];
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("payroll_entries")
          .select(`
            id,
            employee_id,
            payroll_period_id,
            timesheet_hours,
            imported_hours,
            holiday_accrued_hours,
            hourly_rate,
            employees (
              id,
              forename,
              surname,
              department,
              start_date,
              hourly_rate
            ),
            payroll_periods (
              id,
              period_name,
              start_date,
              end_date,
              status
            )
          `)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        allData = allData.concat(data || []);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }

      return allData;
    },
    enabled: !!tenantId,
  });
}

export function useCreateHolidayPayment() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (payment: Omit<HolidayPaymentInsert, 'tenant_id'>) => {
      await assertPermission("approve_holidays", tenantId!);
      const { data, error } = await supabase
        .from("holiday_payments")
        .insert({ ...payment, tenant_id: tenantId! })
        .select()
        .single();
      
      if (error) throw error;

      // Recalculate and update the payroll period's holidays_total and grand_total
      await recalcPayrollPeriodTotals(payment.payroll_period_id);

      // Write matching holiday_ledger entry (negative hours = debit)
      // The unique index uq_holiday_ledger_source(source_table, source_id, entry_type)
      // prevents duplicates if this is somehow called twice for the same payment.
      if (data && payment.employee_id) {
        const hoursValue = -Math.abs(Number(payment.hours));
        const entryDate = payment.holiday_taken_date || new Date().toISOString().slice(0, 10);
        const leaveYearStart = payment.leave_year_start || `${new Date(entryDate).getFullYear()}-01-01`;

        const { data: { user } } = await supabase.auth.getUser();

        await supabase
          .from("holiday_ledger")
          .insert({
            employee_id: payment.employee_id,
            tenant_id: tenantId!,
            leave_year_start: leaveYearStart,
            entry_date: entryDate,
            entry_type: "holiday_taken" as const,
            hours: hoursValue,
            amount: payment.total ? -Math.abs(Number(payment.total)) : null,
            source_table: "holiday_payments",
            source_id: data.id,
            notes: payment.notes || `Holiday taken: ${Math.abs(Number(payment.hours))}h`,
            created_by: user?.id || null,
          })
          .single();
        // Silently catch duplicate insert errors (unique constraint) — the ledger entry already exists
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday_payments", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["holiday_ledger"] });
    },
  });
}

/**
 * Delete a holiday payment AND reverse its matching holiday_ledger entry
 * so the employee's available balance is restored.
 *
 * Safety:
 *  - Blocks deletion if the linked payroll period is approved/locked.
 *  - Removes the matching ledger entry (source_table='holiday_payments',
 *    source_id=paymentId, entry_type='holiday_taken') BEFORE deleting
 *    the payment row, so the ledger never points at a missing source.
 *  - Recalculates payroll period totals.
 */
export function useDeleteHolidayPayment() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      await assertPermission("approve_holidays", tenantId!);

      // 1. Load the payment + linked period status
      const { data: payment, error: loadErr } = await supabase
        .from("holiday_payments")
        .select("id, payroll_period_id, employee_id, hours, total")
        .eq("id", paymentId)
        .maybeSingle();
      if (loadErr) throw loadErr;
      if (!payment) throw new Error("Holiday payment not found");

      if (payment.payroll_period_id) {
        const { data: period, error: periodErr } = await supabase
          .from("payroll_periods")
          .select("status")
          .eq("id", payment.payroll_period_id)
          .maybeSingle();
        if (periodErr) throw periodErr;
        const status = period?.status;
        if (status && status !== "draft" && status !== "pending") {
          throw new Error(
            `Cannot delete: payroll period is ${status}. Reopen the period first.`
          );
        }
      }

      // 2. Reverse the ledger entry FIRST (so balance restores even if step 3 fails)
      const { error: ledgerErr } = await supabase
        .from("holiday_ledger")
        .delete()
        .eq("source_table", "holiday_payments")
        .eq("source_id", paymentId)
        .eq("entry_type", "holiday_taken");
      if (ledgerErr) throw ledgerErr;

      // 3. Delete the payment
      const { error: payErr } = await supabase
        .from("holiday_payments")
        .delete()
        .eq("id", paymentId);
      if (payErr) throw payErr;

      // 4. Recalc period totals
      if (payment.payroll_period_id) {
        await recalcPayrollPeriodTotals(payment.payroll_period_id);
      }

      return { paymentId, employeeId: payment.employee_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday_payments", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["holiday_payments"] });
      queryClient.invalidateQueries({ queryKey: ["holiday_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["holiday_payments_year_total"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
    },
  });
}

/**
 * Update a holiday payment AND keep its matching ledger entry in sync,
 * so the available balance always reflects the edited hours/amount.
 */
export function useUpdateHolidayPayment() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        hours: number;
        rate: number;
        total: number;
        holiday_taken_date: string;
        leave_year_start: string;
        leave_year_end: string;
        notes: string | null;
      }>;
    }) => {
      await assertPermission("approve_holidays", tenantId!);

      // Guard: cannot edit payments in approved/locked periods
      const { data: payment } = await supabase
        .from("holiday_payments")
        .select("payroll_period_id, employee_id")
        .eq("id", id)
        .maybeSingle();
      if (payment?.payroll_period_id) {
        const { data: period } = await supabase
          .from("payroll_periods")
          .select("status")
          .eq("id", payment.payroll_period_id)
          .maybeSingle();
        const status = period?.status;
        if (status && status !== "draft" && status !== "pending") {
          throw new Error(
            `Cannot edit: payroll period is ${status}. Reopen the period first.`
          );
        }
      }

      const { data, error } = await supabase
        .from("holiday_payments")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Sync the matching ledger entry's hours/amount/date so balance derivation stays correct
      const ledgerUpdate: Record<string, unknown> = {};
      if (typeof updates.hours === "number") {
        ledgerUpdate.hours = -Math.abs(updates.hours);
      }
      if (typeof updates.total === "number") {
        ledgerUpdate.amount = -Math.abs(updates.total);
      }
      if (updates.holiday_taken_date) {
        ledgerUpdate.entry_date = updates.holiday_taken_date;
      }
      if (updates.leave_year_start) {
        ledgerUpdate.leave_year_start = updates.leave_year_start;
      }
      if (Object.keys(ledgerUpdate).length > 0) {
        await supabase
          .from("holiday_ledger")
          .update(ledgerUpdate as never)
          .eq("source_table", "holiday_payments")
          .eq("source_id", id)
          .eq("entry_type", "holiday_taken");
      }

      if (payment?.payroll_period_id) {
        await recalcPayrollPeriodTotals(payment.payroll_period_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday_payments", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["holiday_payments"] });
      queryClient.invalidateQueries({ queryKey: ["holiday_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["holiday_payments_year_total"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
    },
  });
}

// Shared helper: recalculate a payroll period's holidays_total and grand_total
export async function recalcPayrollPeriodTotals(periodId: string) {
  // Sum all holiday payments for this period
  const { data: payments, error: paymentsErr } = await supabase
    .from("holiday_payments")
    .select("total")
    .eq("payroll_period_id", periodId);
  if (paymentsErr) throw paymentsErr;
  const holidaysTotal = (payments || []).reduce((s, p) => s + Number(p.total), 0);

  // Sum all payroll entries for this period
  const { data: entries, error: entriesErr } = await supabase
    .from("payroll_entries")
    .select("total_pay")
    .eq("payroll_period_id", periodId);
  if (entriesErr) throw entriesErr;
  const timesheetTotal = (entries || []).reduce((s, e) => s + Number(e.total_pay), 0);

  const grandTotal = timesheetTotal + holidaysTotal;

  const { error: updateErr } = await supabase
    .from("payroll_periods")
    .update({ holidays_total: holidaysTotal, grand_total: grandTotal })
    .eq("id", periodId);
  if (updateErr) throw updateErr;
}

export function useUpdateHolidayBalance() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: HolidayBalanceUpdate }) => {
      await assertPermission("approve_holidays", tenantId!);
      const { data, error } = await supabase
        .from("holiday_balances")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday_balances", tenantId] });
    },
  });
}

export function useCreateHolidayBalance() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (balance: Omit<HolidayBalanceInsert, 'tenant_id'>) => {
      await assertPermission("approve_holidays", tenantId!);
      const { data, error } = await supabase
        .from("holiday_balances")
        .insert({ ...balance, tenant_id: tenantId! })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday_balances", tenantId] });
    },
  });
}

// Holiday adjustments hook
export function useHolidayAdjustments(year?: number) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["holiday_adjustments", tenantId, year],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from("holiday_adjustments")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department
          )
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (year) {
        query = query
          .eq("leave_year_start", `${year}-01-01`)
          .eq("leave_year_end", `${year}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useAllHolidayAdjustments() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["holiday_adjustments", tenantId, "all"],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("holiday_adjustments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

/**
 * @deprecated Use useLeaveRules() hook instead for tenant-aware rules.
 * Kept for backward compatibility — resolves to identical values for GB tenants.
 */
export const UK_HOLIDAY_LAW = {
  STATUTORY_WEEKS: 5.6,
  MAX_STATUTORY_DAYS: 28,
  ACCRUAL_RATE: 0.1207,
  NORMAL_LEAVE_WEEKS: 4,
  BASIC_LEAVE_WEEKS: 1.6,
  MAX_CARRYOVER_AGREED: 8,
  MAX_CARRYOVER_FAMILY_LEAVE: 28,
  MAX_CARRYOVER_SICKNESS: 20,
  STANDARD_WEEK_HOURS: 40,
};

/**
 * @deprecated Use calculateAccrual() from useLeaveRules instead.
 */
export const calculateHolidayAccrual = (hoursWorked: number): number => {
  return hoursWorked * UK_HOLIDAY_LAW.ACCRUAL_RATE;
};

/**
 * @deprecated Use calculateAnnualEntitlement() from useLeaveRules instead.
 */
export const calculateAnnualEntitlement = (weeklyHours: number): number => {
  return weeklyHours * UK_HOLIDAY_LAW.STATUTORY_WEEKS;
};

export const formatCurrency = (amount: number, currency: string = "£"): string => {
  return `${currency}${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatHours = (hours: number): string => {
  return Number(hours).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const hoursToDays = (hours: number, hoursPerDay: number = 8): string => {
  const days = hours / hoursPerDay;
  return days.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

// Calculate employee holiday summary
export interface EmployeeHolidaySummary {
  employeeId: string;
  employeeName: string;
  department: string;
  totalAccrued: number;
  totalTaken: number;
  totalPaid: number;
  balance: number;
  periodBreakdown: {
    periodId: string;
    periodName: string;
    accrued: number;
    taken: number;
    paid: number;
  }[];
}
