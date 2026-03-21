import { CheckCircle2, Clock, AlertTriangle, Shield, ArrowRight, User, Calendar, UserCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useEmployeeReadiness, type ReadinessStatus } from "@/hooks/useOnboardingReadiness";

const statusConfig: Record<ReadinessStatus, {
  icon: any;
  color: string;
  bg: string;
  border: string;
}> = {
  record_created: {
    icon: User,
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    border: "border-muted-foreground/15",
  },
  onboarding_in_progress: {
    icon: Clock,
    color: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/15",
  },
  awaiting_employee_action: {
    icon: UserCheck,
    color: "text-warning",
    bg: "bg-warning/5",
    border: "border-warning/15",
  },
  awaiting_manager_review: {
    icon: Shield,
    color: "text-accent",
    bg: "bg-accent/5",
    border: "border-accent/15",
  },
  not_cleared_to_work: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/5",
    border: "border-destructive/15",
  },
  not_ready_for_rota: {
    icon: Calendar,
    color: "text-warning",
    bg: "bg-warning/5",
    border: "border-warning/15",
  },
  ready_to_schedule: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/5",
    border: "border-success/15",
  },
  fully_onboarded: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/5",
    border: "border-success/15",
  },
};

interface ReadinessBannerProps {
  employeeId: string;
}

export function ReadinessBanner({ employeeId }: ReadinessBannerProps) {
  const { data: readiness, isLoading } = useEmployeeReadiness(employeeId);

  if (isLoading || !readiness) return null;
  if (readiness.status === "fully_onboarded" && readiness.score === 100) return null;

  const config = statusConfig[readiness.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <StatusIcon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold", config.color)}>{readiness.statusLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{readiness.statusDescription}</p>
        </div>
      </div>

      {readiness.score < 100 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progress</span>
            <span className="text-xs font-bold tabular-nums">{readiness.score}%</span>
          </div>
          <Progress value={readiness.score} className="h-1.5" />
        </div>
      )}

      {/* Next action prompt */}
      {readiness.nextAction && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/60">
          <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs text-foreground">{readiness.nextAction}</span>
        </div>
      )}

      {/* Missing items by action owner */}
      {readiness.checks.filter(c => c.status !== "complete").length > 0 && (
        <div className="space-y-1">
          {readiness.checks
            .filter(c => c.status !== "complete")
            .slice(0, 5) // Show top 5 only in banner
            .map(check => (
              <div key={check.key} className="flex items-center gap-2">
                {check.status === "pending_verification" ? (
                  <Shield className="h-3.5 w-3.5 text-accent shrink-0" />
                ) : check.action_owner === "employee" ? (
                  <UserCheck className="h-3.5 w-3.5 text-warning shrink-0" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-xs text-muted-foreground">
                  {check.label}
                  {check.status === "pending_verification" && " — under review"}
                  {check.action_owner === "employee" && check.status === "missing" && " — needs your input"}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
