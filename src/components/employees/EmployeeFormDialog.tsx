import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Save, X, User, Building, CreditCard, FileText, Calendar, MapPin, Check, ShieldCheck, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";
import { useCreateEmployee, useUpdateEmployee, useEmployees, type Employee, type EmployeeInsert } from "@/hooks/useEmployees";
import { useEmployeeBranches, useSetEmployeeBranches, useTenantBranches, getBranchEmoji, type BranchType } from "@/hooks/useBranches";
import { PAY_TYPES, OVERTIME_MODELS, HOLIDAY_ENTITLEMENT_METHODS, useCountryRules } from "@/hooks/useCountryRules";
import { useDepartments } from "@/hooks/useDepartments";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { useTenant } from "@/hooks/useTenant";
import { usePlanLimits } from "@/hooks/useSubscription";

type DepartmentType = string;
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
  
  const [formData, setFormData] = useState({
    forename: "",
    surname: "",
    email: "",
    date_of_birth: "",
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
    // Contract fields
    contract_country: "GB",
    work_country: "",
    employing_entity: "",
    pay_type: "hourly",
    overtime_model: "none",
    holiday_entitlement_method: "accrual",
    service_charge_eligible: true,
  });

  const { data: existingBranches = [] } = useEmployeeBranches(employee?.id);
  const { data: availableBranches = [] } = useTenantBranches();
  const { data: countryRules = [] } = useCountryRules();
  const { data: departments = [] } = useDepartments();

  // Reset form only when dialog opens (not on every render)
  useEffect(() => {
    if (!open) return;
    
    if (employee) {
      setFormData({
        forename: employee.forename || "",
        surname: employee.surname || "",
        email: employee.email || "",
        date_of_birth: employee.date_of_birth || "",
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
        contract_country: (employee as any).contract_country || "GB",
        work_country: (employee as any).work_country || "",
        employing_entity: (employee as any).employing_entity || "",
        pay_type: (employee as any).pay_type || "hourly",
        overtime_model: (employee as any).overtime_model || "none",
        holiday_entitlement_method: (employee as any).holiday_entitlement_method || "accrual",
        service_charge_eligible: (employee as any).service_charge_eligible !== false,
      });
    } else {
      setFormData({
        forename: "",
        surname: "",
        email: "",
        date_of_birth: "",
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
        contract_country: "GB",
        work_country: "",
        employing_entity: "",
        pay_type: "hourly",
        overtime_model: "none",
        holiday_entitlement_method: "accrual",
        service_charge_eligible: true,
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
  const { data: allEmployees = [] } = useEmployees();
  const planLimits = usePlanLimits();

  const activeEmployeeCount = allEmployees.filter(e => e.status === "active").length;

  const isNewEmployee = !employee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check plan employee limit for new employees
    if (isNewEmployee && planLimits.hasEmployeeLimit && planLimits.maxEmployees !== null) {
      if (activeEmployeeCount >= planLimits.maxEmployees) {
        toast.error(`You have reached the employee limit (${planLimits.maxEmployees}) for your plan. Upgrade to continue.`);
        return;
      }
    }

    // Pre-submit validation — only truly mandatory fields for starter creation
    const validationErrors: string[] = [];
    if (!formData.forename.trim()) validationErrors.push("First name is required");
    if (!formData.surname.trim()) validationErrors.push("Surname is required");

    // For editing existing employees, hourly rate is always required
    // For new starters, default to 0 if not provided (payroll readiness will flag it)
    if (!isNewEmployee && (!formData.hourly_rate || isNaN(parseFloat(formData.hourly_rate)))) {
      validationErrors.push("A valid hourly rate is required");
    }

    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(". "));
      setActiveTab("personal");
      return;
    }

    if (!tenantId) {
      toast.error("Session error: no organisation context. Please refresh and try again.");
      return;
    }

    try {
      const parsedRate = parseFloat(formData.hourly_rate);
      const employeeData: any = {
        tenant_id: tenantId,
        forename: formData.forename.trim(),
        surname: formData.surname.trim(),
        email: formData.email.trim().toLowerCase() || null,
        date_of_birth: formData.date_of_birth || null,
        department: formData.department,
        status: formData.status,
        hourly_rate: isNaN(parsedRate) ? 0 : parsedRate,
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
        contract_country: formData.contract_country || "GB",
        work_country: formData.work_country || null,
        employing_entity: formData.employing_entity.trim() || null,
        pay_type: formData.pay_type,
        overtime_model: formData.overtime_model,
        holiday_entitlement_method: formData.holiday_entitlement_method,
        service_charge_eligible: formData.service_charge_eligible,
      };

      let employeeId: string;

      if (employee) {
        // Don't send tenant_id on updates
        const { tenant_id: _omit, ...updateData } = employeeData;
        await updateEmployee.mutateAsync({ id: employee.id, updates: updateData });
        employeeId = employee.id;
        toast.success("Employee updated successfully");
      } else {
        const newEmployee = await createEmployee.mutateAsync(employeeData);
        employeeId = newEmployee.id;

        // Create onboarding record for starter
        try {
          await supabase
            .from("employee_onboarding_data" as any)
            .insert({
              employee_id: employeeId,
              tenant_id: tenantId,
            } as any);
        } catch (onbErr) {
          console.warn("[ADD_EMPLOYEE] Onboarding record creation failed (non-blocking):", onbErr);
        }

        // Build a summary of what's still pending
        const pendingItems: string[] = [];
        if (!formData.hourly_rate || parsedRate === 0) pendingItems.push("hourly rate");
        if (!formData.bank_account_no.trim()) pendingItems.push("bank details");
        if (!formData.ni_number.trim()) pendingItems.push("NI number");
        if (!formData.settlement_status) pendingItems.push("right to work");
        if (selectedBranches.length === 0) pendingItems.push("branch assignment");

        const pendingNote = pendingItems.length > 0
          ? `Still needed: ${pendingItems.join(", ")}.`
          : "All basic details provided.";

        toast.success(`Employee "${formData.forename.trim()} ${formData.surname.trim()}" created as starter.`, {
          description: `No email sent. ${pendingNote} Use the employee profile to complete setup.`,
          duration: 7000,
        });
      }

      // Update branches (only if any selected)
      if (selectedBranches.length > 0) {
        await setEmployeeBranches.mutateAsync({
          employeeId,
          branches: selectedBranches,
          primaryBranch: primaryBranch || selectedBranches[0],
        });
      }

      setOpen(false);
      onSuccess?.();

      // Privacy: Worker must self-activate their own Talent Pool profile.
      const wasLeaver = employee?.status === "leaver";
      const isNowLeaver = formData.status === "leaver";
      if (isNowLeaver && !wasLeaver) {
        toast.info("If this employee wishes to join the Talent Pool, they can activate their own profile from their Staff Portal.");
      }
    } catch (error: any) {
      const msg = error?.message || error?.error?.message || "Unknown error";
      console.error("Employee save error:", msg);

      if (msg.includes("active talent pool profile")) {
        toast.error("This employee has an active Talent Pool profile. Opt them out of the Talent Pool before removing account access.");
      } else if (msg.includes("violates row-level security")) {
        toast.error("Permission denied: you do not have access to create or edit employees.");
      } else if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
        toast.error("An employee with these details already exists. Check for duplicates.");
      } else if (msg.includes("foreign key") || msg.includes("23503")) {
        toast.error("A referenced record (e.g. department or branch) is invalid. Please check your selections.");
      } else if (msg.includes("not-null") || msg.includes("23502")) {
        toast.error(`A required field is missing: ${msg}`);
      } else {
        toast.error(`${employee ? "Failed to update" : "Failed to create"} employee: ${msg}`);
      }
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
          <Button className="gradient-primary shadow-md hover:shadow-lg transition-shadow" size="sm">
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Add Employee</span>
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
            <TabsList className="grid grid-cols-7 mb-4">
              <TabButton value="personal" icon={User} label="Personal" />
              <TabButton value="employment" icon={Building} label="Work" />
              <TabButton value="contract" icon={Globe} label="Contract" />
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
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.smith@example.com"
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground">Used for rota notifications and invitations</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground">Required for age-based pay compliance</p>
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
                  <Label htmlFor="ni_number">
                    National Insurance Number
                  </Label>
                  <Input
                    id="ni_number"
                    value={formData.ni_number}
                    onChange={(e) => setFormData({ ...formData, ni_number: e.target.value.toUpperCase() })}
                    placeholder="AB123456C"
                    maxLength={9}
                    className="transition-all focus:ring-2 focus:ring-primary/20 uppercase"
                  />
                  <p className="text-xs text-muted-foreground">Format: 2 letters, 6 numbers, 1 letter. Can be added later.</p>
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
                        {departments.map(d => (
                          <SelectItem key={d.key} value={d.key}>{d.emoji} {d.key} ({d.label})</SelectItem>
                        ))}
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

              {/* Contract Tab */}
              <TabsContent value="contract" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contract Country</Label>
                    <Select value={formData.contract_country} onValueChange={(v) => setFormData({ ...formData, contract_country: v })}>
                      <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {countryRules.map(r => (
                          <SelectItem key={r.country_code} value={r.country_code}>{r.country_name}</SelectItem>
                        ))}
                        {countryRules.length === 0 && <SelectItem value="GB">United Kingdom</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Work Country</Label>
                    <Select value={formData.work_country || formData.contract_country} onValueChange={(v) => setFormData({ ...formData, work_country: v })}>
                      <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {countryRules.map(r => (
                          <SelectItem key={r.country_code} value={r.country_code}>{r.country_name}</SelectItem>
                        ))}
                        {countryRules.length === 0 && <SelectItem value="GB">United Kingdom</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Employing Entity</Label>
                  <Input
                    value={formData.employing_entity}
                    onChange={(e) => setFormData({ ...formData, employing_entity: e.target.value })}
                    placeholder="e.g. UD Restaurants Ltd"
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pay Type</Label>
                    <Select value={formData.pay_type} onValueChange={(v) => setFormData({ ...formData, pay_type: v })}>
                      <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAY_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Overtime Model</Label>
                    <Select value={formData.overtime_model} onValueChange={(v) => setFormData({ ...formData, overtime_model: v })}>
                      <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OVERTIME_MODELS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Holiday Entitlement Method</Label>
                    <Select value={formData.holiday_entitlement_method} onValueChange={(v) => setFormData({ ...formData, holiday_entitlement_method: v })}>
                      <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HOLIDAY_ENTITLEMENT_METHODS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-6">
                    <Label className="text-sm">Service Charge Eligible</Label>
                    <input
                      type="checkbox"
                      checked={formData.service_charge_eligible}
                      onChange={(e) => setFormData({ ...formData, service_charge_eligible: e.target.checked })}
                      className="h-4 w-4 rounded border-border"
                    />
                  </div>
                </div>

                {formData.contract_country && countryRules.find(r => r.country_code === formData.contract_country) && (
                  <div className="rounded-lg bg-muted/30 border border-border p-3 mt-2">
                    <p className="text-xs font-semibold text-foreground">
                      {countryRules.find(r => r.country_code === formData.contract_country)?.country_name} Labour Defaults
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {countryRules.find(r => r.country_code === formData.contract_country)?.max_statutory_days} days leave · 
                      {countryRules.find(r => r.country_code === formData.contract_country)?.standard_week_hours}h workweek · 
                      {countryRules.find(r => r.country_code === formData.contract_country)?.public_holiday_count} public holidays
                    </p>
                  </div>
                )}
              </TabsContent>

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
    </>
  );
}
