import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportFilters } from "./ReportFilters";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useBranchLocations } from "@/hooks/useSchedule";
import { useEmployees } from "@/hooks/useEmployees";
import { exportToCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";

export function AttendanceReport() {
  const [branch, setBranch] = useState("all");
  const [dept, setDept] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));

  const startStr = dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined;
  const endStr = dateTo ? format(dateTo, "yyyy-MM-dd") : undefined;

  const { data: entries = [], isLoading } = useTimeEntries(startStr, endStr, undefined, branch !== "all" ? branch : undefined);
  const { data: branches } = useBranchLocations();
  const { data: employees } = useEmployees();

  const departments = useMemo(() => {
    if (!employees) return [];
    return [...new Set(employees.map((e) => e.department))].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    let list = entries as any[];
    if (dept !== "all") list = list.filter((e: any) => e.employees?.department === dept);
    return list;
  }, [entries, dept]);

  const handleExport = () => {
    exportToCsv("attendance_report", [
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
          showDateRange
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onExport={handleExport}
          exportDisabled={filtered.length === 0}
          rowCount={filtered.length}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Clock} title="No timesheet entries" description="Adjust filters or date range to find records." compact />
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
