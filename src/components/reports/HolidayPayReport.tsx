import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { useHolidayPayments } from "@/hooks/useHolidays";
import { useEmployees } from "@/hooks/useEmployees";
import { useManagerScope } from "@/hooks/useManagerScope";
import { exportToCsv } from "@/lib/csv-export";
import { ReportFilters } from "./ReportFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palmtree } from "lucide-react";

export function HolidayPayReport() {
  const [periodId, setPeriodId] = useState("all");
  const [empId, setEmpId] = useState("all");

  const { data: periods = [] } = usePayrollPeriods();
  const { data: holidayPayments = [], isLoading } = useHolidayPayments(periodId !== "all" ? periodId : undefined);
  const { data: employees = [] } = useEmployees();
  const { filterEmployees } = useManagerScope();

  const scopedEmployees = useMemo(() => filterEmployees(employees), [employees, filterEmployees]);
  const scopedIds = useMemo(() => new Set(scopedEmployees.map((e) => e.id)), [scopedEmployees]);

  const employeeOptions = useMemo(() => {
    return scopedEmployees.map((e) => ({ id: e.id, forename: e.forename, surname: e.surname, department: e.department }));
  }, [scopedEmployees]);

  const rows = useMemo(() => {
    let list = (holidayPayments as any[]).filter((h) => !h.employee_id || scopedIds.has(h.employee_id));
    if (empId !== "all") list = list.filter((h) => h.employee_id === empId);
    return list;
  }, [holidayPayments, empId, scopedIds]);

  const handleExport = () => {
    exportToCsv("holiday_pay_report", [
      { header: "Employee", accessor: (r: any) => r.employee_name || `${r.employees?.forename || ""} ${r.employees?.surname || ""}`.trim() },
      { header: "Payroll Period", accessor: (r: any) => r.payroll_periods?.period_name || "" },
      { header: "Holiday Taken Date", accessor: (r: any) => r.holiday_taken_date || "" },
      { header: "Hours", accessor: (r: any) => r.hours },
      { header: "Rate (£)", accessor: (r: any) => r.rate },
      { header: "Total (£)", accessor: (r: any) => r.total },
    ], rows);
  };

  const selectedPeriod = periods.find((p) => p.id === periodId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palmtree className="h-4 w-4" /> Holiday Pay Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Periods" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.period_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ReportFilters
            employees={employeeOptions}
            selectedEmployeeId={empId}
            onEmployeeChange={setEmpId}
            onExport={handleExport}
            exportDisabled={rows.length === 0}
            rowCount={rows.length}
          />
        </div>

        <ReportSummaryBar
          rowCount={rows.length}
          employeeName={empId !== "all" ? (() => {
            const emp = employeeOptions.find((e) => e.id === empId);
            return emp ? `${emp.forename} ${emp.surname}` : undefined;
          })() : undefined}
          extra={selectedPeriod?.period_name || (periodId === "all" ? "All Periods" : undefined)}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon="file" title="No holiday payments" description="No holiday pay records match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Payroll Period</TableHead>
                  <TableHead>Holiday Date</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate (£)</TableHead>
                  <TableHead className="text-right">Total (£)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs font-medium whitespace-nowrap">
                      {row.employee_name || `${row.employees?.forename || ""} ${row.employees?.surname || ""}`.trim()}
                    </TableCell>
                    <TableCell className="text-xs">{row.payroll_periods?.period_name || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {row.holiday_taken_date ? format(new Date(row.holiday_taken_date), "d MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs">{(row.hours || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">£{(row.rate || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">£{(row.total || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
