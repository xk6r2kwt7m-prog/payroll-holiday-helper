import { useState, useMemo } from "react";
import { format } from "date-fns";
import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportFilters } from "./ReportFilters";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { useTrainingRecords, CERTIFICATION_TYPES } from "@/hooks/useTrainingRecords";
import { useEmployees } from "@/hooks/useEmployees";
import { useManagerScope } from "@/hooks/useManagerScope";
import { exportToCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";

function getTrainingStatus(expiryDate: string | null): { status: "valid" | "expiring" | "expired" | "no_expiry"; label: string } {
  if (!expiryDate) return { status: "no_expiry", label: "No expiry" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { status: "expired", label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 30) return { status: "expiring", label: `Expires in ${days}d` };
  return { status: "valid", label: format(exp, "d MMM yyyy") };
}

export function TrainingComplianceReport() {
  const [dept, setDept] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [empId, setEmpId] = useState("all");

  const { data: records = [], isLoading } = useTrainingRecords();
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
    let list = filterByScope(records as any[], (r: any) => r.employee_id);
    if (dept !== "all") list = list.filter((r: any) => r.employees?.department === dept);
    if (empId !== "all") list = list.filter((r: any) => r.employee_id === empId);
    if (statusFilter !== "all") {
      list = list.filter((r: any) => {
        const s = getTrainingStatus(r.expiry_date);
        if (statusFilter === "overdue") return s.status === "expired";
        if (statusFilter === "expiring") return s.status === "expiring";
        if (statusFilter === "valid") return s.status === "valid" || s.status === "no_expiry";
        return true;
      });
    }
    return list;
  }, [records, dept, empId, statusFilter, filterByScope]);

  const summary = useMemo(() => {
    const scoped = filterByScope(records as any[], (r: any) => r.employee_id);
    const total = scoped.length;
    const expired = scoped.filter((r: any) => getTrainingStatus(r.expiry_date).status === "expired").length;
    const expiring = scoped.filter((r: any) => getTrainingStatus(r.expiry_date).status === "expiring").length;
    return { total, expired, expiring, valid: total - expired - expiring };
  }, [records, filterByScope]);

  const selectedEmpName = useMemo(() => {
    if (empId === "all") return undefined;
    const e = employees.find((x) => x.id === empId);
    return e ? `${e.forename} ${e.surname}` : undefined;
  }, [empId, employees]);

  const handleExport = () => {
    const typeMap = Object.fromEntries(CERTIFICATION_TYPES.map((t) => [t.value, t.label]));
    exportToCsv("training_compliance_report", [
      { header: "Employee", accessor: (r: any) => `${r.employees?.forename || ""} ${r.employees?.surname || ""}` },
      { header: "Department", accessor: (r: any) => r.employees?.department },
      { header: "Certification", accessor: (r: any) => r.certification_name },
      { header: "Type", accessor: (r: any) => typeMap[r.certification_type] || r.certification_type },
      { header: "Provider", accessor: (r: any) => r.provider },
      { header: "Date Obtained", accessor: (r: any) => r.date_obtained },
      { header: "Expiry Date", accessor: (r: any) => r.expiry_date },
      { header: "Status", accessor: (r: any) => getTrainingStatus(r.expiry_date).status },
    ], filtered);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Training Compliance Report</CardTitle>
        {!isLoading && summary.total > 0 && (
          <div className="flex gap-2 flex-wrap text-xs">
            <Badge variant="outline" className="text-foreground">{summary.total} total</Badge>
            {summary.expired > 0 && <Badge variant="outline" className="text-destructive border-destructive/30">{summary.expired} expired</Badge>}
            {summary.expiring > 0 && <Badge variant="outline" className="text-warning border-warning/30">{summary.expiring} expiring</Badge>}
            <Badge variant="outline" className="text-success border-success/30">{summary.valid} valid</Badge>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="overdue">Overdue</option>
            <option value="expiring">Expiring Soon</option>
            <option value="valid">Valid</option>
          </select>
        </div>
        {!isLoading && (
          <ReportSummaryBar
            rowCount={filtered.length}
            department={dept}
            employeeName={selectedEmpName}
            extra={statusFilter !== "all" ? statusFilter : undefined}
          />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No training records" description="No records match your filters. Adjust filters or status selection." compact />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead className="hidden sm:table-cell">Obtained</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((r: any) => {
                  const s = getTrainingStatus(r.expiry_date);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-xs">{r.employees?.forename} {r.employees?.surname}</TableCell>
                      <TableCell className="text-xs">{r.certification_name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{r.date_obtained ? format(new Date(r.date_obtained), "d MMM yyyy") : "–"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", {
                          "text-destructive border-destructive/30": s.status === "expired",
                          "text-warning border-warning/30": s.status === "expiring",
                          "text-success border-success/30": s.status === "valid",
                          "text-muted-foreground": s.status === "no_expiry",
                        })}>{s.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length > 200 && (
              <p className="text-xs text-muted-foreground text-center mt-2">Showing 200 of {filtered.length}. Export CSV for full data.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
