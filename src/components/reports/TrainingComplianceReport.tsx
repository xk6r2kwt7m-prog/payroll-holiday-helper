import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { GraduationCap, BookOpen, AlertTriangle, Plus, Eye, CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TabsList, TabsTrigger, Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ReportFilters } from "./ReportFilters";
import { ReportSummaryBar } from "./ReportSummaryBar";
import { useTrainingRecords, CERTIFICATION_TYPES } from "@/hooks/useTrainingRecords";
import { useTrainingAssignments, useTrainingLibrary, useCreateAssignments, type TrainingLibraryItem } from "@/hooks/useTrainingLibrary";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useManagerScope } from "@/hooks/useManagerScope";
import { useNavigate } from "react-router-dom";
import { exportToCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

// ─── Gap detection ───

interface GapRow {
  employeeId: string;
  employeeName: string;
  department: string;
  moduleId: string;
  moduleTitle: string;
  category: string;
  countsTowardReadiness: boolean;
  gapStatus: "not_assigned" | "assigned_incomplete" | "overdue" | "completed";
  gapColor: string;
  gapLabel: string;
  assignmentId?: string; // present when an assignment exists
}

function doesModuleApply(item: TrainingLibraryItem, employee: Employee): boolean {
  const deptMatch = !item.target_departments?.length || item.target_departments.includes(employee.department);
  return deptMatch;
}

function buildGapRows(
  libraryItems: TrainingLibraryItem[],
  employees: Employee[],
  assignments: any[]
): GapRow[] {
  const rows: GapRow[] = [];
  const requiredItems = libraryItems.filter(i => i.is_active && (i.target_departments?.length > 0 || i.counts_toward_readiness));

  for (const emp of employees) {
    for (const item of requiredItems) {
      if (!doesModuleApply(item, emp)) continue;

      const empAssignments = assignments.filter(
        (a: any) => a.employee_id === emp.id && a.document_id === item.id && a.status !== "cancelled"
      );

      let gapStatus: GapRow["gapStatus"];
      let gapColor: string;
      let gapLabel: string;
      let assignmentId: string | undefined;

      if (empAssignments.length === 0) {
        gapStatus = "not_assigned";
        gapColor = "text-destructive border-destructive/30";
        gapLabel = "Not Assigned";
      } else {
        const latest = empAssignments[0];
        assignmentId = latest.id;
        if (latest.completed_at) {
          gapStatus = "completed";
          gapColor = "text-success border-success/30";
          gapLabel = "Completed";
        } else if (latest.due_date) {
          const due = new Date(latest.due_date);
          due.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (due < today) {
            gapStatus = "overdue";
            gapColor = "text-destructive border-destructive/30";
            gapLabel = "Overdue";
          } else {
            gapStatus = "assigned_incomplete";
            gapColor = "text-warning border-warning/30";
            gapLabel = "Incomplete";
          }
        } else {
          gapStatus = "assigned_incomplete";
          gapColor = "text-warning border-warning/30";
          gapLabel = "Incomplete";
        }
      }

      rows.push({
        employeeId: emp.id,
        employeeName: `${emp.forename} ${emp.surname}`,
        department: emp.department,
        moduleId: item.id,
        moduleTitle: item.title,
        category: item.category,
        countsTowardReadiness: item.counts_toward_readiness,
        gapStatus,
        gapColor,
        gapLabel,
        assignmentId,
      });
    }
  }

  return rows;
}

// ─── Main Component ───

export function TrainingComplianceReport() {
  const [tab, setTab] = useState("certifications");
  const [dept, setDept] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [empId, setEmpId] = useState("all");
  const [actionableOnly, setActionableOnly] = useState(false);
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());
  const [bulkDueDate, setBulkDueDate] = useState<Date | undefined>(undefined);
  const [singleDueDates, setSingleDueDates] = useState<Map<string, Date>>(new Map());

  const navigate = useNavigate();

  const { data: records = [], isLoading: certLoading } = useTrainingRecords();
  const { data: assignments = [], isLoading: assignLoading } = useTrainingAssignments();
  const { data: libraryItems = [], isLoading: libLoading } = useTrainingLibrary();
  const { data: employees = [] } = useEmployees();
  const { filterByScope, filterEmployees } = useManagerScope();
  const createAssignments = useCreateAssignments();

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

  // ─── Gaps tab ───

  const allGapRows = useMemo(() => {
    return buildGapRows(libraryItems, scopedEmployees, assignments as any[]);
  }, [libraryItems, scopedEmployees, assignments]);

  const filteredGaps = useMemo(() => {
    let list = allGapRows;
    if (dept !== "all") list = list.filter(r => r.department === dept);
    if (empId !== "all") list = list.filter(r => r.employeeId === empId);
    if (actionableOnly) {
      list = list.filter(r => r.gapStatus !== "completed");
    }
    if (statusFilter !== "all") {
      list = list.filter(r => {
        if (statusFilter === "not_assigned") return r.gapStatus === "not_assigned";
        if (statusFilter === "overdue") return r.gapStatus === "overdue";
        if (statusFilter === "incomplete") return r.gapStatus === "assigned_incomplete";
        if (statusFilter === "completed") return r.gapStatus === "completed";
        return true;
      });
    }
    return list;
  }, [allGapRows, dept, empId, statusFilter, actionableOnly]);

  const gapSummary = useMemo(() => {
    const total = allGapRows.length;
    const notAssigned = allGapRows.filter(r => r.gapStatus === "not_assigned").length;
    const overdue = allGapRows.filter(r => r.gapStatus === "overdue").length;
    const incomplete = allGapRows.filter(r => r.gapStatus === "assigned_incomplete").length;
    const completed = allGapRows.filter(r => r.gapStatus === "completed").length;
    return { total, notAssigned, overdue, incomplete, completed };
  }, [allGapRows]);

  // Gaps that can be assigned (not_assigned only)
  const assignableGaps = useMemo(() => filteredGaps.filter(g => g.gapStatus === "not_assigned"), [filteredGaps]);

  // ─── Gap actions ───

  const gapKey = (g: GapRow) => `${g.employeeId}::${g.moduleId}`;

  const toggleGapSelection = useCallback((g: GapRow) => {
    setSelectedGaps(prev => {
      const next = new Set(prev);
      const k = gapKey(g);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedGaps.size === assignableGaps.length) {
      setSelectedGaps(new Set());
    } else {
      setSelectedGaps(new Set(assignableGaps.map(gapKey)));
    }
  }, [assignableGaps, selectedGaps.size]);

  const handleAssignSingle = useCallback(async (g: GapRow) => {
    await createAssignments.mutateAsync([{ document_id: g.moduleId, employee_id: g.employeeId }]);
    setSelectedGaps(prev => { const n = new Set(prev); n.delete(gapKey(g)); return n; });
  }, [createAssignments]);

  const handleAssignSelected = useCallback(async () => {
    const toAssign = assignableGaps.filter(g => selectedGaps.has(gapKey(g)));
    if (toAssign.length === 0) return;
    await createAssignments.mutateAsync(
      toAssign.map(g => ({ document_id: g.moduleId, employee_id: g.employeeId }))
    );
    setSelectedGaps(new Set());
  }, [assignableGaps, selectedGaps, createAssignments]);

  const handleViewAssignment = useCallback((g: GapRow) => {
    // Navigate to training page where the assignment can be managed
    navigate("/training");
  }, [navigate]);

  // ─── Shared ───

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

  const handleExportGaps = () => {
    exportToCsv("training_gaps_report", [
      { header: "Employee", accessor: (r: GapRow) => r.employeeName },
      { header: "Department", accessor: (r: GapRow) => r.department },
      { header: "Module", accessor: (r: GapRow) => r.moduleTitle },
      { header: "Category", accessor: (r: GapRow) => r.category },
      { header: "Status", accessor: (r: GapRow) => r.gapLabel },
      { header: "Counts Toward Readiness", accessor: (r: GapRow) => r.countsTowardReadiness ? "Yes" : "No" },
    ], filteredGaps);
  };

  const isLoading = certLoading || assignLoading || libLoading;
  const isGapsTab = tab === "gaps";
  const isCertTab = tab === "certifications";
  const isAssignTab = tab === "assignments";

  const statusOptions = isCertTab
    ? [{ value: "all", label: "All Statuses" }, { value: "overdue", label: "Overdue" }, { value: "expiring", label: "Expiring Soon" }, { value: "valid", label: "Valid" }]
    : isAssignTab
    ? [{ value: "all", label: "All Statuses" }, { value: "overdue", label: "Overdue" }, { value: "in_progress", label: "In Progress" }, { value: "completed", label: "Completed" }]
    : [{ value: "all", label: "All Statuses" }, { value: "not_assigned", label: "Not Assigned" }, { value: "overdue", label: "Overdue" }, { value: "incomplete", label: "Incomplete" }, { value: "completed", label: "Completed" }];

  const handleTabChange = (t: string) => {
    setTab(t);
    setStatusFilter("all");
    setSelectedGaps(new Set());
    if (t !== "gaps") setActionableOnly(false);
  };

  const activeRowCount = isCertTab ? filteredCerts.length : isAssignTab ? filteredAssignments.length : filteredGaps.length;
  const activeExport = isCertTab ? handleExportCerts : isAssignTab ? handleExportAssignments : handleExportGaps;

  const actionableGaps = gapSummary.notAssigned + gapSummary.overdue + gapSummary.incomplete;

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
            <TabsTrigger value="gaps" className="text-xs gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Gaps
              {actionableGaps > 0 && <Badge variant="destructive" className="text-[9px] h-4 px-1 ml-0.5">{actionableGaps}</Badge>}
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
        {!isLoading && isAssignTab && assignSummary.total > 0 && (
          <div className="flex gap-2 flex-wrap text-xs">
            <Badge variant="outline" className="text-foreground">{assignSummary.total} total</Badge>
            {assignSummary.overdue > 0 && <Badge variant="outline" className="text-destructive border-destructive/30">{assignSummary.overdue} overdue</Badge>}
            {assignSummary.pending > 0 && <Badge variant="outline" className="text-warning border-warning/30">{assignSummary.pending} pending</Badge>}
            <Badge variant="outline" className="text-success border-success/30">{assignSummary.completed} completed</Badge>
          </div>
        )}
        {!isLoading && isGapsTab && gapSummary.total > 0 && (
          <div className="flex gap-2 flex-wrap text-xs">
            <Badge variant="outline" className="text-foreground">{gapSummary.total} total</Badge>
            {gapSummary.notAssigned > 0 && <Badge variant="outline" className="text-destructive border-destructive/30">{gapSummary.notAssigned} not assigned</Badge>}
            {gapSummary.overdue > 0 && <Badge variant="outline" className="text-destructive border-destructive/30">{gapSummary.overdue} overdue</Badge>}
            {gapSummary.incomplete > 0 && <Badge variant="outline" className="text-warning border-warning/30">{gapSummary.incomplete} incomplete</Badge>}
            <Badge variant="outline" className="text-success border-success/30">{gapSummary.completed} completed</Badge>
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
            onExport={activeExport}
            exportDisabled={activeRowCount === 0}
            rowCount={activeRowCount}
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

        {/* Actionable-only toggle for Gaps tab */}
        {isGapsTab && (
          <div className="flex items-center gap-2">
            <Switch
              id="actionable-only"
              checked={actionableOnly}
              onCheckedChange={setActionableOnly}
            />
            <Label htmlFor="actionable-only" className="text-xs text-muted-foreground cursor-pointer">
              Actionable only
            </Label>
          </div>
        )}

        {!isLoading && (
          <ReportSummaryBar
            rowCount={activeRowCount}
            department={dept}
            employeeName={selectedEmpName}
            extra={statusFilter !== "all" ? statusFilter : (actionableOnly && isGapsTab ? "actionable" : undefined)}
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
        ) : isAssignTab ? (
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
        ) : (
          /* ─── Gaps Table ─── */
          <>
            {/* Bulk action bar */}
            {assignableGaps.length > 0 && (
              <div className="flex items-center justify-between gap-2 mb-3 p-2.5 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedGaps.size > 0 && selectedGaps.size === assignableGaps.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all unassigned gaps"
                  />
                  <span className="text-xs text-muted-foreground">
                    {selectedGaps.size > 0
                      ? `${selectedGaps.size} selected`
                      : `${assignableGaps.length} unassigned`}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs gap-1"
                  disabled={selectedGaps.size === 0 || createAssignments.isPending}
                  onClick={handleAssignSelected}
                >
                  <Plus className="h-3 w-3" />
                  Assign {selectedGaps.size > 0 ? `(${selectedGaps.size})` : "selected"}
                </Button>
              </div>
            )}

            {filteredGaps.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="No training gaps" description="All required modules are assigned and completed, or no filters match." compact />
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Employee</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGaps.slice(0, 200).map((g) => {
                      const k = gapKey(g);
                      const isNotAssigned = g.gapStatus === "not_assigned";
                      return (
                        <TableRow key={k}>
                          <TableCell className="px-2">
                            {isNotAssigned && (
                              <Checkbox
                                checked={selectedGaps.has(k)}
                                onCheckedChange={() => toggleGapSelection(g)}
                                aria-label={`Select ${g.employeeName} - ${g.moduleTitle}`}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-xs">{g.employeeName}</TableCell>
                          <TableCell className="text-xs">
                            <span>{g.moduleTitle}</span>
                            {g.countsTowardReadiness && (
                              <span className="block text-[9px] text-muted-foreground">Blocks readiness</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs capitalize">{g.category}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]", g.gapColor)}>{g.gapLabel}</Badge>
                          </TableCell>
                          <TableCell>
                            {isNotAssigned ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px] gap-1 px-1.5 text-primary"
                                disabled={createAssignments.isPending}
                                onClick={() => handleAssignSingle(g)}
                              >
                                <Plus className="h-3 w-3" /> Assign
                              </Button>
                            ) : g.gapStatus !== "completed" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px] gap-1 px-1.5"
                                onClick={() => handleViewAssignment(g)}
                              >
                                <Eye className="h-3 w-3" /> View
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filteredGaps.length > 200 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">Showing 200 of {filteredGaps.length}. Export CSV for full data.</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
