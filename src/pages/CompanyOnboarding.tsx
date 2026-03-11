import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useTenantTemplates, TenantTemplate } from "@/hooks/useTenantTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, Globe, Clock, ArrowRight, ArrowLeft, Loader2,
  MapPin, Users, Calendar, DollarSign, GraduationCap, FileText,
  BarChart3, Check, Sparkles, Send,
} from "lucide-react";
import ugloIcon from "@/assets/uglo-icon.png";

const COUNTRIES = [
  { code: "GB", label: "United Kingdom", timezones: ["Europe/London"] },
  { code: "CV", label: "Cape Verde", timezones: ["Atlantic/Cape_Verde"] },
  { code: "PT", label: "Portugal", timezones: ["Europe/Lisbon", "Atlantic/Azores"] },
  { code: "IE", label: "Ireland", timezones: ["Europe/Dublin"] },
  { code: "US", label: "United States", timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"] },
];

const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "cafe", label: "Café", icon: "☕" },
  { value: "bar", label: "Bar / Pub", icon: "🍺" },
  { value: "quick_service", label: "Quick Service", icon: "🍔" },
  { value: "multi_site", label: "Multi-site Group", icon: "🏨" },
  { value: "other", label: "Other Hospitality", icon: "🏢" },
];

const STAFF_RANGES = ["1-10", "11-25", "26-50", "51-100", "100+"];

const MODULES = [
  { key: "scheduling", label: "Scheduling", icon: Calendar, desc: "Shift planning & rotas" },
  { key: "payroll", label: "Payroll & Leave", icon: DollarSign, desc: "Pay runs, holidays, ledger" },
  { key: "training", label: "Training", icon: GraduationCap, desc: "Compliance & certificates" },
  { key: "documents", label: "Documents", icon: FileText, desc: "Contracts & uploads" },
  { key: "analytics", label: "Analytics", icon: BarChart3, desc: "Reports & insights" },
];

const STEPS = [
  { title: "Company Basics", subtitle: "Tell us about your business" },
  { title: "Business Template", subtitle: "Start from a template or blank" },
  { title: "Modules", subtitle: "Choose what you need" },
  { title: "Team Setup", subtitle: "Training & compliance needs" },
  { title: "Configuration", subtitle: "Starter setup preferences" },
  { title: "Invite Team", subtitle: "Add your first users" },
];

interface WizardData {
  companyName: string;
  businessType: string;
  country: string;
  timezone: string;
  staffRange: string;
  locationCount: string;
  templateId: string | null;
  modules: Record<string, boolean>;
  trainingModules: string[];
  complianceItems: string[];
  shiftTemplates: { name: string; start: string; end: string }[];
  inviteEmails: string[];
}

