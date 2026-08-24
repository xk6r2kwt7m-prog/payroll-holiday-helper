import { useState, useEffect, useMemo } from "react";
import { UserPlus, FileSpreadsheet, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreatePayrollEntry } from "@/hooks/usePayroll";
import { useTenant } from "@/hooks/useTenant";
import { calculateAccrual, useLeaveRules } from "@/hooks/useLeaveRules";
import { isRelevantToPayrollPeriod, isStarterInPeriod } from "@/lib/employee-period-relevance";
import { getEntryDefaultsFromTerms } from "@/lib/payroll-rate-source";
import { departmentForLocation } from "@/lib/payroll-timesheet-csv";
import { usePayrollImportAliases } from "@/hooks/usePayrollImportAliases";
import {
  usePeriodTimesheetSource,
  resolveEmployeeTimesheetHours,
  type EmployeeTimesheetHours,
} from "@/hooks/usePeriodTimesheetSource";

interface AddEmployeeToPeriodDialogProps {
  periodId: string;
  existingEmployeeIds: string[];
  periodStart?: string | null;
  periodEnd?: string | null;
  priorPeriodEmployeeIds?: Set<string>;
}

interface Prefill {
  hourlyRate: number;
  serviceCharge: number;
  rateSource: "terms" | "profile_fallback";
  department: string | null;
  timesheet: EmployeeTimesheetHours | null;
  holidayAccrued: number;
}

