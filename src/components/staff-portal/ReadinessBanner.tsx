import { CheckCircle2, Clock, AlertTriangle, XCircle, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useEmployeeReadiness, type ReadinessStatus } from "@/hooks/useOnboardingReadiness";

const statusConfig: Record<ReadinessStatus, {
  label: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
}> = {
  ready: {
    label: "You're all set",
    description: "All onboarding requirements are complete.",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/5",
    border: "border-success/15",
  },
  pending: {
    label: "Setup incomplete",
    description: "Some required items are still missing — check the list below.",
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/5",
    border: "border-warning/15",
  },
  pending_verification: {
    label: "Awaiting review",
    description: "Your documents have been submitted and are being reviewed by your manager.",
    icon: Shield,
    color: "text-accent",
    bg: "bg-accent/5",
    border: "border-accent/15",
  },
  blocked: {
    label: "Action required",
    description: "Critical compliance items are missing — you may not be able to start work until these are resolved.",
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/5",
    border: "border-destructive/15",
  },
};

interface ReadinessBannerProps {
  employeeId: string;
}

export function ReadinessBanner({ employeeId }: ReadinessBannerProps) {
  const { data: readiness, isLoading } = useEmployeeReadiness(employeeId);

  // Don't show anything while loading or if fully ready
  if (isLoading || !readiness) return null;
  if (readiness.status === "ready" && readiness.score === 100) return null;

  const config = statusConfig[readiness.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <StatusIcon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold", config.color)}>{config.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
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

      {/* Missing items summary */}
      {(readiness.missingCritical.length > 0 || readiness.missingRequired.length > 0) && (
        <div className="space-y-1">
          {readiness.missingCritical.map(item => (
            <div key={item} className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <span className="text-xs text-destructive">{item}</span>
            </div>
          ))}
          {readiness.missingRequired.map(item => (
            <div key={item} className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pending verification */}
      {readiness.pendingVerification.length > 0 && (
        <div className="space-y-1">
          {readiness.pendingVerification.map(item => (
            <div key={item} className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="text-xs text-muted-foreground">{item} — under review</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