const CompanyOnboarding = () => {
  const { user } = useAuth();
  const { tenantId, loading: tenantLoading } = useTenant();
  const { data: templates } = useTenantTemplates();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [wizardData, setWizardData] = useState<WizardData>({
    companyName: "",
    businessType: "",
    country: "",
    timezone: "",
    staffRange: "",
    locationCount: "1",
    templateId: null,
    modules: { scheduling: true, payroll: false, training: false, documents: false, analytics: false },
    trainingModules: [],
    complianceItems: [],
    shiftTemplates: [],
    inviteEmails: [""],
  });

  if (!user) { navigate("/auth"); return null; }
  if (!tenantLoading && tenantId) { navigate("/"); return null; }

  const selectedCountry = COUNTRIES.find((c) => c.code === wizardData.country);
  const selectedTemplate = templates?.find((t) => t.id === wizardData.templateId);

  const updateField = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setWizardData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCountryChange = (code: string) => {
    const c = COUNTRIES.find((x) => x.code === code);
    updateField("country", code);
    if (c && c.timezones.length === 1) updateField("timezone", c.timezones[0]);
    else updateField("timezone", "");
  };

  const applyTemplate = (template: TenantTemplate) => {
    updateField("templateId", template.id);
    const td = template.template_data;
    if (td.training_modules) updateField("trainingModules", td.training_modules);
    if (td.compliance_items) updateField("complianceItems", td.compliance_items);
    if (td.shift_templates) updateField("shiftTemplates", td.shift_templates);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return wizardData.companyName.length >= 2 && wizardData.country && wizardData.timezone;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("provision-tenant", {
        body: {
          company_name: wizardData.companyName,
          country: wizardData.country,
          timezone: wizardData.timezone,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save onboarding state and modules
      const tenantIdResult = data.tenant_id;
      if (tenantIdResult) {
        // Update enabled modules
        await supabase
          .from("tenants")
          .update({ enabled_modules: wizardData.modules } as any)
          .eq("id", tenantIdResult);

        // Save onboarding wizard data
        await supabase.from("tenant_onboarding_state").insert({
          tenant_id: tenantIdResult,
          current_step: 6,
          completed_steps: JSON.stringify([1, 2, 3, 4, 5, 6]),
          wizard_data: wizardData as any,
          completed_at: new Date().toISOString(),
        } as any);

        // Send invitations
        const validEmails = wizardData.inviteEmails.filter((e) => e.includes("@"));
        for (const email of validEmails) {
          await supabase.from("tenant_invitations").insert({
            tenant_id: tenantIdResult,
            email,
            role: "employee" as any,
            invited_by: user.id,
          } as any);
        }
      }

      toast.success("Company workspace created! Redirecting…");
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  const platformTemplates = templates?.filter((t) => t.is_platform_template) || [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={ugloIcon} alt="UGLŌ" className="h-12 w-12 rounded-2xl shadow-lg mx-auto mb-3" />
          <h1 className="text-xl font-bold text-foreground">Set Up Your Company</h1>
          <p className="text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-6 px-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-1">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="rounded-2xl bg-card shadow-elevated border border-border/40 p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 0: Company Basics */}
              {step === 0 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" /> Company Name
                    </Label>
                    <Input
                      placeholder="e.g. The Golden Fork"
                      value={wizardData.companyName}
                      onChange={(e) => updateField("companyName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" /> Business Type
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BUSINESS_TYPES.map((bt) => (
                        <button
                          key={bt.value}
                          onClick={() => updateField("businessType", bt.value)}
                          className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                            wizardData.businessType === bt.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-card-foreground hover:border-primary/50"
                          }`}
                        >
                          <span className="text-lg mr-1">{bt.icon}</span> {bt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" /> Country
                      </Label>
                      <Select value={wizardData.country} onValueChange={handleCountryChange}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(selectedCountry?.timezones.length || 0) > 1 && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" /> Timezone
                        </Label>
                        <Select value={wizardData.timezone} onValueChange={(v) => updateField("timezone", v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {selectedCountry?.timezones.map((tz) => (
                              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" /> Staff Count
                      </Label>
                      <Select value={wizardData.staffRange} onValueChange={(v) => updateField("staffRange", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {STAFF_RANGES.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" /> Locations
                      </Label>
                      <Select value={wizardData.locationCount} onValueChange={(v) => updateField("locationCount", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["1", "2", "3-5", "6-10", "10+"].map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Template Selection */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose a template to pre-fill departments, training, and shift patterns — or start blank.
                  </p>
                  <div className="grid gap-3">
                    <button
                      onClick={() => {
                        updateField("templateId", null);
                        updateField("trainingModules", []);
                        updateField("complianceItems", []);
                        updateField("shiftTemplates", []);
                      }}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        !wizardData.templateId
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        <div>
                          <p className="font-medium text-card-foreground">Blank Setup</p>
                          <p className="text-xs text-muted-foreground">Configure everything manually</p>
                        </div>
                        {!wizardData.templateId && <Check className="h-5 w-5 text-primary ml-auto" />}
                      </div>
                    </button>
                    {platformTemplates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          wizardData.templateId === t.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{t.icon}</span>
                          <div className="flex-1">
                            <p className="font-medium text-card-foreground">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.description}</p>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {t.template_data.departments?.slice(0, 3).map((d) => (
                                <Badge key={d} variant="secondary" className="text-[10px] capitalize">{d.replace("_", " ")}</Badge>
                              ))}
                              {(t.template_data.training_modules?.length || 0) > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {t.template_data.training_modules?.length} training modules
                                </Badge>
                              )}
                            </div>
                          </div>
                          {wizardData.templateId === t.id && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Modules */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select the modules you need. You can change these later.</p>
                  <div className="grid gap-3">
                    {MODULES.map((m) => (
                      <label
                        key={m.key}
                        className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                          wizardData.modules[m.key] ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Checkbox
                          checked={wizardData.modules[m.key]}
                          onCheckedChange={(checked) =>
                            updateField("modules", { ...wizardData.modules, [m.key]: !!checked })
                          }
                        />
                        <m.icon className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-card-foreground">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Training & Compliance */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {selectedTemplate
                      ? `Pre-filled from ${selectedTemplate.name} template. Edit as needed.`
                      : "Add training modules and compliance items for your team."}
                  </div>
                  {wizardData.trainingModules.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Training Modules</Label>
                      <div className="flex flex-wrap gap-2">
                        {wizardData.trainingModules.map((m) => (
                          <Badge
                            key={m}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive/10"
                            onClick={() =>
                              updateField(
                                "trainingModules",
                                wizardData.trainingModules.filter((x) => x !== m)
                              )
                            }
                          >
                            {m} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {wizardData.complianceItems.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Compliance Requirements</Label>
                      <div className="flex flex-wrap gap-2">
                        {wizardData.complianceItems.map((c) => (
                          <Badge
                            key={c}
                            variant="outline"
                            className="cursor-pointer hover:bg-destructive/10"
                            onClick={() =>
                              updateField(
                                "complianceItems",
                                wizardData.complianceItems.filter((x) => x !== c)
                              )
                            }
                          >
                            {c} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {wizardData.trainingModules.length === 0 && wizardData.complianceItems.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Select a template in Step 2 to pre-fill training modules, or skip this step to add them later.
                    </p>
                  )}
                </div>
              )}

              {/* Step 4: Starter Configuration */}
              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Review your starter shift templates.</p>
                  {wizardData.shiftTemplates.length > 0 ? (
                    <div className="grid gap-2">
                      {wizardData.shiftTemplates.map((st, i) => (
                        <Card key={i} className="bg-muted/50 border-border">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-card-foreground text-sm">{st.name}</p>
                              <p className="text-xs text-muted-foreground">{st.start} — {st.end}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">Shift Template</Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No shift templates selected. You can create them later in the Schedule module.
                    </p>
                  )}
                </div>
              )}

              {/* Step 5: Invite Team */}
              {step === 5 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Invite your team members. They'll receive an email to join your workspace.
                  </p>
                  <div className="space-y-2">
                    {wizardData.inviteEmails.map((email, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="team@company.com"
                          value={email}
                          onChange={(e) => {
                            const updated = [...wizardData.inviteEmails];
                            updated[i] = e.target.value;
                            updateField("inviteEmails", updated);
                          }}
                        />
                        {wizardData.inviteEmails.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateField(
                                "inviteEmails",
                                wizardData.inviteEmails.filter((_, idx) => idx !== i)
                              )
                            }
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateField("inviteEmails", [...wizardData.inviteEmails, ""])}
                    >
                      + Add another
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <span className="text-xs text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </span>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="gradient-primary">
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating…</>
                ) : (
                  <><Send className="h-4 w-4 mr-1" /> Create Workspace</>
                )}
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You'll be set up as the Company Admin with full control.
        </p>
      </div>
    </div>
  );
};

export default CompanyOnboarding;
