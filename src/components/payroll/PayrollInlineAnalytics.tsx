import { useMemo, useState } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, Users, Clock, DollarSign, Percent,
  ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Crown, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PayrollLocationAnalytics } from "./PayrollLocationAnalytics";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { useHolidayPayments, formatCurrency, formatHours } from "@/hooks/useHolidays";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, ComposedChart,
} from "recharts";

const DEPT_COLORS: Record<string, string> = {
  FOH: "hsl(168 35% 49%)",
  BOH: "hsl(28 80% 55%)",
  CPU: "hsl(200 15% 45%)",
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

function getWeeks(startDate: string, endDate: string): number {
  const days = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1;
  return Math.round((days / 7) * 10) / 10;
}

interface Props {
  currentPeriodId: string;
  entries: any[];
  holidayPayments: any[];
}

export function PayrollInlineAnalytics({ currentPeriodId, entries, holidayPayments }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: allPeriods = [] } = usePayrollPeriods();
  
  // Get previous period entries
  const currentIndex = allPeriods.findIndex(p => p.id === currentPeriodId);
  const prevPeriod = currentIndex >= 0 && currentIndex < allPeriods.length - 1 ? allPeriods[currentIndex + 1] : null;
  const { data: prevEntries = [] } = usePayrollEntries(prevPeriod?.id);
  const { data: prevHolidays = [] } = useHolidayPayments(prevPeriod?.id);

  // Also get 2 periods back for mini-trend
  const prevPeriod2 = currentIndex >= 0 && currentIndex < allPeriods.length - 2 ? allPeriods[currentIndex + 2] : null;
  const { data: prevEntries2 = [] } = usePayrollEntries(prevPeriod2?.id);

  const currentPeriod = allPeriods.find(p => p.id === currentPeriodId);

  const analytics = useMemo(() => {
    if (!currentPeriod || entries.length === 0) return null;

    const weeks = (currentPeriod as any).period_weeks || getWeeks(currentPeriod.start_date, currentPeriod.end_date);
    const prevWeeks = prevPeriod ? ((prevPeriod as any).period_weeks || getWeeks(prevPeriod.start_date, prevPeriod.end_date)) : 0;
    const prev2Weeks = prevPeriod2 ? ((prevPeriod2 as any).period_weeks || getWeeks(prevPeriod2.start_date, prevPeriod2.end_date)) : 0;

    // Current period metrics
    const totalPay = entries.reduce((s: number, e: any) => s + Number(e.total_pay), 0);
    const totalHours = entries.reduce((s: number, e: any) => s + Number(e.timesheet_hours), 0);
    const totalBonuses = entries.reduce((s: number, e: any) => s + Number(e.performance_bonus || 0) + Number(e.special_bonus || 0), 0);
    const holidayTotal = holidayPayments.reduce((s: number, p: any) => s + Number(p.total), 0);
    const holidayHours = holidayPayments.reduce((s: number, p: any) => s + Number(p.hours), 0);
    const cpuPay = entries.filter((e: any) => e.employees?.department === "CPU").reduce((s: number, e: any) => s + Number(e.total_pay), 0);
    const operationalPay = totalPay - cpuPay;
    const costPerHour = totalHours > 0 ? totalPay / totalHours : 0;
    const payPerWeek = weeks > 0 ? totalPay / weeks : 0;
    const hoursPerWeek = weeks > 0 ? totalHours / weeks : 0;
    const sales = Number((currentPeriod as any).sales_total || 0);
    const labourPct = sales > 0 ? (operationalPay / sales) * 100 : null;
    const costPerEmployee = entries.length > 0 ? totalPay / entries.length : 0;

    // Previous period metrics
    const prevTotalPay = prevEntries.reduce((s: number, e: any) => s + Number(e.total_pay), 0);
    const prevTotalHours = prevEntries.reduce((s: number, e: any) => s + Number(e.timesheet_hours), 0);
    const prevPayPerWeek = prevWeeks > 0 ? prevTotalPay / prevWeeks : 0;
    const prevHoursPerWeek = prevWeeks > 0 ? prevTotalHours / prevWeeks : 0;
    const prevCostPerHour = prevTotalHours > 0 ? prevTotalPay / prevTotalHours : 0;
    const prevSales = Number((prevPeriod as any)?.sales_total || 0);
    const prevCpuPay = prevEntries.filter((e: any) => e.employees?.department === "CPU").reduce((s: number, e: any) => s + Number(e.total_pay), 0);
    const prevLabourPct = prevSales > 0 ? ((prevTotalPay - prevCpuPay) / prevSales) * 100 : null;

    // Department breakdown
    const deptData: Record<string, { pay: number; hours: number; count: number; bonuses: number; avgRate: number; rates: number[] }> = {};
    entries.forEach((e: any) => {
      const dept = e.employees?.department || "Unknown";
      if (!deptData[dept]) deptData[dept] = { pay: 0, hours: 0, count: 0, bonuses: 0, avgRate: 0, rates: [] };
      deptData[dept].pay += Number(e.total_pay);
      deptData[dept].hours += Number(e.timesheet_hours);
      deptData[dept].count += 1;
      deptData[dept].bonuses += Number(e.performance_bonus || 0) + Number(e.special_bonus || 0);
      deptData[dept].rates.push(Number(e.hourly_rate));
    });
    Object.values(deptData).forEach(d => { d.avgRate = d.rates.length > 0 ? d.rates.reduce((a, b) => a + b, 0) / d.rates.length : 0; });

    // Employee ranking
    const employeeStats = entries.map((e: any) => ({
      id: e.employee_id,
      name: `${e.employees?.forename || ""} ${e.employees?.surname || ""}`.trim(),
      department: e.employees?.department || "—",
      hours: Number(e.timesheet_hours),
      rate: Number(e.hourly_rate),
      serviceCharge: Number(e.service_charge || 0),
      bonuses: Number(e.performance_bonus || 0) + Number(e.special_bonus || 0),
      totalPay: Number(e.total_pay),
      holidayAccrued: Number(e.holiday_accrued_hours || 0),
      costPerHour: Number(e.timesheet_hours) > 0 ? Number(e.total_pay) / Number(e.timesheet_hours) : 0,
      weeklyHours: weeks > 0 ? Number(e.timesheet_hours) / weeks : 0,
      // Compare with previous
      prevEntry: prevEntries.find((pe: any) => pe.employee_id === e.employee_id),
    })).sort((a, b) => b.totalPay - a.totalPay);

    // Mini-trend data (3 periods)
    const trendPeriods = [
      prevPeriod2 ? { name: prevPeriod2.period_name.replace(/\s*\[.*?\]\s*/g, '').substring(0, 12), pay: prevEntries2.reduce((s: number, e: any) => s + Number(e.total_pay), 0), hours: prevEntries2.reduce((s: number, e: any) => s + Number(e.timesheet_hours), 0), weeks: prev2Weeks } : null,
      prevPeriod ? { name: prevPeriod.period_name.replace(/\s*\[.*?\]\s*/g, '').substring(0, 12), pay: prevTotalPay, hours: prevTotalHours, weeks: prevWeeks } : null,
      { name: currentPeriod.period_name.replace(/\s*\[.*?\]\s*/g, '').substring(0, 12), pay: totalPay, hours: totalHours, weeks },
    ].filter(Boolean).map((p: any) => ({
      name: p.name,
      "Pay/Wk": p.weeks > 0 ? Math.round(p.pay / p.weeks) : 0,
      "Hrs/Wk": p.weeks > 0 ? Math.round((p.hours / p.weeks) * 10) / 10 : 0,
    }));

    // Overtime detection (>48 hrs/wk average = WTD flag)
    const wtdFlags = employeeStats.filter(e => e.weeklyHours > 48);
    
    // Highest variance employees (vs prev period)
    const varianceEmployees = employeeStats
      .filter(e => e.prevEntry)
      .map(e => {
        const prevHrs = Number(e.prevEntry.timesheet_hours);
        const prevWks = prevWeeks > 0 ? prevWeeks : 1;
        const curWks = weeks > 0 ? weeks : 1;
        const prevWeekly = prevHrs / prevWks;
        const curWeekly = e.hours / curWks;
        const change = prevWeekly > 0 ? ((curWeekly - prevWeekly) / prevWeekly) * 100 : 0;
        return { ...e, prevWeeklyHours: prevWeekly, change };
      })
      .filter(e => Math.abs(e.change) > 15)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5);

    return {
      totalPay, totalHours, totalBonuses, holidayTotal, holidayHours,
      costPerHour, payPerWeek, hoursPerWeek, labourPct, costPerEmployee,
      cpuPay, operationalPay, sales, weeks, employeeCount: entries.length,
      // Previous comparison
      prevPayPerWeek, prevHoursPerWeek, prevCostPerHour, prevLabourPct,
      payChange: prevPayPerWeek > 0 ? ((payPerWeek - prevPayPerWeek) / prevPayPerWeek) * 100 : null,
      hoursChange: prevHoursPerWeek > 0 ? ((hoursPerWeek - prevHoursPerWeek) / prevHoursPerWeek) * 100 : null,
      costChange: prevCostPerHour > 0 ? ((costPerHour - prevCostPerHour) / prevCostPerHour) * 100 : null,
      deptData, employeeStats, trendPeriods, wtdFlags, varianceEmployees,
    };
  }, [currentPeriod, entries, holidayPayments, prevPeriod, prevEntries, prevPeriod2, prevEntries2, prevHolidays]);

  if (!analytics || entries.length === 0) return null;

  const deptPieData = Object.entries(analytics.deptData).map(([name, d]) => ({ name, value: d.pay }));
  const deptBarData = Object.entries(analytics.deptData).map(([name, d]) => ({
    name,
    Cost: d.pay,
    Hours: d.hours,
    Staff: d.count,
    "Avg Rate": d.avgRate,
  }));

  const ChangeIndicator = ({ value, invert = false }: { value: number | null; invert?: boolean }) => {
    if (value === null || !isFinite(value)) return <span className="text-xs text-muted-foreground">—</span>;
    const isUp = value > 0;
    const isGood = invert ? !isUp : isUp;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGood ? "text-success" : "text-destructive"}`}>
        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl bg-card shadow-card border border-border animate-fade-in">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 hover:bg-muted/30 rounded-t-xl transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-card-foreground">Period Analytics</h3>
                <p className="text-xs text-muted-foreground">
                  Labour insights, employee comparison & department breakdown
                </p>
              </div>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Alerts Row */}
            {(analytics.wtdFlags.length > 0 || analytics.varianceEmployees.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {analytics.wtdFlags.map(e => (
                  <Badge key={e.id} variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {e.name}: {e.weeklyHours.toFixed(1)} hrs/wk (WTD limit 48)
                  </Badge>
                ))}
                {analytics.varianceEmployees.slice(0, 3).map(e => (
                  <Badge key={e.id} variant="secondary" className="text-xs gap-1">
                    {e.name}: {e.change > 0 ? "+" : ""}{e.change.toFixed(0)}% hrs vs prev
                  </Badge>
                ))}
              </div>
            )}

            {/* Quick KPIs with comparison */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Pay / Week</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(analytics.payPerWeek)}</p>
                <ChangeIndicator value={analytics.payChange} invert />
              </div>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Hours / Week</p>
                <p className="text-lg font-bold text-foreground">{formatHours(analytics.hoursPerWeek)}</p>
                <ChangeIndicator value={analytics.hoursChange} />
              </div>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Cost / Hour</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(analytics.costPerHour)}</p>
                <ChangeIndicator value={analytics.costChange} invert />
              </div>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Labour %</p>
                <p className={`text-lg font-bold ${analytics.labourPct && analytics.labourPct > 35 ? "text-destructive" : analytics.labourPct && analytics.labourPct > 30 ? "text-warning" : "text-foreground"}`}>
                  {analytics.labourPct ? `${analytics.labourPct.toFixed(1)}%` : "—"}
                </p>
                {analytics.labourPct && (
                  <span className="text-xs text-muted-foreground">
                    {analytics.labourPct <= 25 ? "Excellent" : analytics.labourPct <= 30 ? "Good" : analytics.labourPct <= 35 ? "Monitor" : "High"}
                  </span>
                )}
              </div>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Holiday Cost</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(analytics.holidayTotal)}</p>
                <span className="text-xs text-muted-foreground">{formatHours(analytics.holidayHours)} hrs</span>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Cost / Employee</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(analytics.costPerEmployee)}</p>
                <span className="text-xs text-muted-foreground">{analytics.employeeCount} staff</span>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="locations" className="text-xs">Locations</TabsTrigger>
                <TabsTrigger value="employees" className="text-xs">Employees</TabsTrigger>
                <TabsTrigger value="departments" className="text-xs">Departments</TabsTrigger>
                <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Department Pie */}
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold text-card-foreground mb-3">Cost by Department</p>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={deptPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {deptPieData.map((d, i) => (
                              <Cell key={i} fill={DEPT_COLORS[d.name] || `hsl(${i * 120} 40% 50%)`} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top 5 earners */}
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold text-card-foreground mb-3">Top 5 Earners</p>
                    <div className="space-y-3">
                      {analytics.employeeStats.slice(0, 5).map((emp, i) => {
                        const pctOfTotal = analytics.totalPay > 0 ? (emp.totalPay / analytics.totalPay) * 100 : 0;
                        return (
                          <div key={emp.id} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-foreground truncate">{emp.name}</span>
                                <span className="text-sm font-semibold text-foreground ml-2">{formatCurrency(emp.totalPay)}</span>
                              </div>
                              <Progress value={pctOfTotal} className="h-1.5" />
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{emp.department}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Hours Variance Alerts */}
                {analytics.varianceEmployees.length > 0 && (
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-warning" />
                      Significant Hours Changes vs Previous Period
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {analytics.varianceEmployees.map(emp => (
                        <div key={emp.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {emp.prevWeeklyHours.toFixed(1)} → {emp.weeklyHours.toFixed(1)} hrs/wk
                            </p>
                          </div>
                          <Badge variant={emp.change > 0 ? "default" : "secondary"} className="text-xs">
                            {emp.change > 0 ? "+" : ""}{emp.change.toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Locations Tab */}
              <TabsContent value="locations" className="mt-4">
                <PayrollLocationAnalytics periodId={currentPeriodId} entries={entries} />
              </TabsContent>

              {/* Employees Tab */}
              <TabsContent value="employees" className="mt-4">
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Employee</TableHead>
                        <TableHead className="text-xs">Dept</TableHead>
                        <TableHead className="text-right text-xs">Hours</TableHead>
                        <TableHead className="text-right text-xs">Hrs/Wk</TableHead>
                        <TableHead className="text-right text-xs">Rate</TableHead>
                        <TableHead className="text-right text-xs">SC</TableHead>
                        <TableHead className="text-right text-xs">Bonuses</TableHead>
                        <TableHead className="text-right text-xs">Hol Accrued</TableHead>
                        <TableHead className="text-right text-xs">Total Pay</TableHead>
                        <TableHead className="text-right text-xs">£/hr Eff.</TableHead>
                        <TableHead className="text-right text-xs">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.employeeStats.map((emp, i) => {
                        const pctOfTotal = analytics.totalPay > 0 ? (emp.totalPay / analytics.totalPay) * 100 : 0;
                        const prevEntry = emp.prevEntry;
                        const prevPay = prevEntry ? Number(prevEntry.total_pay) : null;
                        const payDiff = prevPay !== null ? emp.totalPay - prevPay : null;
                        return (
                          <TableRow key={emp.id} className={i === 0 ? "bg-primary/5" : ""}>
                            <TableCell className="text-xs text-muted-foreground">
                              {i === 0 && <Crown className="h-3 w-3 text-warning inline mr-1" />}
                              {i + 1}
                            </TableCell>
                            <TableCell className="text-xs font-medium">{emp.name}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-[10px]">{emp.department}</Badge></TableCell>
                            <TableCell className="text-right text-xs">{formatHours(emp.hours)}</TableCell>
                            <TableCell className={`text-right text-xs ${emp.weeklyHours > 48 ? "text-destructive font-bold" : ""}`}>
                              {emp.weeklyHours.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right text-xs">{formatCurrency(emp.rate)}</TableCell>
                            <TableCell className="text-right text-xs">{emp.serviceCharge > 0 ? formatCurrency(emp.serviceCharge) : "—"}</TableCell>
                            <TableCell className="text-right text-xs">{emp.bonuses > 0 ? formatCurrency(emp.bonuses) : "—"}</TableCell>
                            <TableCell className="text-right text-xs">{formatHours(emp.holidayAccrued)}</TableCell>
                            <TableCell className="text-right text-xs font-semibold">
                              {formatCurrency(emp.totalPay)}
                              {payDiff !== null && Math.abs(payDiff) > 10 && (
                                <span className={`ml-1 text-[10px] ${payDiff > 0 ? "text-destructive" : "text-success"}`}>
                                  {payDiff > 0 ? "↑" : "↓"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs">{formatCurrency(emp.costPerHour)}</TableCell>
                            <TableCell className="text-right text-xs">{pctOfTotal.toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Departments Tab */}
              <TabsContent value="departments" className="space-y-4 mt-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold text-card-foreground mb-3">Department Comparison</p>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptBarData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" className="text-xs fill-muted-foreground" width={40} tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name === "Hours" ? [formatHours(v), name] : [formatCurrency(v), name]} />
                          <Legend />
                          <Bar dataKey="Cost" fill="hsl(168 35% 49%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold text-card-foreground mb-3">Department Detail</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Dept</TableHead>
                          <TableHead className="text-right text-xs">Staff</TableHead>
                          <TableHead className="text-right text-xs">Hours</TableHead>
                          <TableHead className="text-right text-xs">Cost</TableHead>
                          <TableHead className="text-right text-xs">Avg Rate</TableHead>
                          <TableHead className="text-right text-xs">Bonuses</TableHead>
                          <TableHead className="text-right text-xs">% Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(analytics.deptData).map(([dept, d]) => (
                          <TableRow key={dept}>
                            <TableCell><Badge variant="secondary" className="text-[10px]">{dept}</Badge></TableCell>
                            <TableCell className="text-right text-xs">{d.count}</TableCell>
                            <TableCell className="text-right text-xs">{formatHours(d.hours)}</TableCell>
                            <TableCell className="text-right text-xs font-semibold">{formatCurrency(d.pay)}</TableCell>
                            <TableCell className="text-right text-xs">{formatCurrency(d.avgRate)}</TableCell>
                            <TableCell className="text-right text-xs">{d.bonuses > 0 ? formatCurrency(d.bonuses) : "—"}</TableCell>
                            <TableCell className="text-right text-xs">
                              {analytics.totalPay > 0 ? `${((d.pay / analytics.totalPay) * 100).toFixed(1)}%` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-4 mt-4">
                {analytics.trendPeriods.length >= 2 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm font-semibold text-card-foreground mb-3">Weekly Pay Trend</p>
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={analytics.trendPeriods}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} />
                            <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="Pay/Wk" fill="hsl(168 35% 49%)" radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="Pay/Wk" stroke="hsl(28 80% 55%)" strokeWidth={2} dot={{ r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm font-semibold text-card-foreground mb-3">Weekly Hours Trend</p>
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={analytics.trendPeriods}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} />
                            <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatHours(v)} />
                            <Bar dataKey="Hrs/Wk" fill="hsl(200 15% 45%)" radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="Hrs/Wk" stroke="hsl(158 45% 42%)" strokeWidth={2} dot={{ r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Need at least 2 periods to show trends. More periods = better insights.
                  </div>
                )}

                {/* Period-over-period summary */}
                {prevPeriod && (
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold text-card-foreground mb-3">
                      vs Previous Period ({prevPeriod.period_name})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: "Pay/Week", curr: analytics.payPerWeek, prev: analytics.prevPayPerWeek, fmt: formatCurrency, invert: true },
                        { label: "Hours/Week", curr: analytics.hoursPerWeek, prev: analytics.prevHoursPerWeek, fmt: formatHours, invert: false },
                        { label: "Cost/Hour", curr: analytics.costPerHour, prev: analytics.prevCostPerHour, fmt: formatCurrency, invert: true },
                        { label: "Labour %", curr: analytics.labourPct, prev: analytics.prevLabourPct, fmt: (v: number) => `${v.toFixed(1)}%`, invert: true },
                      ].map(m => {
                        const change = m.prev && m.prev > 0 && m.curr !== null ? ((m.curr! - m.prev) / m.prev) * 100 : null;
                        return (
                          <div key={m.label} className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                            <p className="text-sm font-semibold text-foreground">
                              {m.curr !== null ? m.fmt(m.curr) : "—"} <span className="text-muted-foreground">vs</span> {m.prev && m.prev > 0 ? m.fmt(m.prev) : "—"}
                            </p>
                            <ChangeIndicator value={change} invert={m.invert} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
