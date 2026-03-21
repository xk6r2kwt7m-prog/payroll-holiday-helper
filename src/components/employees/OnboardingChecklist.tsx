import { useState } from "react";
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, Shield, ExternalLink,
  ArrowRight, User, FileText, CreditCard, Calendar, BookOpen, UserCheck,
  ChevronDown, ChevronRight, Send, Link2, Mail
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useEmployeeReadiness, type ReadinessStatus, type CriticalityTier } from "@/hooks/useOnboardingReadiness";
import { useNavigate } from "react-router-dom";
import { useInviteEmail } from "@/hooks/useInviteEmail";
import { toast } from "sonner";
import type { Employee } from "@/hooks/useEmployees";

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

const tierLabels: Record<CriticalityTier, { label: string; color: string; headerLabel: string }> = {
  legal_critical: { label: "Legal", color: "text-destructive border-destructive/20", headerLabel: "Legal & Compliance" },
  start_critical: { label: "Start", color: "text-warning border-warning/20", headerLabel: "Start-Day Critical" },
  payroll_critical: { label: "Payroll", color: "text-primary border-primary/20", headerLabel: "Payroll" },
  rota_critical: { label: "Rota", color: "text-accent border-accent/20", headerLabel: "Scheduling" },
  profile_only: { label: "Optional", color: "text-muted-foreground border-muted-foreground/20", headerLabel: "Profile & Optional" },
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

/**
 * Collapsible tier group — collapses when all items are complete.
 */
function TierGroup({ tier, headerLabel, color, checks, employeeId, onCheckClick }: {
  tier: CriticalityTier;
  headerLabel: string;
  color: string;
  checks: Array<{ key: string; label: string; status: string; criticality: CriticalityTier; action_owner: string }>;
  employeeId: string;
  onCheckClick: (key: string) => void;
}) {
  const allComplete = checks.every(c => c.status === "complete");
  const completeCount = checks.filter(c => c.status === "complete").length;
  const [isOpen, setIsOpen] = useState(!allComplete);

  const ChevronIcon = isOpen ? ChevronDown : ChevronRight;

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 w-full text-left py-1 px-1.5 rounded-md hover:bg-muted/30 transition-colors"
      >
        <ChevronIcon className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex-1">
          {headerLabel}
        </span>
        {allComplete ? (
          <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
        ) : (
          <span className="text-[10px] text-muted-foreground tabular-nums">{completeCount}/{checks.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="space-y-0">
          {checks.map(check => {
            const checkConfig = checkStatusIcon[check.status];
            const Icon = checkConfig.icon;
            const action = check.status !== "complete" ? getCheckAction(check.key, employeeId) : null;
            const isClickable = !!action;
            const isComplete = check.status === "complete";

            return (
              <div
                key={check.key}
                className={cn(
                  "flex items-center gap-2.5 py-1.5 px-1.5 rounded-md transition-colors",
                  isClickable && "cursor-pointer hover:bg-muted/50",
                  isComplete && "opacity-60"
                )}
                onClick={() => isClickable && onCheckClick(check.key)}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => { if (isClickable && e.key === "Enter") onCheckClick(check.key); }}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", checkConfig.color)} />
                <span className={cn(
                  "text-xs flex-1",
                  isComplete ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {check.label}
                </span>
                {!isComplete && check.status === "pending_verification" && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-accent border-accent/20">
                    Review
                  </Badge>
                )}
                {!isComplete && check.action_owner === "employee" && check.status === "missing" && (
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
      )}
    </div>
  );
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

  // Group checks by criticality tier
  const tiers: CriticalityTier[] = ["legal_critical", "start_critical", "payroll_critical", "rota_critical", "profile_only"];
  const groupedChecks = tiers
    .map(tier => ({
      tier,
      meta: tierLabels[tier],
      checks: readiness.checks.filter(c => c.criticality === tier),
    }))
    .filter(g => g.checks.length > 0);

  // Find first actionable next-step for the dynamic button
  const firstIncomplete = readiness.checks.find(c => c.status !== "complete");
  const nextStepAction = firstIncomplete ? getCheckAction(firstIncomplete.key, employeeId) : null;

  return (
    <div className="space-y-3">
      {/* ── Status header: Status + Reason + Next Action ── */}
      <div className={cn("p-3 rounded-lg space-y-2", config.bg)}>
        <div className="flex items-center gap-3">
          <StatusIcon className={cn("h-5 w-5 shrink-0", config.color)} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-semibold", config.color)}>{readiness.statusLabel}</p>
            <p className="text-[11px] text-muted-foreground">{readiness.statusDescription}</p>
          </div>
          <Badge variant="outline" className={cn("text-xs shrink-0 tabular-nums", config.color)}>
            {readiness.score}%
          </Badge>
        </div>

        {/* Next action prompt */}
        {readiness.nextAction && (
          <div
            className={cn(
              "flex items-center gap-2 p-2 rounded-md bg-background/60 border border-primary/10",
              nextStepAction && "cursor-pointer hover:bg-background/80 transition-colors"
            )}
            onClick={() => nextStepAction && navigate(nextStepAction.path)}
            role={nextStepAction ? "button" : undefined}
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-primary">Next step</p>
              <p className="text-[11px] text-muted-foreground">{readiness.nextAction}</p>
            </div>
            {nextStepAction && <ExternalLink className="h-3 w-3 text-primary/50 shrink-0" />}
          </div>
        )}
      </div>

      {/* Manager reassurance */}
      {readiness.status !== "fully_onboarded" && readiness.status !== "ready_to_schedule" && (
        <p className="text-[11px] text-muted-foreground italic px-1">
          Manager can continue setup — only scheduling and work clearance are gated.
        </p>
      )}

      <Progress value={readiness.score} className="h-1.5" />

      {/* ── Grouped checklist by criticality tier (collapsible) ── */}
      <div className="space-y-2">
        {groupedChecks.map(group => (
          <TierGroup
            key={group.tier}
            tier={group.tier}
            headerLabel={group.meta.headerLabel}
            color={group.meta.color}
            checks={group.checks}
            employeeId={employeeId}
            onCheckClick={handleCheckClick}
          />
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
