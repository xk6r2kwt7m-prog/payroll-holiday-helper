import { useState } from "react";
import { CheckCircle, AlertCircle, Lock, Send, Undo2, Loader2, Trash2, ShieldAlert, ShieldCheck, ShieldX, RefreshCw, Eye, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePeriodAudit, useRecalculatePeriodTotals, type AuditFinding } from "@/hooks/usePayrollAudit";
import { useTenant } from "@/hooks/useTenant";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PayrollImportIssue } from "@/hooks/usePayrollImportStatus";
import { DeletePeriodDialog } from "@/components/payroll/DeletePeriodDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PayrollApprovalWorkflowProps {
  period: {
    id: string;
    status: string;
    period_name: string;
    approved_at?: string | null;
    approved_by?: string | null;
    notes?: string | null;
  };
  isAdmin: boolean;
  onSubmitForReview: () => void;
  onApprove: () => void;
  onReopen: () => void;
  onDelete?: (args: { reason: string; impact: Record<string, any> | null }) => void;
  isSubmitting: boolean;
  isApproving: boolean;
  isReopening: boolean;
  isDeleting?: boolean;
  entryCount: number;
  zeroHoursCount: number;
  unresolvedImportIssues?: PayrollImportIssue[];
  excludedNames?: string[];
  /**
   * Phase 5A — optional external gate. When set, the approve button is
   * disabled and the reason is shown. Used to gate approval behind the
   * Phase 5 approval-readiness checklist without replacing this workflow.
   */
  externalApprovalBlock?: string | null;
}

const workflowSteps = [
  { status: "draft", label: "Draft", description: "Edit hours, rates, and bonuses" },
  { status: "pending", label: "Pending Review", description: "Submitted for approval" },
  { status: "approved", label: "Approved & Locked", description: "Read-only, ready for payment" },
];

