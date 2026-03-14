import { CheckCircle2, Clock, AlertTriangle, XCircle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useEmployeeReadiness, type ReadinessStatus } from "@/hooks/useOnboardingReadiness";

const statusConfig: Record<ReadinessStatus, { label: string; shortLabel: string; description: string; icon: any; color: string; bg: string }> = {
  ready: { label: "Ready to Work", shortLabel: "Ready", description: "All requirements met — this employee can be scheduled.", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  pending: { label: "Setup Incomplete", shortLabel: "Pending", description: "Some required items are still missing.", icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  pending_verification: { label: "Awaiting Admin Verification", shortLabel: "Verifying", description: "Documents uploaded but need admin review before clearance.", icon: Shield, color: "text-accent", bg: "bg-accent/10" },
  blocked: { label: "Blocked — Cannot Work", shortLabel: "Blocked", description: "Critical compliance items are missing. This employee cannot be scheduled.", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

const checkStatusIcon: Record<string, { icon: any; color: string }> = {
  complete: { icon: CheckCircle2, color: "text-success" },
  pending_verification: { icon: Clock, color: "text-accent" },
  missing: { icon: XCircle, color: "text-muted-foreground" },
};

interface OnboardingChecklistProps {
  employeeId: string;
}

export function OnboardingChecklist({ employeeId }: OnboardingChecklistProps) {
  const { data: readiness, isLoading } = useEmployeeReadiness(employeeId);

  if (isLoading || !readiness) return null;

  const config = statusConfig[readiness.status];
  const StatusIcon = config.icon;

  return (
    <div className="space-y-3">
      {/* Status header */}
      <div className={cn("flex items-center gap-3 p-3 rounded-lg", config.bg)}>
        <StatusIcon className={cn("h-5 w-5", config.color)} />
        <div className="flex-1">
          <p className={cn("text-sm font-semibold", config.color)}>{config.label}</p>
          <p className="text-[11px] text-muted-foreground">{config.description}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs", config.color)}>
          {readiness.score}%
        </Badge>
      </div>

      <Progress value={readiness.score} className="h-1.5" />

      {/* Blocked warning */}
      {readiness.missingCritical.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-destructive">Critical requirements missing</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {readiness.missingCritical.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-1">
        {readiness.checks.map(check => {
          const checkConfig = checkStatusIcon[check.status];
          const Icon = checkConfig.icon;
          return (
            <div key={check.key} className="flex items-center gap-2.5 py-1.5">
              <Icon className={cn("h-4 w-4 shrink-0", checkConfig.color)} />
              <span className={cn(
                "text-sm flex-1",
                check.status === "complete" ? "text-foreground" : "text-muted-foreground"
              )}>
                {check.label}
              </span>
              {check.is_critical && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-destructive border-destructive/20">
                  Critical
                </Badge>
              )}
              {check.status === "pending_verification" && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-accent border-accent/20">
                  Verifying
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReadinessStatusBadge({ status }: { status: ReadinessStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1", config.color, `border-current/20`)}>
      <Icon className="h-3 w-3" />
      {config.shortLabel}
    </Badge>
  );
}
