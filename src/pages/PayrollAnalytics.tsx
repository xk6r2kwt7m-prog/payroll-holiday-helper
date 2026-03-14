import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, DollarSign, Clock, Users, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PayrollNavStrip } from "@/components/payroll/PayrollNavStrip";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ComposedChart, Area,
} from "recharts";

const COLORS = ["hsl(168 35% 49%)", "hsl(28 80% 55%)", "hsl(200 15% 45%)", "hsl(158 45% 42%)", "hsl(0 65% 52%)"];

function getWeeks(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
  return Math.round((days / 7) * 10) / 10;
}

interface PeriodAnalytics {
  id: string;
  name: string;
  weeks: number;
  totalPay: number;
  totalHours: number;
  totalBonuses: number;
  avgHourlyRate: number;
  avgHourlyCost: number;
  holidayAccrued: number;
  employeeCount: number;
  salesTotals: number;
  labourPercent: number;
  payPerWeek: number;
  hoursPerWeek: number;
  deptBreakdown: Record<string, { pay: number; hours: number; count: number }>;
}

const PayrollAnalytics = () => {
  const { data: periods = [] } = usePayrollPeriods();
  const [comparePeriodIds, setComparePeriodIds] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState("trends");

  // Fetch entries for all periods (we'll show up to 12 most recent)
  const recentPeriods = periods.slice(0, 12);
  
  // We need entries for each period - use individual hooks for compare periods
  const period1Entries = usePayrollEntries(recentPeriods[0]?.id);
  const period2Entries = usePayrollEntries(recentPeriods[1]?.id);
  const period3Entries = usePayrollEntries(recentPeriods[2]?.id);
  const period4Entries = usePayrollEntries(recentPeriods[3]?.id);
  const period5Entries = usePayrollEntries(recentPeriods[4]?.id);
  const period6Entries = usePayrollEntries(recentPeriods[5]?.id);
  const period7Entries = usePayrollEntries(recentPeriods[6]?.id);
  const period8Entries = usePayrollEntries(recentPeriods[7]?.id);
  const period9Entries = usePayrollEntries(recentPeriods[8]?.id);
  const period10Entries = usePayrollEntries(recentPeriods[9]?.id);
  const period11Entries = usePayrollEntries(recentPeriods[10]?.id);
  const period12Entries = usePayrollEntries(recentPeriods[11]?.id);

  const allEntries = [
    period1Entries, period2Entries, period3Entries, period4Entries,
    period5Entries, period6Entries, period7Entries, period8Entries,
    period9Entries, period10Entries, period11Entries, period12Entries,
  ];

  const periodAnalytics: PeriodAnalytics[] = useMemo(() => {
    return recentPeriods.map((period, i) => {
      const entries = allEntries[i]?.data || [];
      const weeks = (period as any).period_weeks || getWeeks(period.start_date, period.end_date);
      const sales = (period as any).sales_total || 0;

      const totalPay = entries.reduce((s: number, e: any) => s + Number(e.total_pay), 0);
      const totalHours = entries.reduce((s: number, e: any) => s + Number(e.timesheet_hours), 0);
      const totalBonuses = entries.reduce((s: number, e: any) => s + Number(e.performance_bonus || 0) + Number(e.special_bonus || 0), 0);
      const holidayAccrued = entries.reduce((s: number, e: any) => s + Number(e.holiday_accrued_hours || 0), 0);
      const avgRate = entries.length > 0
        ? entries.reduce((s: number, e: any) => s + Number(e.hourly_rate), 0) / entries.length
        : 0;
      const avgHourlyCost = totalHours > 0 ? totalPay / totalHours : 0;

      const deptBreakdown: Record<string, { pay: number; hours: number; count: number }> = {};
      entries.forEach((e: any) => {
        const dept = e.employees?.department || "Unknown";
        if (!deptBreakdown[dept]) deptBreakdown[dept] = { pay: 0, hours: 0, count: 0 };
        deptBreakdown[dept].pay += Number(e.total_pay);
        deptBreakdown[dept].hours += Number(e.timesheet_hours);
        deptBreakdown[dept].count += 1;
      });

      return {
        id: period.id,
        name: period.period_name,
        weeks,
        totalPay,
        totalHours,
        totalBonuses,
        avgHourlyRate: avgRate,
        avgHourlyCost,
        holidayAccrued,
        employeeCount: entries.length,
        salesTotals: sales,
        labourPercent: sales > 0 ? (totalPay / sales) * 100 : 0,
        payPerWeek: weeks > 0 ? totalPay / weeks : 0,
        hoursPerWeek: weeks > 0 ? totalHours / weeks : 0,
        deptBreakdown,
      };
    });
  }, [recentPeriods, allEntries]);

  // Trend data (reversed for chronological order)
  const trendData = useMemo(() => {
    return [...periodAnalytics].reverse().map(p => ({
      name: p.name,
      "Total Pay": p.totalPay,
      "Pay/Week": p.payPerWeek,
      "Hours/Week": p.hoursPerWeek,
      "Labour %": p.labourPercent,
      "Avg Hourly Cost": p.avgHourlyCost,
      Sales: p.salesTotals,
    }));
  }, [periodAnalytics]);

  // Department trend data
  const deptTrendData = useMemo(() => {
    return [...periodAnalytics].reverse().map(p => {
      const row: Record<string, any> = { name: p.name };
      Object.entries(p.deptBreakdown).forEach(([dept, data]) => {
        row[dept] = data.pay;
      });
      return row;
    });
  }, [periodAnalytics]);

  const allDepts = useMemo(() => {
    const depts = new Set<string>();
    periodAnalytics.forEach(p => Object.keys(p.deptBreakdown).forEach(d => depts.add(d)));
    return Array.from(depts);
  }, [periodAnalytics]);

  // Comparison
  const compareData = useMemo(() => {
    if (comparePeriodIds.length < 2) return [];
    return comparePeriodIds
      .map(id => periodAnalytics.find(p => p.id === id))
      .filter(Boolean) as PeriodAnalytics[];
  }, [comparePeriodIds, periodAnalytics]);

  // Latest vs previous period change
  const latest = periodAnalytics[0];
  const previous = periodAnalytics[1];
  const payChange = latest && previous && previous.payPerWeek > 0
    ? ((latest.payPerWeek - previous.payPerWeek) / previous.payPerWeek) * 100
    : 0;
  const hoursChange = latest && previous && previous.hoursPerWeek > 0
    ? ((latest.hoursPerWeek - previous.hoursPerWeek) / previous.hoursPerWeek) * 100
    : 0;

  // Department pie for latest period
  const latestDeptPie = useMemo(() => {
    if (!latest) return [];
    return Object.entries(latest.deptBreakdown).map(([dept, data]) => ({
      name: dept,
      value: data.pay,
    }));
  }, [latest]);

  const handleCompareChange = (value: string, index: number) => {
    const newIds = [...comparePeriodIds];
    newIds[index] = value;
    setComparePeriodIds(newIds);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PayrollNavStrip />

        {/* Header */}
        <div className="animate-slide-in-left">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            Payroll Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Labour cost analysis, period comparison, and trend insights
          </p>
        </div>

        {/* KPI Cards */}
        {latest && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pay / Week</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(latest.payPerWeek)}</p>
                    {previous && (
                      <div className={`flex items-center gap-1 text-xs mt-1 ${payChange >= 0 ? "text-destructive" : "text-success"}`}>
                        {payChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(payChange).toFixed(1)}% vs prev
                      </div>
                    )}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hours / Week</p>
                    <p className="text-2xl font-bold text-foreground">{formatHours(latest.hoursPerWeek)}</p>
                    {previous && (
                      <div className={`flex items-center gap-1 text-xs mt-1 ${hoursChange >= 0 ? "text-warning" : "text-success"}`}>
                        {hoursChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(hoursChange).toFixed(1)}% vs prev
                      </div>
                    )}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Labour %</p>
                    <p className="text-2xl font-bold text-foreground">
                      {latest.salesTotals > 0 ? `${latest.labourPercent.toFixed(1)}%` : "No sales data"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {latest.salesTotals > 0 ? `of ${formatCurrency(latest.salesTotals)} revenue` : "Add sales to periods"}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Percent className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Hourly Cost</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(latest.avgHourlyCost)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inc. bonuses & service charge
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="compare">Compare Periods</TabsTrigger>
            <TabsTrigger value="department">By Department</TabsTrigger>
            <TabsTrigger value="employees">Employee History</TabsTrigger>
          </TabsList>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            {/* Labour Cost Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Labour Cost Trend (Per Week)</CardTitle>
                <CardDescription>Normalised weekly cost across periods of varying length</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number, name: string) => {
                          if (name === "Labour %") return [`${value.toFixed(1)}%`, name];
                          return [formatCurrency(value), name];
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="Pay/Week" fill="hsl(168 35% 49%)" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="Labour %" stroke="hsl(28 80% 55%)" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Hours Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hours Trend (Per Week)</CardTitle>
                <CardDescription>Normalised weekly hours for consistent comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                      <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(value: number, name: string) => [formatHours(value), name]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Hours/Week" stroke="hsl(168 35% 49%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Avg Hourly Cost" stroke="hsl(158 45% 42%)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Period Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Period Summary</CardTitle>
                <CardDescription>All periods with per-week normalised figures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Weeks</TableHead>
                        <TableHead className="text-right">Staff</TableHead>
                        <TableHead className="text-right">Total Pay</TableHead>
                        <TableHead className="text-right">Pay/Week</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Hrs/Week</TableHead>
                        <TableHead className="text-right">Avg £/hr</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead className="text-right">Labour %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodAnalytics.map((p, i) => (
                        <TableRow key={p.id} className={i === 0 ? "bg-primary/5" : ""}>
                          <TableCell className="font-medium">
                            {p.name}
                            {i === 0 && <Badge className="ml-2 text-xs" variant="secondary">Latest</Badge>}
                          </TableCell>
                          <TableCell className="text-right">{p.weeks}</TableCell>
                          <TableCell className="text-right">{p.employeeCount}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.totalPay)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(p.payPerWeek)}</TableCell>
                          <TableCell className="text-right">{formatHours(p.totalHours)}</TableCell>
                          <TableCell className="text-right font-medium">{formatHours(p.hoursPerWeek)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.avgHourlyCost)}</TableCell>
                          <TableCell className="text-right">{p.salesTotals > 0 ? formatCurrency(p.salesTotals) : "—"}</TableCell>
                          <TableCell className="text-right">
                            {p.labourPercent > 0 ? (
                              <Badge variant={p.labourPercent > 35 ? "destructive" : p.labourPercent > 25 ? "secondary" : "default"}>
                                {p.labourPercent.toFixed(1)}%
                              </Badge>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compare Periods Side-by-Side</CardTitle>
                <CardDescription>Select two or more periods to compare (figures normalised per week)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="space-y-1">
                      <p className="text-xs text-muted-foreground">Period {i + 1}{i < 2 ? " *" : " (optional)"}</p>
                      <Select
                        value={comparePeriodIds[i] || ""}
                        onValueChange={(v) => handleCompareChange(v, i)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          {recentPeriods.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.period_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {compareData.length >= 2 && (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Metric</TableHead>
                            {compareData.map(p => (
                              <TableHead key={p.id} className="text-right">{p.name}</TableHead>
                            ))}
                            <TableHead className="text-right">Variance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { label: "Period Length", fn: (p: PeriodAnalytics) => `${p.weeks} weeks`, var: false },
                            { label: "Staff Count", fn: (p: PeriodAnalytics) => `${p.employeeCount}`, var: false },
                            { label: "Total Pay", fn: (p: PeriodAnalytics) => formatCurrency(p.totalPay), var: false },
                            { label: "Pay / Week", fn: (p: PeriodAnalytics) => formatCurrency(p.payPerWeek), var: true, key: "payPerWeek" },
                            { label: "Total Hours", fn: (p: PeriodAnalytics) => formatHours(p.totalHours), var: false },
                            { label: "Hours / Week", fn: (p: PeriodAnalytics) => formatHours(p.hoursPerWeek), var: true, key: "hoursPerWeek" },
                            { label: "Avg Hourly Cost", fn: (p: PeriodAnalytics) => formatCurrency(p.avgHourlyCost), var: true, key: "avgHourlyCost" },
                            { label: "Total Bonuses", fn: (p: PeriodAnalytics) => formatCurrency(p.totalBonuses), var: false },
                            { label: "Holiday Accrued", fn: (p: PeriodAnalytics) => `${formatHours(p.holidayAccrued)} hrs`, var: false },
                            { label: "Sales", fn: (p: PeriodAnalytics) => p.salesTotals > 0 ? formatCurrency(p.salesTotals) : "—", var: false },
                            { label: "Labour %", fn: (p: PeriodAnalytics) => p.labourPercent > 0 ? `${p.labourPercent.toFixed(1)}%` : "—", var: true, key: "labourPercent" },
                          ].map(metric => {
                            const variance = metric.var && metric.key && compareData.length === 2
                              ? (((compareData[0] as any)[metric.key!] - (compareData[1] as any)[metric.key!]) / (compareData[1] as any)[metric.key!] * 100)
                              : null;
                            return (
                              <TableRow key={metric.label}>
                                <TableCell className="font-medium">{metric.label}</TableCell>
                                {compareData.map(p => (
                                  <TableCell key={p.id} className="text-right">{metric.fn(p)}</TableCell>
                                ))}
                                <TableCell className="text-right">
                                  {variance !== null && isFinite(variance) ? (
                                    <span className={variance > 0 ? "text-destructive" : "text-success"}>
                                      {variance > 0 ? "+" : ""}{variance.toFixed(1)}%
                                    </span>
                                  ) : "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Comparison bar chart */}
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          ...compareData.map(p => ({
                            name: p.name,
                            "Pay/Week": p.payPerWeek,
                            "Hours/Week": p.hoursPerWeek * 10, // Scale for visibility
                          }))
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                          <YAxis className="text-xs fill-muted-foreground" />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                            formatter={(value: number, name: string) => {
                              if (name === "Hours/Week") return [formatHours(value / 10), name];
                              return [formatCurrency(value), name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="Pay/Week" fill="hsl(168 35% 49%)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Hours/Week" fill="hsl(28 80% 55%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Department Tab */}
          <TabsContent value="department" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Period – Cost by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={latestDeptPie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {latestDeptPie.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Department Detail Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Department Breakdown – {latest?.name || "Latest"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {latest && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dept</TableHead>
                          <TableHead className="text-right">Staff</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(latest.deptBreakdown).map(([dept, data]) => (
                          <TableRow key={dept}>
                            <TableCell><Badge variant="secondary">{dept}</Badge></TableCell>
                            <TableCell className="text-right">{data.count}</TableCell>
                            <TableCell className="text-right">{formatHours(data.hours)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(data.pay)}</TableCell>
                            <TableCell className="text-right">
                              {latest.totalPay > 0 ? `${((data.pay / latest.totalPay) * 100).toFixed(1)}%` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Department Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Department Cost Trend</CardTitle>
                <CardDescription>Labour cost by department over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                      <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      {allDepts.map((dept, i) => (
                        <Bar key={dept} dataKey={dept} stackId="dept" fill={COLORS[i % COLORS.length]} radius={i === allDepts.length - 1 ? [4, 4, 0, 0] : undefined} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employee History Tab */}
          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employee Cost History</CardTitle>
                <CardDescription>Per-employee earnings, rate changes, and holiday accrued across all periods</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Build per-employee history across all periods
                  const employeeMap: Record<string, {
                    name: string;
                    department: string;
                    periods: { name: string; rate: number; hours: number; pay: number; holiday: number; bonuses: number }[];
                  }> = {};

                  recentPeriods.forEach((period, i) => {
                    const periodEntries = allEntries[i]?.data || [];
                    periodEntries.forEach((entry: any) => {
                      const emp = entry.employees;
                      if (!emp) return;
                      const key = entry.employee_id;
                      if (!employeeMap[key]) {
                        employeeMap[key] = {
                          name: `${emp.forename} ${emp.surname}`,
                          department: emp.department,
                          periods: [],
                        };
                      }
                      employeeMap[key].periods.push({
                        name: period.period_name,
                        rate: Number(entry.hourly_rate),
                        hours: Number(entry.timesheet_hours),
                        pay: Number(entry.total_pay),
                        holiday: Number(entry.holiday_accrued_hours || 0),
                        bonuses: Number(entry.performance_bonus || 0) + Number(entry.special_bonus || 0),
                      });
                    });
                  });

                  const employees = Object.entries(employeeMap)
                    .map(([id, data]) => {
                      const totalEarnings = data.periods.reduce((s, p) => s + p.pay, 0);
                      const totalHours = data.periods.reduce((s, p) => s + p.hours, 0);
                      const totalHoliday = data.periods.reduce((s, p) => s + p.holiday, 0);
                      const totalBonuses = data.periods.reduce((s, p) => s + p.bonuses, 0);
                      const rates = data.periods.map(p => p.rate);
                      const rateChanged = new Set(rates).size > 1;
                      return { id, ...data, totalEarnings, totalHours, totalHoliday, totalBonuses, rateChanged };
                    })
                    .sort((a, b) => b.totalEarnings - a.totalEarnings);

                  return (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Dept</TableHead>
                            <TableHead className="text-right">Periods</TableHead>
                            <TableHead className="text-right">Total Hours</TableHead>
                            <TableHead className="text-right">Total Earnings</TableHead>
                            <TableHead className="text-right">Total Bonuses</TableHead>
                            <TableHead className="text-right">Holiday Accrued</TableHead>
                            <TableHead className="text-right">Rate History</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map((emp) => (
                            <TableRow key={emp.id}>
                              <TableCell className="font-medium">{emp.name}</TableCell>
                              <TableCell><Badge variant="secondary" className="text-xs">{emp.department}</Badge></TableCell>
                              <TableCell className="text-right">{emp.periods.length}</TableCell>
                              <TableCell className="text-right">{formatHours(emp.totalHours)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(emp.totalEarnings)}</TableCell>
                              <TableCell className="text-right">{emp.totalBonuses > 0 ? formatCurrency(emp.totalBonuses) : "—"}</TableCell>
                              <TableCell className="text-right">{formatHours(emp.totalHoliday)} hrs</TableCell>
                              <TableCell className="text-right">
                                {emp.rateChanged ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="h-2 w-2 rounded-full bg-warning inline-block" />
                                    <span className="text-xs text-muted-foreground">
                                      {formatCurrency(emp.periods[emp.periods.length - 1]?.rate || 0)} → {formatCurrency(emp.periods[0]?.rate || 0)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">{formatCurrency(emp.periods[0]?.rate || 0)}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default PayrollAnalytics;
