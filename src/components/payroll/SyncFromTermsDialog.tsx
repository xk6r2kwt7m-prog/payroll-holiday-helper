import { useMemo, useState } from "react";
import { ArrowRight, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useSyncPayrollFromTerms,
  type SyncPlanRow,
} from "@/hooks/useSyncPayrollFromTerms";
import type { TermsComparisonRow } from "@/hooks/useEmploymentTermsComparison";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payrollPeriodId: string;
  periodStatus: string;
  rows: TermsComparisonRow[];
}

/**
 * Phase 2C — Preview-then-confirm sync from employment terms.
 * Only mismatched draft/review rows are presented. Approved periods are
 * blocked at hook level too.
 */
export function SyncFromTermsDialog({
  open,
  onOpenChange,
  payrollPeriodId,
  periodStatus,
  rows,
}: Props) {
  const candidates: SyncPlanRow[] = useMemo(() => {
    return rows
      .filter((r) => r.rateMismatch && r.terms && r.terms.hourly_rate !== null)
      .map((r) => {
        const newRate = Number(r.terms!.hourly_rate);
        const oldSC = r.payroll_service_charge;
        const eligible = r.terms!.service_charge_eligible;
        // Only adjust service_charge if terms explicitly say "not eligible" and
        // payroll currently has > 0. Never auto-add service_charge from terms.
        const newSC = eligible === false && oldSC > 0 ? 0 : null;
        return {
          payroll_entry_id: r.payroll_entry_id,
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          old_rate: r.payroll_rate,
          new_rate: newRate,
          diff: +(newRate - r.payroll_rate).toFixed(4),
          terms: {
            id: r.terms!.id,
            contract_id: r.terms!.contract_id,
            effective_from: r.terms!.effective_from,
            source_type: r.terms!.source_type,
            service_charge_eligible: eligible,
          },
          old_service_charge: oldSC,
          new_service_charge: newSC,
        };
      });
  }, [rows]);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(candidates.map((c) => c.payroll_entry_id)),
  );

  // Refresh selection if candidates change while open
  const candidateIds = candidates.map((c) => c.payroll_entry_id).join(",");
  useMemoSync(candidateIds, () => {
    setSelected(new Set(candidates.map((c) => c.payroll_entry_id)));
  });

  const sync = useSyncPayrollFromTerms();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    const plan = candidates.filter((c) => selected.has(c.payroll_entry_id));
    if (plan.length === 0) {
      toast.error("Select at least one employee to sync.");
      return;
    }
    try {
      const result = await sync.mutateAsync({
        payrollPeriodId,
        periodStatus,
        plan,
      });
      toast.success(
        `Synced ${result.updated} ${result.updated === 1 ? "rate" : "rates"} from active terms. ${result.audited} audit entr${result.audited === 1 ? "y" : "ies"} written.`,
      );
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    }
  };

  const locked = periodStatus === "approved";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync draft payroll rates from Employment Terms
          </DialogTitle>
          <DialogDescription>
            Preview the changes below. Only employees with a rate mismatch are shown.
            Service charge is only adjusted if active terms explicitly mark the employee as
            <em> not eligible</em>. Every applied change is written to the audit log.
          </DialogDescription>
        </DialogHeader>

        {locked && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            This payroll period is approved and locked. Sync is unavailable.
          </div>
        )}

        {!locked && candidates.length === 0 && (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            No rate mismatches to sync. Payroll rates already match the active employment terms.
          </div>
        )}

        {!locked && candidates.length > 0 && (
          <div className="border border-border rounded-md overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left p-2 w-8"></th>
                    <th className="text-left p-2">Employee</th>
                    <th className="text-right p-2">Old payroll rate</th>
                    <th className="text-center p-2"></th>
                    <th className="text-right p-2">New terms rate</th>
                    <th className="text-right p-2">Δ</th>
                    <th className="text-left p-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => {
                    const checked = selected.has(c.payroll_entry_id);
                    return (
                      <tr
                        key={c.payroll_entry_id}
                        className="border-t border-border/50 align-middle"
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(c.payroll_entry_id)}
                          />
                        </td>
                        <td className="p-2">{c.employee_name}</td>
                        <td className="p-2 text-right tabular-nums">
                          £{c.old_rate.toFixed(2)}
                        </td>
                        <td className="p-2 text-center text-muted-foreground">
                          <ArrowRight className="h-3 w-3 inline" />
                        </td>
                        <td className="p-2 text-right tabular-nums font-medium">
                          £{c.new_rate.toFixed(2)}
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          <Badge
                            variant="outline"
                            className={
                              c.diff > 0
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-warning/10 text-warning border-warning/20"
                            }
                          >
                            {c.diff > 0 ? "+" : ""}£{c.diff.toFixed(2)}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {c.terms.source_type ?? "—"}
                          {c.terms.effective_from && (
                            <span className="ml-1 opacity-70">
                              (from {c.terms.effective_from})
                            </span>
                          )}
                          {c.new_service_charge === 0 && c.old_service_charge > 0 && (
                            <div className="text-warning mt-0.5">
                              Service charge will be cleared (terms mark not eligible).
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sync.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={locked || sync.isPending || selected.size === 0 || candidates.length === 0}
          >
            {sync.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying…
              </>
            ) : (
              `Apply ${selected.size} ${selected.size === 1 ? "change" : "changes"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Tiny helper to re-run a side-effect when a value string changes
import { useEffect, useRef } from "react";
function useMemoSync(key: string, fn: () => void) {
  const prev = useRef(key);
  useEffect(() => {
    if (prev.current !== key) {
      prev.current = key;
      fn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
