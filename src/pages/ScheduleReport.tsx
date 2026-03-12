import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { useShifts } from "@/hooks/useSchedule";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useEmployees } from "@/hooks/useEmployees";
import { useTenantBranches } from "@/hooks/useBranches";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Download, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeRow {
  id: string;
  name: string;
  department: string;
  scheduledHours: number;
  actualHours: number;
  variance: number;
  variancePct: number;
  scheduledCost: number;
  actualCost: number;
  costVariance: number;
  hourlyRate: number;
}

export default function ScheduleReport() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>("Fitzrovia");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: shifts } = useShifts(
    format(weekStart, "yyyy-MM-dd"),
    format(weekEnd, "yyyy-MM-dd")
  );

  const { data: timeEntries } = useTimeEntries(
    format(weekStart, "yyyy-MM-dd"),
    format(weekEnd, "yyyy-MM-dd")
  );

  const { data: employees } = useEmployees();

  const rows: EmployeeRow[] = useMemo(() => {
    if (!employees || !shifts) return [];

    const activeEmployees = employees.filter((e) => e.status === "active");

    return activeEmployees
      .map((emp) => {
        // Scheduled hours from shifts for this branch
        const empShifts = (shifts || []).filter(
          (s: any) => s.employee_id === emp.id && s.branch === selectedBranch
        );
        let scheduledMinutes = 0;
        for (const s of empShifts) {
          const [sh, sm] = (s.start_time || "00:00").split(":").map(Number);
          const [eh, em] = (s.end_time || "00:00").split(":").map(Number);
          let mins = eh * 60 + em - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60;
          scheduledMinutes += mins;
        }
        const scheduledHours = scheduledMinutes / 60;

        // Actual hours from time entries for this branch
        const empEntries = (timeEntries || []).filter(
          (t: any) =>
            t.employee_id === emp.id &&
            t.branch === selectedBranch &&
            t.status !== "rejected"
        );
        const actualHours = empEntries.reduce(
          (sum: number, t: any) => sum + (Number(t.total_hours) || 0),
          0
        );

        const variance = actualHours - scheduledHours;
        const variancePct = scheduledHours > 0 ? (variance / scheduledHours) * 100 : 0;
        const hourlyRate = Number(emp.hourly_rate) || 0;
        const scheduledCost = scheduledHours * hourlyRate;
        const actualCost = actualHours * hourlyRate;

        return {
          id: emp.id,
          name: `${emp.forename} ${emp.surname}`,
          department: emp.department,
          scheduledHours: Math.round(scheduledHours * 100) / 100,
          actualHours: Math.round(actualHours * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          variancePct: Math.round(variancePct),
          scheduledCost,
          actualCost,
          costVariance: actualCost - scheduledCost,
          hourlyRate,
        };
      })
      .filter((r) => r.scheduledHours > 0 || r.actualHours > 0);
  }, [employees, shifts, timeEntries, selectedBranch]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        scheduledHours: acc.scheduledHours + r.scheduledHours,
        actualHours: acc.actualHours + r.actualHours,
        variance: acc.variance + r.variance,
        scheduledCost: acc.scheduledCost + r.scheduledCost,
        actualCost: acc.actualCost + r.actualCost,
        costVariance: acc.costVariance + r.costVariance,
      }),
      { scheduledHours: 0, actualHours: 0, variance: 0, scheduledCost: 0, actualCost: 0, costVariance: 0 }
    );
  }, [rows]);

  const totalVariancePct = totals.scheduledHours > 0
    ? Math.round((totals.variance / totals.scheduledHours) * 100)
    : 0;

  const navigate = (dir: number) => setCurrentDate((d) => addDays(d, 7 * dir));

  const exportCSV = () => {
    const headers = ["Employee", "Department", "Rate (£/hr)", "Scheduled Hours", "Actual Hours", "Variance (hrs)", "Variance (%)", "Scheduled Cost (£)", "Actual Cost (£)", "Cost Variance (£)"];
    const csvRows = rows.map((r) =>
      [r.name, r.department, r.hourlyRate.toFixed(2), r.scheduledHours.toFixed(2), r.actualHours.toFixed(2), r.variance.toFixed(2), `${r.variancePct}%`, r.scheduledCost.toFixed(2), r.actualCost.toFixed(2), r.costVariance.toFixed(2)].join(",")
    );
    const totalsRow = ["TOTAL", "", "", totals.scheduledHours.toFixed(2), totals.actualHours.toFixed(2), totals.variance.toFixed(2), `${totalVariancePct}%`, totals.scheduledCost.toFixed(2), totals.actualCost.toFixed(2), totals.costVariance.toFixed(2)].join(",");
    const csv = [headers.join(","), ...csvRows, totalsRow].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-vs-timesheet-${format(weekStart, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const VarianceIndicator = ({ value, pct }: { value: number; pct: number }) => {
    if (Math.abs(value) < 0.01)
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-3 w-3" /> 0h
        </span>
      );
    if (value > 0)
      return (
        <span className="flex items-center gap-1 text-destructive">
          <ArrowUp className="h-3 w-3" /> +{value.toFixed(1)}h ({pct > 0 ? "+" : ""}{pct}%)
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-success">
        <ArrowDown className="h-3 w-3" /> {value.toFixed(1)}h ({pct}%)
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Schedule vs Timesheet</h1>
            <p className="text-sm text-muted-foreground">
              Compare rostered hours against actual timesheets
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
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
            <TabsContent key={branchVal} value={branchVal} className="mt-3">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <SummaryCard
                  label="Scheduled"
                  value={`${totals.scheduledHours.toFixed(1)}h`}
                  sub={`£${totals.scheduledCost.toFixed(0)}`}
                />
                <SummaryCard
                  label="Actual"
                  value={`${totals.actualHours.toFixed(1)}h`}
                  sub={`£${totals.actualCost.toFixed(0)}`}
                />
                <SummaryCard
                  label="Hour Variance"
                  value={`${totals.variance >= 0 ? "+" : ""}${totals.variance.toFixed(1)}h`}
                  sub={`${totalVariancePct >= 0 ? "+" : ""}${totalVariancePct}%`}
                  variant={Math.abs(totals.variance) < 0.5 ? "neutral" : totals.variance > 0 ? "negative" : "positive"}
                />
                <SummaryCard
                  label="Cost Variance"
                  value={`${totals.costVariance >= 0 ? "+" : ""}£${totals.costVariance.toFixed(0)}`}
                  sub={totals.costVariance > 0 ? "Over budget" : totals.costVariance < 0 ? "Under budget" : "On budget"}
                  variant={Math.abs(totals.costVariance) < 1 ? "neutral" : totals.costVariance > 0 ? "negative" : "positive"}
                />
              </div>

              {/* Table */}
              <div className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Employee</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Dept</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Rate</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Scheduled</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actual</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Variance</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Cost Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground">
                            No data for this week
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium">{r.name}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px]">{r.department}</Badge>
                            </td>
                            <td className="p-3 text-right text-muted-foreground">£{r.hourlyRate.toFixed(2)}</td>
                            <td className="p-3 text-right">{r.scheduledHours.toFixed(1)}h</td>
                            <td className="p-3 text-right">{r.actualHours.toFixed(1)}h</td>
                            <td className="p-3 text-right">
                              <VarianceIndicator value={r.variance} pct={r.variancePct} />
                            </td>
                            <td className={cn(
                              "p-3 text-right font-medium",
                              r.costVariance > 0.5 ? "text-destructive" : r.costVariance < -0.5 ? "text-success" : "text-muted-foreground"
                            )}>
                              {r.costVariance >= 0 ? "+" : ""}£{r.costVariance.toFixed(0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {rows.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border font-semibold bg-muted/20">
                          <td className="p-3" colSpan={3}>Total</td>
                          <td className="p-3 text-right">{totals.scheduledHours.toFixed(1)}h</td>
                          <td className="p-3 text-right">{totals.actualHours.toFixed(1)}h</td>
                          <td className="p-3 text-right">
                            <VarianceIndicator value={totals.variance} pct={totalVariancePct} />
                          </td>
                          <td className={cn(
                            "p-3 text-right",
                            totals.costVariance > 0.5 ? "text-destructive" : totals.costVariance < -0.5 ? "text-success" : "text-muted-foreground"
                          )}>
                            {totals.costVariance >= 0 ? "+" : ""}£{totals.costVariance.toFixed(0)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  variant = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  variant?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3",
      variant === "negative" ? "border-destructive/30 bg-destructive/5" :
      variant === "positive" ? "border-success/30 bg-success/5" :
      "border-border bg-card"
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "text-xl font-bold mt-1",
        variant === "negative" ? "text-destructive" :
        variant === "positive" ? "text-success" :
        "text-foreground"
      )}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
