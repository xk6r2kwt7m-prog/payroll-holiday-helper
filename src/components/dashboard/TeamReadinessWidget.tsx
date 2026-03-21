import { Link } from "react-router-dom";
import { CheckCircle2, Clock, AlertTriangle, Shield, ChevronRight, Users, Calendar, User, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useTeamReadiness, type ReadinessStatus } from "@/hooks/useOnboardingReadiness";

const statusConfig: Record<ReadinessStatus, { label: string; icon: any; color: string; bg: string }> = {
  record_created: { label: "New", icon: User, color: "text-muted-foreground", bg: "bg-muted/50" },
  onboarding_in_progress: { label: "In Progress", icon: Clock, color: "text-primary", bg: "bg-primary/10" },
  awaiting_employee_action: { label: "Staff Action", icon: UserCheck, color: "text-warning", bg: "bg-warning/10" },
  awaiting_manager_review: { label: "Review", icon: Shield, color: "text-accent", bg: "bg-accent/10" },
  not_cleared_to_work: { label: "Not Cleared", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  not_ready_for_rota: { label: "Not Schedulable", icon: Calendar, color: "text-warning", bg: "bg-warning/10" },
  ready_to_schedule: { label: "Schedulable", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  fully_onboarded: { label: "Complete", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
};

// Statuses that count as "needs attention" in the dashboard widget
const NEEDS_ATTENTION: ReadinessStatus[] = [
  "record_created", "onboarding_in_progress", "awaiting_employee_action",
  "awaiting_manager_review", "not_cleared_to_work", "not_ready_for_rota",
];

// Statuses shown as summary counts
const SUMMARY_STATUSES: { key: string; label: string; filter: (s: ReadinessStatus) => boolean; icon: any; color: string; bg: string }[] = [
  { key: "complete", label: "Ready", filter: s => s === "fully_onboarded" || s === "ready_to_schedule", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  { key: "progress", label: "In Progress", filter: s => s === "onboarding_in_progress" || s === "record_created", icon: Clock, color: "text-primary", bg: "bg-primary/10" },
  { key: "action", label: "Action Needed", filter: s => s === "awaiting_employee_action" || s === "awaiting_manager_review", icon: Shield, color: "text-accent", bg: "bg-accent/10" },
  { key: "blocked", label: "Not Cleared", filter: s => s === "not_cleared_to_work" || s === "not_ready_for_rota", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
];

export function TeamReadinessWidget() {
  const { data: employees = [] } = useEmployees();
  const { data: readiness = [] } = useTeamReadiness(employees);

  if (readiness.length === 0) return null;

  const needsAttention = readiness.filter(r => NEEDS_ATTENTION.includes(r.status));

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Onboarding Readiness</h2>
        <Link to="/employees?status=onboarding" className="text-xs text-primary font-medium flex items-center gap-0.5">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {SUMMARY_STATUSES.map(({ key, label, filter, icon: Icon, color, bg }) => {
          const count = readiness.filter(r => filter(r.status)).length;
          return (
            <div key={key} className={cn("flex flex-col items-center py-2 rounded-lg", bg)}>
              <Icon className={cn("h-4 w-4 mb-0.5", color)} />
              <span className="text-lg font-bold text-foreground tabular-nums">{count}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
          );
        })}
      </div>

      {/* People needing attention */}
      {needsAttention.length > 0 && (
        <div className="space-y-1.5">
          {needsAttention.slice(0, 5).map(r => {
            const config = statusConfig[r.status];
            const Icon = config.icon;
            const missingItems = [...r.missingCritical, ...r.missingRequired, ...r.pendingVerification];
            return (
              <Link
                key={r.employeeId}
                to={`/employees`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-sm active:bg-muted transition-all"
              >
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", config.bg)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.employeeName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {missingItems.slice(0, 2).join(", ")}
                    {missingItems.length > 2 && ` +${missingItems.length - 2}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Progress value={r.score} className="h-1 w-10" />
                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{r.score}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
