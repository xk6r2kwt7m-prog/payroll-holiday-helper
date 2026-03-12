import { useState, useEffect } from "react";
import { Plus, Edit2, Save, X, User, Building, CreditCard, FileText, Calendar, MapPin, Check, ShieldCheck, Globe } from "lucide-react";
import { TalentOptInDialog } from "@/components/talent/TalentOptInDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";
import { useCreateEmployee, useUpdateEmployee, type Employee, type EmployeeInsert } from "@/hooks/useEmployees";
import { useEmployeeBranches, useSetEmployeeBranches, useTenantBranches, getBranchEmoji, type BranchType } from "@/hooks/useBranches";
import { PAY_TYPES, OVERTIME_MODELS, HOLIDAY_ENTITLEMENT_METHODS, useCountryRules } from "@/hooks/useCountryRules";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { useTenant } from "@/hooks/useTenant";

type DepartmentType = Database["public"]["Enums"]["department_type"];
type EmployeeStatus = Database["public"]["Enums"]["employee_status"];

interface EmployeeFormDialogProps {
  employee?: Employee;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EmployeeFormDialog({ employee, trigger, onSuccess }: EmployeeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [selectedBranches, setSelectedBranches] = useState<BranchType[]>([]);
  const [primaryBranch, setPrimaryBranch] = useState<BranchType | undefined>();
  const [talentOptInOpen, setTalentOptInOpen] = useState(false);
  const [savedEmployeeId, setSavedEmployeeId] = useState<string | null>(null);
  const [savedEmployeeName, setSavedEmployeeName] = useState("");
  const [formData, setFormData] = useState({
    forename: "",
    surname: "",
    department: "FOH" as DepartmentType,
    status: "starter" as EmployeeStatus,
    hourly_rate: "",
    service_charge: "0",
    ni_number: "",
    bank_account_no: "",
    sort_code: "",
    notes: "",
    start_date: "",
    end_date: "",
    nationality: "",
    passport_no: "",
    employee_ref: "",
    sharing_code: "",
    settlement_status: "",
    residence_permit: "",
    rtw_confirmed: false,
    rtw_checked_date: "",
  });

  const { data: existingBranches = [] } = useEmployeeBranches(employee?.id);
  const { data: availableBranches = [] } = useTenantBranches();

  // Reset form only when dialog opens (not on every render)
  useEffect(() => {
    if (!open) return;
    
    if (employee) {
      setFormData({
        forename: employee.forename || "",
        surname: employee.surname || "",
        department: (employee.department || "FOH") as DepartmentType,
        status: (employee.status || "starter") as EmployeeStatus,
        hourly_rate: employee.hourly_rate?.toString() || "",
        service_charge: employee.service_charge?.toString() || "0",
        ni_number: employee.ni_number || "",
        bank_account_no: employee.bank_account_no || "",
        sort_code: employee.sort_code || "",
        notes: employee.notes || "",
        start_date: employee.start_date || "",
        end_date: employee.end_date || "",
        nationality: employee.nationality || "",
        passport_no: employee.passport_no || "",
        employee_ref: employee.employee_ref || "",
        sharing_code: employee.sharing_code || "",
        settlement_status: employee.settlement_status || "",
        residence_permit: employee.residence_permit || "",
        rtw_confirmed: !!(employee.settlement_status || employee.sharing_code),
        rtw_checked_date: "",
      });
    } else {
      setFormData({
        forename: "",
        surname: "",
        department: "FOH" as DepartmentType,
        status: "starter" as EmployeeStatus,
        hourly_rate: "",
        service_charge: "0",
        ni_number: "",
        bank_account_no: "",
        sort_code: "",
        notes: "",
        start_date: "",
        end_date: "",
        nationality: "",
        passport_no: "",
        employee_ref: "",
        sharing_code: "",
        settlement_status: "",
        residence_permit: "",
        rtw_confirmed: false,
        rtw_checked_date: "",
      });
      setSelectedBranches([]);
      setPrimaryBranch(undefined);
    }
    setActiveTab("personal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Set branches when they load for editing (only for existing employees)
  useEffect(() => {
    if (open && employee && existingBranches.length > 0) {
      setSelectedBranches(existingBranches.map(b => b.branch));
      const primary = existingBranches.find(b => b.is_primary);
      setPrimaryBranch(primary?.branch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id, existingBranches.length]);

  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const setEmployeeBranches = useSetEmployeeBranches();
  const { tenantId } = useTenant();

  const isNewEmployee = !employee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.forename.trim() || !formData.surname.trim() || !formData.hourly_rate) {
      toast.error("Please fill in all required fields (name and hourly rate)");
      return;
    }

    // For new employees, require banking details
    if (isNewEmployee) {
      if (!formData.ni_number.trim()) {
        toast.error("National Insurance Number is required for new employees");
        setActiveTab("personal");
        return;
      }
      if (!formData.sort_code.trim() || !formData.bank_account_no.trim()) {
        toast.error("Bank details (sort code and account number) are required for new employees");
        setActiveTab("banking");
        return;
      }
      if (selectedBranches.length === 0) {
        toast.error("Please select at least one branch for this employee");
        setActiveTab("employment");
        return;
      }
    }

    try {
      const employeeData: Omit<EmployeeInsert, 'tenant_id'> = {
        forename: formData.forename.trim(),
        surname: formData.surname.trim(),
        department: formData.department,
        status: formData.status,
        hourly_rate: parseFloat(formData.hourly_rate),
        service_charge: parseFloat(formData.service_charge) || 0,
        ni_number: formData.ni_number.trim() || null,
        bank_account_no: formData.bank_account_no.trim() || null,
        sort_code: formData.sort_code.trim() || null,
        notes: formData.notes.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        nationality: formData.nationality.trim() || null,
        passport_no: formData.passport_no.trim() || null,
        employee_ref: formData.employee_ref.trim() || null,
        sharing_code: formData.sharing_code.trim() || null,
        settlement_status: formData.settlement_status.trim() || null,
        residence_permit: formData.residence_permit.trim() || null,
      };

      let employeeId: string;

      if (employee) {
        await updateEmployee.mutateAsync({ id: employee.id, updates: employeeData });
        employeeId = employee.id;
        toast.success("Employee updated successfully");
      } else {
        const newEmployee = await createEmployee.mutateAsync(employeeData);
        employeeId = newEmployee.id;
        toast.success("Employee created successfully");
      }

      // Update branches
      await setEmployeeBranches.mutateAsync({
        employeeId,
        branches: selectedBranches,
        primaryBranch: primaryBranch || selectedBranches[0],
      });

      setOpen(false);
      onSuccess?.();

      // Trigger talent pool opt-in when status changes to leaver
      const wasLeaver = employee?.status === "leaver";
      const isNowLeaver = formData.status === "leaver";
      if (isNowLeaver && !wasLeaver) {
        setSavedEmployeeId(employeeId);
        setSavedEmployeeName(`${formData.forename} ${formData.surname}`);
        setTalentOptInOpen(true);
      }
    } catch (error) {
      toast.error(employee ? "Failed to update employee" : "Failed to create employee");
    }
  };

  const isLoading = createEmployee.isPending || updateEmployee.isPending || setEmployeeBranches.isPending;

  const toggleBranch = (branch: BranchType) => {
    setSelectedBranches(prev => {
      if (prev.includes(branch)) {
        const newBranches = prev.filter(b => b !== branch);
        if (primaryBranch === branch) {
          setPrimaryBranch(newBranches[0]);
        }
        return newBranches;
      } else {
        if (prev.length === 0) {
          setPrimaryBranch(branch);
        }
        return [...prev, branch];
      }
    });
  };

  const TabButton = ({ value, icon: Icon, label }: { value: string; icon: typeof User; label: string }) => (
    <TabsTrigger 
      value={value} 
      className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gradient-primary shadow-md hover:shadow-lg transition-shadow">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              employee ? "bg-accent/10" : "bg-primary/10"
            )}>
              {employee ? <Edit2 className="h-5 w-5 text-accent" /> : <Plus className="h-5 w-5 text-primary" />}
            </div>
            {employee ? `Edit ${employee.forename} ${employee.surname}` : "Add New Employee"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-6 mb-4">
              <TabButton value="personal" icon={User} label="Personal" />
              <TabButton value="employment" icon={Building} label="Work" />
              <TabButton value="branches" icon={MapPin} label="Branches" />
              <TabButton value="rtw" icon={ShieldCheck} label="RTW" />
              <TabButton value="banking" icon={CreditCard} label="Banking" />
              <TabButton value="notes" icon={FileText} label="Notes" />
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-2">
              {/* Personal Info Tab */}
              <TabsContent value="personal" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="forename" className="flex items-center gap-1">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="forename"
                      value={formData.forename}
                      onChange={(e) => setFormData({ ...formData, forename: e.target.value })}
                      placeholder="John"
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surname" className="flex items-center gap-1">
                      Surname <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="surname"
                      value={formData.surname}
                      onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                      placeholder="Smith"
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee_ref">Employee Reference</Label>
                  <Input
                    id="employee_ref"
                    value={formData.employee_ref}
                    onChange={(e) => setFormData({ ...formData, employee_ref: e.target.value })}
                    placeholder="EMP001"
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="British"
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport_no">Passport Number</Label>
                    <Input
                      id="passport_no"
                      value={formData.passport_no}
                      onChange={(e) => setFormData({ ...formData, passport_no: e.target.value })}
                      placeholder="123456789"
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ni_number" className="flex items-center gap-1">
                    National Insurance Number {isNewEmployee && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="ni_number"
                    value={formData.ni_number}
                    onChange={(e) => setFormData({ ...formData, ni_number: e.target.value.toUpperCase() })}
                    placeholder="AB123456C"
                    maxLength={9}
                    className="transition-all focus:ring-2 focus:ring-primary/20 uppercase"
                  />
                  <p className="text-xs text-muted-foreground">Format: 2 letters, 6 numbers, 1 letter</p>
                </div>
              </TabsContent>

              {/* Employment Tab */}
              <TabsContent value="employment" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="flex items-center gap-1">
                      Department <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value: DepartmentType) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FOH">🍽️ FOH (Front of House)</SelectItem>
                        <SelectItem value="BOH">👨‍🍳 BOH (Back of House)</SelectItem>
                        <SelectItem value="CPU">🏭 CPU (Central Production)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {employee ? (
                    <div className="space-y-2">
                      <Label htmlFor="status" className="flex items-center gap-1">
                        Status <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: EmployeeStatus) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">✅ Active</SelectItem>
                          <SelectItem value="starter">🆕 Starter</SelectItem>
                          <SelectItem value="leaver">👋 Leaver</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">Status</Label>
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50 text-sm">
                        <span>🆕</span>
                        <span>Starter</span>
                      </div>
                      <p className="text-xs text-muted-foreground">New employees are added as starters</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate" className="flex items-center gap-1">
                      Hourly Rate (£) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      placeholder="12.21"
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_charge">Service Charge (£)</Label>
                    <Input
                      id="service_charge"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.service_charge}
                      onChange={(e) => setFormData({ ...formData, service_charge: e.target.value })}
                      placeholder="1.00"
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Employment Dates
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="transition-all focus:ring-2 focus:ring-primary/20"
                      />
                      <p className="text-xs text-muted-foreground">Leave blank if still employed</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Branches Tab */}
              <TabsContent value="branches" className="space-y-4 mt-0">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mb-4">
                  <p className="text-sm text-muted-foreground">
                    📍 Select the branch(es) where this employee works. {isNewEmployee && <span className="text-destructive font-medium">At least one branch is required.</span>}
                  </p>
                </div>

                <div className="space-y-3">
                  {availableBranches.map((branch) => (
                    <div
                      key={branch}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer",
                        selectedBranches.includes(branch)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => toggleBranch(branch)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                          selectedBranches.includes(branch)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}>
                          {selectedBranches.includes(branch) && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-xl">{getBranchEmoji(branch, availableBranches)}</span>
                        <span className="font-medium">{branch}</span>
                      </div>
                      
                      {selectedBranches.includes(branch) && selectedBranches.length > 1 && (
                        <Button
                          type="button"
                          variant={primaryBranch === branch ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryBranch(branch);
                          }}
                        >
                          {primaryBranch === branch ? "Primary" : "Set Primary"}
                        </Button>
                      )}
                      
                      {selectedBranches.includes(branch) && selectedBranches.length === 1 && (
                        <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">Primary</span>
                      )}
                    </div>
                  ))}
                </div>

                {selectedBranches.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedBranches.length === 1 
                      ? `Works at ${selectedBranches[0]}`
                      : `Works at ${selectedBranches.length} branches. Primary: ${primaryBranch || selectedBranches[0]}`
                    }
                  </p>
                )}
              </TabsContent>

