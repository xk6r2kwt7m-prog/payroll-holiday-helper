import { useState, useMemo, useEffect } from "react";
import { UserMinus, AlertTriangle, Calculator, ShieldCheck, Info, User, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCreateHolidayPayment,
  useInsertLedgerManualAdjustment,
  formatCurrency,
  formatHours,
} from "@/hooks/useHolidays";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { useEmployees } from "@/hooks/useEmployees";
import { useHolidayYearSummary } from "@/hooks/useHolidayYearSummary";
import { useHolidayLedger } from "@/hooks/useHolidayLedger";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { EntitlementBasisSelector } from "./EntitlementBasisSelector";
import { HolidaySourceComparisonTable } from "./HolidaySourceComparisonTable";
import {
  computeBasis,
  buildSourceComparison,
  detectMismatch,
  type EntitlementBasis,
  type PayrollEntryLite,
  type BalanceSnapshotRow,
} from "@/lib/holiday-entitlement-basis";
import type { PaymentRow, LedgerRow } from "@/lib/holiday-ledger-integrity";

export function SettleLeaverDialog() {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [notes, setNotes] = useState("");
  const [approved, setApproved] = useState(false);
  const [basis, setBasis] = useState<EntitlementBasis>("full_employment");
  const [mismatchAck, setMismatchAck] = useState(false);
  const [manualReason, setManualReason] = useState("");
  const [manualNote, setManualNote] = useState("");

  const { data: employees = [] } = useEmployees(true);
  const { data: periods = [] } = usePayrollPeriods();
  const createPayment = useCreateHolidayPayment();
  const manualAdjust = useInsertLedgerManualAdjustment();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { tenantId } = useTenant();

  const leaveYear = new Date().getFullYear();

  // Employee IDs in the selected payroll period
  const { data: periodEmployeeIds = [] } = useQuery({
    queryKey: ["payroll-period-employees", periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const { data } = await supabase
        .from("payroll_entries")
        .select("employee_id")
        .eq("payroll_period_id", periodId);
      return (data ?? []).map((r) => r.employee_id);
    },
    enabled: !!periodId,
  });

  const { data: settledEmployeeIds = [] } = useQuery({
    queryKey: ["settled-employees", periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const { data } = await supabase
        .from("holiday_payments")
        .select("employee_id")
        .eq("payroll_period_id", periodId)
        .not("employee_id", "is", null);
      return (data ?? []).map((r) => r.employee_id).filter(Boolean) as string[];
    },
    enabled: !!periodId,
  });

  const settledSet = useMemo(() => new Set(settledEmployeeIds), [settledEmployeeIds]);
  const periodEmpSet = useMemo(() => new Set(periodEmployeeIds), [periodEmployeeIds]);

  const settleableEmployees = useMemo(() => {
    if (!periodId || periodEmpSet.size === 0) return [];
    return employees
      .filter((e) => periodEmpSet.has(e.id))
      .filter((e) => !settledSet.has(e.id))
      .sort((a, b) => `${a.forename} ${a.surname}`.localeCompare(`${b.forename} ${b.surname}`));
  }, [employees, periodEmpSet, settledSet, periodId]);

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  // Canonical hook (year-scoped ledger) — still used for the headline summary card
  const { summary: employeeSummaryRaw, isLoading: summaryLoading } = useHolidayYearSummary(
    employeeId || undefined,
    leaveYear,
  );

  // For Basis C (full employment) we need the full ledger across years
  const { data: fullLedger = [] } = useHolidayLedger(
    employeeId || undefined,
    undefined, // no year filter
  );

  // Payments for this employee (all leave years)
  const { data: allPayments = [] } = useQuery({
    queryKey: ["settle-leaver-payments", tenantId, employeeId],
    enabled: !!tenantId && !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_payments")
        .select(
          "id, payroll_period_id, hours, total, holiday_taken_date, leave_year_start, notes, created_at",
        )
        .eq("tenant_id", tenantId!)
        .eq("employee_id", employeeId);
      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
  });

  // Payroll entries for this employee (all years, joined to periods)
  const { data: allPayrollEntries = [] } = useQuery({
    queryKey: ["settle-leaver-entries", tenantId, employeeId],
    enabled: !!tenantId && !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_entries")
        .select(
          "id, payroll_period_id, holiday_accrued_hours, timesheet_hours, payroll_periods(start_date, end_date, status)",
        )
        .eq("tenant_id", tenantId!)
        .eq("employee_id", employeeId);
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        id: e.id,
        payroll_period_id: e.payroll_period_id,
        period_start_date: e.payroll_periods?.start_date ?? "",
        period_status: e.payroll_periods?.status ?? "",
        holiday_accrued_hours: Number(e.holiday_accrued_hours || 0),
        timesheet_hours: Number(e.timesheet_hours || 0),
      })) as PayrollEntryLite[];
    },
  });

  // Snapshot for current leave year
  const { data: snapshot } = useQuery({
    queryKey: ["settle-leaver-snapshot", tenantId, employeeId, leaveYear],
    enabled: !!tenantId && !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_balances")
        .select("leave_year_start, hours_accrued, hours_taken, hours_carried_over")
        .eq("tenant_id", tenantId!)
        .eq("employee_id", employeeId)
        .eq("leave_year_start", `${leaveYear}-01-01`)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BalanceSnapshotRow | null;
    },
  });

  // Pure basis computation
  const basisResult = useMemo(() => {
    if (!employeeId) return null;
    return computeBasis({
      basis,
      leaveYear,
      selectedPeriodId: periodId || undefined,
      ledger: fullLedger as unknown as LedgerRow[],
      payments: allPayments,
      payrollEntries: allPayrollEntries,
      manual:
        basis === "manual"
          ? { hours: parseFloat(hours) || 0, amount: (parseFloat(hours) || 0) * (parseFloat(rate) || 0) }
          : undefined,
    });
  }, [employeeId, basis, leaveYear, periodId, fullLedger, allPayments, allPayrollEntries, hours, rate]);

  const sourceRows = useMemo(() => {
    if (!basisResult) return [];
    return buildSourceComparison({
      leaveYear,
      ledger: fullLedger as unknown as LedgerRow[],
      payments: allPayments,
      payrollEntries: allPayrollEntries,
      balanceSnapshot: snapshot,
      manualRecalculation: basisResult,
    });
  }, [basisResult, leaveYear, fullLedger, allPayments, allPayrollEntries, snapshot]);

  const mismatch = useMemo(() => detectMismatch(sourceRows), [sourceRows]);

  // Headline summary (year-scoped ledger)
  const summary = useMemo(() => {
    if (!employeeSummaryRaw) return null;
    return {
      totalAccrued: employeeSummaryRaw.accruedHours,
      totalTaken: employeeSummaryRaw.takenHours,
      totalPaid: employeeSummaryRaw.paidAmount,
      carryOver: employeeSummaryRaw.carryOverHours,
      balance: employeeSummaryRaw.availableHours,
    };
  }, [employeeSummaryRaw]);

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    setApproved(false);
    setMismatchAck(false);
    setBasis("full_employment");
    setManualReason("");
    setManualNote("");
    setHours("");
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      setRate(emp.hourly_rate.toString());
      setNotes("Leaver settlement — full holiday balance payout");
    }
  };

  // Smart default basis: when live payroll accrual is pending ledger posting
  // (draft period on the leave year), auto-select `live_accrual` so the
  // manager settles against the same balance the Leave dashboard shows —
  // instead of falling back to Manual verified adjustment.
  const [autoBasisApplied, setAutoBasisApplied] = useState<string>("");
  useEffect(() => {
    if (!employeeId || !allPayrollEntries.length) return;
    const key = `${employeeId}:${leaveYear}`;
    if (autoBasisApplied === key) return;
    const yearEntries = allPayrollEntries.filter(
      (e) => new Date(e.period_start_date).getUTCFullYear() === leaveYear,
    );
    const liveAccrued = yearEntries.reduce((s, e) => s + Number(e.holiday_accrued_hours || 0), 0);
    const hasDraft = yearEntries.some(
      (e) => !["approved", "finalised", "finalized"].includes(String(e.period_status || "").toLowerCase()),
    );
    if (liveAccrued > 0.005 && hasDraft) {
      setBasis("live_accrual");
    }
    setAutoBasisApplied(key);
  }, [employeeId, leaveYear, allPayrollEntries, autoBasisApplied]);

  // Auto-fill hours from current basis result (except manual mode where user types)
  useEffect(() => {
    if (!basisResult || basis === "manual") return;
    setHours(basisResult.balance > 0 ? basisResult.balance.toFixed(2) : "0");
  }, [basisResult, basis]);

  useEffect(() => {
    if (open && !holidayDate) {
      setHolidayDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, holidayDate]);

  useEffect(() => {
    if (open && !periodId && periods.length > 0) {
      const draftOrPending = periods.find((p) => p.status === "draft" || p.status === "pending");
      if (draftOrPending) setPeriodId(draftOrPending.id);
    }
  }, [open, periodId, periods]);

  const total = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);
  const basisBalance = basisResult?.balance ?? 0;
  const isOverdraw = basisResult ? parseFloat(hours) > basisBalance + 0.005 : false;
  const isZeroBalance = basisResult ? basisBalance <= 0 : false;
  // Year-aware duplication guard: when the ledger contains both prior-year
  // detail rows AND a carry_over_in summary row, full_employment basis would
  // double-count. Block settlement until the data is reconciled.
  const carryOverDuplicationDetected =
    basis === "full_employment" &&
    basisResult?.carryOverDuplicationDetected === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !periodId || !holidayDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!approved) {
      toast.error("Please approve the settlement before recording");
      return;
    }
    if (carryOverDuplicationDetected) {
      toast.error(
        "Holiday balance requires review before settlement. Possible carry-over duplication detected.",
      );
      return;
    }
    if (mismatch.hasMismatch && !mismatchAck) {
      toast.error("Tick the mismatch acknowledgement to proceed.");
      return;
    }
    if (basis === "manual" && manualReason.trim().length === 0) {
      toast.error("Manual basis requires a reason.");
      return;
    }
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    try {
      // If basis is manual, write an audited manual_adjustment ledger row first
      if (basis === "manual" && parseFloat(hours) !== 0) {
        await manualAdjust.mutateAsync({
          employeeId,
          leaveYear,
          hours: parseFloat(hours),
          amount: total || null,
          reason: manualReason,
          note: manualNote,
        });
      }

      const d = new Date(holidayDate);

      if (parseFloat(hours) > 0) {
        await createPayment.mutateAsync({
          employee_id: employeeId,
          employee_name: `${employee.forename} ${employee.surname}`,
          payroll_period_id: periodId,
          hours: parseFloat(hours),
          rate: parseFloat(rate),
          total,
          holiday_taken_date: holidayDate,
          leave_year_start: `${d.getFullYear()}-01-01`,
          leave_year_end: `${d.getFullYear()}-12-31`,
          notes: notes || `Leaver settlement (basis: ${basis})`,
        });
      }

      if (employee.status !== "leaver") {
        const { error: statusError } = await supabase
          .from("employees")
          .update({ status: "leaver" as any, end_date: holidayDate })
          .eq("id", employeeId);
        if (statusError) {
          console.error("Failed to update employee status:", statusError);
          toast.error("Settlement recorded but failed to update employee status");
        } else {
          await supabase.from("employee_changes").insert({
            employee_id: employeeId,
            change_type: "update",
            field_name: "status",
            old_value: employee.status,
            new_value: "leaver",
            notes: `Settled via Settle Leaver dialog (basis: ${basis}). End date: ${holidayDate}${
              mismatch.hasMismatch ? " — mismatch acknowledged" : ""
            }`,
          } as any);
          queryClient.invalidateQueries({ queryKey: ["employees"] });
        }
      }

      toast.success(parseFloat(hours) > 0 ? `Leaver settlement of ${formatCurrency(total)} recorded` : "Leaver marked — no holiday balance to pay out");
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to record settlement");
    }
  };

  const resetForm = () => {
    setEmployeeId("");
    setPeriodId("");
    setHours("");
    setRate("");
    setHolidayDate("");
    setNotes("");
    setApproved(false);
    setMismatchAck(false);
    setBasis("full_employment");
    setManualReason("");
    setManualNote("");
  };

  const statusBadgeStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "starter":
        return "bg-primary/10 text-primary border-primary/20";
      case "leaver":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const canSubmit =
    employeeId &&
    periodId &&
    holidayDate &&
    approved &&
    !carryOverDuplicationDetected &&
    (!mismatch.hasMismatch || mismatchAck) &&
    (basis !== "manual" || manualReason.trim().length > 0) &&
    (isZeroBalance || (parseFloat(hours) > 0 && parseFloat(rate) > 0));

  const disabledReason: string | null = (() => {
    if (createPayment.isPending || manualAdjust.isPending) return null;
    if (!periodId) return "Select a draft payroll period.";
    if (!employeeId) return "Select an employee to settle.";
    if (!holidayDate) return "Set the settlement date.";
    if (carryOverDuplicationDetected)
      return "Resolve carry-over duplication in the ledger before settling.";
    if (basis === "manual" && manualReason.trim().length === 0)
      return "Add a reason for the manual verified adjustment.";
    if (!isZeroBalance && !(parseFloat(hours) > 0 && parseFloat(rate) > 0))
      return "Enter valid hours and rate.";
    if (mismatch.hasMismatch && !mismatchAck)
      return "Tick the mismatch acknowledgement to proceed.";
    if (!approved) return "Tick the approval confirmation to enable settlement.";
    return null;
  })();

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5 h-9 text-xs sm:text-sm">
          <UserMinus className="h-4 w-4 sm:mr-1.5 shrink-0" />
          <span className="hidden xs:inline">Settle Leaver</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            Settle Leaver
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Choose the payroll period, then the employee. Pick an entitlement basis and review the source comparison before settling.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Payroll Period *</Label>
            <Select value={periodId} onValueChange={(v) => { setPeriodId(v); setEmployeeId(""); setApproved(false); }}>
              <SelectTrigger><SelectValue placeholder="Select payroll period" /></SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.period_name}
                    {(p.status === "draft" || p.status === "pending") && (
                      <span className="text-muted-foreground ml-1">({p.status})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Employee *</Label>
            <Select value={employeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger><SelectValue placeholder="Select employee to settle" /></SelectTrigger>
              <SelectContent>
                {periodId && settleableEmployees.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No unsettled employees in this period</div>
                )}
                {!periodId && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Select a payroll period first</div>
                )}
                {settleableEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <span>{emp.forename} {emp.surname}</span>
                      <span className="text-muted-foreground">({emp.department})</span>
                      {emp.status === "leaver" && (
                        <Badge variant="outline" className="text-[9px] h-4 bg-destructive/10 text-destructive border-destructive/20">Leaver</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!periodId && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center space-y-1">
              <User className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Select a payroll period above to see settleable employees.</p>
            </div>
          )}

          {periodId && !employeeId && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center space-y-1">
              <User className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Select an employee above to see their holiday balance and settlement details.</p>
            </div>
          )}

          {employeeId && summaryLoading && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground animate-pulse">Loading holiday balance...</p>
            </div>
          )}

          {selectedEmployee && summary && basisResult && !summaryLoading && (
            <>
              <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedEmployee.forename} {selectedEmployee.surname}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEmployee.department}
                      {selectedEmployee.start_date && (
                        <> · Started {new Date(selectedEmployee.start_date).toLocaleDateString("en-GB")}</>
                      )}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] h-5", statusBadgeStyle(selectedEmployee.status))}>
                    {selectedEmployee.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Rate: <strong className="text-foreground">{formatCurrency(selectedEmployee.hourly_rate)}</strong>/hr</span>
                  {(selectedEmployee as any).ni_number && <span>NI: {(selectedEmployee as any).ni_number}</span>}
                </div>

                <div className="rounded-md bg-muted/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">Selected basis ({leaveYear})</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-4 capitalize">{basis.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Worked hours:</span><span className="font-medium">{formatHours(basisResult.workedHours)} hrs</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Accrued:</span><span className="font-medium">{formatHours(basisResult.accrued)} hrs</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Carry over:</span><span className="font-medium">{formatHours(basisResult.carryOver)} hrs</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Taken:</span><span className="font-medium">{formatHours(basisResult.taken)} hrs</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Already paid:</span><span className="font-medium">{formatCurrency(basisResult.paid)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Manual adjustments:</span><span className="font-medium">{formatHours(basisResult.manualAdjustments)} hrs</span></div>
                  </div>
                  <div className="border-t border-border pt-1.5 mt-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-foreground">Final balance:</span>
                      <span className={cn("text-sm font-bold", basisResult.balance > 0 ? "text-warning" : basisResult.balance < 0 ? "text-destructive" : "text-success")}>
                        {basisResult.balance > 0 ? "+" : ""}{formatHours(basisResult.balance)} hrs ({formatCurrency((basisResult.balance > 0 ? basisResult.balance : 0) * (parseFloat(rate) || 0))})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <EntitlementBasisSelector value={basis} onChange={(v) => { setBasis(v); setApproved(false); setMismatchAck(false); }} isAdmin={isAdmin} />

              <HolidaySourceComparisonTable rows={sourceRows} mismatch={mismatch} />

              {mismatch.hasMismatch && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-warning/40 bg-warning/5">
                  <Checkbox id="mismatch-ack" checked={mismatchAck} onCheckedChange={(v) => setMismatchAck(v === true)} className="mt-0.5" />
                  <label htmlFor="mismatch-ack" className="text-xs text-foreground cursor-pointer leading-relaxed">
                    I have reviewed the source mismatch above and choose to proceed. This will be recorded in the audit trail.
                  </label>
                </div>
              )}

              {basis === "manual" && (
                <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-warning" />
                    <p className="text-xs font-semibold text-foreground">Manual verified adjustment</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Reason *</Label>
                    <Input value={manualReason} onChange={(e) => setManualReason(e.target.value)} placeholder="e.g. Orphan ledger row reconciled offline; agreed final balance with employee" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Supporting note</Label>
                    <Textarea value={manualNote} onChange={(e) => setManualNote(e.target.value)} rows={2} placeholder="Reference to source document, email, signed agreement…" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Settlement Date *</Label>
                <Input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hours *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={hours}
                    onChange={(e) => { setHours(e.target.value); setApproved(false); }}
                    required={!isZeroBalance}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {basis === "manual" ? "Enter the verified final hours." : basisBalance > 0 ? "Auto-filled from selected basis. Override if needed." : "Set to 0 — basis returns no payable balance."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Rate (£/hr) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rate}
                    onChange={(e) => { setRate(e.target.value); setApproved(false); }}
                    required={!isZeroBalance}
                  />
                </div>
              </div>

              {isOverdraw && (
                <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Settlement hours ({formatHours(parseFloat(hours))}) exceed the basis balance ({formatHours(basisBalance)}). Proceed only if intended.</span>
                </div>
              )}

              {total > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Settlement Amount</span>
                    <span className="text-lg font-bold text-destructive">{formatCurrency(total)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatHours(parseFloat(hours) || 0)} hrs × {formatCurrency(parseFloat(rate) || 0)}/hr
                  </p>
                </div>
              )}

              {isZeroBalance && total === 0 && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">No payment required — employee will be marked as leaver.</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30">
                <Checkbox id="approve-settlement" checked={approved} onCheckedChange={(v) => setApproved(v === true)} className="mt-0.5" />
                <label htmlFor="approve-settlement" className="text-xs text-foreground cursor-pointer leading-relaxed">
                  {total > 0
                    ? `I approve this settlement of ${formatCurrency(total)} for ${selectedEmployee?.forename} ${selectedEmployee?.surname} on basis "${basis.replace(/_/g, " ")}". The employee will be marked as a leaver.`
                    : `I confirm marking ${selectedEmployee?.forename} ${selectedEmployee?.surname} as a leaver with no holiday payout.`}
                </label>
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Final settlement — agreed with manager" />
                <p className="text-[10px] text-muted-foreground">Internal only — will not appear in PDFs or exports.</p>
              </div>
            </>
          )}

          {disabledReason && (
            <p className="text-[11px] text-warning bg-warning/10 border border-warning/30 rounded-md px-2 py-1.5 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{disabledReason}</span>
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">

            <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              type="submit"
              disabled={createPayment.isPending || manualAdjust.isPending || !canSubmit}
              className="bg-destructive hover:bg-destructive/90"
            >
              {createPayment.isPending || manualAdjust.isPending ? "Settling..." : isZeroBalance && total === 0 ? "Mark as Leaver" : "Settle & Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
