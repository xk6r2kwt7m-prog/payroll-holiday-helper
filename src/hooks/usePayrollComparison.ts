import { useMemo } from "react";
import {
  buildPeriodComparison,
  type BuildComparisonInput,
  type CompareEntry,
  type PayrollComparison,
  type PeriodInfo,
} from "@/lib/payroll-change-review";

interface RawEntry {
  id: string;
  employee_id: string;
  hourly_rate: number | null;
  service_charge: number | null;
  timesheet_hours: number | null;
  imported_hours: number | null;
  performance_bonus: number | null;
  special_bonus: number | null;
  holiday_pay_amount?: number | null;
  total_pay: number | null;
  employees?: { status?: string | null } | null;
}

function toCompareEntry(e: RawEntry, priorEmployeeIds?: Set<string>): CompareEntry {
  const status = e.employees?.status ?? null;
  const isNewStarter =
    status === "starter" && !!priorEmployeeIds && !priorEmployeeIds.has(e.employee_id);
  return {
    entry_id: e.id,
    employee_id: e.employee_id,
    hourly_rate: Number(e.hourly_rate) || 0,
    service_charge: Number(e.service_charge || 0),
    timesheet_hours: Number(e.timesheet_hours) || 0,
    performance_bonus: Number(e.performance_bonus || 0),
    special_bonus: Number(e.special_bonus || 0),
    holiday_pay: Number(e.holiday_pay_amount || 0),
    total_pay: Number(e.total_pay) || 0,
    missing_from_import: e.imported_hours == null,
    is_new_starter: isNewStarter,
    is_leaver: status === "leaver",
    status,
  };
}

interface Args {
  currentPeriod?: PeriodInfo | null;
  currentEntries: RawEntry[];
  previousPeriod?: PeriodInfo | null;
  previousEntries?: RawEntry[];
  manualAdjustmentsByEntryId?: Map<string, number>;
  pdfVisibleNotesCount?: number;
  everSeenEmployeeIds?: Set<string>;
}

export function usePayrollComparison(args: Args): PayrollComparison | null {
  return useMemo(() => {
    if (!args.currentPeriod) return null;
    const input: BuildComparisonInput = {
      currentPeriod: args.currentPeriod,
      currentEntries: args.currentEntries.map((e) =>
        toCompareEntry(e, args.everSeenEmployeeIds),
      ),
      previousPeriod: args.previousPeriod ?? null,
      previousEntries: (args.previousEntries ?? []).map((e) =>
        toCompareEntry(e, args.everSeenEmployeeIds),
      ),
      manualAdjustmentsByEntryId: args.manualAdjustmentsByEntryId,
      pdfVisibleNotesCount: args.pdfVisibleNotesCount,
      everSeenEmployeeIds: args.everSeenEmployeeIds,
    };
    return buildPeriodComparison(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    args.currentPeriod?.id,
    args.currentPeriod?.start_date,
    args.currentPeriod?.end_date,
    args.previousPeriod?.id,
    args.previousPeriod?.start_date,
    args.previousPeriod?.end_date,
    args.currentEntries,
    args.previousEntries,
    args.manualAdjustmentsByEntryId,
    args.pdfVisibleNotesCount,
    args.everSeenEmployeeIds,
  ]);
}
