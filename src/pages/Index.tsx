import { Users, DollarSign, Calendar, Clock, FileText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ExpiringDocumentsWidget } from "@/components/dashboard/ExpiringDocumentsWidget";
import { useEmployees } from "@/hooks/useEmployees";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { useHolidayPayments, formatCurrency, formatHours, UK_HOLIDAY_LAW } from "@/hooks/useHolidays";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const statusStyles = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const Index = () => {
  const { data: employees = [] } = useEmployees();
  const { data: periods = [] } = usePayrollPeriods();
  const latestPeriod = periods[0];
  const { data: entries = [] } = usePayrollEntries(latestPeriod?.id);
  const { data: holidayPayments = [] } = useHolidayPayments(latestPeriod?.id);

  const activeEmployees = employees.filter(e => e.status === "active").length;
  const totalPayroll = entries.reduce((sum, e) => sum + Number(e.total_pay), 0);
  const totalHours = entries.reduce((sum, e) => sum + Number(e.timesheet_hours), 0);
  const totalHolidayAccrued = entries.reduce((sum, e) => sum + Number(e.holiday_accrued_hours), 0);

  const departmentStats = employees.reduce((acc, emp) => {
    if (!acc[emp.department]) {
      acc[emp.department] = { count: 0 };
    }
    acc[emp.department].count++;
    return acc;
  }, {} as Record<string, { count: number }>);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-slide-in-left">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {latestPeriod ? `Latest period: ${latestPeriod.period_name}` : "Welcome to Ugly Dumpling Payroll"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Employees"
            value={employees.length}
            subtitle={`${activeEmployees} active`}
            icon={<Users className="h-5 w-5" />}
            href="/employees"
          />
          <StatCard
            title="Total Payroll"
            value={formatCurrency(totalPayroll)}
            subtitle={latestPeriod ? latestPeriod.period_name : "No data"}
            icon={<DollarSign className="h-5 w-5" />}
            variant="primary"
            href="/payroll"
          />
          <StatCard
            title="Holiday Accrued"
            value={`${formatHours(totalHolidayAccrued)} hrs`}
            subtitle={`${(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}% rate`}
            icon={<Calendar className="h-5 w-5" />}
            variant="accent"
            href="/holidays"
          />
          <StatCard
            title="Hours Tracked"
            value={formatHours(totalHours)}
            subtitle="This period"
            icon={<Clock className="h-5 w-5" />}
            href="/payroll"
          />
        </div>

        {/* Department Summary */}
        <div className="grid gap-4 sm:grid-cols-3 animate-fade-in">
          {(["FOH", "BOH", "CPU"] as const).map((dept) => (
            <Link 
              key={dept} 
              to={`/employees?dept=${dept}`}
              className="rounded-xl bg-card p-5 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">{dept}</h3>
                <span className="text-sm text-muted-foreground">
                  {departmentStats[dept]?.count || 0} staff
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {dept === "FOH" && "🍽️ Front of House"}
                {dept === "BOH" && "👨‍🍳 Back of House"}
                {dept === "CPU" && "🏭 Central Production Unit"}
              </p>
            </Link>
          ))}
        </div>

        {/* Expiring Documents + UK Holiday Law */}
        <div className="grid gap-4 lg:grid-cols-2 animate-fade-in">
          <ExpiringDocumentsWidget />
          
          {/* UK Holiday Law Info Banner */}
          <div className="rounded-xl bg-card shadow-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl">⚖️</div>
              <h3 className="font-semibold text-card-foreground">UK Holiday Law</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Employees accrue <strong className="text-card-foreground">{(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}%</strong> of hours worked as holiday entitlement.
            </p>
            {totalHolidayAccrued > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-sm text-card-foreground">
                  This period: <strong className="text-primary">{formatHours(totalHolidayAccrued)} hours</strong> accrued
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Payroll Periods */}
        {periods.length > 0 && (
          <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">Recent Payroll Periods</h3>
                <p className="text-sm text-muted-foreground">Latest imported payroll data</p>
              </div>
              <Link to="/payroll">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {periods.slice(0, 3).map((period) => (
                <div key={period.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{period.period_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-card-foreground">
                      {formatCurrency(Number(period.grand_total))}
                    </span>
                    <Badge className={statusStyles[period.status]}>
                      {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Employees by Pay */}
        {entries.length > 0 && (
          <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">Top Earners</h3>
                <p className="text-sm text-muted-foreground">Highest paid this period</p>
              </div>
              <Link to="/employees">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {entries.slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {entry.employees?.forename?.[0]}{entry.employees?.surname?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-card-foreground">
                        {entry.employees?.forename} {entry.employees?.surname}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {entry.employees?.department} · {formatHours(Number(entry.timesheet_hours))} hrs
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-primary">
                    {formatCurrency(Number(entry.total_pay))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {periods.length === 0 && (
          <div className="rounded-xl bg-card shadow-card p-8 text-center animate-fade-in">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">No Payroll Data Yet</h3>
            <p className="text-muted-foreground mb-4">Import your first payroll spreadsheet to get started.</p>
            <Link to="/payroll">
              <Button className="gradient-primary">Go to Payroll</Button>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
