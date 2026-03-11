import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreatePayrollEntry } from "@/hooks/usePayroll";

interface AddEmployeeToPeriodDialogProps {
  periodId: string;
  existingEmployeeIds: string[];
}

export function AddEmployeeToPeriodDialog({ periodId, existingEmployeeIds }: AddEmployeeToPeriodDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  
  const { data: employees = [] } = useEmployees();
  const createEntry = useCreatePayrollEntry();

  // Show active + starter employees not already in this period
  const availableEmployees = employees.filter(
    (emp) => (emp.status === "active" || emp.status === "starter") && !existingEmployeeIds.includes(emp.id)
  );

  const handleAdd = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;

    try {
      await createEntry.mutateAsync({
        payroll_period_id: periodId,
        employee_id: emp.id,
        hourly_rate: emp.hourly_rate,
        service_charge: emp.service_charge || 0,
        timesheet_hours: 0,
        performance_bonus: 0,
        special_bonus: 0,
        total_pay: 0,
      } as any);

      toast.success(`${emp.forename} ${emp.surname} added to this payroll period`);
      setSelectedEmployeeId("");
      setOpen(false);
    } catch {
      toast.error("Failed to add employee");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={availableEmployees.length === 0}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Employee to Period
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-sm text-muted-foreground">
              Add a new starter or existing employee who isn't yet in this payroll period. Their current hourly rate and service charge will be used.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.forename} {emp.surname} — {emp.department}
                    {emp.status === "starter" ? " (Starter)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableEmployees.length === 0 && (
              <p className="text-xs text-muted-foreground">All active employees are already in this period.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedEmployeeId || createEntry.isPending}>
            {createEntry.isPending ? "Adding..." : "Add to Period"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
