import { useState, useMemo, useCallback } from "react";
import { MapPin, Plus, Pencil, Check, CheckSquare, Square } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportFilters } from "./ReportFilters";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { useTimeEntries, useApproveTimeEntries } from "@/hooks/useTimeEntries";
import { useBranchLocations } from "@/hooks/useSchedule";
import { useEmployees } from "@/hooks/useEmployees";
import { useManagerScope } from "@/hooks/useManagerScope";
import { exportToCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";
import { ManagerTimesheetDialog } from "@/components/attendance/ManagerTimesheetDialog";
import { computeFlags } from "@/components/attendance/TimesheetReviewPanel";
import { toast } from "sonner";

/** Check if an entry is "clean" — pending with no blocking flags */
function isCleanPending(entry: any): boolean {
  if (entry.status !== "pending") return false;
  if (!entry.clock_out_time) return false;
  if (entry.total_hours == null || entry.total_hours <= 0) return false;
  const flags = computeFlags(entry);
  const hasBlockingFlag = flags.some(f => f.severity === "error");
  return !hasBlockingFlag;
}

export function AttendanceReport() {
  const [branch, setBranch] = useState("all");
  const [dept, setDept] = useState("all");
  const [empId, setEmpId] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const startStr = dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined;
  const endStr = dateTo ? format(dateTo, "yyyy-MM-dd") : undefined;

  const { data: entries = [], isLoading } = useTimeEntries(startStr, endStr, undefined, branch !== "all" ? branch : undefined);
  const { data: branches } = useBranchLocations();
  const { data: employees = [] } = useEmployees();
  const { filterByScope, filterEmployees } = useManagerScope();
  const approveEntries = useApproveTimeEntries();

  const scopedEmployees = useMemo(() => filterEmployees(employees), [employees, filterEmployees]);

  const departments = useMemo(() => {
    return [...new Set(scopedEmployees.map((e) => e.department))].sort();
  }, [scopedEmployees]);

  const employeeOptions = useMemo(() => {
    let list = scopedEmployees;
    if (dept !== "all") list = list.filter((e) => e.department === dept);
    return list.map((e) => ({ id: e.id, forename: e.forename, surname: e.surname, department: e.department }));
  }, [scopedEmployees, dept]);

  const filtered = useMemo(() => {
    let list = filterByScope(entries as any[], (e: any) => e.employee_id);
    if (dept !== "all") list = list.filter((e: any) => e.employees?.department === dept);
    if (empId !== "all") list = list.filter((e: any) => e.employee_id === empId);
    return list;
  }, [entries, dept, empId, filterByScope]);

  const selectedEmpName = useMemo(() => {
    if (empId === "all") return undefined;
    const e = employees.find((x) => x.id === empId);
    return e ? `${e.forename} ${e.surname}` : undefined;
  }, [empId, employees]);

  // Pending entries eligible for approval
  const pendingEntries = useMemo(() => filtered.filter((e: any) => e.status === "pending"), [filtered]);
  const cleanPendingEntries = useMemo(() => filtered.filter(isCleanPending), [filtered]);

  // Selection helpers
  const displayedIds = useMemo(() => new Set(filtered.slice(0, 200).filter((e: any) => e.status === "pending").map((e: any) => e.id)), [filtered]);
  const allPendingSelected = displayedIds.size > 0 && [...displayedIds].every(id => selectedIds.has(id));

  const toggleId = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedIds));
    }
  }, [allPendingSelected, displayedIds]);

  const handleApproveSelected = async () => {
    const ids = [...selectedIds].filter(id => {
      const entry = filtered.find((e: any) => e.id === id);
      return entry && entry.status === "pending";
    });
    if (ids.length === 0) { toast.error("No pending entries selected"); return; }

    try {
      const result = await approveEntries.mutateAsync({ entryIds: ids, mode: "approve_batch_selected" });
      const skipped = selectedIds.size - ids.length;
      toast.success(`${result.approved} approved${skipped > 0 ? `, ${skipped} skipped (not pending)` : ""}`);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleApproveCleanDaily = async () => {
    const cleanIds = cleanPendingEntries.map((e: any) => e.id);
    if (cleanIds.length === 0) { toast.error("No clean pending entries to approve"); return; }

    try {
      const result = await approveEntries.mutateAsync({ entryIds: cleanIds, mode: "approve_batch_daily" });
      const skipped = pendingEntries.length - cleanIds.length;
      toast.success(`${result.approved} approved, ${skipped} held for review`);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleExport = () => {
    const dateStr = format(new Date(), "yyyyMMdd");
    exportToCsv(`attendance_report_${dateStr}`, [
      { header: "Employee", accessor: (r: any) => `${r.employees?.forename || ""} ${r.employees?.surname || ""}` },
      { header: "Department", accessor: (r: any) => r.employees?.department },
      { header: "Branch", accessor: (r: any) => r.branch },
      { header: "Date", accessor: (r: any) => r.clock_in_time ? format(new Date(r.clock_in_time), "yyyy-MM-dd") : "" },
      { header: "Clock In", accessor: (r: any) => r.clock_in_time ? format(new Date(r.clock_in_time), "HH:mm") : "" },
      { header: "Clock Out", accessor: (r: any) => r.clock_out_time ? format(new Date(r.clock_out_time), "HH:mm") : "" },
      { header: "Total Hours", accessor: (r: any) => r.total_hours },
      { header: "Break (min)", accessor: (r: any) => r.break_minutes },
      { header: "Status", accessor: (r: any) => r.status },
      { header: "Scheduled Start", accessor: (r: any) => r.scheduled_start },
      { header: "Scheduled End", accessor: (r: any) => r.scheduled_end },
      { header: "Clock-in Lat", accessor: (r: any) => r.clock_in_latitude },
      { header: "Clock-in Lng", accessor: (r: any) => r.clock_in_longitude },
      { header: "Clock-in Geofence", accessor: (r: any) => r.clock_in_within_geofence == null ? "" : r.clock_in_within_geofence ? "Yes" : "No" },
      { header: "Clock-out Lat", accessor: (r: any) => r.clock_out_latitude },
      { header: "Clock-out Lng", accessor: (r: any) => r.clock_out_longitude },
      { header: "Clock-out Geofence", accessor: (r: any) => r.clock_out_within_geofence == null ? "" : r.clock_out_within_geofence ? "Yes" : "No" },
      { header: "Override", accessor: (r: any) => r.manager_override ? "Yes" : "No" },
      { header: "Manager Adjusted", accessor: (r: any) => r.manager_adjusted ? "Yes" : "No" },
      { header: "Adjustment Reason", accessor: (r: any) => r.adjustment_reason || "" },
    ], filtered);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Attendance & Timesheet Export</CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add timesheet
          </Button>
        </div>
        <ReportFilters
          branches={branches}
          selectedBranch={branch}
          onBranchChange={setBranch}
          departments={departments}
          selectedDepartment={dept}
          onDepartmentChange={setDept}
          employees={employeeOptions}
          selectedEmployeeId={empId}
          onEmployeeChange={setEmpId}
          showDateRange
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onExport={handleExport}
          exportDisabled={filtered.length === 0}
          rowCount={filtered.length}
        />
        {!isLoading && (
          <ReportSummaryBar
            rowCount={filtered.length}
            branch={branch}
            department={dept}
            employeeName={selectedEmpName}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        )}

        {/* Batch approval toolbar */}
        {pendingEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border mt-2">
            <p className="text-xs text-muted-foreground mr-auto">
              {pendingEntries.length} pending · {cleanPendingEntries.length} clean
              {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
            </p>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={handleApproveSelected}
                disabled={approveEntries.isPending}
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Approve selected ({selectedIds.size})
              </Button>
            )}
            {cleanPendingEntries.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleApproveCleanDaily}
                disabled={approveEntries.isPending}
              >
                <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                Approve all clean ({cleanPendingEntries.length})
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Clock} title="No timesheet entries" description="No records match your filters. Adjust filters or expand the date range." compact />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={allPendingSelected && displayedIds.size > 0}
                      onCheckedChange={toggleAll}
                      aria-label="Select all pending"
                    />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Dept</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((e: any) => {
                  const isPending = e.status === "pending";
                  return (
                    <TableRow key={e.id} className={selectedIds.has(e.id) ? "bg-primary/5" : undefined}>
                      <TableCell className="w-8">
                        {isPending ? (
                          <Checkbox
                            checked={selectedIds.has(e.id)}
                            onCheckedChange={() => toggleId(e.id)}
                            aria-label={`Select entry for ${e.employees?.forename}`}
                          />
                        ) : (
                          <span className="block w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        <span>{e.employees?.forename} {e.employees?.surname}</span>
                        {e.manager_adjusted && (
                          <Badge variant="outline" className="ml-1.5 text-[9px] text-warning border-warning/30">
                            <Pencil className="h-2.5 w-2.5 mr-0.5" />Adjusted
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{e.employees?.department}</TableCell>
                      <TableCell className="text-xs">{e.clock_in_time ? format(new Date(e.clock_in_time), "d MMM") : "–"}</TableCell>
                      <TableCell className="text-xs">{e.clock_in_time ? format(new Date(e.clock_in_time), "HH:mm") : "–"}</TableCell>
                      <TableCell className="text-xs">{e.clock_out_time ? format(new Date(e.clock_out_time), "HH:mm") : "–"}</TableCell>
                      <TableCell className="text-xs font-medium">{e.total_hours ?? "–"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {e.clock_in_latitude ? (
                          <div className="flex items-center gap-1">
                            <MapPin className={cn("h-3 w-3", e.clock_in_within_geofence === false ? "text-destructive" : "text-success")} />
                            <span className="text-[10px] text-muted-foreground">
                              {e.clock_in_within_geofence === false ? "Outside" : "OK"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No GPS</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", {
                          "text-warning border-warning/30": e.status === "pending",
                          "text-success border-success/30": e.status === "approved",
                          "text-destructive border-destructive/30": e.status === "rejected",
                          "text-primary border-primary/30": e.status === "clocked_in",
                        })}>{e.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length > 200 && (
              <p className="text-xs text-muted-foreground text-center mt-2">Showing 200 of {filtered.length} rows. Export CSV for full data.</p>
            )}
          </div>
        )}
      </CardContent>

      <ManagerTimesheetDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </Card>
  );
}
