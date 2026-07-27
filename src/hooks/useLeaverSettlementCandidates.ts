import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import {
  pickLeaverSettlementCandidate,
  type LeaverSettlementCandidate,
} from "@/lib/holiday-display-labels";

interface EmployeeSlim {
  id: string;
  forename: string | null;
  surname: string | null;
  end_date: string | null;
  hourly_rate: number | null;
}

interface EntrySlim {
  employee_id: string | null;
  employees: EmployeeSlim | null;
}

/**
 * Read-only: for a payroll period, list leavers whose end_date is on/before
 * the period end and who still have a non-zero remaining holiday balance
 * with no `payout_on_termination` ledger row. Purely display — never mutates.
 */
export function useLeaverSettlementCandidates(params: {
  periodId?: string;
  periodEndDate?: string;
  entries?: EntrySlim[];
}) {
  const { tenantId } = useTenant();
  const { periodId, periodEndDate, entries } = params;

  return useQuery({
    queryKey: [
      "leaver_settlement_candidates",
      tenantId,
      periodId,
      periodEndDate,
      (entries || []).map((e) => e.employee_id).sort().join(","),
    ],
    enabled: !!tenantId && !!periodId && !!periodEndDate && !!entries,
    queryFn: async (): Promise<LeaverSettlementCandidate[]> => {
      const leavers = (entries || [])
        .map((e) => e.employees)
        .filter((e): e is EmployeeSlim => !!e && !!e.end_date)
        .filter((e) => (e.end_date || "") <= (periodEndDate || ""));

      if (leavers.length === 0) return [];

      const ids = leavers.map((e) => e.id);

      const [paymentsRes, entriesRes, ledgerRes] = await Promise.all([
        supabase
          .from("holiday_payments")
          .select("employee_id, hours, leave_year_start")
          .in("employee_id", ids),
        supabase
          .from("payroll_entries")
          .select(
            "employee_id, holiday_accrued_hours, payroll_periods!inner(start_date)",
          )
          .in("employee_id", ids),
        supabase
          .from("holiday_ledger")
          .select("employee_id, entry_type, hours, leave_year_start")
          .in("employee_id", ids),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (entriesRes.error) throw entriesRes.error;
      if (ledgerRes.error) throw ledgerRes.error;

      const results: LeaverSettlementCandidate[] = [];
      for (const emp of leavers) {
        const year = String(emp.end_date || "").slice(0, 4);
        const leaveYearStart = `${year}-01-01`;

        const takenHoursYear = (paymentsRes.data || [])
          .filter(
            (p: any) =>
              p.employee_id === emp.id && p.leave_year_start === leaveYearStart,
          )
          .reduce((s: number, p: any) => s + Number(p.hours || 0), 0);

        const accruedHoursYear = (entriesRes.data || [])
          .filter((r: any) => {
            if (r.employee_id !== emp.id) return false;
            const start = r.payroll_periods?.start_date || "";
            return String(start).startsWith(year);
          })
          .reduce(
            (s: number, r: any) => s + Number(r.holiday_accrued_hours || 0),
            0,
          );

        const empLedger = (ledgerRes.data || []).filter(
          (l: any) => l.employee_id === emp.id,
        );
        const carryOverHours = empLedger
          .filter(
            (l: any) =>
              l.entry_type === "carry_over_in" &&
              l.leave_year_start === leaveYearStart,
          )
          .reduce((s: number, l: any) => s + Number(l.hours || 0), 0);

        const hasSettlementLedger = empLedger.some(
          (l: any) => l.entry_type === "payout_on_termination",
        );

        const candidate = pickLeaverSettlementCandidate({
          employeeId: emp.id,
          employeeName: `${emp.forename || ""} ${emp.surname || ""}`.trim(),
          endDate: emp.end_date || "",
          hourlyRate: Number(emp.hourly_rate || 0),
          accruedHoursYear,
          carryOverHours,
          takenHoursYear,
          hasSettlementLedger,
        });
        if (candidate) results.push(candidate);
      }
      return results;
    },
  });
}
