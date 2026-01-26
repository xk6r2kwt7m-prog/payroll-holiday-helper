import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { holidayPayments, formatCurrency } from "@/data/payrollData";

export function HolidayRequests() {
  // Show top 5 holiday payments
  const topHolidays = [...holidayPayments]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const totalHolidayPay = holidayPayments.reduce((sum, h) => sum + h.total, 0);

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
        {topHolidays.map((holiday) => (
          <div
            key={holiday.id}
            className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {holiday.employeeForename[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-card-foreground">{holiday.employeeForename}</p>
                <p className="text-sm text-muted-foreground">
                  {holiday.units} hrs @ {formatCurrency(holiday.rate)}
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
