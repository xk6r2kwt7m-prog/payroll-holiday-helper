import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useCountryRules } from "@/hooks/useCountryRules";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const CURRENCIES = [
  { value: "GBP", label: "£ GBP" },
  { value: "EUR", label: "€ EUR" },
  { value: "USD", label: "$ USD" },
  { value: "CVE", label: "CVE (Cape Verde Escudo)" },
];

const PAYROLL_FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "4weekly", label: "4-Weekly" },
];

const PAY_MODELS = [
  { value: "hourly", label: "Hourly" },
  { value: "daily_rate", label: "Daily Rate" },
  { value: "monthly_salary", label: "Monthly Salary" },
  { value: "mixed", label: "Mixed (per employee)" },
];

export function TenantConfigSection() {
  const { tenantId, tenantCountry } = useTenant();
  const { data: countryRules } = useCountryRules();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [payrollFrequency, setPayrollFrequency] = useState("monthly");
  const [defaultPayModel, setDefaultPayModel] = useState("hourly");
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [complianceNotes, setComplianceNotes] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("tenants")
        .select("legal_name, currency, payroll_frequency, default_pay_model, service_charge_enabled, compliance_notes")
        .eq("id", tenantId)
        .single();
      if (data) {
        setLegalName((data as any).legal_name || "");
        setCurrency((data as any).currency || "GBP");
        setPayrollFrequency((data as any).payroll_frequency || "monthly");
        setDefaultPayModel((data as any).default_pay_model || "hourly");
        setServiceChargeEnabled((data as any).service_charge_enabled || false);
        setComplianceNotes((data as any).compliance_notes || "");
      }
      setLoading(false);
    })();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        legal_name: legalName || null,
        currency,
        payroll_frequency: payrollFrequency,
        default_pay_model: defaultPayModel,
        service_charge_enabled: serviceChargeEnabled,
        compliance_notes: complianceNotes || null,
      } as any)
      .eq("id", tenantId);
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Company configuration saved");
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const currentCountryRule = countryRules?.find(r => r.country_code === tenantCountry);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Legal Entity Name</Label>
          <Input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="e.g. UD Restaurants Ltd" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Base Country</Label>
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
            {tenantCountry || "Not set"} {currentCountryRule && `— ${currentCountryRule.country_name}`}
          </div>
          <p className="text-[10px] text-muted-foreground">Set during onboarding. Contact support to change.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Payroll Frequency</Label>
          <Select value={payrollFrequency} onValueChange={setPayrollFrequency}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYROLL_FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Default Pay Model</Label>
          <Select value={defaultPayModel} onValueChange={setDefaultPayModel}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAY_MODELS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-4 pt-5">
          <div>
            <p className="text-sm font-medium text-card-foreground">Service Charge</p>
            <p className="text-[10px] text-muted-foreground">Enable tips/tronc for this company</p>
          </div>
          <Switch checked={serviceChargeEnabled} onCheckedChange={setServiceChargeEnabled} />
        </div>
      </div>

      {currentCountryRule && (
        <>
          <Separator />
          <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">Country Labour Defaults — {currentCountryRule.country_name}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>Annual leave: {currentCountryRule.max_statutory_days} days</span>
              <span>Accrual rate: {currentCountryRule.accrual_rate}</span>
              <span>Workweek: {currentCountryRule.standard_week_hours}h / {currentCountryRule.workdays_per_week} days</span>
              <span>Public holidays: {currentCountryRule.public_holiday_count}</span>
            </div>
            {currentCountryRule.notes && (
              <p className="text-[10px] text-muted-foreground/70 mt-1">{currentCountryRule.notes}</p>
            )}
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Compliance Notes</Label>
        <Textarea value={complianceNotes} onChange={e => setComplianceNotes(e.target.value)} placeholder="Any local compliance requirements..." className="min-h-[60px] text-xs" />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Saving...</> : <><Save className="mr-2 h-3 w-3" />Save Configuration</>}
        </Button>
      </div>
    </div>
  );
}
