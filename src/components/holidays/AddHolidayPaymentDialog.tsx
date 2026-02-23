import { useState, useMemo } from "react";
import { Plus, Calendar, AlertTriangle, User } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || "");
  const [periodId, setPeriodId] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: employees = [] } = useEmployees();
  const { data: periods = [] } = usePayrollPeriods();
  const { data: allPayments = [] } = useAllHolidayPayments();
  const createPayment = useCreateHolidayPayment();

  // Fetch all payroll entries for accrual calculation
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

  // Include all employees (active, starter, leaver)
  const allEmployeesSorted = useMemo(() => {
    return [...employees].sort((a, b) => {
      // Active/starter first, leavers last
      const statusOrder = { active: 0, starter: 1, leaver: 2 };
      const orderA = statusOrder[a.status] ?? 1;
      const orderB = statusOrder[b.status] ?? 1;
      if (orderA !== orderB) return orderA - orderB;
      return `${a.forename} ${a.surname}`.localeCompare(`${b.forename} ${b.surname}`);
    });
  }, [employees]);

  const selectedEmployee = employees.find(e => e.id === employeeId);

  // Calculate holiday summary for selected employee
  const employeeSummary = useMemo(() => {
    if (!employeeId) return null;

    const totalAccrued = allEntries
      .filter(e => e.employee_id === employeeId)
      .reduce((sum, e) => sum + (e.holiday_accrued_hours || 0), 0);

    const totalTaken = allPayments
      .filter((p: any) => p.employee_id === employeeId)
      .reduce((sum: number, p: any) => sum + (p.hours || 0), 0);

    const totalPaid = allPayments
      .filter((p: any) => p.employee_id === employeeId)
      .reduce((sum: number, p: any) => sum + (p.total || 0), 0);

    const balance = totalAccrued - totalTaken;

    return { totalAccrued, totalTaken, totalPaid, balance };
  }, [employeeId, allEntries, allPayments]);

  // Auto-populate rate when employee selected
  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setRate(emp.hourly_rate.toString());
    }
  };

  const total = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);
  const isLeaver = selectedEmployee?.status === "leaver";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !periodId || !hours || !rate || !holidayDate) {
      toast.error("Please fill in all required fields");
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
      const leaveYearStart = `${leaveYear}-01-01`;
      const leaveYearEnd = `${leaveYear}-12-31`;

      await createPayment.mutateAsync({
        employee_id: employeeId,
        employee_name: `${employee.forename} ${employee.surname}`,
        payroll_period_id: periodId,
        hours: parseFloat(hours),
        rate: parseFloat(rate),
        total,
        holiday_taken_date: holidayDate,
        leave_year_start: leaveYearStart,
        leave_year_end: leaveYearEnd,
        notes: notes || null,
      });

      toast.success("Holiday payment added successfully");
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
    setHolidayDate("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Holiday Taken
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
              {isLeaver && employeeSummary.balance > 0 && (
                <div className="mt-2 p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    This employee has <strong>{formatHours(employeeSummary.balance)} hrs</strong> of untaken holiday remaining.
                    Consider paying out the full balance.
                  </span>
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
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.period_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours *</Label>
              <Input
                id="hours"
                type="number"
                step="0.01"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
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
                onChange={(e) => setRate(e.target.value)}
                placeholder="12.21"
                required
              />
            </div>
          </div>

          {hours && rate && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Payment</span>
                <span className="text-lg font-bold text-primary">
                  £{total.toFixed(2)}
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPayment.isPending}>
              {createPayment.isPending ? "Adding..." : "Add Holiday"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
