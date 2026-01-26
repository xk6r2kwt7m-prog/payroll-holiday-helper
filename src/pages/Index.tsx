import { Users, DollarSign, Calendar, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { HolidayRequests } from "@/components/dashboard/HolidayRequests";
import { UpcomingPayroll } from "@/components/dashboard/UpcomingPayroll";
import { employees, payrollSummary, formatCurrency, getDepartmentStats, holidayPayments, getTotalHolidayAccrual, formatHours, UK_HOLIDAY_LAW } from "@/data/payrollData";

const Index = () => {
  const activeEmployees = employees.filter(e => e.status === "active").length;
  const leaversCount = employees.filter(e => e.status === "leaver").length;
  const totalHours = employees.reduce((sum, e) => sum + e.timesheetHours, 0);
  const pendingHolidays = holidayPayments.length;
  const departmentStats = getDepartmentStats();
  const totalHolidayAccrued = getTotalHolidayAccrual();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-slide-in-left">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Payroll period: {payrollSummary.period}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Employees"
            value={employees.length}
            subtitle={`${activeEmployees} active, ${leaversCount} leavers`}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Total Payroll"
            value={formatCurrency(payrollSummary.totalPayroll)}
            subtitle={`Timesheet: ${formatCurrency(payrollSummary.timesheet)}`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Holiday Payments"
            value={formatCurrency(payrollSummary.holidays)}
            subtitle={`${pendingHolidays} employees`}
            icon={<Calendar className="h-5 w-5" />}
            variant="accent"
          />
          <StatCard
            title="Hours Tracked"
            value={totalHours.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
            subtitle="This period"
            icon={<Clock className="h-5 w-5" />}
          />
        </div>

        {/* Department Summary with Holiday Accrual */}
        <div className="grid gap-4 sm:grid-cols-3 animate-fade-in">
          {(["FOH", "BOH", "CPU"] as const).map((dept) => (
            <div key={dept} className="rounded-xl bg-card p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-card-foreground">{dept}</h3>
                <span className="text-sm text-muted-foreground">{departmentStats[dept].count} staff</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Pay</span>
                  <span className="font-medium text-card-foreground">{formatCurrency(departmentStats[dept].totalPay)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hours Worked</span>
                  <span className="font-medium text-card-foreground">{formatHours(departmentStats[dept].totalHours)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Holiday Accrued</span>
                  <span className="font-medium text-accent">{formatHours(departmentStats[dept].holidayAccrued)} hrs</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* UK Holiday Law Info Banner */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-center gap-3 animate-fade-in">
          <div className="text-2xl">⚖️</div>
          <div className="flex-1">
            <p className="text-sm text-card-foreground">
              <strong>UK Holiday Law:</strong> Employees accrue <strong>{(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}%</strong> of hours worked as holiday entitlement. 
              This period: <strong>{formatHours(totalHolidayAccrued)} hours</strong> accrued across all staff.
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Employee Table - Spans 2 columns */}
          <div className="lg:col-span-2">
            <EmployeeTable />
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <UpcomingPayroll />
            <HolidayRequests />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
