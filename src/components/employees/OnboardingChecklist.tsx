import {
  CheckCircle2, Clock, AlertTriangle, XCircle, Shield, ExternalLink,
  ArrowRight, User, FileText, CreditCard, Calendar, BookOpen, UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useEmployeeReadiness, type ReadinessStatus, type CriticalityTier } from "@/hooks/useOnboardingReadiness";
import { useNavigate } from "react-router-dom";

// ─── Status visual config ─────────────────────────────────────────────
const statusConfig: Record<ReadinessStatus, {
  label: string;
  shortLabel: string;
  icon: any;
  color: string;
  bg: string;
}> = {
  record_created: {
    label: "Record Created",
    shortLabel: "New",
    icon: User,
    color: "text-muted-foreground",
    bg: "bg-muted/50",
  },
  onboarding_in_progress: {
    label: "Onboarding In Progress",
    shortLabel: "In Progress",
    icon: Clock,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  awaiting_employee_action: {
    label: "Employee Action Required",
    shortLabel: "Staff Action",
    icon: UserCheck,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  awaiting_manager_review: {
    label: "Awaiting Manager Review",
    shortLabel: "Review",
    icon: Shield,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  not_cleared_to_work: {
    label: "Not Cleared to Work Yet",
    shortLabel: "Not Cleared",
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  not_ready_for_rota: {
    label: "Not Ready for Rota",
    shortLabel: "Not Schedulable",
    icon: Calendar,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  ready_to_schedule: {
    label: "Ready to Schedule",
    shortLabel: "Schedulable",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
  },
  fully_onboarded: {
    label: "Fully Onboarded",
    shortLabel: "Complete",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
  },
};

const checkStatusIcon: Record<string, { icon: any; color: string }> = {
  complete: { icon: CheckCircle2, color: "text-success" },
  pending_verification: { icon: Shield, color: "text-accent" },
  missing: { icon: XCircle, color: "text-muted-foreground" },
};

const tierLabels: Record<CriticalityTier, { label: string; color: string }> = {
  legal_critical: { label: "Legal", color: "text-destructive border-destructive/20" },
  start_critical: { label: "Start", color: "text-warning border-warning/20" },
  payroll_critical: { label: "Payroll", color: "text-primary border-primary/20" },
  rota_critical: { label: "Rota", color: "text-accent border-accent/20" },
  profile_only: { label: "Optional", color: "text-muted-foreground border-muted-foreground/20" },
};

/**
 * Deep-link map: returns employee-specific routing for each check key.
 */
function getCheckAction(key: string, employeeId: string): { path: string; label: string } | null {
  switch (key) {
    case "personal_information":
      return { path: `/employees?edit=${employeeId}&tab=personal`, label: "Edit personal details" };
    case "bank_details":
      return { path: `/employees?edit=${employeeId}&tab=banking`, label: "Add bank details" };
    case "right_to_work":
      return { path: `/employees?edit=${employeeId}&tab=rtw`, label: "Review RTW" };
    case "contract_signed":
      return { path: `/contracts?employee=${employeeId}`, label: "Create contract" };
    case "emergency_contact":
      return { path: `/employees?edit=${employeeId}&tab=personal`, label: "Add emergency contact" };
    case "availability":
      return { path: `/employees?edit=${employeeId}&tab=notes`, label: "Set availability" };
    case "training_records":
      return { path: `/training?tab=tracking&employee=${employeeId}`, label: "Assign training" };
    default:
      if (key.startsWith("training_lib_")) {
        return { path: `/training?tab=tracking&employee=${employeeId}`, label: "Complete training" };
      }
      return null;
  }
}

interface OnboardingChecklistProps {
  employeeId: string;
}

export function OnboardingChecklist({ employeeId }: OnboardingChecklistProps) {
  const { data: readiness, isLoading } = useEmployeeReadiness(employeeId);
  const navigate = useNavigate();

  if (isLoading || !readiness) return null;

  const config = statusConfig[readiness.status];
  const StatusIcon = config.icon;

  const handleCheckClick = (key: string) => {
    const action = getCheckAction(key, employeeId);
    if (action) navigate(action.path);
  };

  // Group checks by criticality tier for clear visual separation
  const tiers: CriticalityTier[] = ["legal_critical", "start_critical", "payroll_critical", "rota_critical", "profile_only"];
  const groupedChecks = tiers
    .map(tier => ({
      tier,
      meta: tierLabels[tier],
      checks: readiness.checks.filter(c => c.criticality === tier),
    }))
    .filter(g => g.checks.length > 0);

  return (
    <div className="space-y-3">
      {/* Status header — never says "Blocked" */}
      <div className={cn("flex items-center gap-3 p-3 rounded-lg", config.bg)}>
        <StatusIcon className={cn("h-5 w-5 shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold", config.color)}>{readiness.statusLabel}</p>
          <p className="text-[11px] text-muted-foreground">{readiness.statusDescription}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs shrink-0", config.color)}>
          {readiness.score}%
        </Badge>
      </div>

      {/* Manager reassurance */}
      {readiness.status !== "fully_onboarded" && readiness.status !== "ready_to_schedule" && (
        <p className="text-[11px] text-muted-foreground italic px-1">
          Manager can continue setup — only scheduling and work clearance are gated.
        </p>
      )}

      <Progress value={readiness.score} className="h-1.5" />

      {/* Next action prompt */}
      {readiness.nextAction && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-primary">Next step</p>
            <p className="text-[11px] text-muted-foreground">{readiness.nextAction}</p>
          </div>
        </div>
      )}

      {/* Grouped checklist by criticality tier */}
      <div className="space-y-3">
        {groupedChecks.map(group => (
          <div key={group.tier} className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1.5">
              {group.meta.label} Requirements
            </p>
            {group.checks.map(check => {
              const checkConfig = checkStatusIcon[check.status];
              const Icon = checkConfig.icon;
              const action = check.status !== "complete" ? getCheckAction(check.key, employeeId) : null;
              const isClickable = !!action;

              return (
                <div
                  key={check.key}
                  className={cn(
                    "flex items-center gap-2.5 py-1.5 px-1.5 rounded-md transition-colors",
                    isClickable && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => isClickable && handleCheckClick(check.key)}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={(e) => { if (isClickable && e.key === "Enter") handleCheckClick(check.key); }}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", checkConfig.color)} />
                  <span className={cn(
                    "text-sm flex-1",
                    check.status === "complete" ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {check.label}
                  </span>
                  {check.status !== "complete" && (
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", tierLabels[check.criticality].color)}>
                      {tierLabels[check.criticality].label}
                    </Badge>
                  )}
                  {check.status === "pending_verification" && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-accent border-accent/20">
                      Review
                    </Badge>
                  )}
                  {check.action_owner === "employee" && check.status === "missing" && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground border-muted-foreground/20">
                      Staff
                    </Badge>
                  )}
                  {isClickable && (
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
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
