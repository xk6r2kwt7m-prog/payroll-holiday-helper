import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, CheckCircle2, Clock, Users, BarChart3, Shield, Download, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useComplianceStats } from "@/hooks/useTrainingModules";
import { AssignmentStatusBadge } from "@/components/training/AssignmentStatusBadge";
import { format, parseISO, differenceInDays } from "date-fns";
import { exportToCsv } from "@/lib/csv-export";
import { useManagerSignoff } from "@/hooks/useTrainingModules";
import { usePermission } from "@/hooks/useRolePermissions";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ManagerComplianceDashboard() {
  const stats = useComplianceStats();
  const canManage = usePermission("manage_training");
  const managerSignoff = useManagerSignoff();
  const [expandedSection, setExpandedSection] = useState<string | null>("overdue");
  const [signoffTarget, setSignoffTarget] = useState<string | null>(null);
  const [signoffNotes, setSignoffNotes] = useState("");
  const [retrainOnFail, setRetrainOnFail] = useState(true);
  const [deptFilter, setDeptFilter] = useState("all");

  if (stats.isLoading) {
    return <div className="text-center py-12 text-sm text-muted-foreground">Loading compliance data…</div>;
  }

  const overdueAssignments = stats.assignments.filter((a: any) => {
    if (!a.due_date) return false;
    return new Date(a.due_date) < new Date() && !["completed", "acknowledged", "cancelled"].includes(a.status);
  });

  const pendingSignoffs = stats.assignments.filter((a: any) =>
    a.signoff_required && !a.signed_off_at && a.status !== "cancelled"
  );

  const failedAttempts = stats.assignments.filter((a: any) =>
    a.quiz_passed === false && a.quiz_score != null
  );

  // Filter by department
  const filterByDept = (items: any[]) => {
    if (deptFilter === "all") return items;
    return items.filter((a: any) => a.employees?.department === deptFilter);
  };

  const toggleSection = (key: string) => {
    setExpandedSection(expandedSection === key ? null : key);
  };

  const handleSignoff = (assignment: any, passed: boolean) => {
    managerSignoff.mutate({
      assignmentId: assignment.id,
      passed,
      notes: signoffNotes,
      createRetrain: !passed && retrainOnFail,
      employeeId: assignment.employee_id,
      documentId: assignment.document_id,
    }, {
      onSuccess: () => {
        setSignoffTarget(null);
        setSignoffNotes("");
        setRetrainOnFail(true);
      },
    });
  };

  // CSV exports
  const handleExportOverdue = () => {
    exportToCsv("overdue-training", [
      { header: "Employee", accessor: (a: any) => `${a.employees?.forename} ${a.employees?.surname}` },
      { header: "Department", accessor: (a: any) => a.employees?.department },
      { header: "Module", accessor: (a: any) => a.training_library?.title },
      { header: "Due Date", accessor: (a: any) => a.due_date ? format(parseISO(a.due_date), "dd/MM/yyyy") : "" },
      { header: "Days Overdue", accessor: (a: any) => a.due_date ? differenceInDays(new Date(), parseISO(a.due_date)) : "" },
      { header: "Mandatory", accessor: (a: any) => a.is_mandatory ? "Yes" : "No" },
    ], overdueAssignments);
    toast.success("Overdue training exported");
  };

  const handleExportAll = () => {
    exportToCsv("training-compliance", [
      { header: "Employee", accessor: (a: any) => `${a.employees?.forename} ${a.employees?.surname}` },
      { header: "Department", accessor: (a: any) => a.employees?.department },
      { header: "Module", accessor: (a: any) => a.training_library?.title },
      { header: "Category", accessor: (a: any) => a.training_library?.category },
      { header: "Status", accessor: (a: any) => a.status },
      { header: "Mandatory", accessor: (a: any) => (a.is_mandatory || a.training_library?.is_mandatory) ? "Yes" : "No" },
      { header: "Due Date", accessor: (a: any) => a.due_date ? format(parseISO(a.due_date), "dd/MM/yyyy") : "" },
      { header: "Completed At", accessor: (a: any) => a.completed_at ? format(parseISO(a.completed_at), "dd/MM/yyyy") : "" },
      { header: "Score", accessor: (a: any) => a.score ?? "" },
      { header: "Sign-off Status", accessor: (a: any) => a.signoff_status || "" },
    ], stats.assignments);
    toast.success("Training compliance exported");
  };

  const departments = Array.from(new Set(stats.assignments.map((a: any) => a.employees?.department).filter(Boolean)));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Training Compliance</h2>
          <p className="text-xs text-muted-foreground">Team training progress and compliance overview</p>
        </div>
        {canManage && stats.total > 0 && (
          <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KPICard
          label="Overall"
          value={`${stats.complianceRate}%`}
          icon={<BarChart3 className="h-4 w-4" />}
          color={stats.complianceRate >= 80 ? "text-success" : stats.complianceRate >= 60 ? "text-warning" : "text-destructive"}
        />
        <KPICard
          label="Mandatory"
          value={`${stats.mandatoryRate}%`}
          icon={<Shield className="h-4 w-4" />}
          color={stats.mandatoryRate >= 90 ? "text-success" : stats.mandatoryRate >= 70 ? "text-warning" : "text-destructive"}
          subtitle={`${stats.mandatoryComplete}/${stats.mandatoryTotal}`}
        />
        <KPICard
          label="Overdue"
          value={String(overdueAssignments.length)}
          icon={<AlertTriangle className="h-4 w-4" />}
          color={overdueAssignments.length > 0 ? "text-destructive" : "text-success"}
          onClick={() => toggleSection("overdue")}
        />
        <KPICard
          label="Sign-offs"
          value={String(pendingSignoffs.length)}
          icon={<Clock className="h-4 w-4" />}
          color={pendingSignoffs.length > 0 ? "text-warning" : "text-success"}
          subtitle="pending"
          onClick={() => toggleSection("signoffs")}
        />
      </div>

      {/* Department Filter */}
      {departments.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setDeptFilter("all")}
            className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all",
              deptFilter === "all" ? "bg-primary/10 text-primary border-primary/20" : "bg-card text-muted-foreground border-border"
            )}>All</button>
          {departments.map(d => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all",
                deptFilter === d ? "bg-primary/10 text-primary border-primary/20" : "bg-card text-muted-foreground border-border"
              )}>{d}</button>
          ))}
        </div>
      )}

      {/* Department Breakdown */}
      {stats.byDepartment.length > 0 && deptFilter === "all" && (
        <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3">By Department</h3>
          <div className="space-y-3">
            {stats.byDepartment.map(dept => (
              <button key={dept.department} onClick={() => setDeptFilter(dept.department)} className="w-full text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{dept.department}</span>
                  <span className={cn("text-sm font-bold tabular-nums",
                    dept.rate >= 80 ? "text-success" : dept.rate >= 60 ? "text-warning" : "text-destructive"
                  )}>{dept.rate}%</span>
                </div>
                <Progress value={dept.rate} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{dept.completed}/{dept.total} completed</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Items — Expandable */}
      {filterByDept(overdueAssignments).length > 0 && (
        <CollapsibleSection
          title={`Overdue Training (${filterByDept(overdueAssignments).length})`}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          expanded={expandedSection === "overdue"}
          onToggle={() => toggleSection("overdue")}
          headerAction={canManage && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleExportOverdue(); }}>
              <Download className="h-3 w-3" /> CSV
            </Button>
          )}
        >
          <div className="space-y-1.5">
            {filterByDept(overdueAssignments).slice(0, 20).map((a: any) => {
              const daysOverdue = differenceInDays(new Date(), parseISO(a.due_date));
              return (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {a.employees?.forename} {a.employees?.surname}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{a.training_library?.title}</p>
                  </div>
                  <Badge className="text-[10px] bg-destructive/10 text-destructive shrink-0 ml-2">{daysOverdue}d overdue</Badge>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Pending Sign-offs — Expandable with action */}
      {filterByDept(pendingSignoffs).length > 0 && (
        <CollapsibleSection
          title={`Pending Sign-offs (${filterByDept(pendingSignoffs).length})`}
          icon={<Clock className="h-4 w-4 text-warning" />}
          expanded={expandedSection === "signoffs"}
          onToggle={() => toggleSection("signoffs")}
        >
          <div className="space-y-2">
            {filterByDept(pendingSignoffs).slice(0, 20).map((a: any) => (
              <div key={a.id} className="p-3 rounded-lg bg-warning/5 border border-warning/10">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {a.employees?.forename} {a.employees?.surname}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{a.training_library?.title}</p>
                  </div>
                  {canManage && signoffTarget !== a.id && (
                    <Button variant="outline" size="sm" className="h-7 text-xs shrink-0 ml-2"
                      onClick={() => setSignoffTarget(a.id)}>
                      Sign Off
                    </Button>
                  )}
                </div>
                {signoffTarget === a.id && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-warning/10">
                    <Textarea
                      value={signoffNotes}
                      onChange={e => setSignoffNotes(e.target.value)}
                      placeholder="Manager comments (optional)"
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                        onClick={() => handleSignoff(a, true)}
                        disabled={managerSignoff.isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Pass
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1"
                        onClick={() => handleSignoff(a, false)}
                        disabled={managerSignoff.isPending}>
                        Fail
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSignoffTarget(null); setSignoffNotes(""); setRetrainOnFail(true); }}>
                        Cancel
                      </Button>
                    </div>
                    {/* Retrain toggle — only visible when failing */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-foreground font-medium">Create retrain assignment on fail</span>
                      </div>
                      <Switch checked={retrainOnFail} onCheckedChange={setRetrainOnFail} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Failed Attempts */}
      {filterByDept(failedAttempts).length > 0 && (
        <CollapsibleSection
          title={`Failed Attempts (${filterByDept(failedAttempts).length})`}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          expanded={expandedSection === "failed"}
          onToggle={() => toggleSection("failed")}
        >
          <div className="space-y-1.5">
            {filterByDept(failedAttempts).slice(0, 15).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {a.employees?.forename} {a.employees?.surname}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{a.training_library?.title}</p>
                </div>
                <Badge className="text-[10px] bg-destructive/10 text-destructive shrink-0 ml-2">
                  Score: {a.quiz_score ?? a.score ?? 0}%
                </Badge>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Empty state */}
      {stats.total === 0 && (
        <div className="text-center py-12">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No training assigned yet</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Assign training modules from the Library tab to start tracking team compliance.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ───
function KPICard({ label, value, icon, color, subtitle, onClick }: {
  label: string; value: string; icon: React.ReactNode; color: string; subtitle?: string; onClick?: () => void;
}) {
  return (
    <div className={cn("rounded-xl bg-card border border-border p-3 shadow-sm", onClick && "cursor-pointer hover:border-primary/20 active:bg-muted transition-all")}
      onClick={onClick}>
      <div className={cn("mb-1", color)}>{icon}</div>
      <p className={cn("text-xl font-bold tabular-nums", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>}
    </div>
  );
}

// ─── Collapsible Section ───
function CollapsibleSection({ title, icon, expanded, onToggle, children, headerAction }: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 p-4 text-left">
        {icon}
        <h3 className="text-sm font-semibold text-foreground flex-1">{title}</h3>
        {headerAction}
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
