import { CheckCircle, AlertCircle, Lock, Send, Undo2, Loader2, Trash2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePeriodAudit, type AuditFinding } from "@/hooks/usePayrollAudit";
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
  onDelete?: () => void;
  isSubmitting: boolean;
  isApproving: boolean;
  isReopening: boolean;
  isDeleting?: boolean;
  entryCount: number;
  zeroHoursCount: number;
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
}: PayrollApprovalWorkflowProps) {
  const currentStepIndex = workflowSteps.findIndex(s => s.status === period.status);
  const hasUnmatchedEmployees = period.notes?.includes("⚠ PENDING:");
  
  // Audit gate: run period-level audit for pending/draft periods
  const shouldAudit = period.status === "draft" || period.status === "pending";
  const { data: auditFindings = [], isLoading: auditLoading } = usePeriodAudit(
    shouldAudit ? period.id : undefined,
    shouldAudit
  );
  const auditErrors = auditFindings.filter(f => f.severity === "error");
  const auditWarnings = auditFindings.filter(f => f.severity === "warning");
  const hasAuditErrors = auditErrors.length > 0;
  const canSubmitOrApprove = !hasUnmatchedEmployees && !hasAuditErrors;
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

      {/* Unmatched employees warning - blocks approval */}
      {hasUnmatchedEmployees && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">Unmatched Employees — Action Required</p>
              <p className="text-sm text-muted-foreground mt-1">
                {period.notes?.replace("⚠ PENDING: ", "")}
              </p>
              <p className="text-sm font-medium text-destructive mt-1">
                You cannot submit or approve this payroll until all employees are in the database and added to this period.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audit gate - blocks approval */}
      {shouldAudit && !auditLoading && auditFindings.length > 0 && (
        <div className={`rounded-lg ${hasAuditErrors ? "bg-destructive/10 border-destructive/20" : "bg-warning/10 border-warning/20"} border p-4 mb-4`}>
          <div className="flex items-center gap-3">
            {hasAuditErrors ? (
              <ShieldX className="h-5 w-5 text-destructive shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${hasAuditErrors ? "text-destructive" : "text-warning"}`}>
                Audit {hasAuditErrors ? "Failed" : "Warnings"} — {auditErrors.length} error{auditErrors.length !== 1 ? "s" : ""}, {auditWarnings.length} warning{auditWarnings.length !== 1 ? "s" : ""}
              </p>
              {hasAuditErrors && (
                <p className="text-sm font-medium text-destructive mt-1">
                  You cannot approve this period until all audit errors are resolved.
                </p>
              )}
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {auditFindings.slice(0, 5).map((f) => (
                  <p key={f.id} className={`text-xs flex items-center gap-1.5 ${f.severity === "error" ? "text-destructive" : "text-warning"}`}>
                    {f.severity === "error" ? "✗" : "⚠"} {f.title}: {f.detail}
                  </p>
                ))}
                {auditFindings.length > 5 && (
                  <p className="text-xs text-muted-foreground">...and {auditFindings.length - 5} more issues</p>
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
          <div>
            <p className="font-medium text-success text-sm">All Audit Checks Passed</p>
            <p className="text-xs text-muted-foreground">Calculations, holiday accruals, totals, and duplicate checks verified.</p>
          </div>
        </div>
      )}

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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isDeleting} className="text-destructive border-destructive/30 hover:bg-destructive/10 w-full sm:w-auto min-h-[44px]">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{period.period_name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this draft payroll period and all its entries. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Period
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                    This will move the payroll to "Pending Review" status.
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
        <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 p-4">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-medium text-card-foreground">Pending Review</p>
              <p className="text-sm text-muted-foreground">
                Review all entries before approving. Once approved, this period is locked.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isReopening}>
                  <Undo2 className="mr-2 h-4 w-4" />
                  Reopen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reopen this payroll period?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will move the period back to "Draft" status, allowing edits. 
                    This action will be recorded in the audit log.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onReopen}>Reopen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isApproving} className="bg-success hover:bg-success/90 text-success-foreground">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isApproving ? "Approving..." : "Approve & Lock"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve and lock {period.period_name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Once approved, this payroll period will be <strong>permanently locked</strong>. 
                    No further edits can be made. This complies with UK payroll record-keeping requirements.
                    <br /><br />
                    To make changes after approval, you will need to reopen the period, which is recorded in the audit trail.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onApprove} className="bg-success hover:bg-success/90 text-success-foreground">
                    Approve & Lock
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {period.status === "approved" && (
        <div className="flex items-center justify-between rounded-lg bg-success/10 border border-success/20 p-4">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-success shrink-0" />
            <div>
              <p className="font-medium text-success">Approved & Locked</p>
              <p className="text-sm text-muted-foreground">
                {period.approved_at 
                  ? `Approved on ${new Date(period.approved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` 
                  : "This period is locked and read-only"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isReopening}>
                  <Undo2 className="mr-2 h-4 w-4" />
                  Reopen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>⚠️ Reopen approved period?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong className="text-destructive">This is a controlled action.</strong> Reopening an approved 
                    period will move it back to draft status, allowing edits. This is recorded in the audit log 
                    for compliance purposes (UK payroll record-keeping).
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
          )}
        </div>
      )}

      {period.status === "rejected" && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">Rejected</p>
              <p className="text-sm text-muted-foreground">This period was rejected. Reopen to make corrections.</p>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" onClick={onReopen} disabled={isReopening}>
              <Undo2 className="mr-2 h-4 w-4" />
              Reopen as Draft
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
