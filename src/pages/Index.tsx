import { Users, DollarSign, Calendar, Clock, FileText, Percent, TrendingUp, Search } from "lucide-react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ExpiringDocumentsWidget } from "@/components/dashboard/ExpiringDocumentsWidget";
import { SmartAlerts } from "@/components/dashboard/SmartAlerts";
import { PayrollDeadlineWidget } from "@/components/dashboard/PayrollDeadlineWidget";
import { useEmployees } from "@/hooks/useEmployees";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { formatCurrency, formatHours, UK_HOLIDAY_LAW } from "@/hooks/useHolidays";
import { Link } from "react-router-dom";
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

  const activeEmployees = employees.filter(e => e.status === "active").length;
  const totalPayroll = entries.reduce((sum, e: any) => sum + Number(e.total_pay), 0);
  const totalHours = entries.reduce((sum, e: any) => sum + Number(e.timesheet_hours), 0);
  const totalHolidayAccrued = entries.reduce((sum, e: any) => sum + Number(e.holiday_accrued_hours || 0), 0);
  
  // Labour % KPI
  const salesTotal = latestPeriod ? Number((latestPeriod as any).sales_total || 0) : 0;
  const labourPercent = salesTotal > 0 ? (totalPayroll / salesTotal) * 100 : 0;
  
  // Per-week normalisation
  const periodWeeks = latestPeriod ? Number((latestPeriod as any).period_weeks || 4) : 4;
  const payPerWeek = periodWeeks > 0 ? totalPayroll / periodWeeks : 0;

  const departmentStats = employees.reduce((acc, emp) => {
    if (!acc[emp.department]) acc[emp.department] = { count: 0 };
    acc[emp.department].count++;
    return acc;
  }, {} as Record<string, { count: number }>);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              {latestPeriod ? `Latest period: ${latestPeriod.period_name}` : "Welcome to Ugly Dumpling Payroll"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex gap-2 text-muted-foreground"
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
          </Button>
        </div>

        {/* Smart Alerts */}
        <SmartAlerts employees={employees} periods={periods} entries={entries} />

        {/* KPI Stats Grid — compact 2-col on mobile, 5-col on desktop */}
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Active Staff"
            value={activeEmployees}
            subtitle={`${employees.length} total`}
            icon={<Users className="h-4 w-4" />}
            href="/employees"
            index={0}
          />
          <StatCard
            title="Total Payroll"
            value={formatCurrency(totalPayroll)}
            subtitle={`${formatCurrency(payPerWeek)}/week`}
            icon={<DollarSign className="h-4 w-4" />}
            variant="primary"
            href="/payroll"
            index={1}
          />
          <StatCard
            title="Labour %"
            value={labourPercent > 0 ? `${labourPercent.toFixed(1)}%` : "—"}
            subtitle={salesTotal > 0 ? `of ${formatCurrency(salesTotal)}` : "No sales data"}
            icon={<Percent className="h-4 w-4" />}
            variant={labourPercent > 35 ? "warning" : labourPercent > 0 ? "success" : "default"}
            href="/payroll/analytics"
            index={2}
          />
          <StatCard
            title="Holiday Accrued"
            value={`${formatHours(totalHolidayAccrued)} hrs`}
            subtitle={`${(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}% rate`}
            icon={<Calendar className="h-4 w-4" />}
            variant="accent"
            href="/holidays"
            index={3}
          />
          <StatCard
            title="Hours Tracked"
            value={formatHours(totalHours)}
            subtitle={`${formatHours(periodWeeks > 0 ? totalHours / periodWeeks : 0)}/week`}
            icon={<Clock className="h-4 w-4" />}
            href="/timesheets"
            index={4}
          />
        </div>

        {/* Department Summary */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {(["FOH", "BOH", "CPU"] as const).map((dept, i) => {
            const deptEntries = entries.filter((e: any) => e.employees?.department === dept);
            const deptPay = deptEntries.reduce((s: number, e: any) => s + Number(e.total_pay), 0);
            const deptHours = deptEntries.reduce((s: number, e: any) => s + Number(e.timesheet_hours), 0);
            return (
              <motion.div
                key={dept}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
              <Link 
                key={dept} 
                to={`/employees?dept=${dept}`}
                className="rounded-xl bg-card border border-border p-4 shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5 group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">{dept}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {departmentStats[dept]?.count || 0} staff
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatHours(deptHours)} hrs</span>
                  <span className="font-medium text-card-foreground">{formatCurrency(deptPay)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {dept === "FOH" && "🍽️ Front of House"}
                  {dept === "BOH" && "👨‍🍳 Back of House"}
                  {dept === "CPU" && "🏭 Central Production Unit"}
                </p>
              </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Payroll Timeline + Expiring Docs */}
        <div className="grid gap-3 lg:grid-cols-2 animate-fade-in">
          <PayrollDeadlineWidget periods={periods} />
          <ExpiringDocumentsWidget />
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
                        {(period as any).period_weeks && ` · ${(period as any).period_weeks}w`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-card-foreground">
                      {formatCurrency(Number(period.grand_total))}
                    </span>
                    <Badge className={statusStyles[period.status]}>
                      {period.status === "pending" ? "Pending Review" : period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Earners */}
        {entries.length > 0 && (
          <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">Top Earners</h3>
                <p className="text-sm text-muted-foreground">Highest paid this period</p>
              </div>
              <Link to="/payroll/analytics">
                <Button variant="outline" size="sm">Analytics</Button>
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
