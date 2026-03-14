import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle, Info, XCircle, Play, GitCompareArrows, Save, Eye,
  PoundSterling, Users, MapPin, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  runSimulation,
  compareScenarios,
  type SimulationInput,
  type DistributionModel,
  type PreviewResult,
  type PreviewWarning,
  type EmployeeHoursRow,
  type ComparisonRow,
} from "@/hooks/useServiceChargePreview";
import {
  useServiceChargeEnabled,
  useServiceChargeLocations,
  useServiceChargeRoleRates,
  useServiceChargeEmployeeRates,
  useUpsertServiceChargeLocation,
  useSaveRoleRate,
  useSaveEmployeeRate,
} from "@/hooks/useServiceCharge";
import { useEmployees } from "@/hooks/useEmployees";
import { useLocationSettings } from "@/hooks/useLocationSettings";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MODELS: { value: DistributionModel; label: string }[] = [
  { value: "none", label: "No service charge" },
  { value: "equal_by_hours", label: "Equal by hours worked" },
  { value: "role_points", label: "Role points system" },
  { value: "fixed_role", label: "Fixed rate per role/hour" },
  { value: "fixed_employee", label: "Fixed rate per employee/hour" },
  { value: "hybrid", label: "Hybrid / custom" },
];

const SOURCE_COLORS: Record<string, string> = {
  none: "bg-muted text-muted-foreground",
  company_default: "bg-primary/10 text-primary",
  location_rule: "bg-accent text-accent-foreground",
  role_rule: "bg-secondary text-secondary-foreground",
  employee_rule: "bg-primary/20 text-primary",
  custom_formula: "bg-muted text-foreground",
};

