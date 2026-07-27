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
import { useTenant } from "@/hooks/useTenant";
import { isRelevantToPayrollPeriod, isStarterInPeriod } from "@/lib/employee-period-relevance";

interface AddEmployeeToPeriodDialogProps {
  periodId: string;
  existingEmployeeIds: string[];
  periodStart?: string | null;
  periodEnd?: string | null;
  priorPeriodEmployeeIds?: Set<string>;
}

export function AddEmployeeToPeriodDialog({
  periodId,
  existingEmployeeIds,
  periodStart,
  periodEnd,
  priorPeriodEmployeeIds,
}: AddEmployeeToPeriodDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  
  const { data: employees = [] } = useEmployees();
  const createEntry = useCreatePayrollEntry();
  const { tenantId } = useTenant();

  // Show employees relevant to the selected period (excludes former
  // employees whose end_date is before the period start, unless they have
  // current-period activity). We don't have entries here, so we let the
  // helper apply status + end_date rules.
  const period = periodStart && periodEnd ? { start_date: periodStart, end_date: periodEnd } : null;
  const availableEmployees = employees.filter((emp) => {
    if (existingEmployeeIds.includes(emp.id)) return false;
    if (!period) return emp.status === "active" || emp.status === "starter";
    return isRelevantToPayrollPeriod(emp as any, period);
  });

  const handleAdd = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    if (!tenantId) {
      toast.error("No tenant context available");
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;

    // Check duplicate (defensive — UI already filters, but handles race conditions)
    if (existingEmployeeIds.includes(emp.id)) {
      toast.error("This employee is already in this payroll period.");
      return;
    }

    if (!emp.hourly_rate && emp.hourly_rate !== 0) {
      toast.error(`${emp.forename} ${emp.surname} has no hourly rate set. Update their record first.`);
      return;
    }

    try {
      await createEntry.mutateAsync({
        payroll_period_id: periodId,
        employee_id: emp.id,
        tenant_id: tenantId,
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
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists")) {
        toast.error("This employee is already in this payroll period.");
      } else if (msg.includes("row-level security")) {
        toast.error("Permission denied. You may not have access to add employees to this period.");
      } else if (msg.includes("locked")) {
        toast.error("This payroll period is locked. Reopen it first.");
      } else {
        toast.error(`Failed to add employee: ${msg || "Unknown error"}`);
      }
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
                {availableEmployees.map((emp) => {
                  const starterHere = period
                    ? isStarterInPeriod(emp as any, period, priorPeriodEmployeeIds)
                    : false;
                  return (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.forename} {emp.surname} — {emp.department}
                      {starterHere ? " (Starter)" : ""}
                    </SelectItem>
                  );
                })}
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
