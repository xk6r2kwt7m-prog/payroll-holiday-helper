import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { format, startOfWeek, endOfWeek, addDays, subWeeks } from "date-fns";
import { useShifts } from "@/hooks/useSchedule";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useEmployees } from "@/hooks/useEmployees";
import { useTenantBranches } from "@/hooks/useBranches";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, DollarSign, Users, BarChart3, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const DEPARTMENTS = ["All", "FOH", "BOH", "CPU"] as const;

const hoursChartConfig: ChartConfig = {
  scheduled: { label: "Scheduled", color: "hsl(168 35% 49%)" },
  actual: { label: "Actual", color: "hsl(28 80% 55%)" },
};

const costChartConfig: ChartConfig = {
  scheduledCost: { label: "Budgeted", color: "hsl(168 35% 49%)" },
  actualCost: { label: "Actual", color: "hsl(28 80% 55%)" },
};

const deptChartConfig: ChartConfig = {
  FOH: { label: "FOH", color: "hsl(168 35% 49%)" },
  BOH: { label: "BOH", color: "hsl(28 80% 55%)" },
  CPU: { label: "CPU", color: "hsl(200 15% 45%)" },
};

const DEPT_COLORS = [
  "hsl(168, 35%, 49%)",
  "hsl(28, 80%, 55%)",
  "hsl(200, 15%, 45%)",
];

function useWeekData(weekStart: Date, weekEnd: Date, branch: string, deptFilter: string) {
  const startStr = format(weekStart, "yyyy-MM-dd");
  const endStr = format(weekEnd, "yyyy-MM-dd");
  const { data: shifts } = useShifts(startStr, endStr);
  const { data: timeEntries } = useTimeEntries(startStr, endStr);
  const { data: employees } = useEmployees();

  return useMemo(() => {
    if (!employees || !shifts) return null;

    const activeEmployees = employees.filter((e) => e.status === "active" && (deptFilter === "All" || e.department === deptFilter));
    let totalScheduled = 0;
    let totalActual = 0;
    let totalScheduledCost = 0;
    let totalActualCost = 0;

    const deptData: Record<string, { scheduled: number; actual: number; scheduledCost: number; actualCost: number }> = {
      FOH: { scheduled: 0, actual: 0, scheduledCost: 0, actualCost: 0 },
      BOH: { scheduled: 0, actual: 0, scheduledCost: 0, actualCost: 0 },
      CPU: { scheduled: 0, actual: 0, scheduledCost: 0, actualCost: 0 },
    };

    // Per-day data
    const dayData: { day: string; scheduled: number; actual: number; scheduledCost: number; actualCost: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const dayLabel = format(d, "EEE");
      let dayScheduled = 0;
      let dayActual = 0;
      let dayScheduledCost = 0;
      let dayActualCost = 0;

      for (const emp of activeEmployees) {
        const rate = Number(emp.hourly_rate) || 0;

        // Shifts for this day/branch
        const empShifts = (shifts || []).filter(
          (s: any) => s.employee_id === emp.id && s.branch === branch && s.shift_date === dateStr
        );
        for (const s of empShifts) {
          const [sh, sm] = (s.start_time || "00:00").split(":").map(Number);
          const [eh, em] = (s.end_time || "00:00").split(":").map(Number);
          let mins = eh * 60 + em - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60;
          const hrs = mins / 60;
          dayScheduled += hrs;
          if (deptData[emp.department]) {
            deptData[emp.department].scheduled += hrs;
            deptData[emp.department].scheduledCost += hrs * rate;
          }
          dayScheduledCost += hrs * rate;
        }

        // Time entries for this day/branch
        const empEntries = (timeEntries || []).filter((t: any) => {
          const entryDate = t.clock_in_time ? format(new Date(t.clock_in_time), "yyyy-MM-dd") : "";
          return t.employee_id === emp.id && t.branch === branch && entryDate === dateStr && t.status !== "rejected";
        });
        for (const t of empEntries) {
          const hrs = Number(t.total_hours) || 0;
          dayActual += hrs;
          if (deptData[emp.department]) {
            deptData[emp.department].actual += hrs;
            deptData[emp.department].actualCost += hrs * rate;
          }
          dayActualCost += hrs * rate;
        }
      }

      dayData.push({
        day: dayLabel,
        scheduled: Math.round(dayScheduled * 100) / 100,
        actual: Math.round(dayActual * 100) / 100,
        scheduledCost: Math.round(dayScheduledCost),
        actualCost: Math.round(dayActualCost),
      });

      totalScheduled += dayScheduled;
      totalActual += dayActual;
      totalScheduledCost += dayScheduledCost;
      totalActualCost += dayActualCost;
    }

    // Top variance employees
    const empVariance = activeEmployees.map((emp) => {
      const rate = Number(emp.hourly_rate) || 0;
      const empShifts = (shifts || []).filter(
        (s: any) => s.employee_id === emp.id && s.branch === branch
      );
      let scheduled = 0;
      for (const s of empShifts) {
        const [sh, sm] = (s.start_time || "00:00").split(":").map(Number);
        const [eh, em] = (s.end_time || "00:00").split(":").map(Number);
        let mins = eh * 60 + em - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        scheduled += mins / 60;
      }
      const empEntries = (timeEntries || []).filter(
        (t: any) => t.employee_id === emp.id && t.branch === branch && t.status !== "rejected"
      );
      const actual = empEntries.reduce((s: number, t: any) => s + (Number(t.total_hours) || 0), 0);
      return {
        name: `${emp.forename} ${emp.surname[0]}.`,
        department: emp.department,
        scheduled: Math.round(scheduled * 10) / 10,
        actual: Math.round(actual * 10) / 10,
        variance: Math.round((actual - scheduled) * 10) / 10,
        costVariance: Math.round((actual - scheduled) * rate),
      };
    }).filter((e) => e.scheduled > 0 || e.actual > 0)
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 8);

    return {
      dayData,
      totalScheduled: Math.round(totalScheduled * 10) / 10,
      totalActual: Math.round(totalActual * 10) / 10,
      totalScheduledCost: Math.round(totalScheduledCost),
      totalActualCost: Math.round(totalActualCost),
      deptData: Object.entries(deptData).map(([dept, d]) => ({
        dept,
        scheduled: Math.round(d.scheduled * 10) / 10,
        actual: Math.round(d.actual * 10) / 10,
      })),
      deptPie: Object.entries(deptData).map(([dept, d]) => ({
        name: dept,
        value: Math.round(d.actual * 10) / 10 || Math.round(d.scheduled * 10) / 10,
      })).filter(d => d.value > 0),
      empVariance,
    };
  }, [employees, shifts, timeEntries, branch, weekStart, deptFilter]);
}

