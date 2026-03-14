import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle, Info, XCircle, GitCompareArrows, Save, Eye,
  PoundSterling, Users, MapPin, Loader2, Clock, TrendingUp,
  ChevronDown, ChevronUp, Plus, Minus, ArrowRightLeft, Trash2,
} from "lucide-react";
import {
  calculateLabourCost,
  compareLabourCost,
  applyWhatIf,
  type ShiftRow,
  type WhatIfAction,
  type LabourCostResult,
  type LabourBudget,
  type LabourCostComparison,
} from "@/hooks/useLabourCostPreview";
import { useShifts, useBranchLocations } from "@/hooks/useSchedule";
import { useEmployees } from "@/hooks/useEmployees";
import { useTenant } from "@/hooks/useTenant";
import { useDailyRevenue } from "@/hooks/useLabourCost";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";

export default function LabourCostPreviewPage() {
  const { tenantId } = useTenant();
  const today = new Date();
  const [weekDate, setWeekDate] = useState(today);
  const ws = startOfWeek(weekDate, { weekStartsOn: 1 });
  const we = endOfWeek(weekDate, { weekStartsOn: 1 });
  const startDate = format(ws, "yyyy-MM-dd");
  const endDate = format(we, "yyyy-MM-dd");

  const [locationFilter, setLocationFilter] = useState("all");
  const [showCompare, setShowCompare] = useState(false);
  const [whatIfActions, setWhatIfActions] = useState<WhatIfAction[]>([]);
  const [budgetExpanded, setBudgetExpanded] = useState(false);
  const [dailyBudget, setDailyBudget] = useState<number | undefined>(undefined);
  const [weeklyBudget, setWeeklyBudget] = useState<number | undefined>(undefined);
  const [labourTarget, setLabourTarget] = useState<number | undefined>(undefined);
  const [revenueInput, setRevenueInput] = useState<number | undefined>(undefined);
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const { data: shifts = [], isLoading } = useShifts(startDate, endDate, locationFilter === "all" ? undefined : locationFilter);
  const { data: branches = [] } = useBranchLocations();
  const { data: employees = [] } = useEmployees();

  // Map DB shifts → ShiftRow
  const shiftRows: ShiftRow[] = useMemo(() => {
    return (shifts as any[]).map((s) => ({
      id: s.id,
      employeeId: s.employee_id || "",
      employeeName: s.employees ? `${s.employees.forename} ${s.employees.surname}` : "Unassigned",
      branch: s.branch || "",
      role: s.department || "Staff",
      shiftDate: s.shift_date,
      startTime: s.start_time,
      endTime: s.end_time,
      hourlyRate: s.employees?.hourly_rate || 0,
      isPublished: s.is_published,
    }));
  }, [shifts]);

  const budget: LabourBudget = {
    dailyBudget,
    weeklyBudget,
    labourPercentTarget: labourTarget,
    revenue: revenueInput,
  };

  // Scenario A = current schedule
  const resultA = useMemo(() => calculateLabourCost(shiftRows, budget), [shiftRows, budget]);

  // Scenario B = with what-if actions
  const modifiedShifts = useMemo(() => applyWhatIf(shiftRows, whatIfActions), [shiftRows, whatIfActions]);
  const resultB = useMemo(() => calculateLabourCost(modifiedShifts, budget), [modifiedShifts, budget]);

  const comparison = useMemo(() => {
    if (!showCompare && whatIfActions.length === 0) return null;
    return compareLabourCost(resultA, resultB);
  }, [resultA, resultB, showCompare, whatIfActions]);

  const activeResult = whatIfActions.length > 0 ? resultB : resultA;
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i);
    return { key: format(d, "yyyy-MM-dd"), label: format(d, "EEE dd") };
  });

  // What-if helpers
  const addShiftAction = () => {
    setWhatIfActions([...whatIfActions, {
      type: "add",
      shiftDate: startDate,
      startTime: "09:00",
      endTime: "17:00",
      branch: locationFilter === "all" ? (branches[0]?.branch || "") : locationFilter,
      role: "foh",
      employeeId: "",
      employeeName: "New Shift",
      hourlyRate: 12,
    }]);
  };

  const removeAction = (idx: number) => {
    setWhatIfActions(whatIfActions.filter((_, i) => i !== idx));
  };

  // Apply what-if to real schedule (only add actions)
  const handleApply = async () => {
    try {
      const addActions = whatIfActions.filter((a) => a.type === "add");
      if (addActions.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const newShifts = addActions.map((a) => ({
          tenant_id: tenantId!,
          employee_id: a.employeeId || null,
          branch: a.branch || "",
          department: a.role || "foh",
          shift_date: a.shiftDate || startDate,
          start_time: a.startTime || "09:00",
          end_time: a.endTime || "17:00",
          status: a.employeeId ? "scheduled" : "open",
          is_published: false,
          created_by: user?.id || null,
        }));
        const { error } = await supabase.from("shifts").insert(newShifts as any);
        if (error) throw error;
      }

      // Audit log
      if (tenantId) {
        await supabase.from("audit_log").insert({
          tenant_id: tenantId,
          table_name: "shifts",
          action: "UPDATE" as any,
          old_data: { totalCost: resultA.totalCost, totalHours: resultA.totalHours },
          new_data: { totalCost: resultB.totalCost, totalHours: resultB.totalHours, actions: whatIfActions.length },
          record_id: tenantId,
        });
      }

      setWhatIfActions([]);
      setShowApplyDialog(false);
      toast.success("Schedule changes applied.");
    } catch (e: any) {
      toast.error(e.message || "Failed to apply changes.");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <PoundSterling className="h-5 w-5 text-primary" />
              Labour Cost Preview
            </h1>
            <p className="text-xs text-muted-foreground">
              Simulate schedule cost before publishing. Read-only until you apply.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowCompare(!showCompare)}
            >
              <GitCompareArrows className="h-3.5 w-3.5 mr-1" />
              {showCompare ? "Hide Compare" : "Compare"}
            </Button>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Week Starting</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={format(ws, "yyyy-MM-dd")}
                  onChange={(e) => setWeekDate(new Date(e.target.value + "T00:00:00"))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Location</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All locations</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.branch} value={b.branch} className="text-xs">{b.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Shifts Loaded</Label>
                <div className="h-8 flex items-center text-xs text-muted-foreground">
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `${shiftRows.length} shifts`}
                </div>
              </div>
            </div>

            {/* Budget targets */}
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setBudgetExpanded(!budgetExpanded)}
            >
              {budgetExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {budgetExpanded ? "Hide budget targets" : "Set budget targets"}
            </button>

            {budgetExpanded && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border p-3 bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-[10px]">Daily Budget (£)</Label>
                  <Input type="number" className="h-7 text-xs" value={dailyBudget ?? ""} onChange={(e) => setDailyBudget(e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="e.g. 900" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Weekly Budget (£)</Label>
                  <Input type="number" className="h-7 text-xs" value={weeklyBudget ?? ""} onChange={(e) => setWeeklyBudget(e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="e.g. 5000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Labour % Target</Label>
                  <Input type="number" className="h-7 text-xs" value={labourTarget ?? ""} onChange={(e) => setLabourTarget(e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="e.g. 24" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Expected Revenue (£)</Label>
                  <Input type="number" className="h-7 text-xs" value={revenueInput ?? ""} onChange={(e) => setRevenueInput(e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="e.g. 20000" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warnings */}
        {activeResult.warnings.length > 0 && (
          <div className="space-y-1.5">
            {activeResult.warnings.map((w, i) => (
              <Alert key={i} variant={w.type === "error" ? "destructive" : "default"} className="py-2">
                {w.type === "error" ? <XCircle className="h-4 w-4" /> : w.type === "warning" ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                <AlertDescription className="text-xs ml-2">{w.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Summary cards */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard icon={<PoundSterling className="h-4 w-4" />} label="Total Cost" value={`£${activeResult.totalCost.toFixed(2)}`} />
            <SummaryCard icon={<Clock className="h-4 w-4" />} label="Total Hours" value={`${activeResult.totalHours.toFixed(1)}h`} />
            <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Avg Hourly" value={`£${activeResult.avgHourlyCost.toFixed(2)}`} />
            <SummaryCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Overtime"
              value={`${activeResult.totalOvertimeHours.toFixed(1)}h`}
              accent={activeResult.totalOvertimeHours > 0}
            />
          </div>
        )}

        {/* What-if comparison banner */}
        {whatIfActions.length > 0 && comparison && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-xs">
                <GitCompareArrows className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">What-If Impact:</span>
                <span className={comparison.costDiff > 0 ? "text-destructive font-semibold" : comparison.costDiff < 0 ? "text-green-600 dark:text-green-400 font-semibold" : ""}>
                  {comparison.costDiff > 0 ? "+" : ""}£{comparison.costDiff.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  ({comparison.hoursDiff > 0 ? "+" : ""}{comparison.hoursDiff.toFixed(1)}h)
                </span>
              </div>
              <Button size="sm" className="h-7 text-xs" onClick={() => setShowApplyDialog(true)}>
                <Save className="h-3 w-3 mr-1" />Apply Changes
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs: By Day / By Location / By Role / By Employee */}
        {!isLoading && (
          <Tabs defaultValue="day" className="space-y-3">
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs">By Day</TabsTrigger>
              <TabsTrigger value="branch" className="text-xs">By Location</TabsTrigger>
              <TabsTrigger value="role" className="text-xs">By Role</TabsTrigger>
              <TabsTrigger value="employee" className="text-xs">By Employee</TabsTrigger>
            </TabsList>

            <TabsContent value="day">
              <BreakdownTable
                data={dayLabels.map((d) => ({
                  key: d.label,
                  hours: activeResult.byDay[d.key]?.hours || 0,
                  cost: activeResult.byDay[d.key]?.cost || 0,
                  diffCost: comparison?.byBranch ? undefined : undefined,
                }))}
              />
            </TabsContent>
            <TabsContent value="branch">
              <BreakdownTable
                data={Object.entries(activeResult.byBranch).map(([key, val]) => ({
                  key,
                  hours: val.hours,
                  cost: val.cost,
                }))}
              />
            </TabsContent>
            <TabsContent value="role">
              <BreakdownTable
                data={Object.entries(activeResult.byRole).map(([key, val]) => ({
                  key,
                  hours: val.hours,
                  cost: val.cost,
                }))}
              />
            </TabsContent>
            <TabsContent value="employee">
              <BreakdownTable
                data={Object.entries(activeResult.byEmployee)
                  .sort(([, a], [, b]) => b.cost - a.cost)
                  .map(([, val]) => ({
                    key: val.name,
                    hours: val.hours,
                    cost: val.cost,
                  }))}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* What-If Actions */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              What-If Simulator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Add hypothetical changes to see their cost impact instantly.</p>

            {whatIfActions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2 bg-muted/20">
                <Badge variant="secondary" className="text-[9px] shrink-0">{action.type}</Badge>
                {action.type === "add" && (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Select value={action.employeeId || ""} onValueChange={(v) => {
                      const emp = employees.find((e: any) => e.id === v);
                      const copy = [...whatIfActions];
                      copy[i] = { ...action, employeeId: v, employeeName: emp ? `${(emp as any).forename} ${(emp as any).surname}` : "Employee", hourlyRate: (emp as any)?.hourly_rate || 12 };
                      setWhatIfActions(copy);
                    }}>
                      <SelectTrigger className="h-7 text-[10px] w-36"><SelectValue placeholder="Employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.filter((e: any) => e.status === "active").map((e: any) => (
                          <SelectItem key={e.id} value={e.id} className="text-xs">{e.forename} {e.surname}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input className="h-7 text-[10px] w-20" type="date" value={action.shiftDate} onChange={(e) => {
                      const copy = [...whatIfActions]; copy[i] = { ...action, shiftDate: e.target.value }; setWhatIfActions(copy);
                    }} />
                    <Input className="h-7 text-[10px] w-16" type="time" value={action.startTime} onChange={(e) => {
                      const copy = [...whatIfActions]; copy[i] = { ...action, startTime: e.target.value }; setWhatIfActions(copy);
                    }} />
                    <span className="text-[10px] text-muted-foreground">to</span>
                    <Input className="h-7 text-[10px] w-16" type="time" value={action.endTime} onChange={(e) => {
                      const copy = [...whatIfActions]; copy[i] = { ...action, endTime: e.target.value }; setWhatIfActions(copy);
                    }} />
                  </div>
                )}
                {action.type === "remove" && (
                  <span className="text-xs text-muted-foreground flex-1">Remove shift</span>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeAction(i)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addShiftAction}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add Shift
              </Button>
              {whatIfActions.length > 0 && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setWhatIfActions([])}>
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compare side-by-side */}
        {showCompare && comparison && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Scenario Comparison</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-3">
              <div className="grid grid-cols-3 gap-2 px-4 mb-3">
                <SummaryPill label="Current" value={`£${resultA.totalCost.toFixed(2)}`} />
                <SummaryPill label="Modified" value={`£${resultB.totalCost.toFixed(2)}`} />
                <SummaryPill
                  label="Difference"
                  value={`${comparison.costDiff > 0 ? "+" : ""}£${comparison.costDiff.toFixed(2)}`}
                  accent={comparison.costDiff > 0}
                  positive={comparison.costDiff < 0}
                />
              </div>

              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Category</TableHead>
                      <TableHead className="text-[10px] text-right">Current</TableHead>
                      <TableHead className="text-[10px] text-right">Modified</TableHead>
                      <TableHead className="text-[10px] text-right">Diff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(comparison.byRole).map(([role, data]) => (
                      <TableRow key={role}>
                        <TableCell className="text-xs py-2">{role}</TableCell>
                        <TableCell className="text-xs text-right py-2">£{data.costA.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right py-2">£{data.costB.toFixed(2)}</TableCell>
                        <TableCell className={`text-xs text-right font-semibold py-2 ${data.diff > 0 ? "text-destructive" : data.diff < 0 ? "text-green-600 dark:text-green-400" : ""}`}>
                          {data.diff > 0 ? "+" : ""}£{data.diff.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Apply dialog */}
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm">Apply Schedule Changes</DialogTitle>
              <DialogDescription className="text-xs">
                This will add new draft shifts to the schedule. Published shifts and approved payroll will not be affected.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border p-3 space-y-1 text-xs">
              <p><span className="font-medium">Actions:</span> {whatIfActions.length} change(s)</p>
              <p><span className="font-medium">Cost before:</span> £{resultA.totalCost.toFixed(2)}</p>
              <p><span className="font-medium">Cost after:</span> £{resultB.totalCost.toFixed(2)}</p>
              <p><span className="font-medium">Difference:</span> {comparison && comparison.costDiff > 0 ? "+" : ""}£{comparison?.costDiff.toFixed(2) || "0.00"}</p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowApplyDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={handleApply}>
                <Save className="h-3.5 w-3.5 mr-1" />Confirm & Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

/* ─── Sub-components ─── */

function SummaryCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-destructive/30 bg-destructive/5" : ""}>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${accent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">{label}</p>
          <p className={`text-sm font-bold ${accent ? "text-destructive" : "text-foreground"}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryPill({ label, value, accent, positive }: { label: string; value: string; accent?: boolean; positive?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${accent ? "border-destructive bg-destructive/5" : positive ? "border-green-500/30 bg-green-500/5" : "border-border bg-muted/30"}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${accent ? "text-destructive" : positive ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function BreakdownTable({ data }: { data: { key: string; hours: number; cost: number }[] }) {
  const total = data.reduce((s, r) => ({ hours: s.hours + r.hours, cost: s.cost + r.cost }), { hours: 0, cost: 0 });

  return (
    <Card>
      <CardContent className="px-0 py-2">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Category</TableHead>
                <TableHead className="text-[10px] text-right">Hours</TableHead>
                <TableHead className="text-[10px] text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="text-xs font-medium py-2">{row.key}</TableCell>
                  <TableCell className="text-xs text-right py-2">{row.hours.toFixed(1)}h</TableCell>
                  <TableCell className="text-xs text-right font-semibold py-2">£{row.cost.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {data.length > 1 && (
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell className="text-xs py-2">Total</TableCell>
                  <TableCell className="text-xs text-right py-2">{total.hours.toFixed(1)}h</TableCell>
                  <TableCell className="text-xs text-right py-2">£{total.cost.toFixed(2)}</TableCell>
                </TableRow>
              )}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">No data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
