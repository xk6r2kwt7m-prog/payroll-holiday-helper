import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useQueryClient } from "@tanstack/react-query";

interface CreateEmployeeFromImportProps {
  csvName: string;
  onCreated: (employee: { id: string; forename: string; surname: string; department: string; hourly_rate: number; service_charge: number | null }) => void;
  onCancel: () => void;
}

export function CreateEmployeeFromImport({ csvName, onCreated, onCancel }: CreateEmployeeFromImportProps) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  // Split csvName into parts for defaults
  const parts = csvName.trim().split(/\s+/);
  const defaultForename = parts[0] || "";
  const defaultSurname = parts.slice(1).join(" ") || "";

  const [forename, setForename] = useState(defaultForename);
  const [surname, setSurname] = useState(defaultSurname);
  const [preferredName, setPreferredName] = useState(csvName.trim());
  const [department, setDepartment] = useState("FOH");
  const [hourlyRate, setHourlyRate] = useState("11.44");
  const [email, setEmail] = useState("");
  const [scEligible, setScEligible] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!forename.trim() || !surname.trim()) {
      toast.error("Forename and surname are required");
      return;
    }
    if (!tenantId) return;

    setCreating(true);
    try {
      const rate = parseFloat(hourlyRate) || 0;
      const importAlias = csvName.trim().toLowerCase() !== `${forename} ${surname}`.toLowerCase()
        ? [csvName.trim()]
        : [];

      const { data, error } = await supabase
        .from("employees")
        .insert({
          forename: forename.trim(),
          surname: surname.trim(),
          preferred_name: preferredName.trim() || null,
          import_aliases: importAlias,
          department,
          hourly_rate: rate,
          service_charge_eligible: scEligible,
          email: email.trim() || null,
          status: "starter",
          tenant_id: tenantId,
        } as any)
        .select("id, forename, surname, department, hourly_rate, service_charge")
        .single();

      if (error) throw error;

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert([{
        user_id: user?.id || null,
        action: "create" as const,
        table_name: "employees",
        record_id: data.id,
        tenant_id: tenantId,
        new_data: {
          operation: "created_from_payroll_import",
          csv_name: csvName,
          forename: data.forename,
          surname: data.surname,
        },
      }]);

      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(`${data.forename} ${data.surname} created and linked`);
      onCreated(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create employee");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          Create employee from "{csvName}"
        </h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Forename *</Label>
          <Input value={forename} onChange={(e) => setForename(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Surname *</Label>
          <Input value={surname} onChange={(e) => setSurname(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Preferred / Import name</Label>
          <Input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} className="h-8 text-sm" placeholder="Nickname or alias" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Department *</Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FOH">FOH</SelectItem>
              <SelectItem value="BOH">BOH</SelectItem>
              <SelectItem value="CPU">CPU</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Hourly rate (£) *</Label>
          <Input type="number" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" placeholder="Optional" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={scEligible} onCheckedChange={setScEligible} id="sc-eligible" />
        <Label htmlFor="sc-eligible" className="text-xs">Service charge eligible</Label>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} className="text-xs h-7">
          Cancel
        </Button>
        <Button size="sm" onClick={handleCreate} disabled={creating || !forename.trim() || !surname.trim()} className="text-xs h-7">
          {creating ? "Creating…" : "Create & Link"}
        </Button>
      </div>
    </div>
  );
}
