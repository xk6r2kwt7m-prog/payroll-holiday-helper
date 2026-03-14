import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportFilters } from "./ReportFilters";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { useHolidayBalancesByYear } from "@/hooks/useHolidays";
import { useEmployees } from "@/hooks/useEmployees";
import { useManagerScope } from "@/hooks/useManagerScope";
import { exportToCsv } from "@/lib/csv-export";

export function HolidayBalanceReport() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [dept, setDept] = useState("all");
  const [empId, setEmpId] = useState("all");

  const { data: balances = [], isLoading } = useHolidayBalancesByYear(year);
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
    let list = filterByScope(balances as any[], (b: any) => b.employee_id);
    if (dept !== "all") list = list.filter((b: any) => b.employees?.department === dept);
    if (empId !== "all") list = list.filter((b: any) => b.employee_id === empId);
    return list;
  }, [balances, dept, empId, filterByScope]);

  const selectedEmpName = useMemo(() => {
    if (empId === "all") return undefined;
    const e = employees.find((x) => x.id === empId);
    return e ? `${e.forename} ${e.surname}` : undefined;
  }, [empId, employees]);

  const handleExport = () => {
    exportToCsv(`holiday_balances_${year}`, [
      { header: "Employee", accessor: (r: any) => `${r.employees?.forename || ""} ${r.employees?.surname || ""}` },
      { header: "Department", accessor: (r: any) => r.employees?.department },
      { header: "Status", accessor: (r: any) => r.employees?.status },
      { header: "Leave Year", accessor: () => String(year) },
      { header: "Accrued (hrs)", accessor: (r: any) => r.hours_accrued },
      { header: "Taken (hrs)", accessor: (r: any) => r.hours_taken },
      { header: "Carry Over (hrs)", accessor: (r: any) => r.carry_over_hours },
      { header: "Adjustment (hrs)", accessor: (r: any) => r.adjustment_hours },
      { header: "Remaining (hrs)", accessor: (r: any) => {
        const accrued = Number(r.hours_accrued || 0);
        const taken = Number(r.hours_taken || 0);
        const carry = Number(r.carry_over_hours || 0);
        const adj = Number(r.adjustment_hours || 0);
        return (accrued + carry + adj - taken).toFixed(2);
      }},
    ], filtered);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Holiday Balances</CardTitle>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ReportFilters
          departments={departments}
          selectedDepartment={dept}
          onDepartmentChange={setDept}
          employees={employeeOptions}
          selectedEmployeeId={empId}
          onEmployeeChange={setEmpId}
          onExport={handleExport}
          exportDisabled={filtered.length === 0}
          rowCount={filtered.length}
        />
        {!isLoading && (
          <ReportSummaryBar
            rowCount={filtered.length}
            department={dept}
            employeeName={selectedEmpName}
            extra={String(year)}
          />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Calendar} title="No holiday balances" description="No records match your filters. Adjust filters or expand the date range." compact />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Dept</TableHead>
                  <TableHead className="text-right">Accrued</TableHead>
                  <TableHead className="text-right">Taken</TableHead>
                  <TableHead className="text-right font-semibold">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b: any) => {
                  const remaining = Number(b.hours_accrued || 0) + Number(b.carry_over_hours || 0) + Number(b.adjustment_hours || 0) - Number(b.hours_taken || 0);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-xs">{b.employees?.forename} {b.employees?.surname}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{b.employees?.department}</TableCell>
                      <TableCell className="text-right text-xs">{Number(b.hours_accrued || 0).toFixed(1)}h</TableCell>
                      <TableCell className="text-right text-xs">{Number(b.hours_taken || 0).toFixed(1)}h</TableCell>
                      <TableCell className={`text-right text-xs font-semibold ${remaining < 0 ? "text-destructive" : ""}`}>
                        {remaining.toFixed(1)}h
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
