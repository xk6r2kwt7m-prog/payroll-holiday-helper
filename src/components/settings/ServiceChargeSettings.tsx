import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, MapPin, Users, User, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useServiceChargeEnabled,
  useToggleServiceCharge,
  useServiceChargeLocations,
  useUpsertServiceChargeLocation,
  useServiceChargeRoleRates,
  useSaveRoleRate,
  useDeleteRoleRate,
  useServiceChargeEmployeeRates,
  useSaveEmployeeRate,
  useDeleteEmployeeRate,
} from "@/hooks/useServiceCharge";
import { useLocationSettings } from "@/hooks/useLocationSettings";
import { useEmployees } from "@/hooks/useEmployees";
import { format } from "date-fns";

const CALC_MODELS = [
  { value: "none", label: "No service charge" },
  { value: "equal_by_hours", label: "Equal by hours worked" },
  { value: "role_points", label: "Role points system" },
  { value: "percentage_split", label: "Dept/role percentage split" },
  { value: "fixed_employee", label: "Fixed rate per employee/hour" },
  { value: "fixed_role", label: "Fixed rate per role/hour" },
  { value: "hybrid", label: "Hybrid / custom formula" },
];

export function ServiceChargeSettings() {
  const { data: enabled, isLoading: loadingEnabled } = useServiceChargeEnabled();
  const toggleSC = useToggleServiceCharge();

  if (loadingEnabled) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Master toggle */}
      <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border p-4">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Service Charge System
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable to distribute service charge / tips / tronc to employees
          </p>
        </div>
        <Switch
          checked={!!enabled}
          onCheckedChange={(v) => toggleSC.mutate(v)}
          disabled={toggleSC.isPending}
        />
      </div>

      {enabled && (
        <Tabs defaultValue="locations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="locations" className="text-xs gap-1"><MapPin className="h-3 w-3" />Locations</TabsTrigger>
            <TabsTrigger value="roles" className="text-xs gap-1"><Users className="h-3 w-3" />By Role</TabsTrigger>
            <TabsTrigger value="employees" className="text-xs gap-1"><User className="h-3 w-3" />By Employee</TabsTrigger>
          </TabsList>

          <TabsContent value="locations"><LocationRulesTab /></TabsContent>
          <TabsContent value="roles"><RoleRatesTab /></TabsContent>
          <TabsContent value="employees"><EmployeeRatesTab /></TabsContent>
        </Tabs>
      )}

      {enabled && (
        <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1">
          <p className="text-xs font-semibold text-foreground">Rule Priority (highest → lowest)</p>
          <ol className="text-[11px] text-muted-foreground list-decimal list-inside space-y-0.5">
            <li>Company-level enabled check</li>
            <li>Location-level enabled check</li>
            <li>Employee-specific rate</li>
            <li>Role-specific rate</li>
            <li>Location default rate</li>
            <li>Company default (from employee record)</li>
          </ol>
        </div>
      )}
    </div>
  );
}

