import { useState, useMemo, useEffect } from "react";
import { UserMinus, AlertTriangle, Calculator, ShieldCheck } from "lucide-react";
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

  const { data: employees = [] } = useEmployees();
  const { data: periods = [] } = usePayrollPeriods();
  const createPayment = useCreateHolidayPayment();

  // Shared single-source-of-truth balance from the holiday ledger
  const { summary: employeeSummaryRaw } = useHolidayYearSummary(
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

  const leavers = useMemo(() =>
    employees.filter(e => e.status === "leaver").sort((a, b) =>
      `${a.forename} ${a.surname}`.localeCompare(`${b.forename} ${b.surname}`)
    ), [employees]);

  const selectedEmployee = employees.find(e => e.id === employeeId);

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    setApproved(false);
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setRate(emp.hourly_rate.toString());
      setNotes("Leaver settlement — full holiday balance payout");
    }
  };

  // Auto-fill hours from shared summary when it loads (useEffect, not useMemo)
  useEffect(() => {
    if (employeeId && summary && summary.balance > 0) {
      setHours(Math.max(0, summary.balance).toFixed(2));
    } else if (employeeId && summary && summary.balance <= 0) {
      setHours("0");
    }
  }, [employeeId, summary]);

  const total = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !periodId || !hours || !rate || !holidayDate) {
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
      toast.success(`Leaver settlement of ${formatCurrency(total)} recorded — payroll period updated`);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5 h-9 text-xs sm:text-sm">
          <UserMinus className="h-4 w-4 sm:mr-1.5 shrink-0" />
          <span className="hidden xs:inline">Settle Leaver</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            Settle Leaver Holiday
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Leaver *</Label>
            <Select value={employeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select leaver" />
              </SelectTrigger>
              <SelectContent>
                {leavers.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No leavers found</div>
                )}
                {leavers.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.forename} {emp.surname} ({emp.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {summary && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold">Settlement Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accrued:</span>
                  <span className="font-medium text-success">{formatHours(summary.totalAccrued)} hrs</span>
                </div>
                {summary.carryOver > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carry over:</span>
                    <span className="font-medium text-accent">{formatHours(summary.carryOver)} hrs</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taken:</span>
                  <span className="font-medium text-primary">{formatHours(summary.totalTaken)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className={cn("font-bold", summary.balance >= 0 ? "text-accent" : "text-destructive")}>
                    {summary.balance >= 0 ? "+" : ""}{formatHours(summary.balance)} hrs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-medium">{formatCurrency(summary.totalPaid)}</span>
                </div>
              </div>
              {summary.balance > 0 && (
                <div className="mt-2 p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>{formatHours(summary.balance)} hrs</strong> remaining — auto-filled below. You can override.
                  </span>
                </div>
              )}
              {summary.balance <= 0 && (
                <div className="mt-2 p-2 rounded bg-success/10 border border-success/20 text-xs text-success">
                  No remaining balance — employee has used all accrued holiday.
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Settlement Date *</Label>
            <Input type="date" value={holidayDate} onChange={e => setHolidayDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Payroll Period (for payment) *</Label>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.period_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hours *</Label>
              <Input type="number" step="0.01" min="0" value={hours} onChange={e => { setHours(e.target.value); setApproved(false); }} required />
              <p className="text-[10px] text-muted-foreground">Auto-filled from balance. Override if needed.</p>
            </div>
            <div className="space-y-2">
              <Label>Rate (£) *</Label>
              <Input type="number" step="0.01" min="0" value={rate} onChange={e => { setRate(e.target.value); setApproved(false); }} required />
            </div>
          </div>

          {total > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Settlement Amount</span>
                <span className="text-lg font-bold text-destructive">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {/* Approval step */}
          {total > 0 && !approved && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-success/30 text-success hover:bg-success/5"
              onClick={() => setApproved(true)}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              I approve this settlement of {formatCurrency(total)}
            </Button>
          )}
          {approved && (
            <div className="p-2 rounded bg-success/10 border border-success/20 text-xs text-success flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Settlement of {formatCurrency(total)} approved — ready to record.</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createPayment.isPending || !approved} className="bg-destructive hover:bg-destructive/90">
              {createPayment.isPending ? "Settling..." : "Settle & Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
