import { Users, DollarSign, Calendar, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { HolidayRequests } from "@/components/dashboard/HolidayRequests";
import { UpcomingPayroll } from "@/components/dashboard/UpcomingPayroll";
import { employees, payrollSummary, formatCurrency, getDepartmentStats, holidayPayments } from "@/data/payrollData";

const Index = () => {
  const activeEmployees = employees.filter(e => e.status === "active").length;
  const leaversCount = employees.filter(e => e.status === "leaver").length;
  const totalHours = employees.reduce((sum, e) => sum + e.timesheetHours, 0);
  const pendingHolidays = holidayPayments.length;
  const departmentStats = getDepartmentStats();

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

        {/* Department Summary */}
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
                  <span className="text-muted-foreground">Hours</span>
                  <span className="font-medium text-card-foreground">{departmentStats[dept].totalHours.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
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
