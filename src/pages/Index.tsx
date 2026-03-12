import { Users, DollarSign, Calendar, Clock, FileText, Percent, Search, CreditCard, Shield, TrendingUp, ChevronRight, ArrowRight, Utensils, ChefHat, Factory, MapPin, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { ExpiringDocumentsWidget } from "@/components/dashboard/ExpiringDocumentsWidget";
import { PayrollDeadlineWidget } from "@/components/dashboard/PayrollDeadlineWidget";
import { TodayActions } from "@/components/dashboard/TodayActions";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { usePayrollAudit } from "@/hooks/usePayrollAudit";
import { useEmployees } from "@/hooks/useEmployees";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";
import { useLeaveRules } from "@/hooks/useLeaveRules";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useAllEmployeeBranches, useTenantBranches, getBranchEmoji } from "@/hooks/useBranches";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const { data: employees = [] } = useEmployees();
  const { data: periods = [] } = usePayrollPeriods();
  const latestPeriod = periods[0];
  const { data: entries = [] } = usePayrollEntries(latestPeriod?.id);
  const { data: audit } = usePayrollAudit();
  const { data: employeeBranches = [] } = useAllEmployeeBranches();
  const { data: leaveRules } = useLeaveRules();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showDetails, setShowDetails] = useState(false);

  const activeEmployees = employees.filter(e => e.status === "active").length;
  const totalPayroll = entries.reduce((sum, e: any) => sum + Number(e.total_pay), 0);
  const totalHours = entries.reduce((sum, e: any) => sum + Number(e.timesheet_hours), 0);
  const totalHolidayAccrued = entries.reduce((sum, e: any) => sum + Number(e.holiday_accrued_hours || 0), 0);

  const salesTotal = latestPeriod ? Number((latestPeriod as any).sales_total || 0) : 0;
  const labourPercent = salesTotal > 0 ? (totalPayroll / salesTotal) * 100 : 0;
  const periodWeeks = latestPeriod ? Number((latestPeriod as any).period_weeks || 4) : 4;
  const payPerWeek = periodWeeks > 0 ? totalPayroll / periodWeeks : 0;

  // Department data
  const deptConfig = {
    FOH: { label: "Front of House", icon: Utensils, color: "text-primary", bgColor: "bg-primary/10" },
    BOH: { label: "Back of House", icon: ChefHat, color: "text-accent", bgColor: "bg-accent/10" },
    CPU: { label: "Central Production", icon: Factory, color: "text-warning", bgColor: "bg-warning/10" },
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

  // KPI data for compact mobile strip
  const kpis = [
    { label: "Staff", value: String(activeEmployees), color: "text-foreground", href: "/employees" },
    { label: "Payroll", value: formatCurrency(totalPayroll), color: "text-primary", href: "/payroll" },
    { label: "Labour", value: labourPercent > 0 ? `${labourPercent.toFixed(1)}%` : "—", color: labourPercent > 35 ? "text-warning" : "text-success", href: "/payroll/analytics" },
    { label: "Hours", value: `${formatHours(totalHours)}`, color: "text-foreground", href: "/timesheets" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 sm:space-y-10 max-w-7xl mx-auto pb-8">

        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {latestPeriod ? latestPeriod.period_name : "Welcome to Ugly Dumpling Payroll"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex gap-2 text-muted-foreground border-border min-h-[40px]"
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search</span>
            <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hidden sm:inline">⌘K</kbd>
          </Button>
        </div>

        {/* ─── MOBILE: KPI STRIP ─── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="sm:hidden"
        >
          <div className="grid grid-cols-4 gap-2">
            {kpis.map((kpi) => (
              <Link
                key={kpi.label}
                to={kpi.href}
                className="rounded-xl bg-card border border-border p-3 text-center transition-all active:bg-muted"
              >
                <p className={cn("text-lg font-bold tabular-nums leading-none", kpi.color)}>{kpi.value}</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">{kpi.label}</p>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ─── DESKTOP: KPI CARDS ─── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="hidden sm:block"
        >
          <div className="grid gap-4 grid-cols-3 lg:grid-cols-5">
            {[
              {
                label: "Active Staff",
                value: String(activeEmployees),
                sub: `${employees.length} total incl. leavers`,
                icon: <Users className="h-5 w-5" />,
                color: "text-foreground",
                iconBg: "bg-secondary",
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
                value: `${formatHours(totalHolidayAccrued)} hrs`,
                sub: `${((leaveRules?.accrualRate ?? 0.1207) * 100).toFixed(2)}% accrual rate`,
                icon: <Calendar className="h-5 w-5" />,
                color: "text-accent",
                iconBg: "bg-accent/10",
                href: "/holidays",
              },
              {
                label: "Hours Tracked",
                value: `${formatHours(totalHours)} hrs`,
                sub: `${formatHours(periodWeeks > 0 ? totalHours / periodWeeks : 0)} / week`,
                icon: <Clock className="h-5 w-5" />,
                color: "text-foreground",
                iconBg: "bg-secondary",
                href: "/timesheets",
              },
            ].map((kpi) => (
              <Link
                key={kpi.label}
                to={kpi.href}
                className="rounded-xl bg-card border border-border p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", kpi.iconBg)}>
                    <span className={cn(kpi.color)}>{kpi.icon}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className={cn("text-[26px] font-bold tracking-tight leading-none tabular-nums", kpi.color)}>{kpi.value}</p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-3 uppercase tracking-widest">{kpi.label}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1 truncate">{kpi.sub}</p>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ─── MOBILE: QUICK ACTIONS GRID ─── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="sm:hidden"
        >
          <QuickActions />
        </motion.section>

        {/* ─── TODAY'S PRIORITIES ─── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Needs Attention
          </h2>
          <TodayActions employees={employees} periods={periods} entries={entries} />
        </motion.section>

        {/* ─── OPERATIONS (Payroll deadline + expiring docs) ─── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Operations</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <PayrollDeadlineWidget periods={periods} />
            <ExpiringDocumentsWidget />
          </div>
        </motion.section>

        {/* ─── MOBILE: COLLAPSIBLE DETAIL SECTIONS ─── */}
        {isMobile && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 w-full text-left py-2"
            >
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Departments & Locations
              </h2>
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", showDetails && "rotate-180")} />
            </button>
          </motion.section>
        )}

        {/* ─── DEPARTMENT OVERVIEW + AUDIT ─── */}
        {(!isMobile || showDetails) && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="grid gap-5 lg:grid-cols-12"
          >
            {/* Department Overview — 8 cols */}
            <div className="lg:col-span-8">
              {!isMobile && <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Department Overview</h2>}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
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
                      className="rounded-xl bg-card border border-border p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
                    >
                      <div className="flex items-center gap-3 mb-3 sm:mb-5">
                        <div className={cn("flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg", cfg.bgColor)}>
                          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", cfg.color)} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-foreground text-sm tracking-tight">{dept}</h3>
                          <p className="text-[11px] text-muted-foreground leading-none mt-0.5">{cfg.label}</p>
                        </div>
                        {/* Mobile: inline stats */}
                        <div className="sm:hidden flex items-center gap-3 text-xs tabular-nums">
                          <span className="text-muted-foreground">{count} staff</span>
                          <span className="font-semibold text-foreground">{formatCurrency(deptPay)}</span>
                        </div>
                      </div>

                      {/* Desktop: stacked stats */}
                      <div className="hidden sm:block space-y-3 pt-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Staff</span>
                          <span className="text-lg font-bold text-foreground tabular-nums">{count}</span>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hours</span>
                          <span className="text-lg font-bold text-foreground tabular-nums">{formatHours(deptHours)}</span>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cost</span>
                          <span className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(deptPay)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Audit Score — 4 cols */}
            <div className="lg:col-span-4">
              {!isMobile && <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Payroll Audit</h2>}
              <Link
                to="/payroll/audit"
                className="flex flex-col rounded-xl bg-card border border-border p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 sm:h-[calc(100%-2rem)]"
              >
                {auditScore !== null ? (
                  <div className="flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-0 flex-1">
                    {/* Circular gauge */}
                    <div className="relative w-[80px] h-[80px] sm:w-[120px] sm:h-[120px] shrink-0 sm:mb-5">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" className="stroke-border" />
                        <circle
                          cx="60" cy="60" r="50" fill="none" strokeWidth="10"
                          strokeDasharray={`${(auditScore / 100) * 314} 314`}
                          strokeLinecap="round"
                          className={cn(
                            "transition-all duration-700",
                            auditScore >= 80 ? "stroke-success" : auditScore >= 50 ? "stroke-warning" : "stroke-destructive"
                          )}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={cn(
                          "text-2xl sm:text-4xl font-bold tabular-nums",
                          auditScore >= 80 ? "text-success" : auditScore >= 50 ? "text-warning" : "text-destructive"
                        )}>
                          {auditScore}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground mt-0.5">/ 100</span>
                      </div>
                    </div>

                    <div className="flex-1 sm:text-center">
                      <p className="text-sm font-bold text-foreground sm:hidden">Audit Score</p>
                      {auditTotal > 0 ? (
                        <div className="flex items-center gap-3 text-xs mt-1 sm:mt-0">
                          {auditErrors > 0 && (
                            <span className="flex items-center gap-1.5 text-destructive font-semibold">
                              <span className="h-2 w-2 rounded-full bg-destructive" />
                              {auditErrors} error{auditErrors !== 1 ? "s" : ""}
                            </span>
                          )}
                          {auditWarnings > 0 && (
                            <span className="flex items-center gap-1.5 text-warning font-semibold">
                              <span className="h-2 w-2 rounded-full bg-warning" />
                              {auditWarnings} warning{auditWarnings !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-success font-semibold mt-1 sm:mt-0">All checks passing</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-4">
                    <p className="text-sm text-muted-foreground">Loading audit…</p>
                  </div>
                )}
              </Link>
            </div>
          </motion.section>
        )}

        {/* ─── LOCATION OVERVIEW ─── */}
        {(!isMobile || showDetails) && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
          >
            {!isMobile && <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Locations</h2>}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              {tenantBranches.map((branch) => {
                const branchEmployeeIds = employeeBranches
                  .filter(eb => eb.branch === branch)
                  .map(eb => eb.employee_id);
                const branchEmployees = employees.filter(e => e.status === "active" && branchEmployeeIds.includes(e.id));
                const staffCount = branchEmployees.length;

                const branchEntries = entries.filter((e: any) => branchEmployeeIds.includes(e.employee_id));
                const branchHours = branchEntries.reduce((s: number, e: any) => s + Number(e.timesheet_hours), 0);
                const branchCost = branchEntries.reduce((s: number, e: any) => s + Number(e.total_pay), 0);

                return (
                  <Link
                    key={branch}
                    to="/locations"
                    className="rounded-xl bg-card border border-border p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-secondary text-lg">
                        {BRANCH_EMOJI[branch]}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground text-sm tracking-tight">{branch}</h3>
                        <p className="text-[11px] text-muted-foreground leading-none mt-0.5">{staffCount} active staff</p>
                      </div>
                      {/* Mobile: inline numbers */}
                      <div className="sm:hidden flex items-center gap-3 text-xs tabular-nums">
                        <span className="text-muted-foreground">{formatHours(branchHours)}h</span>
                        <span className="font-semibold text-foreground">{formatCurrency(branchCost)}</span>
                      </div>
                      <ArrowRight className="hidden sm:block h-3.5 w-3.5 text-muted-foreground/40 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Desktop: expanded stats */}
                    <div className="hidden sm:block space-y-3 pt-1 mt-5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hours</span>
                        <span className="text-lg font-bold text-foreground tabular-nums">{formatHours(branchHours)}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cost</span>
                        <span className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(branchCost)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ─── RECENT PAYROLL ─── */}
        {periods.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 }}
          >
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Recent Payroll</h2>
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="divide-y divide-border">
                {periods.slice(0, 3).map((period) => (
                  <Link
                    key={period.id}
                    to="/payroll"
                    className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-muted/30 transition-colors group min-h-[52px]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{period.period_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(period.start_date).toLocaleDateString("en-GB")} – {new Date(period.end_date).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                      <span className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(Number(period.grand_total))}</span>
                      <Badge variant="secondary" className="text-[10px] font-semibold hidden sm:inline-flex">
                        {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Empty State */}
        {periods.length === 0 && (
          <div className="rounded-xl bg-card border border-border shadow-sm p-8 sm:p-10 text-center">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">No Payroll Data Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Import your first payroll spreadsheet to get started.</p>
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
