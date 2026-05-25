/**
 * Holiday Ledger Investigation dialog.
 *
 * The view itself is read-only. The only write path exposed here is a
 * narrowly-scoped, admin-only, confirmation-gated correction for
 * ORPHAN holiday_ledger rows whose source holiday_payments record has
 * been deleted. The correction writes a REVERSING ledger entry (it
 * never deletes the original orphan row) so the audit trail is kept.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
  Lock,
  FileText,
  Undo2,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useHolidayLedger } from "@/hooks/useHolidayLedger";
import {
  formatCurrency,
  formatHours,
  useReverseOrphanLedgerEntry,
} from "@/hooks/useHolidays";
import {
  findIntegrityIssues,
  summariseLedger,
  hasApprovedPeriodImpact,
  type LedgerRow,
  type PaymentRow,
  type PeriodInfo,
} from "@/lib/holiday-ledger-integrity";
import { cn } from "@/lib/utils";

const ENTRY_LABELS: Record<string, string> = {
  accrual: "Accrual",
  carry_over_in: "Carry-over In",
  holiday_taken: "Holiday Taken",
  manual_adjustment: "Manual Adjustment",
  correction: "Correction",
  payout_on_termination: "Leaver Settlement",
  carry_over_out: "Carry-over Out",
  expiry: "Expiry",
};

const ENTRY_BADGE: Record<string, string> = {
  accrual: "bg-success/10 text-success border-success/20",
  carry_over_in: "bg-accent/10 text-accent border-accent/20",
  holiday_taken: "bg-primary/10 text-primary border-primary/20",
  manual_adjustment: "bg-warning/10 text-warning border-warning/20",
  correction: "bg-muted text-muted-foreground border-border",
  payout_on_termination:
    "bg-destructive/10 text-destructive border-destructive/20",
  carry_over_out: "bg-muted text-muted-foreground border-border",
  expiry: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  locked: "bg-destructive/10 text-destructive border-destructive/20",
};

interface Props {
  employeeId: string;
  employeeName: string;
  year?: number;
  /** Render style of the trigger button. Pass `null` for a controlled-only mode. */
  triggerVariant?: "outline" | "ghost" | "link";
  triggerLabel?: string;
  triggerClassName?: string;
}

