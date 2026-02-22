import { CheckCircle, AlertCircle, Lock, Send, Undo2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  };
  isAdmin: boolean;
  onSubmitForReview: () => void;
  onApprove: () => void;
  onReopen: () => void;
  isSubmitting: boolean;
  isApproving: boolean;
  isReopening: boolean;
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
  isSubmitting,
  isApproving,
  isReopening,
  entryCount,
  zeroHoursCount,
}: PayrollApprovalWorkflowProps) {
  const currentStepIndex = workflowSteps.findIndex(s => s.status === period.status);

  return (
    <div className="rounded-xl bg-card shadow-card p-5 animate-fade-in">
      {/* Workflow Steps */}
      <div className="flex items-center gap-2 mb-4">
        {workflowSteps.map((step, i) => {
          const isActive = step.status === period.status;
          const isPast = i < currentStepIndex;
          return (
            <div key={step.status} className="flex items-center gap-2">
              {i > 0 && (
                <div className={`h-px w-8 ${isPast ? "bg-success" : "bg-border"}`} />
              )}
              <div className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isPast ? "bg-success text-success-foreground" :
                  isActive ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isPast ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status-specific content */}
      {period.status === "draft" && isAdmin && (
        <div className="flex items-center justify-between rounded-lg bg-warning/10 border border-warning/20 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="font-medium text-card-foreground">Draft – Editable</p>
              <p className="text-sm text-muted-foreground">
                {entryCount} employees · {zeroHoursCount > 0 ? `${zeroHoursCount} with 0 hours` : "All hours entered"}
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isSubmitting || entryCount === 0}>
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit for Review"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
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
