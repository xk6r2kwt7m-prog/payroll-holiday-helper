import { Calendar, DollarSign, Clock, Info, Scale } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  holidayPayments, 
  formatCurrency, 
  payrollSummary, 
  employees,
  UK_HOLIDAY_LAW,
  getTotalHolidayAccrual,
  formatHours,
  roundHolidayHours
} from "@/data/payrollData";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Holidays = () => {
  const totalHolidayPay = holidayPayments.reduce((sum, h) => sum + h.total, 0);
  const totalHolidayHours = holidayPayments.reduce((sum, h) => sum + h.units, 0);
  const avgRate = holidayPayments.reduce((sum, h) => sum + h.rate, 0) / holidayPayments.length;
  const totalAccruedThisPeriod = getTotalHolidayAccrual();

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
          <StatCard
            title="Total Holiday Pay"
            value={formatCurrency(totalHolidayPay)}
            subtitle={`${holidayPayments.length} employees paid`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Holiday Hours Paid"
            value={formatHours(totalHolidayHours)}
            subtitle="Hours this period"
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Accrued This Period"
            value={formatHours(totalAccruedThisPeriod)}
            subtitle={`${(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}% of hours worked`}
            icon={<Calendar className="h-5 w-5" />}
            variant="accent"
          />
          <StatCard
            title="Avg. Rate"
            value={formatCurrency(avgRate)}
            subtitle="Per hour"
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>

        {/* UK Holiday Law Info Card */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-card-foreground mb-2">UK Holiday Law Compliance</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Holiday calculations follow the <strong>Working Time Regulations 1998</strong> (updated January 2024).
              </p>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="rules" className="border-primary/20">
                  <AccordionTrigger className="text-sm font-medium text-card-foreground hover:no-underline">
                    View Calculation Rules
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm text-muted-foreground pt-2">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Statutory Entitlement</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li><strong>{UK_HOLIDAY_LAW.STATUTORY_WEEKS} weeks</strong> per year</li>
                            <li>Capped at <strong>{UK_HOLIDAY_LAW.MAX_STATUTORY_DAYS} days</strong> for 5+ day workers</li>
                            <li>{UK_HOLIDAY_LAW.NORMAL_LEAVE_WEEKS} weeks normal + {UK_HOLIDAY_LAW.BASIC_LEAVE_WEEKS} weeks basic</li>
                          </ul>
                        </div>
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Accrual Rate (Hourly Workers)</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li><strong>{(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}%</strong> of hours worked</li>
                            <li>Formula: 5.6 ÷ (52 - 5.6) × 100</li>
                            <li>Applied to irregular/part-year workers</li>
                          </ul>
                        </div>
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Carryover Limits</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>Up to <strong>{UK_HOLIDAY_LAW.MAX_CARRYOVER_AGREED} days</strong> if agreed</li>
                            <li>Up to <strong>{UK_HOLIDAY_LAW.MAX_CARRYOVER_FAMILY_LEAVE} days</strong> for family leave</li>
                            <li>Up to <strong>{UK_HOLIDAY_LAW.MAX_CARRYOVER_SICKNESS} days</strong> for sickness</li>
                          </ul>
                        </div>
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Rounding Rules</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>Less than 30 mins → round <strong>down</strong></li>
                            <li>30 mins or more → round <strong>up</strong></li>
                            <li>Applied to accrued hours</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        {/* Holiday Accrual Table */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">Holiday Accrual This Period</h3>
                <p className="text-sm text-muted-foreground">12.07% of hours worked per UK law</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <Clock className="h-5 w-5 text-success" />
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
                    Dept
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Hours Worked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Holiday Accrued
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Rounded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.slice(0, 10).map((emp) => (
                  <tr
                    key={emp.employeeId}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {emp.forename[0]}{emp.surname[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-card-foreground">
                          {emp.forename} {emp.surname}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {emp.department}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {formatHours(emp.timesheetHours)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-success">
                      {formatHours(emp.holidayAccruedThisPeriod)} hrs
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-card-foreground">
                      {roundHolidayHours(emp.holidayAccruedThisPeriod)} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Holiday Payments Table */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">Holiday Payments Made</h3>
                <p className="text-sm text-muted-foreground">Payments for holiday taken this period</p>
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
                            {holiday.employeeForename[0]}{holiday.employeeSurname?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-card-foreground">
                          {holiday.employeeForename} {holiday.employeeSurname || ""}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {formatCurrency(holiday.rate)}/hr
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
                    Avg: {formatCurrency(avgRate)}/hr
                  </td>
                  <td className="px-6 py-4 font-semibold text-card-foreground">
                    {formatHours(totalHolidayHours)}
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
