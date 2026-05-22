import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Bell } from "lucide-react";
import type { PublishedChangeKind } from "@/lib/schedule-staff-visibility";

interface PublishedChangeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PublishedChangeKind;
  shiftSummary?: string;
  willNotifyStaff?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
}

const KIND_LABEL: Record<PublishedChangeKind, string> = {
  edit: "Edit published shift",
  reassign: "Reassign published shift",
  cancel: "Cancel published shift",
  delete: "Delete published shift",
};

const KIND_ACTION: Record<PublishedChangeKind, string> = {
  edit: "Confirm change",
  reassign: "Confirm reassignment",
  cancel: "Confirm cancellation",
  delete: "Confirm deletion",
};

export function PublishedChangeConfirmDialog({
  open,
  onOpenChange,
  kind,
  shiftSummary,
  willNotifyStaff = false,
  isPending = false,
  onConfirm,
}: PublishedChangeConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="published-change-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            {KIND_LABEL[kind]}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              This shift has already been published. Changing it may affect the
              employee's rota. Please confirm before saving.
            </span>
            {shiftSummary && (
              <span className="block text-foreground/80 font-medium">
                {shiftSummary}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {willNotifyStaff && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
            <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Staff notification may be needed for this change.
            </span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={kind === "delete" ? "destructive" : "default"}
              disabled={isPending}
              onClick={onConfirm}
              data-testid="published-change-confirm-action"
            >
              {KIND_ACTION[kind]}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