export function AddEmployeeToPeriodDialog({
  periodId,
  existingEmployeeIds,
  periodStart,
  periodEnd,
  priorPeriodEmployeeIds,
}: AddEmployeeToPeriodDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [loadingPrefill, setLoadingPrefill] = useState(false);

  const { data: employees = [] } = useEmployees();
  const { data: allEmployees = [] } = useEmployees(true);
  const createEntry = useCreatePayrollEntry();
  const { tenantId } = useTenant();
  const { data: leaveRules } = useLeaveRules();
  const queryClient = useQueryClient();
  const { activeAliases } = usePayrollImportAliases();
  const { data: timesheetSource, isLoading: loadingTimesheet } = usePeriodTimesheetSource(
    open ? periodId : null,
  );

  // Show employees relevant to the selected period (excludes former
  // employees whose end_date is before the period start, unless they have
  // current-period activity). We don't have entries here, so we let the
  // helper apply status + end_date rules.
  const period = periodStart && periodEnd ? { start_date: periodStart, end_date: periodEnd } : null;
  const availableEmployees = employees.filter((emp) => {
    if (existingEmployeeIds.includes(emp.id)) return false;
    if (!period) return emp.status === "active" || emp.status === "starter";
    return isRelevantToPayrollPeriod(emp as any, period);
  });

  const matchPool = useMemo(
    () => (allEmployees.length > 0 ? allEmployees : employees) as any[],
    [allEmployees, employees],
  );

  // Pull everything already recorded for this employee in this period:
  // timesheet hours from the period's source file, rate / service charge /
  // department from active employment terms (profile as fallback), and the
  // resulting holiday accrual.
  useEffect(() => {
    if (!open || !selectedEmployeeId || !tenantId) {
      setPrefill(null);
      return;
    }
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;

    let cancelled = false;
    setLoadingPrefill(true);
    (async () => {
      try {
        const defaults = await getEntryDefaultsFromTerms(
          tenantId,
          emp.id,
          periodStart || new Date().toISOString().slice(0, 10),
          { id: emp.id, hourly_rate: emp.hourly_rate, service_charge: emp.service_charge, department: emp.department },
        );
        const timesheet = resolveEmployeeTimesheetHours(
          timesheetSource,
          emp.id,
          matchPool,
          activeAliases as any,
        );
        if (cancelled) return;
        setPrefill({
          hourlyRate: defaults.hourly_rate || 0,
          serviceCharge: defaults.service_charge || 0,
          rateSource: defaults.source,
          department: defaults.department,
          timesheet,
          holidayAccrued: timesheet ? calculateAccrual(timesheet.hours, leaveRules?.accrualRate ?? 0.1207, leaveRules?.roundingPrecision) : 0,
        });
      } catch (err: any) {
        if (!cancelled) {
          setPrefill(null);
          toast.error(`Could not load payroll details: ${err?.message || "unknown error"}`);
        }
      } finally {
        if (!cancelled) setLoadingPrefill(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, selectedEmployeeId, tenantId, periodStart, timesheetSource, matchPool, activeAliases, employees]);

  const handleAdd = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    if (!tenantId) {
      toast.error("No tenant context available");
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;

    // Check duplicate (defensive — UI already filters, but handles race conditions)
    if (existingEmployeeIds.includes(emp.id)) {
      toast.error("This employee is already in this payroll period.");
      return;
    }

    const hours = prefill?.timesheet?.hours ?? 0;
    const rate = prefill?.hourlyRate ?? Number(emp.hourly_rate ?? 0);
    const sc = prefill?.serviceCharge ?? Number(emp.service_charge ?? 0);
    const holidayAccrued = prefill?.holidayAccrued ?? 0;

    const locationList = prefill?.timesheet?.locations ?? [];
    const locNotes = locationList.length > 1
      ? `Hours by location: ${locationList.map((l) => `${l.name}: ${l.hours.toFixed(2)}h`).join(" | ")}`
      : locationList.length === 1
        ? `Location: ${locationList[0].name}`
        : "";
    const sourceNote = prefill?.timesheet
      ? ` [Hours pulled from period timesheet${prefill.timesheet.fileName ? `: ${prefill.timesheet.fileName}` : ""}]`
      : "";
    const rateNote = rate === 0 ? " [⚠ rate missing — set before approval]" : "";

    try {
      const created: any = await createEntry.mutateAsync({
        payroll_period_id: periodId,
        employee_id: emp.id,
        tenant_id: tenantId,
        hourly_rate: rate,
        service_charge: sc,
        timesheet_hours: hours,
        imported_hours: prefill?.timesheet ? hours : null,
        holiday_accrued_hours: holidayAccrued,
        performance_bonus: 0,
        special_bonus: 0,
        total_pay: hours * rate + hours * sc,
        notes: `${locNotes}${sourceNote}${rateNote} [Added to period]`.trim(),
      } as any);

      // Mirror the per-location split so reports/PDF breakdowns stay consistent
      if (created?.id && locationList.length > 0) {
        const rows = locationList.map((l) => ({
          payroll_entry_id: created.id,
          payroll_period_id: periodId,
          employee_id: emp.id,
          location_name: l.name,
          department: departmentForLocation(l.name) || prefill?.department || null,
          hours: l.hours,
          imported_source: "csv_import",
          tenant_id: tenantId,
        }));
        const { error: locError } = await supabase.from("payroll_entry_locations").insert(rows as any);
        if (locError) console.error("Location split insert error:", locError);
        queryClient.invalidateQueries({ queryKey: ["payroll_entry_locations"] });
      }

      toast.success(
        hours > 0
          ? `${emp.forename} ${emp.surname} added with ${hours.toFixed(2)}h from the period timesheet`
          : `${emp.forename} ${emp.surname} added to this payroll period`,
      );
      setSelectedEmployeeId("");
      setPrefill(null);
      setOpen(false);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists")) {
        toast.error("This employee is already in this payroll period.");
      } else if (msg.includes("row-level security")) {
        toast.error("Permission denied. You may not have access to add employees to this period.");
      } else if (msg.includes("locked")) {
        toast.error("This payroll period is locked. Reopen it first.");
      } else {
        toast.error(`Failed to add employee: ${msg || "Unknown error"}`);
      }
    }
  };

  const busy = loadingPrefill || loadingTimesheet;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={availableEmployees.length === 0}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Employee to Period
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-sm text-muted-foreground">
              Everything already recorded for this period is pulled in automatically — timesheet
              hours from the imported file, current pay rate, service charge, department and the
              resulting holiday accrual.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((emp) => {
                  const starterHere = period
                    ? isStarterInPeriod(emp as any, period, priorPeriodEmployeeIds)
                    : false;
                  return (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.forename} {emp.surname} — {emp.department}
                      {starterHere ? " (Starter)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {availableEmployees.length === 0 && (
              <p className="text-xs text-muted-foreground">All active employees are already in this period.</p>
            )}
          </div>

          {selectedEmployeeId && (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              {busy ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reading period timesheet and pay details…
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Timesheet hours (this period)</span>
                    <span className="font-medium">
                      {prefill?.timesheet ? `${prefill.timesheet.hours.toFixed(2)}h` : "0.00h"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hourly rate</span>
                    <span className="font-medium">£{(prefill?.hourlyRate ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Service charge</span>
                    <span className="font-medium">£{(prefill?.serviceCharge ?? 0).toFixed(2)}/h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{prefill?.department || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Holiday accrued (12.07%)</span>
                    <span className="font-medium">{(prefill?.holidayAccrued ?? 0).toFixed(2)}h</span>
                  </div>

                  {prefill?.timesheet && prefill.timesheet.locations.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      {prefill.timesheet.locations
                        .map((l) => `${l.name}: ${l.hours.toFixed(2)}h`)
                        .join(" · ")}
                    </p>
                  )}

                  {prefill?.timesheet ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileSpreadsheet className="h-3 w-3" />
                      Source: {prefill.timesheet.fileName || "imported timesheet"}
                      {prefill.timesheet.matchMethod !== "exact" && prefill.timesheet.matchMethod !== "none" && (
                        <Badge variant="outline" className="ml-1">
                          matched via {prefill.timesheet.matchMethod.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      No timesheet rows found for this employee in this period — hours start at 0 and
                      can be entered on the payroll table.
                    </p>
                  )}

                  {prefill?.rateSource === "profile_fallback" && (
                    <p className="text-xs text-muted-foreground">
                      Rate taken from the employee profile (no active employment terms for this period).
                    </p>
                  )}
                  {prefill?.hourlyRate === 0 && (
                    <p className="text-xs text-destructive">
                      No hourly rate on record — set it before approving this period.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedEmployeeId || busy || createEntry.isPending}>
            {createEntry.isPending ? "Adding..." : "Add to Period"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
