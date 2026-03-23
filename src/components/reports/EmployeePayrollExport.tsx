import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { usePayrollEntryLocations } from "@/hooks/usePayrollLocations";
import { useEmployees } from "@/hooks/useEmployees";
import { useManagerScope } from "@/hooks/useManagerScope";
import { exportToCsv } from "@/lib/csv-export";
import { ReportFilters } from "./ReportFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

export function EmployeePayrollExport() {
  const [periodId, setPeriodId] = useState("latest");
  const [dept, setDept] = useState("all");
  const [empId, setEmpId] = useState("all");

  const { data: periods = [] } = usePayrollPeriods();
  const { data: employees = [] } = useEmployees();
  const { filterEmployees } = useManagerScope();

  const scopedEmployees = useMemo(() => filterEmployees(employees), [employees, filterEmployees]);

  const selectedPeriodId = useMemo(() => {
    if (periodId === "latest" && periods.length > 0) return periods[0].id;
    return periodId;
  }, [periodId, periods]);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  const { data: entries = [], isLoading } = usePayrollEntries(selectedPeriodId);
  const { data: locationData = [] } = usePayrollEntryLocations(selectedPeriodId);

  const departments = useMemo(() => {
    return [...new Set(scopedEmployees.map((e) => e.department))].sort();
  }, [scopedEmployees]);

  const employeeOptions = useMemo(() => {
    let list = scopedEmployees;
    if (dept !== "all") list = list.filter((e) => e.department === dept);
    return list.map((e) => ({ id: e.id, forename: e.forename, surname: e.surname, department: e.department }));
  }, [scopedEmployees, dept]);

  const scopedEmployeeIds = useMemo(() => new Set(scopedEmployees.map((e) => e.id)), [scopedEmployees]);

  const rows = useMemo(() => {
    let list = (entries as any[]).filter((e) => scopedEmployeeIds.has(e.employee_id));
    if (dept !== "all") list = list.filter((e) => e.employees?.department === dept);
    if (empId !== "all") list = list.filter((e) => e.employee_id === empId);
    return list;
  }, [entries, dept, empId, scopedEmployeeIds]);

  const handleExport = () => {
    const filename = selectedPeriod
      ? `payroll_export_${selectedPeriod.period_name.replace(/\s+/g, "_").toLowerCase()}`
      : "payroll_export";
    exportToCsv(filename, [
      { header: "Employee", accessor: (r: any) => `${r.employees?.forename || ""} ${r.employees?.surname || ""}`.trim() },
      { header: "Department", accessor: (r: any) => r.employees?.department || "" },
      { header: "Hourly Rate", accessor: (r: any) => r.hourly_rate },
      { header: "Timesheet Hours", accessor: (r: any) => r.timesheet_hours },
      { header: "Imported Hours", accessor: (r: any) => r.imported_hours },
      { header: "Service Charge", accessor: (r: any) => r.service_charge },
      { header: "Performance Bonus", accessor: (r: any) => r.performance_bonus },
      { header: "Special Bonus", accessor: (r: any) => r.special_bonus },
      { header: "Holiday Accrued Hours", accessor: (r: any) => r.holiday_accrued_hours },
      { header: "Total Pay", accessor: (r: any) => r.total_pay },
      { header: "Adjustment Note", accessor: (r: any) => r.adjustment_note || "" },
      { header: "Bank Exported", accessor: (r: any) => r.bank_details_exported ? "Yes" : "No" },
    ], rows);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Employee Payroll Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select period" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest Period</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.period_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ReportFilters
            departments={departments}
            selectedDepartment={dept}
            onDepartmentChange={setDept}
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
          department={dept}
          employeeName={empId !== "all" ? (() => {
            const emp = employeeOptions.find((e) => e.id === empId);
            return emp ? `${emp.forename} ${emp.surname}` : undefined;
          })() : undefined}
          extra={selectedPeriod?.period_name}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading payroll entries…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No payroll entries" description="No entries found for this period and filter combination. Try selecting a different period or clearing filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Imported</TableHead>
                  <TableHead className="text-right">Svc Chg</TableHead>
                  <TableHead className="text-right">Perf Bonus</TableHead>
                  <TableHead className="text-right">Spec Bonus</TableHead>
                  <TableHead className="text-right">Hol Accrued</TableHead>
                  <TableHead className="text-right">Total Pay</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Bank</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs font-medium whitespace-nowrap">
                      {row.employees?.forename} {row.employees?.surname}
                    </TableCell>
                    <TableCell className="text-xs">{row.employees?.department}</TableCell>
                    <TableCell className="text-right text-xs">£{(row.hourly_rate || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">{(row.timesheet_hours || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">{row.imported_hours != null ? row.imported_hours.toFixed(2) : "—"}</TableCell>
                    <TableCell className="text-right text-xs">£{(row.service_charge || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">£{(row.performance_bonus || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">£{(row.special_bonus || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">{(row.holiday_accrued_hours || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">£{(row.total_pay || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{row.adjustment_note || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={row.bank_details_exported ? "default" : "secondary"} className="text-[10px]">
                        {row.bank_details_exported ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
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