/* ─── Location Rules ─── */
function LocationRulesTab() {
  const { data: locations = [] } = useServiceChargeLocations();
  const { data: branches = [] } = useTenantBranches();
  const upsert = useUpsertServiceChargeLocation();

  const branchesWithSettings = branches.map((b) => {
    const setting = locations.find((l) => l.branch === b.branch);
    return { branch: b.branch, displayName: b.display_name, setting };
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Configure service charge per workplace location.</p>
      {branchesWithSettings.map((b) => (
        <div key={b.branch} className="rounded-lg border border-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium text-foreground">{b.displayName}</span>
            </div>
            <Switch
              checked={b.setting?.enabled ?? true}
              onCheckedChange={(v) =>
                upsert.mutate({
                  branch: b.branch,
                  enabled: v,
                  calculation_model: b.setting?.calculation_model || "equal_by_hours",
                })
              }
            />
          </div>
          {(b.setting?.enabled ?? true) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Calculation Model</Label>
                <Select
                  value={b.setting?.calculation_model || "equal_by_hours"}
                  onValueChange={(v) =>
                    upsert.mutate({ branch: b.branch, enabled: true, calculation_model: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CALC_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Default Rate (£/hr)</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-8 text-xs"
                  value={b.setting?.default_rate_per_hour ?? ""}
                  placeholder="e.g. 3.00"
                  onChange={(e) =>
                    upsert.mutate({
                      branch: b.branch,
                      enabled: true,
                      calculation_model: b.setting?.calculation_model || "equal_by_hours",
                      default_rate_per_hour: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      ))}
      {branches.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No locations configured yet.</p>
      )}
    </div>
  );
}

/* ─── Role Rates ─── */
function RoleRatesTab() {
  const { data: rates = [] } = useServiceChargeRoleRates();
  const saveRate = useSaveRoleRate();
  const deleteRate = useDeleteRoleRate();
  const [newRole, setNewRole] = useState("");
  const [newRate, setNewRate] = useState("");

  const handleAdd = () => {
    if (!newRole || !newRate) return;
    saveRate.mutate({
      role_name: newRole,
      rate_per_hour: parseFloat(newRate),
      effective_from: format(new Date(), "yyyy-MM-dd"),
      is_active: true,
    });
    setNewRole("");
    setNewRate("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Set service charge rates by role. These apply when no employee-specific rate exists.</p>

      {/* Existing rates */}
      {rates.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-[10px]">{r.role_name}</Badge>
            <span className="text-sm font-medium text-foreground">£{Number(r.rate_per_hour).toFixed(2)}/hr</span>
            {!r.is_active && <Badge variant="outline" className="text-[9px] text-muted-foreground">Inactive</Badge>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRate.mutate(r.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}

      {/* Add new */}
      <Separator />
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px]">Role Name</Label>
          <Input className="h-8 text-xs" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="e.g. Server" />
        </div>
        <div className="w-28 space-y-1">
          <Label className="text-[10px]">Rate (£/hr)</Label>
          <Input className="h-8 text-xs" type="number" step="0.01" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="3.00" />
        </div>
        <Button size="sm" className="h-8" onClick={handleAdd} disabled={!newRole || !newRate || saveRate.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add
        </Button>
      </div>
    </div>
  );
}

/* ─── Employee Rates ─── */
function EmployeeRatesTab() {
  const { data: rates = [] } = useServiceChargeEmployeeRates();
  const { data: employees = [] } = useEmployees();
  const saveRate = useSaveEmployeeRate();
  const deleteRate = useDeleteEmployeeRate();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [newRate, setNewRate] = useState("");

  const activeEmployees = employees.filter((e: any) => e.status === "active");

  const handleAdd = () => {
    if (!selectedEmployee || !newRate) return;
    saveRate.mutate({
      employee_id: selectedEmployee,
      custom_rate_per_hour: parseFloat(newRate),
      effective_from: format(new Date(), "yyyy-MM-dd"),
      is_active: true,
    });
    setSelectedEmployee("");
    setNewRate("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Override service charge rates for specific employees. These take highest priority.</p>

      {rates.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {r.employees?.forename} {r.employees?.surname}
            </span>
            <Badge variant="secondary" className="text-[10px]">£{Number(r.custom_rate_per_hour).toFixed(2)}/hr</Badge>
            {!r.is_active && <Badge variant="outline" className="text-[9px] text-muted-foreground">Inactive</Badge>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRate.mutate(r.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}

      <Separator />
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px]">Employee</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              {activeEmployees.map((e: any) => (
                <SelectItem key={e.id} value={e.id} className="text-xs">{e.forename} {e.surname}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-28 space-y-1">
          <Label className="text-[10px]">Rate (£/hr)</Label>
          <Input className="h-8 text-xs" type="number" step="0.01" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="3.50" />
        </div>
        <Button size="sm" className="h-8" onClick={handleAdd} disabled={!selectedEmployee || !newRate || saveRate.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add
        </Button>
      </div>
    </div>
  );
}
