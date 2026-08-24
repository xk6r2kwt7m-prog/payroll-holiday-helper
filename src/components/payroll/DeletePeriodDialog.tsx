import { useState } from "react";
import { AlertTriangle, ShieldCheck, Trash2, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePayrollPeriodDeleteImpact } from "@/hooks/usePayrollPeriodDeleteImpact";
import {
  DELETE_PRESERVED_ITEMS,
  describeDeleteImpact,
} from "@/lib/payroll-period-delete-impact";

interface DeletePeriodDialogProps {
  periodId: string;
  periodName: string;
  isDeleting?: boolean;
  onConfirm: (args: { reason: string; impact: Record<string, any> | null }) => void;
}

/**
 * Responsible delete gate for a DRAFT payroll period.
 * Step 1: read-only impact report + optional reason.
 * Step 2: a single plain-English "are you happy to proceed?" confirmation.
 * Deletion stays reversible for two hours afterwards.
 */
export function DeletePeriodDialog({
  periodId,
  periodName,
  isDeleting,
  onConfirm,
}: DeletePeriodDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"review" | "confirm">("review");
  const [reason, setReason] = useState("");
  const { data: impact, isLoading } = usePayrollPeriodDeleteImpact(periodId, open);

  const lines = impact ? describeDeleteImpact(impact) : [];

  const reset = () => {
    setStep("review");
    setReason("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleConfirm = () => {
    onConfirm({ reason: reason.trim(), impact: impact ? { ...impact } : null });
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isDeleting}
          className="text-destructive border-destructive/30 hover:bg-destructive/10 w-full sm:w-auto min-h-[44px]"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </DialogTrigger>
      <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
        {step === "review" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Delete draft period "{periodName}"?
              </DialogTitle>
              <DialogDescription className="text-xs">
                Holiday ledger rows created by this period are reversed at the same
                time, so balances stay correct and no orphan records are left behind.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive mb-2">
                  This will be removed
                </p>
                {isLoading ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking linked records…
                  </p>
                ) : lines.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nothing else is linked to this period.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                    {lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Left untouched
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                  {DELETE_PRESERVED_ITEMS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-medium text-foreground flex items-center gap-2">
                  <Undo2 className="h-3.5 w-3.5 text-primary" />
                  Reversible for 2 hours
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  A full snapshot is saved. For the next two hours an "Undo delete"
                  banner appears on the payroll page and restores this period
                  exactly as it was — entries, hours, holiday payments and ledger rows.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-reason" className="text-xs">
                  Reason (optional — stored in the audit log)
                </Label>
                <Textarea
                  id="delete-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Rebuilding from a corrected timesheet import"
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="min-h-[44px]">
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isDeleting || isLoading}
                onClick={() => setStep("confirm")}
                className="min-h-[44px]"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Are you happy to proceed?
              </DialogTitle>
              <DialogDescription className="text-xs">
                "{periodName}" and its {impact?.entryCount ?? 0} payroll entr
                {(impact?.entryCount ?? 0) === 1 ? "y" : "ies"} will be deleted now, and
                the holiday ledger reversed. You can undo this for the next two hours.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("review")} className="min-h-[44px]">
                Back
              </Button>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleConfirm}
                className="min-h-[44px]"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Yes, delete period
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
