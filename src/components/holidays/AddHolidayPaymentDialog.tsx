import { useState } from "react";
import { Plus, Calendar } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateHolidayPayment } from "@/hooks/useHolidays";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { useEmployees } from "@/hooks/useEmployees";

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
  const createPayment = useCreateHolidayPayment();

  const activeEmployees = employees.filter(e => e.status !== 'leaver');
  const selectedEmployee = employees.find(e => e.id === employeeId);

  // Auto-populate rate when employee selected
  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setRate(emp.hourly_rate.toString());
    }
  };

  const total = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);

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
      // Determine leave year from holiday date
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
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.forename} {emp.surname} ({emp.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
