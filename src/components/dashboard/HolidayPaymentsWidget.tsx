import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useHolidayPayments } from "@/hooks/useHolidays";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { useMemo } from "react";

export function HolidayPaymentsWidget() {
  const { data: periods = [] } = usePayrollPeriods();
  const latestPeriodId = periods[0]?.id;
  const { data: holidayPayments = [], isLoading } = useHolidayPayments(latestPeriodId);

  const topHolidays = useMemo(() =>
    [...(holidayPayments as any[])].sort((a, b) => b.total - a.total).slice(0, 5),
    [holidayPayments]
  );

  const totalHolidayPay = useMemo(() =>
    (holidayPayments as any[]).reduce((sum, h) => sum + (h.total || 0), 0),
    [holidayPayments]
  );

  const formatCurrency = (v: number) => `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in p-6">
        <p className="text-sm text-muted-foreground">Loading holiday payments…</p>
      </div>
    );
  }

  if (topHolidays.length === 0) {
    return (
      <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in p-6">
        <h3 className="text-lg font-semibold text-card-foreground">Holiday Payments</h3>
        <p className="text-sm text-muted-foreground mt-1">No holiday payments this period.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Holiday Payments</h3>
            <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalHolidayPay)}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Calendar className="h-5 w-5 text-accent" />
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {topHolidays.map((holiday: any) => (
          <div
            key={holiday.id}
            className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {(holiday.employee_name || "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-card-foreground">{holiday.employee_name}</p>
                <p className="text-sm text-muted-foreground">
                  {holiday.hours} hrs @ {formatCurrency(holiday.rate)}
                </p>
              </div>
            </div>
            <span className="font-semibold text-card-foreground">
              {formatCurrency(holiday.total)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-6 py-3">
        <Button variant="ghost" className="w-full text-primary hover:text-primary">
          View all holiday payments
        </Button>
      </div>
    </div>
  );
}
