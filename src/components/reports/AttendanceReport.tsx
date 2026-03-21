import { useState, useMemo } from "react";
import { MapPin } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportFilters } from "./ReportFilters";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useBranchLocations } from "@/hooks/useSchedule";
import { useEmployees } from "@/hooks/useEmployees";
import { useManagerScope } from "@/hooks/useManagerScope";
import { exportToCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";

export function AttendanceReport() {
  const [branch, setBranch] = useState("all");
  const [dept, setDept] = useState("all");
  const [empId, setEmpId] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));

  const startStr = dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined;
  const endStr = dateTo ? format(dateTo, "yyyy-MM-dd") : undefined;

  const { data: entries = [], isLoading } = useTimeEntries(startStr, endStr, undefined, branch !== "all" ? branch : undefined);
  const { data: branches } = useBranchLocations();
  const { data: employees = [] } = useEmployees();
  const { filterByScope, filterEmployees } = useManagerScope();

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
      { header: "Override", accessor: (r: any) => r.manager_override ? "Yes" : "No" },
    ], filtered);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Attendance & Timesheet Export</CardTitle>
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
                {filtered.slice(0, 200).map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-xs">{e.employees?.forename} {e.employees?.surname}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">{e.employees?.department}</TableCell>
                    <TableCell className="text-xs">{e.clock_in_time ? format(new Date(e.clock_in_time), "d MMM") : "–"}</TableCell>
                    <TableCell className="text-xs">{e.clock_in_time ? format(new Date(e.clock_in_time), "HH:mm") : "–"}</TableCell>
                    <TableCell className="text-xs">{e.clock_out_time ? format(new Date(e.clock_out_time), "HH:mm") : "–"}</TableCell>
                    <TableCell className="text-xs font-medium">{e.total_hours ?? "–"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", {
                        "text-warning border-warning/30": e.status === "pending",
                        "text-success border-success/30": e.status === "approved",
                        "text-destructive border-destructive/30": e.status === "rejected",
                        "text-primary border-primary/30": e.status === "clocked_in",
                      })}>{e.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length > 200 && (
              <p className="text-xs text-muted-foreground text-center mt-2">Showing 200 of {filtered.length} rows. Export CSV for full data.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
