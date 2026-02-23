import { useState, useMemo } from "react";
import { Plus, Calendar, AlertTriangle, User, UserMinus, ShieldCheck } from "lucide-react";
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
import { useCreateHolidayPayment, useAllHolidayPayments, formatCurrency, formatHours } from "@/hooks/useHolidays";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { useEmployees } from "@/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface AddHolidayPaymentDialogProps {
  defaultEmployeeId?: string;
  onSuccess?: () => void;
}

export function AddHolidayPaymentDialog({ defaultEmployeeId, onSuccess }: AddHolidayPaymentDialogProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || "");
  const [periodId, setPeriodId] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [holidayDate, setHolidayDate] = useState(todayStr);
  const [notes, setNotes] = useState("");
  const [leaverApproved, setLeaverApproved] = useState(false);

  const { data: employees = [] } = useEmployees();
  const { data: periods = [] } = usePayrollPeriods();
  const { data: allPayments = [] } = useAllHolidayPayments();
  const createPayment = useCreateHolidayPayment();

  const { data: allEntries = [] } = useQuery({
    queryKey: ["payroll_entries", "all_accrual"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_entries")
        .select("employee_id, holiday_accrued_hours")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ["holiday_adjustments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_adjustments")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const allEmployeesSorted = useMemo(() => {
    return [...employees].sort((a, b) => {
      const statusOrder = { active: 0, starter: 1, leaver: 2 };
      const orderA = statusOrder[a.status] ?? 1;
      const orderB = statusOrder[b.status] ?? 1;
      if (orderA !== orderB) return orderA - orderB;
      return `${a.forename} ${a.surname}`.localeCompare(`${b.forename} ${b.surname}`);
    });
  }, [employees]);

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const isLeaver = selectedEmployee?.status === "leaver";

  // Calculate holiday summary for selected employee (including adjustments)
  const employeeSummary = useMemo(() => {
    if (!employeeId) return null;

    const totalAccrued = allEntries
      .filter(e => e.employee_id === employeeId)
      .reduce((sum, e) => sum + (e.holiday_accrued_hours || 0), 0);

    const accrualAdj = adjustments
      .filter((a: any) => a.employee_id === employeeId && a.adjustment_type === "accrued")
      .reduce((sum: number, a: any) => sum + Number(a.hours), 0);

    const totalTaken = allPayments
      .filter((p: any) => p.employee_id === employeeId)
      .reduce((sum: number, p: any) => sum + (p.hours || 0), 0);

    const takenAdj = adjustments
      .filter((a: any) => a.employee_id === employeeId && a.adjustment_type === "taken")
      .reduce((sum: number, a: any) => sum + Number(a.hours), 0);

    const totalPaid = allPayments
      .filter((p: any) => p.employee_id === employeeId)
      .reduce((sum: number, p: any) => sum + (p.total || 0), 0);

    const adjustedAccrued = totalAccrued + accrualAdj;
    const adjustedTaken = totalTaken + takenAdj;
    const balance = adjustedAccrued - adjustedTaken;

    return { totalAccrued: adjustedAccrued, totalTaken: adjustedTaken, totalPaid, balance };
  }, [employeeId, allEntries, allPayments, adjustments]);

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    setLeaverApproved(false);
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setRate(emp.hourly_rate.toString());
      // For leavers, auto-fill the remaining balance
      if (emp.status === "leaver") {
        const accrued = allEntries
          .filter(e => e.employee_id === id)
          .reduce((sum, e) => sum + (e.holiday_accrued_hours || 0), 0);
        const accrualAdj = adjustments
          .filter((a: any) => a.employee_id === id && a.adjustment_type === "accrued")
          .reduce((sum: number, a: any) => sum + Number(a.hours), 0);
        const taken = allPayments
          .filter((p: any) => p.employee_id === id)
          .reduce((sum: number, p: any) => sum + (p.hours || 0), 0);
        const takenAdj = adjustments
          .filter((a: any) => a.employee_id === id && a.adjustment_type === "taken")
          .reduce((sum: number, a: any) => sum + Number(a.hours), 0);
        const balance = (accrued + accrualAdj) - (taken + takenAdj);
        setHours(Math.max(0, balance).toFixed(2));
        setNotes("Leaver settlement — full holiday balance payout");
      }
    }
  };

  const total = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);

  const [overdrawConfirmed, setOverdrawConfirmed] = useState(false);

  // Check if this payment would overdraw the employee's balance
  const wouldOverdraw = useMemo(() => {
    if (!employeeSummary || !hours) return false;
    const requestedHours = parseFloat(hours) || 0;
    return employeeSummary.balance - requestedHours < 0;
  }, [employeeSummary, hours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !periodId || !hours || !rate || !holidayDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    // For leavers, require explicit approval
    if (isLeaver && !leaverApproved) {
      toast.error("Please review and approve the leaver settlement before recording");
      return;
    }

    // Overdraw protection — require explicit confirmation
    if (wouldOverdraw && !overdrawConfirmed) {
      return;
    }

    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      toast.error("Employee not found");
      return;
    }

    try {
      const holidayDateObj = new Date(holidayDate);
      const leaveYear = holidayDateObj.getFullYear();

      await createPayment.mutateAsync({
        employee_id: employeeId,
        employee_name: `${employee.forename} ${employee.surname}`,
        payroll_period_id: periodId,
        hours: parseFloat(hours),
        rate: parseFloat(rate),
        total,
        holiday_taken_date: holidayDate,
        leave_year_start: `${leaveYear}-01-01`,
        leave_year_end: `${leaveYear}-12-31`,
        notes: notes || null,
      });

      toast.success(`Holiday payment of ${formatCurrency(total)} recorded — payroll period updated`);
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Error adding holiday payment:", error);
      toast.error("Failed to add holiday payment");
    }
  };

  const resetForm = () => {
    if (!defaultEmployeeId) setEmployeeId("");
    setPeriodId("");
    setHours("");
    setRate("");
    setHolidayDate(todayStr);
    setNotes("");
    setLeaverApproved(false);
    setOverdrawConfirmed(false);
  };

  // Only show draft/pending periods for flexibility
  const editablePeriods = periods.filter(p => p.status === "draft" || p.status === "pending");
  const allPeriodsForDisplay = periods;

  // Auto-select latest editable period when dialog opens
  const latestEditablePeriodId = editablePeriods.length > 0 ? editablePeriods[0].id : "";

  // When dialog opens, set defaults
  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      // Set defaults on open
      setHolidayDate(todayStr);
      if (!periodId && latestEditablePeriodId) {
        setPeriodId(latestEditablePeriodId);
      }
    }
    if (!v) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Holiday Taken
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Record Holiday Taken
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <Select value={employeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {allEmployeesSorted.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <span>{emp.forename} {emp.surname}</span>
                      <span className="text-muted-foreground text-xs">({emp.department})</span>
                      {emp.status === "leaver" && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/20">
                          Leaver
                        </Badge>
                      )}
                      {emp.status === "starter" && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-accent/10 text-accent border-accent/20">
                          Starter
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Holiday Summary Card */}
          {employeeId && employeeSummary && (
            <div className={cn(
              "rounded-lg border p-3 space-y-2",
              isLeaver ? "bg-destructive/5 border-destructive/20" : "bg-muted/50 border-border"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">
                  {selectedEmployee?.forename} {selectedEmployee?.surname}
                </span>
                {isLeaver && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Leaver
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accrued:</span>
                  <span className="font-medium text-success">{formatHours(employeeSummary.totalAccrued)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taken:</span>
                  <span className="font-medium text-primary">{formatHours(employeeSummary.totalTaken)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className={cn(
                    "font-bold",
                    employeeSummary.balance >= 0 ? "text-accent" : "text-destructive"
                  )}>
                    {employeeSummary.balance >= 0 ? "+" : ""}{formatHours(employeeSummary.balance)} hrs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="font-medium">{formatCurrency(employeeSummary.totalPaid)}</span>
                </div>
              </div>

              {/* Leaver approval section */}
              {isLeaver && employeeSummary.balance > 0 && (
                <div className="space-y-2 mt-2">
                  <div className="p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      This leaver has <strong>{formatHours(employeeSummary.balance)} hrs</strong> of untaken holiday remaining.
                      Hours and rate are pre-filled. Review and approve below.
                    </span>
                  </div>
                  {!leaverApproved ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-success/30 text-success hover:bg-success/5"
                      onClick={() => setLeaverApproved(true)}
                    >
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      I approve this settlement ({formatHours(parseFloat(hours) || employeeSummary.balance)} hrs × {formatCurrency(parseFloat(rate) || 0)} = {formatCurrency(total || (employeeSummary.balance * (parseFloat(rate) || 0)))})
                    </Button>
                  ) : (
                    <div className="p-2 rounded bg-success/10 border border-success/20 text-xs text-success flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>Settlement approved — ready to record.</span>
                    </div>
                  )}
                </div>
              )}
              {isLeaver && employeeSummary.balance <= 0 && (
                <div className="mt-2 p-2 rounded bg-success/10 border border-success/20 text-xs text-success">
                  No remaining balance — employee has used all accrued holiday.
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="holidayDate">Holiday Date *</Label>
            <Input
              id="holidayDate"
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The leave year is automatically determined from this date
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Payroll Period (for payment) *</Label>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {editablePeriods.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Editable Periods</div>
                    {editablePeriods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.period_name}
                        <Badge variant="secondary" className="ml-2 text-[10px]">{p.status}</Badge>
                      </SelectItem>
                    ))}
                  </>
                )}
                {allPeriodsForDisplay.filter(p => p.status !== "draft" && p.status !== "pending").length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase mt-1">All Periods</div>
                    {allPeriodsForDisplay.filter(p => p.status !== "draft" && p.status !== "pending").map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.period_name}
                        <Badge variant="outline" className="ml-2 text-[10px]">{p.status}</Badge>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The payroll period's holiday total and grand total will be updated automatically
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="hours">Hours *</Label>
                {employeeSummary && (
                  <span className={cn(
                    "text-xs font-medium",
                    employeeSummary.balance >= 0 ? "text-success" : "text-destructive"
                  )}>
                    Bal: {formatHours(employeeSummary.balance)}h
                  </span>
                )}
              </div>
              <Input
                id="hours"
                type="number"
                step="0.01"
                min="0"
                value={hours}
                onChange={(e) => { setHours(e.target.value); setOverdrawConfirmed(false); if (isLeaver) setLeaverApproved(false); }}
                placeholder="8.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate (£) *</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => { setRate(e.target.value); if (isLeaver) setLeaverApproved(false); }}
                placeholder="12.21"
                required
              />
            </div>
          </div>

          {hours && rate && (
            <div className={cn(
              "p-3 rounded-lg border",
              isLeaver ? "bg-destructive/10 border-destructive/20" : "bg-primary/10 border-primary/20"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {isLeaver ? "Settlement Amount" : "Total Payment"}
                </span>
                <span className={cn("text-lg font-bold", isLeaver ? "text-destructive" : "text-primary")}>
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          {/* Overdraw warning */}
          {wouldOverdraw && !overdrawConfirmed && employeeSummary && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive">Overdraw Warning</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    This employee only has <strong>{formatHours(employeeSummary.balance)} hrs</strong> remaining but you are recording <strong>{formatHours(parseFloat(hours) || 0)} hrs</strong>.
                    This will put them <strong>{formatHours(Math.abs(employeeSummary.balance - (parseFloat(hours) || 0)))} hrs</strong> overdrawn.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => setOverdrawConfirmed(true)}
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                I confirm this overdraw is correct
              </Button>
            </div>
          )}

          {wouldOverdraw && overdrawConfirmed && (
            <div className="p-2 rounded-lg border border-warning/30 bg-warning/5 text-xs text-warning flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Overdraw confirmed — ready to record.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPayment.isPending || (isLeaver && !leaverApproved && (employeeSummary?.balance ?? 0) > 0) || (wouldOverdraw && !overdrawConfirmed)}
              className={isLeaver ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {createPayment.isPending ? "Recording..." : isLeaver ? "Record Settlement" : "Record Holiday"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}