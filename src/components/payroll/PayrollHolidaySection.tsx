import { useState } from "react";
import { Palmtree, Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useCreateHolidayPayment, formatCurrency } from "@/hooks/useHolidays";
import { useEmployees } from "@/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface HolidayPaymentRow {
  id: string;
  employee_name: string;
  employee_id: string | null;
  hours: number;
  rate: number;
  total: number;
  holiday_taken_date: string | null;
  notes: string | null;
  employees: {
    forename: string;
    surname: string;
    department: string;
  } | null;
}

interface PayrollHolidaySectionProps {
  periodId: string;
  periodStatus: string;
  holidayPayments: HolidayPaymentRow[];
  isAdmin: boolean;
}

export function PayrollHolidaySection({
  periodId,
  periodStatus,
  holidayPayments,
  isAdmin,
}: PayrollHolidaySectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: employees = [] } = useEmployees();
  const createPayment = useCreateHolidayPayment();
  const queryClient = useQueryClient();

  const activeEmployees = employees.filter((e) => e.status !== "leaver");
  const canEdit = isAdmin && (periodStatus === "draft" || periodStatus === "pending");
  const total = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);
  const holidayTotal = holidayPayments.reduce((s, p) => s + Number(p.total), 0);

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp) setRate(emp.hourly_rate.toString());
  };

  const handleAdd = async () => {
    if (!employeeId || !hours || !rate || !holidayDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    const employee = employees.find((e) => e.id === employeeId);
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
        notes: notes || null,
      });
      toast.success("Holiday payment added");
      resetForm();
    } catch {
      toast.error("Failed to add holiday payment");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("holiday_payments").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["holiday_payments"] });
      toast.success("Holiday payment removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const resetForm = () => {
    setEmployeeId("");
    setHours("");
    setRate("");
    setHolidayDate("");
    setNotes("");
    setShowAddForm(false);
  };

  return (
    <div className="rounded-xl bg-card shadow-card border border-border animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
            <Palmtree className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Holiday Pay This Period</h3>
            <p className="text-xs text-muted-foreground">
              {holidayPayments.length > 0
                ? `${holidayPayments.length} payment${holidayPayments.length !== 1 ? "s" : ""} — ${formatCurrency(holidayTotal)}`
                : "No holiday payments recorded yet"}
            </p>
          </div>
        </div>
        {canEdit && !showAddForm && (
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Add Holiday Pay
          </Button>
        )}
      </div>

      {/* Existing payments */}
      {holidayPayments.length > 0 && (
        <div className="divide-y divide-border">
          {holidayPayments.map((hp) => (
            <div key={hp.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="font-medium text-card-foreground">
                  {hp.employees
                    ? `${hp.employees.forename} ${hp.employees.surname}`
                    : hp.employee_name}
                </span>
                <Badge variant="outline" className="text-xs">
                  {hp.employees?.department || "—"}
                </Badge>
                {hp.holiday_taken_date && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(hp.holiday_taken_date).toLocaleDateString("en-GB")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {Number(hp.hours).toFixed(1)}h × {formatCurrency(Number(hp.rate))}
                </span>
                <span className="font-semibold text-warning">{formatCurrency(Number(hp.total))}</span>
                {canEdit && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove holiday payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the {formatCurrency(Number(hp.total))} holiday payment.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(hp.id)}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAddForm && canEdit && (
        <div className="p-4 border-t border-border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Add Holiday Payment</Label>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetForm}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Employee</Label>
              <Select value={employeeId} onValueChange={handleEmployeeChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.forename} {emp.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" className="h-8 text-xs" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Hours</Label>
              <Input type="number" step="0.5" className="h-8 text-xs" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="8" />
            </div>
            <div>
              <Label className="text-xs">Rate (£)</Label>
              <Input type="number" step="0.01" className="h-8 text-xs" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="12.21" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input className="h-8 text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          <div className="flex items-center justify-between">
            {total > 0 && (
              <span className="text-sm font-semibold text-warning">Total: {formatCurrency(total)}</span>
            )}
            <Button size="sm" onClick={handleAdd} disabled={createPayment.isPending} className="ml-auto">
              {createPayment.isPending ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