export function InvestigateLedgerDialog({
  employeeId,
  employeeName,
  year = new Date().getFullYear(),
  triggerVariant = "outline",
  triggerLabel = "Investigate ledger",
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(String(year));
  const [pendingReversalId, setPendingReversalId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const yr = parseInt(selectedYear, 10);
  const leaveYearStart = `${yr}-01-01`;
  const leaveYearEnd = `${yr}-12-31`;

  const { isAdmin } = useAuth();
  const reverseOrphan = useReverseOrphanLedgerEntry();

  const { tenantId } = useTenant();
  const { data: rawLedger, isLoading: ledgerLoading } = useHolidayLedger(
    open ? employeeId : undefined,
    open ? leaveYearStart : undefined
  );

  // READ-ONLY: fetch holiday_payments for this employee + leave year
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    enabled: open && !!tenantId && !!employeeId,
    queryKey: ["investigate_payments", tenantId, employeeId, yr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_payments")
        .select(
          "id, payroll_period_id, hours, total, holiday_taken_date, leave_year_start, notes, created_at"
        )
        .eq("tenant_id", tenantId!)
        .eq("employee_id", employeeId)
        .eq("leave_year_start", leaveYearStart)
        .eq("leave_year_end", leaveYearEnd);
      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
  });

  // READ-ONLY: fetch period status for any period referenced by ledger or payments
  const periodIds = useMemo(() => {
    const ids = new Set<string>();
    (payments ?? []).forEach((p) => {
      if (p.payroll_period_id) ids.add(p.payroll_period_id);
    });
    return [...ids];
  }, [payments]);

  const { data: periods } = useQuery({
    enabled: open && periodIds.length > 0,
    queryKey: ["investigate_periods", tenantId, periodIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("id, status, period_name")
        .in("id", periodIds);
      if (error) throw error;
      return (data ?? []) as PeriodInfo[];
    },
  });

  const periodsById = useMemo<Record<string, PeriodInfo>>(() => {
    const map: Record<string, PeriodInfo> = {};
    (periods ?? []).forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [periods]);

  const ledger = (rawLedger ?? []) as LedgerRow[];
  const summary = summariseLedger(ledger, payments ?? []);
  const issues = findIntegrityIssues({
    ledger,
    payments: payments ?? [],
    periodsById,
  });
  const approvedImpact = hasApprovedPeriodImpact(issues);

  // running balance for the table
  let running = 0;
  const rows = ledger.map((e) => {
    running += Number(e.hours);
    const linkedPaymentId =
      e.source_table === "holiday_payments" ? e.source_id : null;
    const linkedPeriodId = linkedPaymentId
      ? (payments ?? []).find((p) => p.id === linkedPaymentId)?.payroll_period_id ?? null
      : null;
    const linkedStatus = linkedPeriodId ? periodsById[linkedPeriodId]?.status ?? null : null;
    return { ...e, running, linkedPaymentId, linkedPeriodId, linkedStatus };
  });

  const years = Array.from({ length: 6 }, (_, i) => String(2021 + i));
  const isLoading = ledgerLoading || paymentsLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size="sm"
          className={cn("h-8 text-xs", triggerClassName)}
        >
          <Search className="h-3.5 w-3.5 mr-1.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Investigate holiday ledger
          </DialogTitle>
          <DialogDescription>
            Read-only audit of every ledger entry, payment and linked payroll
            period for this employee and leave year. This view never writes,
            deletes or recalculates.
          </DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{employeeName}</p>
            <p className="text-xs text-muted-foreground">
              Leave year {selectedYear} · {summary.entries} ledger {summary.entries === 1 ? "entry" : "entries"}
            </p>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <SummaryCell label="Carry-over in" value={`${formatHours(summary.carryOverHours)} h`} />
          <SummaryCell label="Accrued" value={`${formatHours(summary.accruedHours)} h`} />
          <SummaryCell label="Taken" value={`${formatHours(summary.takenHours)} h`} />
          <SummaryCell
            label="Available"
            value={`${formatHours(summary.availableHours)} h`}
            tone={summary.availableHours < 0 ? "destructive" : "success"}
          />
          <SummaryCell label="Paid" value={formatCurrency(summary.paidAmount)} />
          <SummaryCell
            label="Leaver settlements"
            value={String(summary.leaverSettlementCount)}
          />
        </div>

        {/* Integrity issues */}
        {issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-warning" />
              Integrity warnings ({issues.length})
            </h4>
            {approvedImpact && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  One or more issues affect an approved or locked payroll
                  period. Reopen or reverse through a controlled process
                  before correction.
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              {issues.map((iss, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-2.5 text-xs flex items-start gap-2",
                    iss.severity === "error"
                      ? "border-destructive/30 bg-destructive/5 text-destructive"
                      : "border-warning/30 bg-warning/5 text-warning"
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium">{iss.message}</p>
                    <p className="text-[11px] opacity-90">{iss.guidance}</p>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {iss.paymentId && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          payment:{iss.paymentId.slice(0, 8)}
                        </Badge>
                      )}
                      {iss.ledgerId && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          ledger:{iss.ledgerId.slice(0, 8)}
                        </Badge>
                      )}
                      {iss.periodStatus && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            STATUS_BADGE[iss.periodStatus] || ""
                          )}
                        >
                          period: {iss.periodStatus}
                        </Badge>
                      )}
                    </div>
                    {iss.code === "ledger_without_payment" && isAdmin && iss.ledgerId && (
                      <div className="pt-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => {
                            setReversalReason("");
                            setPendingReversalId(iss.ledgerId!);
                          }}
                        >
                          <Undo2 className="h-3 w-3 mr-1" />
                          Reverse orphan ledger entry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmation modal for orphan ledger reversal */}
        <OrphanReversalConfirm
          open={pendingReversalId !== null}
          onOpenChange={(v) => {
            if (!v) setPendingReversalId(null);
          }}
          ledgerRow={
            pendingReversalId
              ? ledger.find((l) => l.id === pendingReversalId) ?? null
              : null
          }
          employeeName={employeeName}
          leaveYear={yr}
          currentAvailable={summary.availableHours}
          reason={reversalReason}
          onReasonChange={setReversalReason}
          isPending={reverseOrphan.isPending}
          onConfirm={async () => {
            if (!pendingReversalId) return;
            try {
              await reverseOrphan.mutateAsync({
                ledgerId: pendingReversalId,
                reason: reversalReason,
              });
              toast({
                title: "Orphan ledger entry reversed",
                description:
                  "A reversing correction was written. The original orphan row is preserved for audit.",
              });
              setPendingReversalId(null);
              setReversalReason("");
            } catch (err: any) {
              toast({
                title: "Reversal failed",
                description: err?.message ?? "Unknown error",
                variant: "destructive",
              });
            }
          }}
        />


        {/* Ledger rows */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Ledger entries
          </h4>
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              No ledger entries for {selectedYear}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left py-1.5 px-2 font-medium">Date</th>
                    <th className="text-left py-1.5 px-2 font-medium">Type</th>
                    <th className="text-right py-1.5 px-2 font-medium">Hours</th>
                    <th className="text-right py-1.5 px-2 font-medium">Amount</th>
                    <th className="text-right py-1.5 px-2 font-medium">Balance</th>
                    <th className="text-left py-1.5 px-2 font-medium">Source</th>
                    <th className="text-left py-1.5 px-2 font-medium">Period</th>
                    <th className="text-left py-1.5 px-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="py-1.5 px-2 whitespace-nowrap text-muted-foreground">
                        {new Date(r.entry_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>
                      <td className="py-1.5 px-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-normal",
                            ENTRY_BADGE[r.entry_type] || ""
                          )}
                        >
                          {ENTRY_LABELS[r.entry_type] || r.entry_type}
                        </Badge>
                      </td>
                      <td
                        className={cn(
                          "py-1.5 px-2 text-right font-mono whitespace-nowrap",
                          Number(r.hours) > 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {Number(r.hours) > 0 ? "+" : ""}
                        {formatHours(Number(r.hours))}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap text-muted-foreground">
                        {r.amount != null ? formatCurrency(Number(r.amount)) : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-1.5 px-2 text-right font-mono font-semibold whitespace-nowrap",
                          r.running >= 0 ? "" : "text-destructive"
                        )}
                      >
                        {formatHours(r.running)}
                      </td>
                      <td className="py-1.5 px-2 text-[10px] text-muted-foreground font-mono">
                        {r.source_table ? (
                          <span className="inline-flex items-center gap-0.5">
                            <ExternalLink className="h-2.5 w-2.5" />
                            {r.source_table}
                            {r.source_id ? `:${r.source_id.slice(0, 6)}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-[10px]">
                        {r.linkedPeriodId ? (
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              {periodsById[r.linkedPeriodId]?.period_name ?? r.linkedPeriodId.slice(0, 6)}
                            </span>
                            {r.linkedStatus && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px]",
                                  STATUS_BADGE[r.linkedStatus] || ""
                                )}
                              >
                                {r.linkedStatus}
                              </Badge>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-[10px] text-muted-foreground max-w-[160px] truncate" title={r.notes || ""}>
                        {r.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground italic text-center pt-1">
          Read-only investigation. The orphan ledger reversal is the only
          write path and is admin-only, confirmation-gated, and preserves
          the original orphan row for audit.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "destructive";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums mt-0.5",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface OrphanReversalConfirmProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ledgerRow: LedgerRow | null;
  employeeName: string;
  leaveYear: number;
  currentAvailable: number;
  reason: string;
  onReasonChange: (v: string) => void;
  isPending: boolean;
  onConfirm: () => void | Promise<void>;
}

function OrphanReversalConfirm({
  open,
  onOpenChange,
  ledgerRow,
  employeeName,
  leaveYear,
  currentAvailable,
  reason,
  onReasonChange,
  isPending,
  onConfirm,
}: OrphanReversalConfirmProps) {
  const hoursToReverse = ledgerRow ? -Number(ledgerRow.hours) : 0;
  const amountToReverse =
    ledgerRow && ledgerRow.amount != null ? -Number(ledgerRow.amount) : null;
  const projectedAvailable = currentAvailable + hoursToReverse;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Undo2 className="h-4 w-4 text-primary" />
            Reverse orphan ledger entry
          </AlertDialogTitle>
          <AlertDialogDescription>
            This writes a reversing correction entry. The original orphan
            ledger row is preserved for audit. This does not change any
            approved payroll period.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {ledgerRow && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Field label="Employee" value={employeeName} />
              <Field label="Leave year" value={String(leaveYear)} />
              <Field
                label="Orphan entry date"
                value={new Date(ledgerRow.entry_date).toLocaleDateString("en-GB")}
              />
              <Field
                label="Hours to restore"
                value={`${formatHours(hoursToReverse)} h`}
                tone="success"
              />
              <Field
                label="Amount to reverse"
                value={amountToReverse != null ? formatCurrency(amountToReverse) : "—"}
              />
              <Field
                label="Projected available"
                value={`${formatHours(projectedAvailable)} h`}
                tone={projectedAvailable >= 0 ? "success" : "destructive"}
              />
              <div className="col-span-2">
                <Field
                  label="Original source"
                  value={
                    ledgerRow.source_table && ledgerRow.source_id
                      ? `${ledgerRow.source_table}:${ledgerRow.source_id}`
                      : "—"
                  }
                  mono
                />
              </div>
            </div>

            <p className="text-xs rounded-md bg-success/5 border border-success/20 p-2 text-success">
              This will restore {formatHours(hoursToReverse)} h to{" "}
              {employeeName}'s balance by reversing an orphan ledger entry.
              This does not change approved payroll.
            </p>

            <div className="space-y-1">
              <Label htmlFor="reversal-reason" className="text-xs">
                Reason (recorded in audit trail)
              </Label>
              <Textarea
                id="reversal-reason"
                placeholder="e.g. Deleted holiday payment for leaver settlement"
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            disabled={isPending || !ledgerRow}
          >
            {isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            Confirm reversal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Field({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "success" | "destructive";
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-xs font-medium mt-0.5",
          mono && "font-mono break-all",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}

