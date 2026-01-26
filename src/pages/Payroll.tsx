import { Download, Calendar, DollarSign, Users, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { employees, payrollSummary, formatCurrency, getDepartmentStats } from "@/data/payrollData";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Department } from "@/data/payrollData";

const statusStyles = {
  active: "bg-success/10 text-success",
  leaver: "bg-destructive/10 text-destructive",
  starter: "bg-primary/10 text-primary",
};

const statusLabels = {
  active: "Active",
  leaver: "Leaver",
  starter: "Starter",
};

const Payroll = () => {
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">("all");
  const departmentStats = getDepartmentStats();

  const filteredEmployees = departmentFilter === "all" 
    ? employees 
    : employees.filter(e => e.department === departmentFilter);

  const totalHours = filteredEmployees.reduce((sum, e) => sum + e.timesheetHours, 0);
  const totalPay = filteredEmployees.reduce((sum, e) => sum + e.totalPay, 0);
  const avgHourlyRate = employees.reduce((sum, e) => sum + e.hourlyRate, 0) / employees.length;
  const totalBonuses = employees.reduce((sum, e) => sum + e.performanceBonus + e.specialBonus, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
            <p className="text-muted-foreground">
              Period: {payrollSummary.period}
            </p>
          </div>
          <Button className="gradient-primary">
            <Download className="mr-2 h-4 w-4" />
            Export Payroll
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Payroll"
            value={formatCurrency(payrollSummary.totalPayroll)}
            subtitle={`Timesheet: ${formatCurrency(payrollSummary.timesheet)}`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Total Hours"
            value={totalHours.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
            subtitle={`${employees.length} employees`}
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Avg. Hourly Rate"
            value={formatCurrency(avgHourlyRate)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Total Bonuses"
            value={formatCurrency(totalBonuses)}
            subtitle={`Incentives: ${formatCurrency(payrollSummary.incentives)}`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="success"
          />
        </div>

        {/* Department Filter */}
        <div className="flex justify-between items-center">
          <Tabs value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v as Department | "all")}>
            <TabsList>
              <TabsTrigger value="all">All Departments</TabsTrigger>
              <TabsTrigger value="FOH">FOH ({departmentStats.FOH.count})</TabsTrigger>
              <TabsTrigger value="BOH">BOH ({departmentStats.BOH.count})</TabsTrigger>
              <TabsTrigger value="CPU">CPU ({departmentStats.CPU.count})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="text-sm text-muted-foreground">
            Showing {filteredEmployees.length} employees · {formatCurrency(totalPay)} total
          </div>
        </div>

        {/* Payroll Table */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold text-card-foreground">Payroll Details</h3>
            <p className="text-sm text-muted-foreground">Timesheet hours and payments for this period</p>
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
                    H. Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    S.C.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Perf. Bonus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sp. Bonus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total Pay
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.map((record) => (
                  <tr
                    key={record.employeeId}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-card-foreground">
                        {record.forename} {record.surname}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {record.department}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {formatCurrency(record.hourlyRate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {formatCurrency(record.serviceCharge)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {record.timesheetHours.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-success">
                      {record.performanceBonus > 0 ? formatCurrency(record.performanceBonus) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-accent">
                      {record.specialBonus > 0 ? formatCurrency(record.specialBonus) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-card-foreground">
                      {formatCurrency(record.totalPay)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusStyles[record.status]
                        }`}
                      >
                        {statusLabels[record.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50">
                  <td colSpan={4} className="px-6 py-4 font-semibold text-card-foreground">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 font-semibold text-card-foreground">
                    {totalHours.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-semibold text-success">
                    {formatCurrency(filteredEmployees.reduce((sum, e) => sum + e.performanceBonus, 0))}
                  </td>
                  <td className="px-6 py-4 font-semibold text-accent">
                    {formatCurrency(filteredEmployees.reduce((sum, e) => sum + e.specialBonus, 0))}
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">
                    {formatCurrency(totalPay)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Payroll;