              {/* Right to Work Tab */}
              <TabsContent value="rtw" className="space-y-4 mt-0">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mb-4">
                  <p className="text-sm text-muted-foreground">
                    🛂 Confirm the employee's right to work in the UK. Use the{" "}
                    <a 
                      href="https://www.gov.uk/view-right-to-work" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline font-medium"
                    >
                      GOV.UK Right to Work checker
                    </a>{" "}
                    to verify their share code online.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sharing_code">Share Code</Label>
                  <Input
                    id="sharing_code"
                    value={formData.sharing_code}
                    onChange={(e) => setFormData({ ...formData, sharing_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. W46 3FG 27R"
                    maxLength={11}
                    className="transition-all focus:ring-2 focus:ring-primary/20 uppercase font-mono"
                  />
                  <p className="text-xs text-muted-foreground">9-character code from the employee's share code letter or email</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="settlement_status">Settlement Status</Label>
                  <Select
                    value={formData.settlement_status}
                    onValueChange={(value) => setFormData({ ...formData, settlement_status: value })}
                  >
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="british_citizen">🇬🇧 British Citizen</SelectItem>
                      <SelectItem value="settled">✅ Settled Status (ILR)</SelectItem>
                      <SelectItem value="pre_settled">🔄 Pre-Settled Status</SelectItem>
                      <SelectItem value="work_visa">📋 Work Visa</SelectItem>
                      <SelectItem value="student_visa">🎓 Student Visa</SelectItem>
                      <SelectItem value="other">📝 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residence_permit">Visa / Residence Permit Number</Label>
                  <Input
                    id="residence_permit"
                    value={formData.residence_permit}
                    onChange={(e) => setFormData({ ...formData, residence_permit: e.target.value })}
                    placeholder="e.g. BRP number or visa ref"
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rtw_checked_date">RTW Check Date</Label>
                  <Input
                    id="rtw_checked_date"
                    type="date"
                    value={formData.rtw_checked_date}
                    onChange={(e) => setFormData({ ...formData, rtw_checked_date: e.target.value })}
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer",
                    formData.rtw_confirmed
                      ? "border-primary bg-primary/10"
                      : "border-destructive/50 bg-destructive/5"
                  )}
                  onClick={() => setFormData({ ...formData, rtw_confirmed: !formData.rtw_confirmed })}
                >
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                    formData.rtw_confirmed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}>
                    {formData.rtw_confirmed && <Check className="h-3 w-3" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {formData.rtw_confirmed ? "✅ Right to Work Confirmed" : "⚠️ Right to Work Not Confirmed"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      I confirm I have checked this employee's right to work in the UK
                    </p>
                  </div>
                </div>

                {!formData.rtw_confirmed && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ You must verify right to work before the employee starts. Failure to do so may result in a civil penalty of up to £45,000 per illegal worker.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Banking Tab */}
              <TabsContent value="banking" className="space-y-4 mt-0">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mb-4">
                  <p className="text-sm text-muted-foreground">
                    🔒 Banking details are stored securely. {isNewEmployee && <span className="text-destructive font-medium">Required for new employees.</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bank details will only be included in the first payroll export of each month.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_code" className="flex items-center gap-1">
                    Sort Code {isNewEmployee && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="sort_code"
                    value={formData.sort_code}
                    onChange={(e) => {
                      // Auto-format sort code with dashes
                      let value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length > 6) value = value.slice(0, 6);
                      if (value.length >= 4) {
                        value = value.slice(0, 2) + '-' + value.slice(2, 4) + '-' + value.slice(4);
                      } else if (value.length >= 2) {
                        value = value.slice(0, 2) + '-' + value.slice(2);
                      }
                      setFormData({ ...formData, sort_code: value });
                    }}
                    placeholder="12-34-56"
                    maxLength={8}
                    className="transition-all focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_account_no" className="flex items-center gap-1">
                    Account Number {isNewEmployee && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="bank_account_no"
                    value={formData.bank_account_no}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                      setFormData({ ...formData, bank_account_no: value });
                    }}
                    placeholder="12345678"
                    maxLength={8}
                    className="transition-all focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                  <p className="text-xs text-muted-foreground">8 digit account number</p>
                </div>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any notes about this employee... e.g. dietary requirements, availability, emergency contacts, etc."
                    className="min-h-[200px] transition-all focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.notes.length}/1000 characters
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-between items-center gap-3 pt-4 mt-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <span className="text-destructive">*</span> Required fields
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="gradient-primary shadow-md hover:shadow-lg transition-shadow"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? "Saving..." : employee ? "Update Employee" : "Create Employee"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {savedEmployeeId && tenantId && (
      <TalentOptInDialog
        open={talentOptInOpen}
        onOpenChange={setTalentOptInOpen}
        employeeId={savedEmployeeId}
        employeeName={savedEmployeeName}
        tenantId={tenantId}
      />
    )}
    </>
  );
}
