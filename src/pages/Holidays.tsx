import { Calendar, DollarSign, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { holidayPayments, formatCurrency, payrollSummary } from "@/data/payrollData";
import { StatCard } from "@/components/dashboard/StatCard";

const Holidays = () => {
  const totalHolidayPay = holidayPayments.reduce((sum, h) => sum + h.total, 0);
  const totalHolidayHours = holidayPayments.reduce((sum, h) => sum + h.units, 0);
  const avgRate = holidayPayments.reduce((sum, h) => sum + h.rate, 0) / holidayPayments.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Holiday Payments</h1>
            <p className="text-muted-foreground">
              Period: {payrollSummary.period}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 animate-fade-in">
          <StatCard
            title="Total Holiday Pay"
            value={formatCurrency(totalHolidayPay)}
            subtitle={`${holidayPayments.length} employees`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Total Hours"
            value={totalHolidayHours.toFixed(1)}
            subtitle="Holiday hours paid"
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Avg. Rate"
            value={formatCurrency(avgRate)}
            subtitle="Per hour"
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>

        {/* Holiday Payments Table */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">Holiday Payment Details</h3>
                <p className="text-sm text-muted-foreground">All holiday payments for this period</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {holidayPayments.map((holiday) => (
                  <tr
                    key={holiday.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {holiday.employeeForename[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-card-foreground">
                          {holiday.employeeForename} {holiday.employeeSurname || ""}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {formatCurrency(holiday.rate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {holiday.units}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-card-foreground">
                      {formatCurrency(holiday.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50">
                  <td className="px-6 py-4 font-semibold text-card-foreground">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    Avg: {formatCurrency(avgRate)}
                  </td>
                  <td className="px-6 py-4 font-semibold text-card-foreground">
                    {totalHolidayHours.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">
                    {formatCurrency(totalHolidayPay)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Holidays;
