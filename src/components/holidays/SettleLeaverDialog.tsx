import { useState, useMemo, useEffect } from "react";
import { UserMinus, AlertTriangle, Calculator, ShieldCheck, Info, User } from "lucide-react";
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
import { useCreateHolidayPayment, formatCurrency, formatHours } from "@/hooks/useHolidays";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { useEmployees } from "@/hooks/useEmployees";
import { useHolidayYearSummary } from "@/hooks/useHolidayYearSummary";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function SettleLeaverDialog() {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [notes, setNotes] = useState("");
  const [approved, setApproved] = useState(false);

  const { data: employees = [] } = useEmployees(true);
  const { data: periods = [] } = usePayrollPeriods();
  const createPayment = useCreateHolidayPayment();
  const queryClient = useQueryClient();

  // Fetch employee IDs present in the selected payroll period
  const { data: periodEmployeeIds = [] } = useQuery({
    queryKey: ["payroll-period-employees", periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const { data } = await supabase
        .from("payroll_entries")
        .select("employee_id")
        .eq("payroll_period_id", periodId);
      return (data ?? []).map(r => r.employee_id);
    },
    enabled: !!periodId,
  });

  // Fetch already-settled employee IDs for this period (have holiday_payments)
  const { data: settledEmployeeIds = [] } = useQuery({
    queryKey: ["settled-employees", periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const { data } = await supabase
        .from("holiday_payments")
        .select("employee_id")
        .eq("payroll_period_id", periodId)
        .not("employee_id", "is", null);
      return (data ?? []).map(r => r.employee_id).filter(Boolean) as string[];
    },
    enabled: !!periodId,
  });

  const settledSet = useMemo(() => new Set(settledEmployeeIds), [settledEmployeeIds]);
  const periodEmpSet = useMemo(() => new Set(periodEmployeeIds), [periodEmployeeIds]);

  // Only show employees in the current payroll period, sorted by name
  const settleableEmployees = useMemo(() => {
    if (!periodId || periodEmpSet.size === 0) return [];
    return employees
      .filter(e => periodEmpSet.has(e.id))
      .filter(e => !settledSet.has(e.id))
      .sort((a, b) => `${a.forename} ${a.surname}`.localeCompare(`${b.forename} ${b.surname}`));
  }, [employees, periodEmpSet, settledSet, periodId]);

  const selectedEmployee = employees.find(e => e.id === employeeId);

  // Shared single-source-of-truth balance from the holiday ledger
  const { summary: employeeSummaryRaw, isLoading: summaryLoading } = useHolidayYearSummary(
    employeeId || undefined,
    new Date().getFullYear()
  );

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
    setHours("");
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setRate(emp.hourly_rate.toString());
      setNotes("Leaver settlement — full holiday balance payout");
    }
  };

  // Auto-fill hours from shared summary when it loads
  useEffect(() => {
    if (employeeId && summary) {
      if (summary.balance > 0) {
        setHours(summary.balance.toFixed(2));
      } else {
        setHours("0");
      }
    }
  }, [employeeId, summary]);

  // Auto-set holiday date to today if empty
  useEffect(() => {
    if (open && !holidayDate) {
      setHolidayDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, holidayDate]);

  // Auto-select first draft/pending period
  useEffect(() => {
    if (open && !periodId && periods.length > 0) {
      const draftOrPending = periods.find(p => p.status === "draft" || p.status === "pending");
      if (draftOrPending) setPeriodId(draftOrPending.id);
    }
  }, [open, periodId, periods]);

  const total = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);
  const isOverdraw = summary ? (parseFloat(hours) || 0) > summary.balance : false;
  const isZeroBalance = summary && summary.balance <= 0;

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
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    try {
      const d = new Date(holidayDate);

      // Only record a payment if hours > 0
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
          notes: notes || "Leaver settlement",
        });
      }

      // Mark employee as leaver if not already
      if (employee.status !== "leaver") {
        const { error: statusError } = await supabase
          .from("employees")
          .update({
            status: "leaver" as any,
            end_date: holidayDate,
          })
          .eq("id", employeeId);

        if (statusError) {
          console.error("Failed to update employee status:", statusError);
          toast.error("Settlement recorded but failed to update employee status");
        } else {
          // Log the status change
          await supabase.from("employee_changes").insert({
            employee_id: employeeId,
            change_type: "update",
            field_name: "status",
            old_value: employee.status,
            new_value: "leaver",
            notes: `Settled via Settle Leaver dialog. End date: ${holidayDate}`,
          } as any);

          queryClient.invalidateQueries({ queryKey: ["employees"] });
        }
      }

      const paymentNote = parseFloat(hours) > 0
        ? `Leaver settlement of ${formatCurrency(total)} recorded`
        : "Leaver marked — no holiday balance to pay out";

      toast.success(paymentNote);
      setOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to record settlement");
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
  };

  const statusBadgeStyle = (status: string) => {
    switch (status) {
      case "active": return "bg-success/10 text-success border-success/20";
      case "starter": return "bg-primary/10 text-primary border-primary/20";
      case "leaver": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const canSubmit = employeeId && periodId && holidayDate && approved &&
    (isZeroBalance || (parseFloat(hours) > 0 && parseFloat(rate) > 0));

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5 h-9 text-xs sm:text-sm">
          <UserMinus className="h-4 w-4 sm:mr-1.5 shrink-0" />
          <span className="hidden xs:inline">Settle Leaver</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            Settle Leaver
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Select the payroll period first, then choose an employee from that period to settle.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Payroll period — must be selected first to scope employee list */}
          <div className="space-y-2">
            <Label>Payroll Period *</Label>
            <Select value={periodId} onValueChange={(v) => { setPeriodId(v); setEmployeeId(""); setApproved(false); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select payroll period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
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

          {/* Employee selection — scoped to selected period */}
          <div className="space-y-2">
            <Label>Employee *</Label>
            <Select value={employeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee to settle" />
              </SelectTrigger>
              <SelectContent>
                {settleableEmployees.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No employees available</div>
                )}
                {settleableEmployees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <span>{emp.forename} {emp.surname}</span>
                      <span className="text-muted-foreground">({emp.department})</span>
                      {emp.status === "leaver" && (
                        <Badge variant="outline" className="text-[9px] h-4 bg-destructive/10 text-destructive border-destructive/20">
                          Leaver
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* No employee selected — placeholder */}
          {!employeeId && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center space-y-1">
              <User className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Select an employee above to see their holiday balance and settlement details.</p>
            </div>
          )}

          {/* Loading state */}
          {employeeId && summaryLoading && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground animate-pulse">Loading holiday balance...</p>
            </div>
          )}

          {/* Employee info + settlement summary */}
          {selectedEmployee && summary && !summaryLoading && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-3">
              {/* Employee header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedEmployee.forename} {selectedEmployee.surname}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedEmployee.department}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={cn("text-[10px] h-5", statusBadgeStyle(selectedEmployee.status))}>
                    {selectedEmployee.status}
                  </Badge>
                </div>
              </div>

              {/* Rate info */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Rate: <strong className="text-foreground">{formatCurrency(selectedEmployee.hourly_rate)}</strong>/hr</span>
                {(selectedEmployee as any).ni_number && (
                  <span>NI: {(selectedEmployee as any).ni_number}</span>
                )}
              </div>

              {/* Holiday balance summary */}
              <div className="rounded-md bg-muted/50 p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Holiday Balance ({new Date().getFullYear()})</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accrued:</span>
                    <span className="font-medium">{formatHours(summary.totalAccrued)} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carry over:</span>
                    <span className="font-medium">{formatHours(summary.carryOver)} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taken:</span>
                    <span className="font-medium">{formatHours(summary.totalTaken)} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already paid:</span>
                    <span className="font-medium">{formatCurrency(summary.totalPaid)}</span>
                  </div>
                </div>
                <div className="border-t border-border pt-1.5 mt-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground">Remaining balance:</span>
                    <span className={cn("text-sm font-bold", summary.balance > 0 ? "text-warning" : summary.balance < 0 ? "text-destructive" : "text-success")}>
                      {summary.balance > 0 ? "+" : ""}{formatHours(summary.balance)} hrs
                    </span>
                  </div>
                </div>
              </div>

              {/* Status messages */}
              {summary.balance > 0 && (
                <div className="p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>{formatHours(summary.balance)} hrs</strong> remaining holiday to settle.
                    Hours and rate are auto-filled below — override if needed.
                  </span>
                </div>
              )}
              {summary.balance === 0 && (
                <div className="p-2 rounded bg-success/10 border border-success/20 text-xs text-success flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>No remaining balance — employee has used all accrued holiday. You can still settle to mark as leaver.</span>
                </div>
              )}
              {summary.balance < 0 && (
                <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>Overdrawn by {formatHours(Math.abs(summary.balance))} hrs</strong> — employee has taken more holiday than accrued.
                    Consider settling with 0 hours or adjusting.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Settlement fields — only show when employee selected */}
          {employeeId && summary && (
            <>
              <div className="space-y-2">
                <Label>Settlement Date *</Label>
                <Input type="date" value={holidayDate} onChange={e => setHolidayDate(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Payroll Period *</Label>
                <Select value={periodId} onValueChange={setPeriodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map(p => (
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hours *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={hours}
                    onChange={e => { setHours(e.target.value); setApproved(false); }}
                    required={!isZeroBalance}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {summary.balance > 0 ? "Auto-filled from balance. Override if needed." : "Set to 0 — no balance to pay."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Rate (£/hr) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rate}
                    onChange={e => { setRate(e.target.value); setApproved(false); }}
                    required={!isZeroBalance}
                  />
                </div>
              </div>

              {/* Overdraw warning */}
              {isOverdraw && (
                <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Settlement hours ({formatHours(parseFloat(hours))}) exceed remaining balance ({formatHours(summary.balance)}). Proceed only if intended.</span>
                </div>
              )}

              {/* Settlement total */}
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

              {/* Zero balance settlement */}
              {isZeroBalance && total === 0 && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">No payment required — employee will be marked as leaver.</span>
                  </div>
                </div>
              )}

              {/* Approval checkbox */}
              <div className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30">
                <Checkbox
                  id="approve-settlement"
                  checked={approved}
                  onCheckedChange={(v) => setApproved(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="approve-settlement" className="text-xs text-foreground cursor-pointer leading-relaxed">
                  {total > 0
                    ? `I approve this settlement of ${formatCurrency(total)} for ${selectedEmployee?.forename} ${selectedEmployee?.surname}. The employee will be marked as a leaver.`
                    : `I confirm marking ${selectedEmployee?.forename} ${selectedEmployee?.surname} as a leaver with no holiday payout.`
                  }
                </label>
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Final settlement — agreed with manager"
                />
                <p className="text-[10px] text-muted-foreground">Internal only — will not appear in PDFs or exports.</p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              type="submit"
              disabled={createPayment.isPending || !canSubmit}
              className="bg-destructive hover:bg-destructive/90"
            >
              {createPayment.isPending ? "Settling..." : isZeroBalance && total === 0 ? "Mark as Leaver" : "Settle & Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
