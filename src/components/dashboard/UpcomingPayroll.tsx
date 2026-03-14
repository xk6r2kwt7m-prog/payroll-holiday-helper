import { DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { useHolidayPayments } from "@/hooks/useHolidays";
import { useMemo } from "react";

export function UpcomingPayroll() {
  const { data: periods = [], isLoading } = usePayrollPeriods();
  const { data: allEntries = [] } = usePayrollEntries();
  const { data: allHolidayPayments = [] } = useHolidayPayments();

  // Pick the most recent period (already sorted desc by start_date)
  const latestPeriod = periods[0];

  const summary = useMemo(() => {
    if (!latestPeriod) return null;
    const entries = (allEntries as any[]).filter((e) => e.payroll_period_id === latestPeriod.id);
    const holidays = (allHolidayPayments as any[]).filter((h) => h.payroll_period_id === latestPeriod.id);

    // Read stored values only — no rate multiplication
    const totalPayroll = entries.reduce((s, e) => s + (e.total_pay || 0), 0);
    const holidayCost = holidays.reduce((s, h) => s + (h.total || 0), 0);
    const bonuses = entries.reduce((s, e) => s + (e.performance_bonus || 0) + (e.special_bonus || 0), 0);
    // Timesheet = stored total_pay minus stored bonuses (derived from stored fields only)
    const timesheetCost = totalPayroll - bonuses;

    return {
      periodName: latestPeriod.period_name,
      totalPayroll,
      breakdown: [
        { label: "Timesheet", amount: timesheetCost, color: "bg-primary" },
        { label: "Holidays", amount: holidayCost, color: "bg-accent" },
        { label: "Bonuses", amount: bonuses, color: "bg-success" },
      ],
    };
  }, [latestPeriod, allEntries, allHolidayPayments]);

  const formatCurrency = (v: number) => `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in p-6">
        <p className="text-sm text-muted-foreground">Loading payroll…</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in p-6">
        <p className="text-sm text-muted-foreground">No payroll periods yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Current Payroll</h3>
            <p className="text-sm text-muted-foreground">{summary.periodName}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
            <DollarSign className="h-5 w-5 text-success" />
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-card-foreground">
              {formatCurrency(summary.totalPayroll)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Total payroll for this period</p>
        </div>
        <div className="space-y-4">
          {summary.breakdown.map((item) => {
            const pct = summary.totalPayroll > 0 ? (item.amount / summary.totalPayroll) * 100 : 0;
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-card-foreground">{formatCurrency(item.amount)}</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
