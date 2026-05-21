/**
 * Phase 5C/5D — Payroll approval evidence card (read-only, presentational).
 *
 * Renders a typed `PayrollApprovalEvidence` snapshot produced by
 * `buildPayrollApprovalEvidence`. This component is intentionally pure
 * presentation:
 *   - no approval logic
 *   - no mutation
 *   - no audit writes
 *   - no Supabase calls
 *   - no permission decisions
 *
 * The parent owns derivation and passes the evidence object in. This makes
 * the snapshot trivially testable in isolation and prepares it as the
 * candidate shape for future immutable persistence (see
 * `src/lib/payroll-approval-evidence.ts`).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldX,
  Lock,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import type {
  PayrollApprovalEvidence as Evidence,
  ApprovalEvidenceStatus,
} from "@/lib/payroll-approval-evidence";

interface Props {
  evidence: Evidence;
}

export function PayrollApprovalEvidence({ evidence }: Props) {
  const {
    periodName,
    periodDateRange,
    payrollEntryCount,
    warningCount,
    acknowledgementsRequired,
    acknowledgedWarningCount,
    approvalConfirmed,
    approvalBlocked,
    approvalBlockedReason,
    approvalStatus,
    approvalStatusLabel,
  } = evidence;

  const { Icon, iconCls, bannerCls } = statusVisuals(approvalStatus);

  return (
    <Card data-testid="approval-evidence" data-evidence-status={approvalStatus}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          Approval evidence
          <Badge
            variant="outline"
            className="ml-auto text-[10px]"
            data-testid="evidence-status-label"
          >
            {approvalStatusLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Field label="Period">
            <span className="font-medium text-foreground">{periodName}</span>
            {periodDateRange && (
              <span className="block text-[11px] text-muted-foreground">{periodDateRange}</span>
            )}
          </Field>
          <Field label="Entries included">
            <span className="font-medium text-foreground" data-testid="evidence-entry-count">
              {payrollEntryCount}
            </span>
          </Field>
          <Field label="Checklist warnings">
            <span className="font-medium text-foreground" data-testid="evidence-warning-count">
              {warningCount}
            </span>
            {acknowledgementsRequired > 0 && (
              <span className="ml-2 text-muted-foreground" data-testid="evidence-ack-progress">
                {acknowledgedWarningCount}/{acknowledgementsRequired} acknowledged
              </span>
            )}
          </Field>
          <Field label="Approval confirmation">
            <span
              className={`font-medium ${approvalConfirmed ? "text-success" : "text-muted-foreground"}`}
              data-testid="evidence-confirmed"
            >
              {approvalConfirmed ? "Ticked" : "Not ticked"}
            </span>
          </Field>
        </div>

        <div
          className={`rounded-md border p-2.5 flex items-start gap-2 ${bannerCls}`}
          data-testid="evidence-status"
        >
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconCls}`} />
          <div className="flex-1 min-w-0">
            {approvalStatus === "locked" ? (
              <p className="text-xs">
                <span className="font-medium">Period locked.</span>{" "}
                <span className="text-muted-foreground">
                  Approval evidence is read-only.
                </span>
              </p>
            ) : approvalStatus === "draft_readiness_only" ? (
              <p className="text-xs">
                <span className="font-medium">Draft readiness only.</span>{" "}
                <span className="text-muted-foreground">
                  Final approval controls appear once the period is moved to pending review.
                </span>
              </p>
            ) : approvalBlocked ? (
              <p className="text-xs">
                <span className="font-medium">Approval blocked.</span>{" "}
                <span className="text-muted-foreground" data-testid="evidence-blocked-reason">
                  {approvalBlockedReason}
                </span>
              </p>
            ) : (
              <p className="text-xs">
                <span className="font-medium">Ready for approval.</span>{" "}
                <span className="text-muted-foreground">
                  All checklist items resolved or acknowledged.
                </span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function statusVisuals(
  status: ApprovalEvidenceStatus,
): { Icon: LucideIcon; iconCls: string; bannerCls: string } {
  switch (status) {
    case "locked":
      return {
        Icon: Lock,
        iconCls: "text-muted-foreground",
        bannerCls: "border-border bg-muted/40",
      };
    case "blocked":
      return {
        Icon: ShieldX,
        iconCls: "text-destructive",
        bannerCls: "border-warning/30 bg-warning/5",
      };
    case "draft_readiness_only":
      return {
        Icon: AlertTriangle,
        iconCls: "text-muted-foreground",
        bannerCls: "border-border bg-muted/40",
      };
    case "ready_for_approval":
    default:
      return {
        Icon: CheckCircle2,
        iconCls: "text-success",
        bannerCls: "border-success/30 bg-success/5",
      };
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-xs">{children}</div>
    </div>
  );
}
