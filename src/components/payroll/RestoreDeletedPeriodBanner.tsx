import { useState } from "react";
import { Undo2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useRestorablePayrollDeletions,
  useRestorePayrollPeriod,
} from "@/hooks/usePayrollPeriodRestore";
import { formatRestoreRemaining } from "@/lib/payroll-period-restore";

interface RestoreDeletedPeriodBannerProps {
  onRestored?: (periodId: string) => void;
}

/**
 * Two-hour reversal window: shows draft payroll periods deleted recently and
 * lets the admin restore them exactly as they were.
 */
export function RestoreDeletedPeriodBanner({ onRestored }: RestoreDeletedPeriodBannerProps) {
  const { data: deletions } = useRestorablePayrollDeletions();
  const restore = useRestorePayrollPeriod();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!deletions || deletions.length === 0) return null;

  return (
    <div className="space-y-2">
      {deletions.map((deletion) => (
        <div
          key={deletion.auditId}
          className="rounded-md border border-primary/30 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium flex items-center gap-2">
              <Undo2 className="h-4 w-4 text-primary" />
              "{deletion.periodName}" was deleted
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Reversible — {formatRestoreRemaining(deletion.deletedAt)} · restores{" "}
              {deletion.entryCount} entr{deletion.entryCount === 1 ? "y" : "ies"}, holiday
              payments and ledger rows
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] w-full sm:w-auto"
            disabled={busyId === deletion.auditId}
            onClick={async () => {
              setBusyId(deletion.auditId);
              try {
                const periodId = await restore.mutateAsync(deletion);
                toast.success(`Restored "${deletion.periodName}"`);
                onRestored?.(periodId);
              } catch (e: any) {
                toast.error(e?.message || "Could not restore this period");
              } finally {
                setBusyId(null);
              }
            }}
          >
            {busyId === deletion.auditId ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="mr-2 h-4 w-4" />
            )}
            Undo delete
          </Button>
        </div>
      ))}
    </div>
  );
}