export function PayrollApprovalWorkflow({
  period,
  isAdmin,
  onSubmitForReview,
  onApprove,
  onReopen,
  onDelete,
  isSubmitting,
  isApproving,
  isReopening,
  isDeleting = false,
  entryCount,
  zeroHoursCount,
  unresolvedImportIssues = [],
  excludedNames = [],
  externalApprovalBlock = null,
}: PayrollApprovalWorkflowProps) {
  const currentStepIndex = workflowSteps.findIndex(s => s.status === period.status);
  const hasUnmatchedEmployees = unresolvedImportIssues.length > 0;
  const hasExcludedEmployees = excludedNames.length > 0;
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Audit gate
  const shouldAudit = period.status === "draft" || period.status === "pending";
  const { data: auditFindings = [], isLoading: auditLoading, refetch: rerunAudit, isFetching: auditRefetching } = usePeriodAudit(
    shouldAudit ? period.id : undefined,
    shouldAudit,
    tenantId
  );
  const blockingErrors = auditFindings.filter(f => f.severity === "error" && f.blocking !== false);
  const auditErrors = auditFindings.filter(f => f.severity === "error");
  const auditWarnings = auditFindings.filter(f => f.severity === "warning");
  const hasBlockingErrors = blockingErrors.length > 0;
  const canSubmitOrApprove = !hasUnmatchedEmployees && !hasBlockingErrors && !externalApprovalBlock;

  const recalculateTotals = useRecalculatePeriodTotals();

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await recalculateTotals(period.id);
      toast.success("Totals recalculated successfully");
      rerunAudit();
    } catch {
      toast.error("Failed to recalculate totals");
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="rounded-xl bg-card shadow-card p-4 sm:p-5 animate-fade-in overflow-hidden">
      {/* Workflow Steps */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto no-scrollbar">
        {workflowSteps.map((step, i) => {
          const isActive = step.status === period.status;
          const isPast = i < currentStepIndex;
          return (
            <div key={step.status} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {i > 0 && (
                <div className={`h-px w-4 sm:w-8 ${isPast ? "bg-success" : "bg-border"}`} />
              )}
              <div className="flex items-center gap-1.5">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium shrink-0 ${
                  isPast ? "bg-success text-success-foreground" :
                  isActive ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isPast ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase 5C — externally-derived approval block (e.g. checklist gate).
          Rendered in a single, consistent place so managers always see why
          approval cannot proceed, regardless of period status. */}
      {externalApprovalBlock && period.status !== "approved" && (
        <div
          data-testid="external-approval-block"
          className="rounded-lg bg-warning/10 border border-warning/20 p-3 mb-4 flex items-start gap-2"
        >
          <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/90">
            <span className="font-medium">Approval is currently blocked.</span>{" "}
            <span className="text-muted-foreground">{externalApprovalBlock}</span>
          </p>
        </div>
      )}


      {/* Unmatched employees */}
      {hasUnmatchedEmployees && !hasExcludedEmployees && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm font-medium text-destructive">
              {unresolvedImportIssues.length} unresolved {unresolvedImportIssues.length === 1 ? "issue" : "issues"} — review above before submission.
            </p>
          </div>
        </div>
      )}

      {/* Audit gate */}
      {shouldAudit && !auditLoading && auditFindings.length > 0 && (
        <div className={`rounded-lg ${hasBlockingErrors ? "bg-destructive/10 border-destructive/20" : "bg-warning/10 border-warning/20"} border p-4 mb-4`}>
          <div className="flex items-start gap-3">
            {hasBlockingErrors ? (
              <ShieldX className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${hasBlockingErrors ? "text-destructive" : "text-warning"}`}>
                {hasBlockingErrors
                  ? `Audit failed — ${blockingErrors.length} blocking issue${blockingErrors.length !== 1 ? "s" : ""} found`
                  : `Audit warnings — ${auditWarnings.length} non-blocking issue${auditWarnings.length !== 1 ? "s" : ""}`}
              </p>
              {hasBlockingErrors && (
                <p className="text-xs text-muted-foreground mt-1">
                  Resolve all blocking issues before approval. Use the buttons below to review or fix.
                </p>
              )}
              {!hasBlockingErrors && auditErrors.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {auditErrors.length} non-blocking error{auditErrors.length !== 1 ? "s" : ""} detected. Review recommended.
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setReviewOpen(true)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Review audit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => rerunAudit()}
                  disabled={auditRefetching}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${auditRefetching ? "animate-spin" : ""}`} />
                  Run audit again
                </Button>
                {auditFindings.some(f => f.actionType === "recalculate_totals") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleRecalculate}
                    disabled={recalculating}
                  >
                    <Calculator className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
                    {recalculating ? "Recalculating..." : "Recalculate totals"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {shouldAudit && auditLoading && (
        <div className="rounded-lg bg-muted/50 border border-border p-4 mb-4 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Running pre-approval audit checks...</span>
        </div>
      )}

      {shouldAudit && !auditLoading && auditFindings.length === 0 && (
        <div className="rounded-lg bg-success/10 border border-success/20 p-4 mb-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-success" />
          <div className="flex-1">
            <p className="font-medium text-success text-sm">All Audit Checks Passed</p>
            <p className="text-xs text-muted-foreground">Calculations, holiday accruals, totals, and duplicate checks verified.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-muted-foreground"
            onClick={() => rerunAudit()}
            disabled={auditRefetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${auditRefetching ? "animate-spin" : ""}`} />
            Rerun
          </Button>
        </div>
      )}

      {/* Audit Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Audit Review — {period.period_name}
            </DialogTitle>
            <DialogDescription>
              {blockingErrors.length} blocking issue{blockingErrors.length !== 1 ? "s" : ""}, {auditWarnings.length} warning{auditWarnings.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {auditFindings.map((f) => (
              <div
                key={f.id}
                className={`rounded-lg border p-4 space-y-2 ${
                  f.severity === "error" && f.blocking !== false
                    ? "bg-destructive/5 border-destructive/20"
                    : f.severity === "error"
                    ? "bg-warning/5 border-warning/20"
                    : "bg-warning/5 border-warning/20"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={f.severity === "error" ? "text-destructive" : "text-warning"}>
                    {f.severity === "error" ? "✗" : "⚠"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-card-foreground">{f.title}</p>
                      {f.blocking !== false && f.severity === "error" && (
                        <Badge variant="destructive" className="text-[10px] h-4">Blocking</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{f.detail}</p>
                    {f.explanation && (
                      <p className="text-xs text-foreground/80 mt-2 bg-muted/30 rounded px-2 py-1.5">
                        💡 {f.explanation}
                      </p>
                    )}
                    {(f.expected !== undefined || f.actual !== undefined) && (
                      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                        {f.expected !== undefined && <span>Expected: <strong>{f.expected.toFixed(2)}</strong></span>}
                        {f.actual !== undefined && <span>Actual: <strong>{f.actual.toFixed(2)}</strong></span>}
                        {f.difference !== undefined && (
                          <span>Diff: <strong className={f.severity === "error" ? "text-destructive" : "text-warning"}>
                            {f.difference.toFixed(2)}
                          </strong></span>
                        )}
                      </div>
                    )}
                    {f.suggestedAction && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        → {f.suggestedAction}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { rerunAudit(); }}
              disabled={auditRefetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${auditRefetching ? "animate-spin" : ""}`} />
              Run audit again
            </Button>
            {auditFindings.some(f => f.actionType === "recalculate_totals") && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleRecalculate}
                disabled={recalculating}
              >
                <Calculator className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
                {recalculating ? "Recalculating..." : "Recalculate totals"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setReviewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status-specific content */}
      {period.status === "draft" && isAdmin && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 sm:p-4">
          <div className="flex items-start gap-3 mb-3 sm:mb-0">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-card-foreground text-sm">Draft – Editable</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {entryCount} employees · {zeroHoursCount > 0 ? `${zeroHoursCount} with 0 hrs` : "All hours entered"}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-2 sm:mt-0">
            {onDelete && (
              <DeletePeriodDialog
                periodId={period.id}
                periodName={period.period_name}
                isDeleting={isDeleting}
                onConfirm={({ reason, impact }) => onDelete({ reason, impact })}
              />
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={isSubmitting || entryCount === 0 || !canSubmitOrApprove} className="w-full sm:w-auto min-h-[44px]">
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Submitting..." : "Submit for Review"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit {period.period_name} for review?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {zeroHoursCount > 0 && (
                      <span className="block text-warning font-medium mb-2">
                        ⚠️ {zeroHoursCount} employee{zeroHoursCount > 1 ? "s have" : " has"} 0 hours. Continue anyway?
                      </span>
                    )}
                    Once submitted, entries cannot be edited until the period is reopened.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onSubmitForReview}>Submit</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {period.status === "pending" && isAdmin && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 sm:p-4">
          <div className="flex items-start gap-3 mb-3 sm:mb-0">
            <Send className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-card-foreground text-sm">Pending Review</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Review all entries. Approval is completed from the readiness checklist above.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-2 sm:mt-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isReopening} className="w-full sm:w-auto min-h-[44px]">
                  <Undo2 className="mr-2 h-4 w-4" />
                  Reopen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reopen this payroll period?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will move the period back to "Draft" status, allowing edits.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onReopen}>Reopen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}


      {period.status === "approved" && (
        <div className="rounded-lg bg-success/10 border border-success/20 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-success text-sm">Approved & Locked</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {period.approved_at
                  ? `Approved ${new Date(period.approved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                  : "This period is locked and read-only"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="mt-2 flex sm:justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isReopening} className="w-full sm:w-auto min-h-[44px]">
                    <Undo2 className="mr-2 h-4 w-4" />
                    Reopen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ Reopen approved period?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <strong className="text-destructive">This is a controlled action.</strong> Reopening an approved
                      period will move it back to draft status, allowing edits. This is recorded in the audit log.
                      <br /><br />
                      Only proceed if corrections are genuinely required.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onReopen} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Reopen Period
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      )}

      {period.status === "rejected" && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-destructive text-sm">Rejected</p>
              <p className="text-xs sm:text-sm text-muted-foreground">This period was rejected. Reopen to make corrections.</p>
            </div>
          </div>
          {isAdmin && (
            <div className="mt-2 flex sm:justify-end">
              <Button variant="outline" size="sm" onClick={onReopen} disabled={isReopening} className="w-full sm:w-auto min-h-[44px]">
                <Undo2 className="mr-2 h-4 w-4" />
                Reopen as Draft
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
