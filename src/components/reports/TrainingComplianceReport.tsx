import { useState, useMemo } from "react";
import { format } from "date-fns";
import { GraduationCap, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportFilters } from "./ReportFilters";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { useTrainingRecords, CERTIFICATION_TYPES } from "@/hooks/useTrainingRecords";
import { useTrainingAssignments } from "@/hooks/useTrainingLibrary";
import { useEmployees } from "@/hooks/useEmployees";
import { useManagerScope } from "@/hooks/useManagerScope";
import { exportToCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";

// ─── Certification helpers ───

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

// ─── Assignment helpers ───

function getAssignmentStatus(a: any): { status: "completed" | "overdue" | "in_progress" | "assigned"; label: string; color: string } {
  if (a.completed_at) return { status: "completed", label: "Completed", color: "text-success border-success/30" };
  if (a.due_date) {
    const due = new Date(a.due_date);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return { status: "overdue", label: "Overdue", color: "text-destructive border-destructive/30" };
  }
  if (a.viewed_at || a.acknowledged_at) return { status: "in_progress", label: "In Progress", color: "text-warning border-warning/30" };
  return { status: "assigned", label: "Assigned", color: "text-muted-foreground" };
}

export function TrainingComplianceReport() {
  const [tab, setTab] = useState("certifications");
  const [dept, setDept] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [empId, setEmpId] = useState("all");

  const { data: records = [], isLoading: certLoading } = useTrainingRecords();
  const { data: assignments = [], isLoading: assignLoading } = useTrainingAssignments();
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

  // ─── Certifications tab ───

  const filteredCerts = useMemo(() => {
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

  const certSummary = useMemo(() => {
    const scoped = filterByScope(records as any[], (r: any) => r.employee_id);
    const total = scoped.length;
    const expired = scoped.filter((r: any) => getTrainingStatus(r.expiry_date).status === "expired").length;
    const expiring = scoped.filter((r: any) => getTrainingStatus(r.expiry_date).status === "expiring").length;
    return { total, expired, expiring, valid: total - expired - expiring };
  }, [records, filterByScope]);

  // ─── Assignments tab ───

  const filteredAssignments = useMemo(() => {
    let list = filterByScope(assignments as any[], (r: any) => r.employee_id);
    if (dept !== "all") list = list.filter((r: any) => r.employees?.department === dept);
    if (empId !== "all") list = list.filter((r: any) => r.employee_id === empId);
    if (statusFilter !== "all") {
      list = list.filter((r: any) => {
        const s = getAssignmentStatus(r);
        if (statusFilter === "overdue") return s.status === "overdue";
        if (statusFilter === "completed") return s.status === "completed";
        if (statusFilter === "in_progress") return s.status === "in_progress" || s.status === "assigned";
        if (statusFilter === "valid") return s.status === "completed";
        return true;
      });
    }
    return list;
  }, [assignments, dept, empId, statusFilter, filterByScope]);

  const assignSummary = useMemo(() => {
    const scoped = filterByScope(assignments as any[], (r: any) => r.employee_id);
    const total = scoped.length;
    const completed = scoped.filter((r: any) => r.completed_at).length;
    const overdue = scoped.filter((r: any) => getAssignmentStatus(r).status === "overdue").length;
    return { total, completed, overdue, pending: total - completed - overdue };
  }, [assignments, filterByScope]);

  const selectedEmpName = useMemo(() => {
    if (empId === "all") return undefined;
    const e = employees.find((x) => x.id === empId);
    return e ? `${e.forename} ${e.surname}` : undefined;
  }, [empId, employees]);

  const handleExportCerts = () => {
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
    ], filteredCerts);
  };

  const handleExportAssignments = () => {
    exportToCsv("training_assignments_report", [
      { header: "Employee", accessor: (r: any) => `${r.employees?.forename || ""} ${r.employees?.surname || ""}` },
      { header: "Department", accessor: (r: any) => r.employees?.department },
      { header: "Module", accessor: (r: any) => r.training_library?.title || "–" },
      { header: "Category", accessor: (r: any) => r.training_library?.category || "–" },
      { header: "Content Type", accessor: (r: any) => r.training_library?.content_type || "document" },
      { header: "Due Date", accessor: (r: any) => r.due_date || "–" },
      { header: "Status", accessor: (r: any) => getAssignmentStatus(r).label },
      { header: "Acknowledged", accessor: (r: any) => r.acknowledged_at ? format(new Date(r.acknowledged_at), "d MMM yyyy") : "–" },
      { header: "Completed", accessor: (r: any) => r.completed_at ? format(new Date(r.completed_at), "d MMM yyyy") : "–" },
      { header: "Counts Toward Readiness", accessor: (r: any) => r.training_library?.counts_toward_readiness ? "Yes" : "No" },
    ], filteredAssignments);
  };

  const isLoading = certLoading || assignLoading;
  const isCertTab = tab === "certifications";

  // Status filter options differ per tab
  const statusOptions = isCertTab
    ? [{ value: "all", label: "All Statuses" }, { value: "overdue", label: "Overdue" }, { value: "expiring", label: "Expiring Soon" }, { value: "valid", label: "Valid" }]
    : [{ value: "all", label: "All Statuses" }, { value: "overdue", label: "Overdue" }, { value: "in_progress", label: "In Progress" }, { value: "completed", label: "Completed" }];

  // Reset status filter on tab change
  const handleTabChange = (t: string) => {
    setTab(t);
    setStatusFilter("all");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Training Compliance Report</CardTitle>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="h-8">
            <TabsTrigger value="certifications" className="text-xs gap-1">
              <GraduationCap className="h-3.5 w-3.5" /> Certifications
              {certSummary.total > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{certSummary.total}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs gap-1">
              <BookOpen className="h-3.5 w-3.5" /> Modules
              {assignSummary.total > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{assignSummary.total}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Summary badges */}
        {!isLoading && isCertTab && certSummary.total > 0 && (
          <div className="flex gap-2 flex-wrap text-xs">
            <Badge variant="outline" className="text-foreground">{certSummary.total} total</Badge>
            {certSummary.expired > 0 && <Badge variant="outline" className="text-destructive border-destructive/30">{certSummary.expired} expired</Badge>}
            {certSummary.expiring > 0 && <Badge variant="outline" className="text-warning border-warning/30">{certSummary.expiring} expiring</Badge>}
            <Badge variant="outline" className="text-success border-success/30">{certSummary.valid} valid</Badge>
          </div>
        )}
        {!isLoading && !isCertTab && assignSummary.total > 0 && (
          <div className="flex gap-2 flex-wrap text-xs">
            <Badge variant="outline" className="text-foreground">{assignSummary.total} total</Badge>
            {assignSummary.overdue > 0 && <Badge variant="outline" className="text-destructive border-destructive/30">{assignSummary.overdue} overdue</Badge>}
            {assignSummary.pending > 0 && <Badge variant="outline" className="text-warning border-warning/30">{assignSummary.pending} pending</Badge>}
            <Badge variant="outline" className="text-success border-success/30">{assignSummary.completed} completed</Badge>
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
            onExport={isCertTab ? handleExportCerts : handleExportAssignments}
            exportDisabled={isCertTab ? filteredCerts.length === 0 : filteredAssignments.length === 0}
            rowCount={isCertTab ? filteredCerts.length : filteredAssignments.length}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-[140px] rounded-md border border-input bg-background px-3 text-sm"
          >
            {statusOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {!isLoading && (
          <ReportSummaryBar
            rowCount={isCertTab ? filteredCerts.length : filteredAssignments.length}
            department={dept}
            employeeName={selectedEmpName}
            extra={statusFilter !== "all" ? statusFilter : undefined}
          />
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        ) : isCertTab ? (
          /* ─── Certifications Table ─── */
          filteredCerts.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No training records" description="No records match your filters." compact />
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
                  {filteredCerts.slice(0, 200).map((r: any) => {
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
              {filteredCerts.length > 200 && (
                <p className="text-xs text-muted-foreground text-center mt-2">Showing 200 of {filteredCerts.length}. Export CSV for full data.</p>
              )}
            </div>
          )
        ) : (
          /* ─── Assignments Table ─── */
          filteredAssignments.length === 0 ? (
            <EmptyState icon={BookOpen} title="No training assignments" description="No assignments match your filters." compact />
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.slice(0, 200).map((a: any) => {
                    const s = getAssignmentStatus(a);
                    const lib = a.training_library;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-xs">{a.employees?.forename} {a.employees?.surname}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            {lib?.content_type === "internal_page" && <BookOpen className="h-3 w-3 text-primary shrink-0" />}
                            <span>{lib?.title || "–"}</span>
                          </div>
                          {lib?.counts_toward_readiness && (
                            <span className="text-[9px] text-muted-foreground">Counts toward readiness</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs capitalize">{lib?.category || "–"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]", s.color)}>{s.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">
                          {a.completed_at ? format(new Date(a.completed_at), "d MMM yyyy") : "–"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredAssignments.length > 200 && (
                <p className="text-xs text-muted-foreground text-center mt-2">Showing 200 of {filteredAssignments.length}. Export CSV for full data.</p>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