export function ServiceChargePreview() {
  const { tenantId } = useTenant();
  const { data: companyEnabled = false } = useServiceChargeEnabled();
  const { data: locationSettings = [] } = useServiceChargeLocations();
  const { data: liveRoleRates = [] } = useServiceChargeRoleRates();
  const { data: liveEmpRates = [] } = useServiceChargeEmployeeRates();
  const { data: employees = [] } = useEmployees();
  const { data: locations = [] } = useLocationSettings();

  // Input state
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [locationFilter, setLocationFilter] = useState("all");
  const [pool, setPool] = useState(1000);
  const [modelA, setModelA] = useState<DistributionModel>("equal_by_hours");
  const [modelB, setModelB] = useState<DistributionModel>("fixed_role");
  const [showCompare, setShowCompare] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [rulesExpanded, setRulesExpanded] = useState(false);

  // Sim role/employee overrides (start from live)
  const [simRoleRates, setSimRoleRates] = useState<{ role_name: string; rate_per_hour: number }[]>([]);
  const [simEmpRates, setSimEmpRates] = useState<{ employee_id: string; custom_rate_per_hour: number }[]>([]);

  // Initialize overrides from live on first render
  useMemo(() => {
    if (simRoleRates.length === 0 && liveRoleRates.length > 0) {
      setSimRoleRates(liveRoleRates.filter((r) => r.is_active).map((r) => ({
        role_name: r.role_name,
        rate_per_hour: Number(r.rate_per_hour),
      })));
    }
    if (simEmpRates.length === 0 && liveEmpRates.length > 0) {
      setSimEmpRates(liveEmpRates.filter((r) => r.is_active).map((r) => ({
        employee_id: r.employee_id,
        custom_rate_per_hour: Number(r.custom_rate_per_hour),
      })));
    }
  }, [liveRoleRates, liveEmpRates]);

  // Fetch timesheet hours for the date range
  const { data: timesheetData = [], isLoading: loadingHours } = useQuery({
    queryKey: ["sc-preview-hours", tenantId, startDate, endDate],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("time_entries")
        .select("employee_id, branch, total_hours, status")
        .eq("tenant_id", tenantId)
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .in("status", ["approved", "pending"]);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  // Aggregate hours per employee+branch
  const employeeHours: EmployeeHoursRow[] = useMemo(() => {
    const map = new Map<string, EmployeeHoursRow>();
    for (const entry of timesheetData) {
      const emp = employees.find((e: any) => e.id === entry.employee_id);
      if (!emp) continue;
      const key = `${entry.employee_id}-${entry.branch}`;
      const existing = map.get(key);
      if (existing) {
        existing.hoursWorked += Number(entry.total_hours || 0);
      } else {
        map.set(key, {
          employee: emp,
          branch: entry.branch || "Unknown",
          hoursWorked: Number(entry.total_hours || 0),
          role: (emp as any).department || "Staff",
        });
      }
    }
    return Array.from(map.values());
  }, [timesheetData, employees]);

  // Run simulations
  const resultA = useMemo(() => {
    const input: SimulationInput = {
      pool,
      model: modelA,
      locationFilter,
      companyEnabled,
      roleRates: simRoleRates,
      employeeRates: simEmpRates,
    };
    return runSimulation(input, employeeHours, locationSettings);
  }, [pool, modelA, locationFilter, companyEnabled, simRoleRates, simEmpRates, employeeHours, locationSettings]);

  const resultB = useMemo(() => {
    if (!showCompare) return null;
    const input: SimulationInput = {
      pool,
      model: modelB,
      locationFilter,
      companyEnabled,
      roleRates: simRoleRates,
      employeeRates: simEmpRates,
    };
    return runSimulation(input, employeeHours, locationSettings);
  }, [pool, modelB, locationFilter, companyEnabled, simRoleRates, simEmpRates, employeeHours, locationSettings, showCompare]);

  const comparison = useMemo(() => {
    if (!resultB) return null;
    return compareScenarios(resultA, resultB);
  }, [resultA, resultB]);

  // Save mutations
  const upsertLocation = useUpsertServiceChargeLocation();
  const saveRoleRate = useSaveRoleRate();
  const saveEmpRate = useSaveEmployeeRate();

  const handleApply = async () => {
    try {
      // Save role rates
      for (const rr of simRoleRates) {
        await saveRoleRate.mutateAsync({
          role_name: rr.role_name,
          rate_per_hour: rr.rate_per_hour,
          effective_from: format(new Date(), "yyyy-MM-dd"),
          is_active: true,
        });
      }
      // Save employee rates
      for (const er of simEmpRates) {
        await saveEmpRate.mutateAsync({
          employee_id: er.employee_id,
          custom_rate_per_hour: er.custom_rate_per_hour,
          effective_from: format(new Date(), "yyyy-MM-dd"),
          is_active: true,
        });
      }
      // Audit log
      if (tenantId) {
        await supabase.from("audit_log").insert({
          tenant_id: tenantId,
          table_name: "service_charge_config",
          action: "UPDATE" as any,
          old_data: { roleRates: liveRoleRates.map((r) => ({ role: r.role_name, rate: r.rate_per_hour })), empRates: liveEmpRates.map((r) => ({ emp: r.employee_id, rate: r.custom_rate_per_hour })) },
          new_data: { roleRates: simRoleRates, empRates: simEmpRates, model: modelA },
          record_id: tenantId,
        });
      }
      toast.success("Service charge configuration applied.");
      setShowApplyDialog(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to apply configuration.");
    }
  };

  const uniqueBranches = useMemo(() => {
    const set = new Set(employeeHours.map((r) => r.branch));
    return Array.from(set);
  }, [employeeHours]);

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Service Charge Preview
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simulate distribution before applying to payroll. Read-only until you choose to save.
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
            {showCompare ? "Hide Compare" : "Compare Scenarios"}
          </Button>
        </div>
      </div>

      {/* ─── Inputs ─── */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">End Date</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All locations</SelectItem>
                  {locations.map((l: any) => (
                    <SelectItem key={l.branch} value={l.branch} className="text-xs">{l.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">SC Pool (£)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-8 text-xs"
                value={pool}
                onChange={(e) => setPool(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className={`grid gap-3 ${showCompare ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {showCompare ? "Scenario A — Model" : "Distribution Model"}
              </Label>
              <Select value={modelA} onValueChange={(v) => setModelA(v as DistributionModel)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showCompare && (
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Scenario B — Model</Label>
                <Select value={modelB} onValueChange={(v) => setModelB(v as DistributionModel)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Collapsible rule overrides */}
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setRulesExpanded(!rulesExpanded)}
          >
            {rulesExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {rulesExpanded ? "Hide rule overrides" : "Show rule overrides (role & employee rates)"}
          </button>

          {rulesExpanded && (
            <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Role Rates</p>
                <div className="space-y-1.5">
                  {simRoleRates.map((rr, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        className="h-7 text-xs flex-1"
                        value={rr.role_name}
                        onChange={(e) => {
                          const copy = [...simRoleRates];
                          copy[i] = { ...rr, role_name: e.target.value };
                          setSimRoleRates(copy);
                        }}
                        placeholder="Role"
                      />
                      <Input
                        className="h-7 text-xs w-24"
                        type="number"
                        step="0.01"
                        value={rr.rate_per_hour}
                        onChange={(e) => {
                          const copy = [...simRoleRates];
                          copy[i] = { ...rr, rate_per_hour: parseFloat(e.target.value) || 0 };
                          setSimRoleRates(copy);
                        }}
                        placeholder="£/hr"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setSimRoleRates(simRoleRates.filter((_, j) => j !== i))}
                      >×</Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => setSimRoleRates([...simRoleRates, { role_name: "", rate_per_hour: 0 }])}
                  >+ Add Role Rate</Button>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Employee Overrides</p>
                <div className="space-y-1.5">
                  {simEmpRates.map((er, i) => {
                    const emp = employees.find((e: any) => e.id === er.employee_id);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <Select
                          value={er.employee_id}
                          onValueChange={(v) => {
                            const copy = [...simEmpRates];
                            copy[i] = { ...er, employee_id: v };
                            setSimEmpRates(copy);
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Employee" /></SelectTrigger>
                          <SelectContent>
                            {employees.filter((e: any) => e.status === "active").map((e: any) => (
                              <SelectItem key={e.id} value={e.id} className="text-xs">{e.forename} {e.surname}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="h-7 text-xs w-24"
                          type="number"
                          step="0.01"
                          value={er.custom_rate_per_hour}
                          onChange={(e) => {
                            const copy = [...simEmpRates];
                            copy[i] = { ...er, custom_rate_per_hour: parseFloat(e.target.value) || 0 };
                            setSimEmpRates(copy);
                          }}
                          placeholder="£/hr"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setSimEmpRates(simEmpRates.filter((_, j) => j !== i))}
                        >×</Button>
                      </div>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => setSimEmpRates([...simEmpRates, { employee_id: "", custom_rate_per_hour: 0 }])}
                  >+ Add Employee Override</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {loadingHours && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Loading timesheet data…</span>
        </div>
      )}

      {/* ─── Warnings ─── */}
      {resultA.warnings.length > 0 && (
        <div className="space-y-2">
          {resultA.warnings.map((w, i) => (
            <WarningAlert key={i} warning={w} />
          ))}
        </div>
      )}

      {/* ─── Results ─── */}
      {!loadingHours && !showCompare && <PreviewTable result={resultA} label="Preview" />}

      {!loadingHours && showCompare && comparison && resultB && (
        <Tabs defaultValue="side-by-side" className="space-y-3">
          <TabsList className="h-8">
            <TabsTrigger value="side-by-side" className="text-xs">Side-by-Side</TabsTrigger>
            <TabsTrigger value="scenario-a" className="text-xs">Scenario A</TabsTrigger>
            <TabsTrigger value="scenario-b" className="text-xs">Scenario B</TabsTrigger>
          </TabsList>

          <TabsContent value="side-by-side">
            <ComparisonTable
              comparison={comparison}
              totalA={resultA.totalDistributed}
              totalB={resultB.totalDistributed}
              pool={pool}
            />
          </TabsContent>
          <TabsContent value="scenario-a">
            <PreviewTable result={resultA} label="Scenario A" />
          </TabsContent>
          <TabsContent value="scenario-b">
            <PreviewTable result={resultB} label="Scenario B" />
          </TabsContent>
        </Tabs>
      )}

      {/* ─── Actions ─── */}
      {!loadingHours && resultA.rows.length > 0 && (
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowApplyDialog(true)}>
            <Save className="h-3.5 w-3.5 mr-1" />
            Apply Configuration
          </Button>
        </div>
      )}

      {/* Apply confirmation dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Apply Service Charge Configuration</DialogTitle>
            <DialogDescription className="text-xs">
              This will update live service charge rules for future payroll calculations. Existing approved payroll periods will not be affected.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border p-3 space-y-1 text-xs">
            <p><span className="font-medium">Model:</span> {MODELS.find((m) => m.value === modelA)?.label}</p>
            <p><span className="font-medium">Role rates:</span> {simRoleRates.length} configured</p>
            <p><span className="font-medium">Employee overrides:</span> {simEmpRates.length} configured</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowApplyDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleApply}>
              <Save className="h-3.5 w-3.5 mr-1" />
              Confirm & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Sub-components ─── */

function WarningAlert({ warning }: { warning: PreviewWarning }) {
  const icon = warning.type === "error" ? <XCircle className="h-4 w-4" /> :
    warning.type === "warning" ? <AlertTriangle className="h-4 w-4" /> :
      <Info className="h-4 w-4" />;
  const variant = warning.type === "error" ? "destructive" : "default";

  return (
    <Alert variant={variant} className="py-2">
      {icon}
      <AlertDescription className="text-xs ml-2">{warning.message}</AlertDescription>
    </Alert>
  );
}

function PreviewTable({ result, label }: { result: PreviewResult; label: string }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{label} Results</CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              <Users className="h-3 w-3 inline mr-1" />{result.employeeCount} employees
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-3">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 px-4 mb-3">
          <SummaryPill label="Pool" value={`£${result.totalPool.toFixed(2)}`} />
          <SummaryPill label="Distributed" value={`£${result.totalDistributed.toFixed(2)}`} accent={result.totalDistributed > result.totalPool} />
          <SummaryPill label="Remainder" value={`£${result.remainder.toFixed(2)}`} />
        </div>

        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Employee</TableHead>
                <TableHead className="text-[10px]">Location</TableHead>
                <TableHead className="text-[10px] text-right">Hours</TableHead>
                <TableHead className="text-[10px]">Role</TableHead>
                <TableHead className="text-[10px] text-right">SC Amount</TableHead>
                <TableHead className="text-[10px]">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row) => (
                <TableRow key={`${row.employeeId}-${row.branch}`}>
                  <TableCell className="text-xs font-medium py-2">{row.employeeName}</TableCell>
                  <TableCell className="text-xs py-2">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{row.branch}</span>
                  </TableCell>
                  <TableCell className="text-xs text-right py-2">{row.hoursWorked.toFixed(1)}</TableCell>
                  <TableCell className="text-xs py-2">{row.role}</TableCell>
                  <TableCell className="text-xs text-right font-semibold py-2">£{row.serviceChargeAmount.toFixed(2)}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className={`text-[9px] ${SOURCE_COLORS[row.calculationSource] || ""}`}>
                      {row.calculationSource}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {result.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                    No data to display.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonTable({ comparison, totalA, totalB, pool }: {
  comparison: ComparisonRow[];
  totalA: number;
  totalB: number;
  pool: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm">Scenario Comparison</CardTitle>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <SummaryPill label="Pool" value={`£${pool.toFixed(2)}`} />
          <SummaryPill label="Scenario A" value={`£${totalA.toFixed(2)}`} />
          <SummaryPill label="Scenario B" value={`£${totalB.toFixed(2)}`} />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-3">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Employee</TableHead>
                <TableHead className="text-[10px] text-right">Scenario A</TableHead>
                <TableHead className="text-[10px] text-right">Scenario B</TableHead>
                <TableHead className="text-[10px] text-right">Difference</TableHead>
                <TableHead className="text-[10px]">A Source</TableHead>
                <TableHead className="text-[10px]">B Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((row) => (
                <TableRow key={row.employeeId}>
                  <TableCell className="text-xs font-medium py-2">{row.employeeName}</TableCell>
                  <TableCell className="text-xs text-right py-2">£{row.amountA.toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-right py-2">£{row.amountB.toFixed(2)}</TableCell>
                  <TableCell className={`text-xs text-right font-semibold py-2 ${row.diff > 0 ? "text-green-600 dark:text-green-400" : row.diff < 0 ? "text-destructive" : ""}`}>
                    {row.diff > 0 ? "+" : ""}£{row.diff.toFixed(2)}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className={`text-[9px] ${SOURCE_COLORS[row.sourceA] || ""}`}>{row.sourceA}</Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className={`text-[9px] ${SOURCE_COLORS[row.sourceB] || ""}`}>{row.sourceB}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${accent ? "border-destructive bg-destructive/5" : "border-border bg-muted/30"}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${accent ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
