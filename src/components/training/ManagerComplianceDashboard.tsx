import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Clock, Users, BarChart3, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useComplianceStats } from "@/hooks/useTrainingModules";
import { AssignmentStatusBadge } from "@/components/training/AssignmentStatusBadge";
import { format, parseISO, differenceInDays } from "date-fns";

export function ManagerComplianceDashboard() {
  const stats = useComplianceStats();

  if (stats.isLoading) {
    return <div className="text-center py-12 text-sm text-muted-foreground">Loading compliance data…</div>;
  }

  const overdueAssignments = stats.assignments.filter((a: any) => {
    if (!a.due_date) return false;
    return new Date(a.due_date) < new Date() && !["completed", "acknowledged", "cancelled"].includes(a.status);
  }).slice(0, 10);

  const pendingSignoffs = stats.assignments.filter((a: any) =>
    a.signoff_required && !a.signed_off_at && a.status !== "cancelled"
  ).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Training Compliance</h2>
        <p className="text-xs text-muted-foreground">Team training progress and compliance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label="Overall"
          value={`${stats.complianceRate}%`}
          icon={<BarChart3 className="h-5 w-5" />}
          color={stats.complianceRate >= 80 ? "text-success" : stats.complianceRate >= 60 ? "text-warning" : "text-destructive"}
        />
        <KPICard
          label="Mandatory"
          value={`${stats.mandatoryRate}%`}
          icon={<Shield className="h-5 w-5" />}
          color={stats.mandatoryRate >= 90 ? "text-success" : stats.mandatoryRate >= 70 ? "text-warning" : "text-destructive"}
          subtitle={`${stats.mandatoryComplete}/${stats.mandatoryTotal}`}
        />
        <KPICard
          label="Overdue"
          value={String(stats.overdue)}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={stats.overdue > 0 ? "text-destructive" : "text-success"}
        />
        <KPICard
          label="Completed"
          value={String(stats.completed)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="text-success"
          subtitle={`of ${stats.total}`}
        />
      </div>

      {/* Department Breakdown */}
      {stats.byDepartment.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3">By Department</h3>
          <div className="space-y-3">
            {stats.byDepartment.map(dept => (
              <div key={dept.department}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{dept.department}</span>
                  <span className={cn("text-sm font-bold tabular-nums",
                    dept.rate >= 80 ? "text-success" : dept.rate >= 60 ? "text-warning" : "text-destructive"
                  )}>{dept.rate}%</span>
                </div>
                <Progress value={dept.rate} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{dept.completed}/{dept.total} completed</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Items */}
      {overdueAssignments.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold text-foreground">Overdue Training ({stats.overdue})</h3>
          </div>
          <div className="space-y-1.5">
            {overdueAssignments.map((a: any) => {
              const daysOverdue = differenceInDays(new Date(), parseISO(a.due_date));
              return (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {a.employees?.forename} {a.employees?.surname}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {a.training_library?.title}
                    </p>
                  </div>
                  <Badge className="text-[10px] bg-destructive/10 text-destructive shrink-0">{daysOverdue}d overdue</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Sign-offs */}
      {pendingSignoffs.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Pending Sign-offs ({stats.pendingSignoff})</h3>
          </div>
          <div className="space-y-1.5">
            {pendingSignoffs.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-warning/5 border border-warning/10">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {a.employees?.forename} {a.employees?.surname}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{a.training_library?.title}</p>
                </div>
                <Badge className="text-[10px] bg-warning/10 text-warning shrink-0">Awaiting</Badge>
              </div>
            ))}
          </div>
        </div>
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

function KPICard({ label, value, icon, color, subtitle }: {
  label: string; value: string; icon: React.ReactNode; color: string; subtitle?: string;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
      <div className={cn("mb-2", color)}>{icon}</div>
      <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>}
    </div>
  );
}
