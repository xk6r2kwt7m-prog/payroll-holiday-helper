import { Users, DollarSign, Calendar, Clock, FileText, Percent, Search, AlertTriangle, CreditCard, Shield, TrendingUp, ChevronRight, ArrowRight, Utensils, ChefHat, Factory } from "lucide-react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { ExpiringDocumentsWidget } from "@/components/dashboard/ExpiringDocumentsWidget";
import { PayrollDeadlineWidget } from "@/components/dashboard/PayrollDeadlineWidget";
import { usePayrollAudit } from "@/hooks/usePayrollAudit";
import { useEmployees } from "@/hooks/useEmployees";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { formatCurrency, formatHours, UK_HOLIDAY_LAW } from "@/hooks/useHolidays";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const Index = () => {
  const { data: employees = [] } = useEmployees();
  const { data: periods = [] } = usePayrollPeriods();
  const latestPeriod = periods[0];
  const { data: entries = [] } = usePayrollEntries(latestPeriod?.id);
  const { data: audit } = usePayrollAudit();
  const navigate = useNavigate();

  const activeEmployees = employees.filter(e => e.status === "active").length;
  const totalPayroll = entries.reduce((sum, e: any) => sum + Number(e.total_pay), 0);
  const totalHours = entries.reduce((sum, e: any) => sum + Number(e.timesheet_hours), 0);
  const totalHolidayAccrued = entries.reduce((sum, e: any) => sum + Number(e.holiday_accrued_hours || 0), 0);

  const salesTotal = latestPeriod ? Number((latestPeriod as any).sales_total || 0) : 0;
  const labourPercent = salesTotal > 0 ? (totalPayroll / salesTotal) * 100 : 0;
  const periodWeeks = latestPeriod ? Number((latestPeriod as any).period_weeks || 4) : 4;
  const payPerWeek = periodWeeks > 0 ? totalPayroll / periodWeeks : 0;

  // Build alerts (max 3)
  const alerts = useMemo(() => {
    const result: { id: string; icon: React.ReactNode; title: string; description: string; severity: "critical" | "warning" | "info"; href: string; action: string }[] = [];

    const missingNI = employees.filter(e => e.status === "active" && !e.ni_number);
    if (missingNI.length > 0) {
      result.push({
        id: "missing-ni",
        severity: "warning",
        icon: <Shield className="h-4 w-4" />,
        title: `${missingNI.length} missing NI number${missingNI.length > 1 ? "s" : ""}`,
        description: "Required for HMRC RTI submissions",
        action: "Update records",
        href: "/employees",
      });
    }

    const draftPeriods = periods.filter(p => p.status === "draft");
    if (draftPeriods.length > 0) {
      result.push({
        id: "draft-payroll",
        severity: "critical",
        icon: <DollarSign className="h-4 w-4" />,
        title: `${draftPeriods.length} payroll period${draftPeriods.length > 1 ? "s" : ""} in draft`,
        description: draftPeriods.map(p => p.period_name).join(", "),
        action: "Review payroll",
        href: "/payroll",
      });
    }

    const rateDiscrepancies = entries.filter((e: any) => {
      const emp = e.employees;
      if (!emp) return false;
      return Number(e.hourly_rate) !== Number(emp.hourly_rate);
    });
    if (rateDiscrepancies.length > 0) {
      result.push({
        id: "rate-discrepancy",
        severity: "info",
        icon: <TrendingUp className="h-4 w-4" />,
        title: `${rateDiscrepancies.length} rate discrepanc${rateDiscrepancies.length > 1 ? "ies" : "y"}`,
        description: "Entry rates differ from master rates",
        action: "Review",
        href: "/payroll",
      });
    }

    const missingBank = employees.filter(e => e.status === "active" && (!e.bank_account_no || !e.sort_code));
    if (missingBank.length > 0) {
      result.push({
        id: "missing-bank",
        severity: "critical",
        icon: <CreditCard className="h-4 w-4" />,
        title: `${missingBank.length} missing bank details`,
        description: missingBank.slice(0, 2).map(e => `${e.forename} ${e.surname}`).join(", "),
        action: "View",
        href: "/employees",
      });
    }

    return result.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    }).slice(0, 3);
  }, [employees, periods, entries]);

  const severityConfig = {
    critical: { bg: "bg-destructive/5 border-destructive/15", iconBg: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
    warning: { bg: "bg-warning/5 border-warning/15", iconBg: "bg-warning/10 text-warning", dot: "bg-warning" },
    info: { bg: "bg-primary/5 border-primary/15", iconBg: "bg-primary/10 text-primary", dot: "bg-primary" },
  };

  // Department data
  const deptConfig = {
    FOH: { label: "Front of House", icon: Utensils, color: "text-primary" },
    BOH: { label: "Back of House", icon: ChefHat, color: "text-accent" },
    CPU: { label: "Central Production", icon: Factory, color: "text-warning" },
  };

  const departmentStats = employees.reduce((acc, emp) => {
    if (emp.status !== "active") return acc;
    if (!acc[emp.department]) acc[emp.department] = { count: 0 };
    acc[emp.department].count++;
    return acc;
  }, {} as Record<string, { count: number }>);

  // Audit
  const auditScore = audit?.summary?.healthScore ?? null;
  const auditErrors = audit?.summary?.errors ?? 0;
  const auditWarnings = audit?.summary?.warnings ?? 0;
  const auditTotal = auditErrors + auditWarnings;

  return (
    <AppLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {latestPeriod ? `Period: ${latestPeriod.period_name}` : "Welcome to Ugly Dumpling Payroll"}
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

        {/* ─── 1. KPI METRICS ─── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              {
                label: "Active Staff",
                value: activeEmployees,
                sub: `${employees.length} total incl. leavers`,
                icon: <Users className="h-5 w-5" />,
                color: "text-foreground",
                iconBg: "bg-muted",
                href: "/employees",
              },
              {
                label: "Total Payroll",
                value: formatCurrency(totalPayroll),
                sub: `${formatCurrency(payPerWeek)} / week`,
                icon: <DollarSign className="h-5 w-5" />,
                color: "text-primary",
                iconBg: "bg-primary/10",
                href: "/payroll",
              },
              {
                label: "Labour %",
                value: labourPercent > 0 ? `${labourPercent.toFixed(1)}%` : "—",
                sub: salesTotal > 0 ? `of ${formatCurrency(salesTotal)} sales` : "No sales data",
                icon: <Percent className="h-5 w-5" />,
                color: labourPercent > 35 ? "text-warning" : "text-success",
                iconBg: labourPercent > 35 ? "bg-warning/10" : "bg-success/10",
                href: "/payroll/analytics",
              },
              {
                label: "Holiday Accrued",
                value: `${formatHours(totalHolidayAccrued)}h`,
                sub: `${(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}% accrual rate`,
                icon: <Calendar className="h-5 w-5" />,
                color: "text-accent",
                iconBg: "bg-accent/10",
                href: "/holidays",
              },
              {
                label: "Hours Tracked",
                value: formatHours(totalHours),
                sub: `${formatHours(periodWeeks > 0 ? totalHours / periodWeeks : 0)} / week`,
                icon: <Clock className="h-5 w-5" />,
                color: "text-muted-foreground",
                iconBg: "bg-muted",
                href: "/timesheets",
              },
            ].map((kpi, i) => (
              <Link
                key={kpi.label}
                to={kpi.href}
                className={cn(
                  "rounded-xl bg-card border border-border p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 group",
                  i === 4 && "col-span-2 sm:col-span-1"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", kpi.iconBg)}>
                    <span className={cn(kpi.color)}>{kpi.icon}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-2xl font-bold text-foreground tracking-tight leading-none">{kpi.value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-2 uppercase tracking-wider">{kpi.label}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{kpi.sub}</p>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ─── 2. ALERTS ─── */}
        {alerts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Action Required</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {alerts.map((alert) => {
                const cfg = severityConfig[alert.severity];
                return (
                  <button
                    key={alert.id}
                    onClick={() => navigate(alert.href)}
                    className={cn(
                      "text-left rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 group",
                      cfg.bg
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cfg.iconBg)}>
                        {alert.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ─── 3. DEPARTMENT OVERVIEW + AUDIT SCORE ─── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="grid gap-4 lg:grid-cols-12"
        >
          {/* Department Overview — 8 cols */}
          <div className="lg:col-span-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Department Overview</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              {(["FOH", "BOH", "CPU"] as const).map((dept) => {
                const cfg = deptConfig[dept];
                const Icon = cfg.icon;
                const deptEntries = entries.filter((e: any) => e.employees?.department === dept);
                const deptPay = deptEntries.reduce((s: number, e: any) => s + Number(e.total_pay), 0);
                const deptHours = deptEntries.reduce((s: number, e: any) => s + Number(e.timesheet_hours), 0);
                const count = departmentStats[dept]?.count || 0;

                return (
                  <Link
                    key={dept}
                    to={`/employees?dept=${dept}`}
                    className="rounded-xl bg-card border border-border p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-muted", cfg.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{dept}</h3>
                        <p className="text-[11px] text-muted-foreground">{cfg.label}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t border-border">
                      <div>
                        <p className="text-xl font-bold text-foreground">{count}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Staff</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-foreground">{formatHours(deptHours)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Hours</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-foreground">{formatCurrency(deptPay)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Cost</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Audit Score — 4 cols */}
          <div className="lg:col-span-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Payroll Audit</h2>
            <Link
              to="/payroll/audit"
              className="block rounded-xl bg-card border border-border p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 h-full"
            >
              {auditScore !== null ? (
                <div className="flex flex-col items-center justify-center h-full py-2">
                  {/* Circular gauge */}
                  <div className="relative w-28 h-28 mb-4">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-muted" />
                      <circle
                        cx="60" cy="60" r="52" fill="none" strokeWidth="8"
                        strokeDasharray={`${(auditScore / 100) * 327} 327`}
                        strokeLinecap="round"
                        className={cn(
                          auditScore >= 80 ? "stroke-success" : auditScore >= 50 ? "stroke-warning" : "stroke-destructive"
                        )}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cn(
                        "text-3xl font-bold",
                        auditScore >= 80 ? "text-success" : auditScore >= 50 ? "text-warning" : "text-destructive"
                      )}>
                        {auditScore}
                      </span>
                      <span className="text-[10px] text-muted-foreground">/ 100</span>
                    </div>
                  </div>
                  {auditTotal > 0 ? (
                    <p className="text-xs text-muted-foreground text-center">
                      {auditErrors > 0 && <span className="text-destructive font-medium">{auditErrors} error{auditErrors !== 1 ? "s" : ""}</span>}
                      {auditErrors > 0 && auditWarnings > 0 && " · "}
                      {auditWarnings > 0 && <span className="text-warning font-medium">{auditWarnings} warning{auditWarnings !== 1 ? "s" : ""}</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-success font-medium">All checks passing</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">Click to view details →</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Loading audit…</p>
              )}
            </Link>
          </div>
        </motion.section>

        {/* ─── 4. OPERATIONS ─── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Operations</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <PayrollDeadlineWidget periods={periods} />
            <ExpiringDocumentsWidget />
          </div>
        </motion.section>

        {/* ─── RECENT PAYROLL ─── */}
        {periods.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Payroll</h2>
                <Link to="/payroll">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">View All</Button>
                </Link>
              </div>
              <div className="divide-y divide-border">
                {periods.slice(0, 3).map((period) => (
                  <Link
                    key={period.id}
                    to="/payroll"
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{period.period_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(period.start_date).toLocaleDateString()} – {new Date(period.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(Number(period.grand_total))}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Empty State */}
        {periods.length === 0 && (
          <div className="rounded-xl bg-card border border-border shadow-sm p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Payroll Data Yet</h3>
            <p className="text-muted-foreground mb-4">Import your first payroll spreadsheet to get started.</p>
            <Link to="/payroll">
              <Button>Go to Payroll</Button>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
