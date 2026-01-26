import { useState } from "react";
import { Plus, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateEmployee, useUpdateEmployee, type Employee, type EmployeeInsert } from "@/hooks/useEmployees";
import type { Database } from "@/integrations/supabase/types";

type DepartmentType = Database["public"]["Enums"]["department_type"];
type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

interface EmployeeFormDialogProps {
  employee?: Employee;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EmployeeFormDialog({ employee, trigger, onSuccess }: EmployeeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    forename: employee?.forename || "",
    surname: employee?.surname || "",
    department: (employee?.department || "FOH") as DepartmentType,
    status: (employee?.status || "active") as EmployeeStatus,
    hourly_rate: employee?.hourly_rate?.toString() || "",
    service_charge: employee?.service_charge?.toString() || "0",
    ni_number: employee?.ni_number || "",
    bank_account_no: employee?.bank_account_no || "",
    sort_code: employee?.sort_code || "",
    notes: employee?.notes || "",
  });

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.forename || !formData.surname || !formData.hourly_rate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const employeeData: EmployeeInsert = {
        forename: formData.forename,
        surname: formData.surname,
        department: formData.department,
        status: formData.status,
        hourly_rate: parseFloat(formData.hourly_rate),
        service_charge: parseFloat(formData.service_charge) || 0,
        ni_number: formData.ni_number || null,
        bank_account_no: formData.bank_account_no || null,
        sort_code: formData.sort_code || null,
        notes: formData.notes || null,
      };

      if (employee) {
        await updateEmployee.mutateAsync({ id: employee.id, updates: employeeData });
        toast.success("Employee updated successfully");
      } else {
        await createEmployee.mutateAsync(employeeData);
        toast.success("Employee created successfully");
      }

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(employee ? "Failed to update employee" : "Failed to create employee");
    }
  };

  const isLoading = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {employee ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {employee ? "Edit Employee" : "Add New Employee"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="forename">First Name *</Label>
              <Input
                id="forename"
                value={formData.forename}
                onChange={(e) => setFormData({ ...formData, forename: e.target.value })}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surname">Surname *</Label>
              <Input
                id="surname"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                placeholder="Smith"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value: DepartmentType) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOH">FOH (Front of House)</SelectItem>
                  <SelectItem value="BOH">BOH (Back of House)</SelectItem>
                  <SelectItem value="CPU">CPU (Central Production)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: EmployeeStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="leaver">Leaver</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate (£) *</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                placeholder="12.21"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_charge">Service Charge (£)</Label>
              <Input
                id="service_charge"
                type="number"
                step="0.01"
                value={formData.service_charge}
                onChange={(e) => setFormData({ ...formData, service_charge: e.target.value })}
                placeholder="1.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ni_number">NI Number</Label>
            <Input
              id="ni_number"
              value={formData.ni_number}
              onChange={(e) => setFormData({ ...formData, ni_number: e.target.value })}
              placeholder="AB123456C"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_account_no">Bank Account No.</Label>
              <Input
                id="bank_account_no"
                value={formData.bank_account_no}
                onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                placeholder="12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_code">Sort Code</Label>
              <Input
                id="sort_code"
                value={formData.sort_code}
                onChange={(e) => setFormData({ ...formData, sort_code: e.target.value })}
                placeholder="12-34-56"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : employee ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
