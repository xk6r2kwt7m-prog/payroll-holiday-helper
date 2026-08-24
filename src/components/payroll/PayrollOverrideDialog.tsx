import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";

/**
 * Admin override gate for closing a payroll period while blockers remain.
 *
 * Nothing is bypassed silently: the admin must type a reason and the
 * confirmation word, and the caller records the override in the audit log
 * alongside the list of outstanding items.
 */
export interface PayrollOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "submit" | "approve";
  periodName: string;
  outstanding: string[];
  isBusy?: boolean;
  onConfirm: (reason: string) => void;
}

const CONFIRM_WORD = "OVERRIDE";

export function PayrollOverrideDialog({
  open,
  onOpenChange,
  mode,
  periodName,
  outstanding,
  isBusy,
  onConfirm,
}: PayrollOverrideDialogProps) {
  const [reason, setReason] = useState("");
  const [word, setWord] = useState("");

  const ready = reason.trim().length >= 10 && word.trim().toUpperCase() === CONFIRM_WORD;

  const close = (v: boolean) => {
    if (!v) {
      setReason("");
      setWord("");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg" data-testid="payroll-override-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            {mode === "approve"
              ? "Override and approve period"
              : "Override and submit for review"}
          </DialogTitle>
          <DialogDescription>
            {periodName} — outstanding checks will be bypassed and recorded in the
            payroll audit trail against your user.
          </DialogDescription>
        </DialogHeader>

        {outstanding.length > 0 && (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs space-y-1"
            data-testid="payroll-override-outstanding"
          >
            <p className="font-medium">Being bypassed ({outstanding.length})</p>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
              {outstanding.slice(0, 8).map((o, i) => (
                <li key={i}>{o}</li>
              ))}
              {outstanding.length > 8 && <li>+{outstanding.length - 8} more</li>}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="override-reason" className="text-xs">
              Reason for override (required, min 10 characters)
            </Label>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Checked against source timesheets; NMW top-up already paid outside the system."
              data-testid="payroll-override-reason"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="override-word" className="text-xs">
              Type {CONFIRM_WORD} to confirm
            </Label>
            <Input
              id="override-word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder={CONFIRM_WORD}
              data-testid="payroll-override-word"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!ready || isBusy}
            onClick={() => onConfirm(reason.trim())}
            data-testid="payroll-override-confirm"
          >
            {isBusy
              ? "Working…"
              : mode === "approve"
                ? "Override & approve"
                : "Override & submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
