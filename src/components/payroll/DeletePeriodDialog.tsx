import { useState } from "react";
import { AlertTriangle, ShieldCheck, Trash2, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePayrollPeriodDeleteImpact } from "@/hooks/usePayrollPeriodDeleteImpact";
import {
  DELETE_CONFIRM_WORD,
  DELETE_PRESERVED_ITEMS,
  describeDeleteImpact,
  isDeleteConfirmed,
} from "@/lib/payroll-period-delete-impact";

interface DeletePeriodDialogProps {
  periodId: string;
  periodName: string;
  isDeleting?: boolean;
  onConfirm: (args: { reason: string; impact: Record<string, any> | null }) => void;
}

/**
 * Responsible delete gate for a DRAFT payroll period:
 * shows a read-only impact report, what stays untouched, and requires a
 * written reason plus typing DELETE before anything is removed.
 */
export function DeletePeriodDialog({
  periodId,
  periodName,
  isDeleting,
  onConfirm,
}: DeletePeriodDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const { data: impact, isLoading } = usePayrollPeriodDeleteImpact(periodId, open);

  const confirmed = isDeleteConfirmed(typed, reason);
  const lines = impact ? describeDeleteImpact(impact) : [];

  const handleConfirm = () => {
    if (!confirmed) return;
    onConfirm({ reason: reason.trim(), impact: impact ? { ...impact } : null });
    setOpen(false);
    setReason("");
    setTyped("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Delete draft period "{periodName}"?
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review exactly what is removed. Holiday ledger rows created by this
            period are reversed at the same time, so balances stay correct and
            no orphan records are left behind.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-medium text-destructive mb-2">
              This will be permanently deleted
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

          <div className="space-y-2">
            <Label htmlFor="delete-reason" className="text-xs">
              Reason for deleting (min. 10 characters — stored in the audit log)
            </Label>
            <Textarea
              id="delete-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Rebuilding August 2026 from a corrected timesheet import after holiday changes"
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm" className="text-xs">
              Type {DELETE_CONFIRM_WORD} to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={DELETE_CONFIRM_WORD}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || isDeleting || isLoading}
            onClick={handleConfirm}
            className="min-h-[44px]"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete period &amp; reverse ledger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
