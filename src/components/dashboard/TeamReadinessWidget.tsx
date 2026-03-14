import { Link } from "react-router-dom";
import { CheckCircle2, Clock, XCircle, Shield, ChevronRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useTeamReadiness, type ReadinessStatus } from "@/hooks/useOnboardingReadiness";

const statusConfig: Record<ReadinessStatus, { label: string; icon: any; color: string; bg: string }> = {
  ready: { label: "Ready", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  pending: { label: "Pending", icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  pending_verification: { label: "Verifying", icon: Shield, color: "text-accent", bg: "bg-accent/10" },
  blocked: { label: "Blocked", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

export function TeamReadinessWidget() {
  const { data: employees = [] } = useEmployees();
  const { data: readiness = [] } = useTeamReadiness(employees);

  if (readiness.length === 0) return null;

  const counts = {
    ready: readiness.filter(r => r.status === "ready").length,
    pending: readiness.filter(r => r.status === "pending").length,
    pending_verification: readiness.filter(r => r.status === "pending_verification").length,
    blocked: readiness.filter(r => r.status === "blocked").length,
  };

  const needsAttention = readiness.filter(r => r.status !== "ready");

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
        {(Object.entries(counts) as [ReadinessStatus, number][]).map(([status, count]) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          return (
            <div key={status} className={cn("flex flex-col items-center py-2 rounded-lg", config.bg)}>
              <Icon className={cn("h-4 w-4 mb-0.5", config.color)} />
              <span className="text-lg font-bold text-foreground tabular-nums">{count}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{config.label}</span>
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