export default function ScheduleAnalytics() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>("Fitzrovia");
  const [selectedDept, setSelectedDept] = useState<string>("All");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const data = useWeekData(weekStart, weekEnd, selectedBranch, selectedDept);

  const navigate = (dir: number) => setCurrentDate((d) => addDays(d, 7 * dir));

  const hourVariance = data ? data.totalActual - data.totalScheduled : 0;
  const costVariance = data ? data.totalActualCost - data.totalScheduledCost : 0;
  const variancePct = data && data.totalScheduled > 0
    ? Math.round((hourVariance / data.totalScheduled) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Schedule Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Rostered vs actual hours with cost tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d === "All" ? "All Departments" : d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Week navigator */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[220px] text-center">
            {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Branch tabs */}
        <Tabs value={selectedBranch} onValueChange={setSelectedBranch}>
          <TabsList className="w-full justify-start">
            {BRANCHES.map((b) => (
              <TabsTrigger key={b} value={b} className="flex-1 sm:flex-none">
                {b}
              </TabsTrigger>
            ))}
          </TabsList>

          {BRANCHES.map((branchVal) => (
            <TabsContent key={branchVal} value={branchVal} className="mt-4 space-y-5">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                  icon={<Clock className="h-4 w-4" />}
                  label="Rostered Hours"
                  value={`${data?.totalScheduled ?? 0}h`}
                />
                <KPICard
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="Actual Hours"
                  value={`${data?.totalActual ?? 0}h`}
                />
                <KPICard
                  icon={hourVariance > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  label="Hour Variance"
                  value={`${hourVariance >= 0 ? "+" : ""}${hourVariance.toFixed(1)}h`}
                  sub={`${variancePct >= 0 ? "+" : ""}${variancePct}%`}
                  variant={Math.abs(hourVariance) < 0.5 ? "neutral" : hourVariance > 0 ? "negative" : "positive"}
                />
                <KPICard
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Cost Variance"
                  value={`${costVariance >= 0 ? "+" : ""}£${Math.abs(costVariance)}`}
                  sub={costVariance > 0 ? "Over budget" : costVariance < 0 ? "Under budget" : "On budget"}
                  variant={Math.abs(costVariance) < 1 ? "neutral" : costVariance > 0 ? "negative" : "positive"}
                />
              </div>

              {/* Charts Row */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Rostered vs Actual Hours Bar Chart */}
                <div className="rounded-xl bg-card shadow-card p-5">
                  <h3 className="text-sm font-semibold text-card-foreground mb-4">Rostered vs Actual Hours</h3>
                  {data?.dayData && data.dayData.some(d => d.scheduled > 0 || d.actual > 0) ? (
                    <ChartContainer config={hoursChartConfig} className="h-[260px] w-full">
                      <BarChart data={data.dayData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}h`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="scheduled" fill="var(--color-scheduled)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actual" fill="var(--color-actual)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyChart message="No shift or timesheet data this week" />
                  )}
                </div>

                {/* Cost Tracking Bar Chart */}
                <div className="rounded-xl bg-card shadow-card p-5">
                  <h3 className="text-sm font-semibold text-card-foreground mb-4">Cost Tracking (£)</h3>
                  {data?.dayData && data.dayData.some(d => d.scheduledCost > 0 || d.actualCost > 0) ? (
                    <ChartContainer config={costChartConfig} className="h-[260px] w-full">
                      <BarChart data={data.dayData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `£${v}`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="scheduledCost" fill="var(--color-scheduledCost)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actualCost" fill="var(--color-actualCost)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyChart message="No cost data this week" />
                  )}
                </div>
              </div>

              {/* Second Row: Department + Employee Variance */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Department Breakdown Pie */}
                <div className="rounded-xl bg-card shadow-card p-5">
                  <h3 className="text-sm font-semibold text-card-foreground mb-4">Hours by Department</h3>
                  {data?.deptPie && data.deptPie.length > 0 ? (
                    <div className="h-[220px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.deptPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {data.deptPie.map((_, i) => (
                              <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart message="No department data" />
                  )}
                  {data?.deptPie && data.deptPie.length > 0 && (
                    <div className="flex justify-center gap-4 mt-2">
                      {data.deptPie.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: DEPT_COLORS[i] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="font-medium">{d.value}h</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Department Scheduled vs Actual */}
                <div className="rounded-xl bg-card shadow-card p-5 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-card-foreground mb-4">Department Comparison</h3>
                  {data?.deptData && data.deptData.some(d => d.scheduled > 0 || d.actual > 0) ? (
                    <ChartContainer config={deptChartConfig} className="h-[220px] w-full">
                      <BarChart data={data.deptData} barGap={4} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v}h`} />
                        <YAxis type="category" dataKey="dept" tickLine={false} axisLine={false} fontSize={12} width={40} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="scheduled" fill="hsl(168, 35%, 49%)" radius={[0, 4, 4, 0]} name="Scheduled" />
                        <Bar dataKey="actual" fill="hsl(28, 80%, 55%)" radius={[0, 4, 4, 0]} name="Actual" />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyChart message="No department data" />
                  )}
                </div>
              </div>

              {/* Top Employee Variance Table */}
              <div className="rounded-xl bg-card shadow-card overflow-hidden">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-sm font-semibold text-card-foreground">Top Variance by Employee</h3>
                  <p className="text-xs text-muted-foreground">Employees with the largest hour discrepancies</p>
                </div>
                {data?.empVariance && data.empVariance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Employee</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Dept</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">Scheduled</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actual</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">Variance</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">Cost Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.empVariance.map((e) => (
                          <tr key={e.name} className="border-t border-border hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium">{e.name}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px]">{e.department}</Badge>
                            </td>
                            <td className="p-3 text-right">{e.scheduled}h</td>
                            <td className="p-3 text-right">{e.actual}h</td>
                            <td className={cn(
                              "p-3 text-right font-medium",
                              e.variance > 0.5 ? "text-destructive" : e.variance < -0.5 ? "text-success" : "text-muted-foreground"
                            )}>
                              {e.variance >= 0 ? "+" : ""}{e.variance}h
                            </td>
                            <td className={cn(
                              "p-3 text-right font-medium",
                              e.costVariance > 0 ? "text-destructive" : e.costVariance < 0 ? "text-success" : "text-muted-foreground"
                            )}>
                              {e.costVariance >= 0 ? "+" : ""}£{Math.abs(e.costVariance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No employee data for this week
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}

function KPICard({
  icon,
  label,
  value,
  sub,
  variant = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  variant?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      variant === "negative" ? "border-destructive/30 bg-destructive/5" :
      variant === "positive" ? "border-success/30 bg-success/5" :
      "border-border bg-card"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-muted-foreground">{icon}</div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
      <p className={cn(
        "text-2xl font-bold",
        variant === "negative" ? "text-destructive" :
        variant === "positive" ? "text-success" :
        "text-foreground"
      )}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
