import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Save, Loader2 } from "lucide-react";
import { ProtectedBadge } from "./ProtectedBadge";
import { toast } from "sonner";
import { useTenantPreferences, useSaveTenantPreferences, type PreferenceCategory } from "@/hooks/useTenantPreferences";

/* ═══════════════════════════════════════════════
   SCHEDULING SETTINGS
   ═══════════════════════════════════════════════ */
const SCHEDULING_DEFAULTS = {
  defaultView: "week",
  autoPublish: false,
  showDeptFilter: true,
  mobileQuickBuild: true,
  shiftSwapNotify: true,
};

export function SchedulingSettings() {
  const { data: prefs, isLoading } = useTenantPreferences("scheduling", SCHEDULING_DEFAULTS);
  const saveMut = useSaveTenantPreferences();
  const [local, setLocal] = useState(SCHEDULING_DEFAULTS);

  useEffect(() => { if (prefs) setLocal(prefs); }, [prefs]);

  const set = <K extends keyof typeof SCHEDULING_DEFAULTS>(key: K, val: typeof SCHEDULING_DEFAULTS[K]) =>
    setLocal(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    try {
      await saveMut.mutateAsync({ category: "scheduling", preferences: local });
      toast.success("Scheduling preferences saved");
    } catch { toast.error("Failed to save"); }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Configure scheduling defaults, presets, and mobile behaviour for your team.</p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Default schedule view</Label>
          <select value={local.defaultView} onChange={e => set("defaultView", e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="week">Week View</option>
            <option value="day">Day View</option>
          </select>
        </div>
        <Separator />
        <ToggleRow label="Department filter visible by default" desc="Show department tabs on schedule page" checked={local.showDeptFilter} onChange={v => set("showDeptFilter", v)} />
        <ToggleRow label="Mobile Quick Build mode" desc="Enable guided shift wizard on mobile" checked={local.mobileQuickBuild} onChange={v => set("mobileQuickBuild", v)} />
        <ToggleRow label="Shift swap notifications" desc="Notify managers of swap requests" checked={local.shiftSwapNotify} onChange={v => set("shiftSwapNotify", v)} />
        <ToggleRow label="Auto-publish on create" desc="Publish shifts immediately when created" checked={local.autoPublish} onChange={v => set("autoPublish", v)} />
      </div>
      <div className="space-y-2 pt-2">
        <SettingLink label="Shift Templates" description="Manage pre-built shift patterns" to="/schedule" />
        <SettingLink label="Location Operating Hours" description="Site-specific hours and rules" to="/settings?section=locations" />
      </div>
      <SaveButton onSave={handleSave} isPending={saveMut.isPending} />
      <ConfigProtectedNote configurable="Default views, department filters, shift templates, mobile presets, swap notifications" protected_="Compliance rules, working time regulations, shift validation engine" />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAYROLL DISPLAY SETTINGS
   ═══════════════════════════════════════════════ */
const PAYROLL_DISPLAY_DEFAULTS = {
  showBonusColumn: true,
  showServiceCharge: true,
  defaultPdfLogo: true,
  reminderDaysBefore: "3",
};

export function PayrollDisplaySettings() {
  const { data: prefs, isLoading } = useTenantPreferences("payroll_display", PAYROLL_DISPLAY_DEFAULTS);
  const saveMut = useSaveTenantPreferences();
  const [local, setLocal] = useState(PAYROLL_DISPLAY_DEFAULTS);

  useEffect(() => { if (prefs) setLocal(prefs); }, [prefs]);

  const set = <K extends keyof typeof PAYROLL_DISPLAY_DEFAULTS>(key: K, val: typeof PAYROLL_DISPLAY_DEFAULTS[K]) =>
    setLocal(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    try {
      await saveMut.mutateAsync({ category: "payroll_display", preferences: local });
      toast.success("Payroll preferences saved");
    } catch { toast.error("Failed to save"); }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Configure how payroll data is displayed and exported. These do not affect calculations.</p>
      <ToggleRow label="Show bonus column" desc="Display performance/special bonus on payroll table" checked={local.showBonusColumn} onChange={v => set("showBonusColumn", v)} />
      <ToggleRow label="Show service charge column" desc="Display service charge breakdown" checked={local.showServiceCharge} onChange={v => set("showServiceCharge", v)} />
      <ToggleRow label="Company logo on PDF exports" desc="Include logo in payroll report headers" checked={local.defaultPdfLogo} onChange={v => set("defaultPdfLogo", v)} />
      <Separator />
      <div className="space-y-1.5">
        <Label className="text-xs">Payroll reminder (days before due)</Label>
        <Input type="number" min="0" max="14" value={local.reminderDaysBefore} onChange={e => set("reminderDaysBefore", e.target.value)} className="h-9 w-24" />
      </div>
      <SaveButton onSave={handleSave} isPending={saveMut.isPending} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HOLIDAY DISPLAY SETTINGS
   ═══════════════════════════════════════════════ */
const HOLIDAY_DISPLAY_DEFAULTS = {
  showBalanceSummary: true,
  showLedgerTab: true,
  defaultView: "cards",
};

export function HolidayDisplaySettings() {
  const { data: prefs, isLoading } = useTenantPreferences("holiday_display", HOLIDAY_DISPLAY_DEFAULTS);
  const saveMut = useSaveTenantPreferences();
  const [local, setLocal] = useState(HOLIDAY_DISPLAY_DEFAULTS);

  useEffect(() => { if (prefs) setLocal(prefs); }, [prefs]);

  const set = <K extends keyof typeof HOLIDAY_DISPLAY_DEFAULTS>(key: K, val: typeof HOLIDAY_DISPLAY_DEFAULTS[K]) =>
    setLocal(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    try {
      await saveMut.mutateAsync({ category: "holiday_display", preferences: local });
      toast.success("Holiday preferences saved");
    } catch { toast.error("Failed to save"); }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Configure holiday page display preferences. Leave calculations remain protected.</p>
      <div className="space-y-1.5">
        <Label className="text-xs">Default holiday view</Label>
        <select value={local.defaultView} onChange={e => set("defaultView", e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="cards">Card View</option>
          <option value="table">Table View</option>
        </select>
      </div>
      <ToggleRow label="Show balance summary" desc="Display accrual/taken/remaining at top" checked={local.showBalanceSummary} onChange={v => set("showBalanceSummary", v)} />
      <ToggleRow label="Show ledger tab" desc="Allow viewing detailed ledger entries" checked={local.showLedgerTab} onChange={v => set("showLedgerTab", v)} />
      <SaveButton onSave={handleSave} isPending={saveMut.isPending} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TRAINING & DOCS
   ═══════════════════════════════════════════════ */
const TRAINING_DEFAULTS = {
  autoReminders: true,
  reminderDays: "30",
  requireAcknowledge: true,
};

export function TrainingDocSettings() {
  const { data: prefs, isLoading } = useTenantPreferences("training_docs", TRAINING_DEFAULTS);
  const saveMut = useSaveTenantPreferences();
  const [local, setLocal] = useState(TRAINING_DEFAULTS);

  useEffect(() => { if (prefs) setLocal(prefs); }, [prefs]);

  const set = <K extends keyof typeof TRAINING_DEFAULTS>(key: K, val: typeof TRAINING_DEFAULTS[K]) =>
    setLocal(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    try {
      await saveMut.mutateAsync({ category: "training_docs", preferences: local });
      toast.success("Training preferences saved");
    } catch { toast.error("Failed to save"); }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Manage training modules, certifications, document categories, and compliance reminders.</p>
      <ToggleRow label="Auto renewal reminders" desc="Send reminders before certifications expire" checked={local.autoReminders} onChange={v => set("autoReminders", v)} />
      {local.autoReminders && (
        <div className="space-y-1.5 pl-1">
          <Label className="text-xs">Reminder days before expiry</Label>
          <Input type="number" min="1" max="90" value={local.reminderDays} onChange={e => set("reminderDays", e.target.value)} className="h-9 w-24" />
        </div>
      )}
      <ToggleRow label="Require document acknowledgement" desc="Staff must acknowledge receipt of documents" checked={local.requireAcknowledge} onChange={v => set("requireAcknowledge", v)} />
      <Separator />
      <div className="space-y-2">
        <SettingLink label="Training Records" description="View and manage certifications" to="/training" />
        <SettingLink label="Contracts & Documents" description="Template and document management" to="/contracts" />
      </div>
      <SaveButton onSave={handleSave} isPending={saveMut.isPending} />
      <ConfigProtectedNote configurable="Training categories, renewal dates, document categories, acknowledgement rules, reminder timing" protected_="Document storage security, file access policies, tenant isolation" />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TALENT POOL
   ═══════════════════════════════════════════════ */
export function TalentPoolSettings() {
  const [enabled, setEnabled] = useState(true);
  const [promptLeavers, setPromptLeavers] = useState(true);
  const [shareRegionally, setShareRegionally] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setIsSaving(false);
    toast.success("Talent pool preferences saved");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Configure how your company participates in the talent pool and manages former staff visibility.</p>
      <ToggleRow label="Talent pool enabled" desc="Allow your company to access and participate in the talent pool" checked={enabled} onChange={setEnabled} />
      <ToggleRow label="Prompt leavers for opt-in" desc="Ask departing staff if they'd like to join the talent pool" checked={promptLeavers} onChange={setPromptLeavers} />
      <ToggleRow label="Share profiles regionally" desc="Allow other companies in your region to discover former staff (with consent)" checked={shareRegionally} onChange={setShareRegionally} />
      <Separator />
      <SettingLink label="Talent Pool" description="Browse talent profiles and manage hiring requests" to="/talent-pool" />
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        🚧 Talent pool preferences are not yet enforced. Configuration will be connected in a future update.
      </div>
      <ConfigProtectedNote configurable="Leaver opt-in prompts, company visibility preferences, talent request defaults" protected_="Candidate consent architecture, cross-tenant privacy rules, geographic visibility enforcement" />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   BRANDING
   ═══════════════════════════════════════════════ */
export function BrandingSettings() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Customise how your company appears across the platform — on reports, contracts, and team views.</p>
      <div className="space-y-3">
        <div className="rounded-lg border border-border p-3 bg-card">
          <p className="text-sm font-medium text-foreground">Company Logo</p>
          <p className="text-xs text-muted-foreground">Upload via Company Profile tab. Used on PDF reports and contracts.</p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-card">
          <p className="text-sm font-medium text-foreground">Display Name</p>
          <p className="text-xs text-muted-foreground">Set under Company Profile. Shown in headers and navigation.</p>
        </div>
        <div className="rounded-lg border border-border p-3 bg-card">
          <p className="text-sm font-medium text-foreground">Report Branding</p>
          <p className="text-xs text-muted-foreground">Company name, address, and logo auto-populate on all generated PDFs.</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FEATURE ACCESS
   ═══════════════════════════════════════════════ */
export function FeatureAccessSettings() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">View which modules are enabled for your company under your current plan.</p>
      <div className="space-y-1.5">
        {[
          { label: "Scheduling", desc: "Shift management, rota builder, mobile wizard", editable: true },
          { label: "Payroll", desc: "Pay runs, reports, analytics, exports", editable: true },
          { label: "Training", desc: "Certifications, training records, compliance", editable: true },
          { label: "Documents", desc: "Contracts, uploads, digital signing", editable: true },
          { label: "Analytics", desc: "Advanced reporting and schedule analytics", editable: false },
          { label: "Talent Pool", desc: "Former staff network and hiring requests", editable: true },
        ].map((mod) => (
          <div key={mod.label} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{mod.label}</p>
              <p className="text-[11px] text-muted-foreground">{mod.desc}</p>
            </div>
            <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Active</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
        <div className="flex items-center gap-2 mb-1"><ProtectedBadge label="Platform Managed" /></div>
        <p className="text-[11px] text-muted-foreground">Module entitlements are managed by the platform based on your subscription plan. Contact support to change your plan.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PEOPLE & LIFECYCLE SETTINGS
   ═══════════════════════════════════════════════ */
const PEOPLE_DEFAULTS = {
  hideLeaversDefault: true,
  defaultListView: "cards",
  talentOptIn: true,
  archiveAfterDays: "7",
};

export function PeopleLifecycleSettings() {
  const { data: prefs, isLoading } = useTenantPreferences("people_lifecycle", PEOPLE_DEFAULTS);
  const saveMut = useSaveTenantPreferences();
  const [local, setLocal] = useState(PEOPLE_DEFAULTS);

  useEffect(() => { if (prefs) setLocal(prefs); }, [prefs]);

  const set = <K extends keyof typeof PEOPLE_DEFAULTS>(key: K, val: typeof PEOPLE_DEFAULTS[K]) =>
    setLocal(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    try {
      await saveMut.mutateAsync({ category: "people_lifecycle", preferences: local });
      toast.success("People preferences saved");
    } catch { toast.error("Failed to save"); }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Configure employee directory behaviour and lifecycle workflow preferences.</p>
      <div className="space-y-1.5">
        <Label className="text-xs">Default employee list view</Label>
        <select value={local.defaultListView} onChange={e => set("defaultListView", e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="cards">Card View</option>
          <option value="table">Table View</option>
        </select>
      </div>
      <ToggleRow label="Hide leavers by default" desc="Show only active employees on the Employees page" checked={local.hideLeaversDefault} onChange={v => set("hideLeaversDefault", v)} />
      <ToggleRow label="Talent pool opt-in for leavers" desc="Prompt departing staff to join the talent pool" checked={local.talentOptIn} onChange={v => set("talentOptIn", v)} />
      <Separator />
      <div className="space-y-1.5">
        <Label className="text-xs">Auto-archive leavers after (days)</Label>
        <Input type="number" min="1" max="90" value={local.archiveAfterDays} onChange={e => set("archiveAfterDays", e.target.value)} className="h-9 w-24" />
        <p className="text-[10px] text-muted-foreground">Leavers automatically move to archive after this period</p>
      </div>
      <SaveButton onSave={handleSave} isPending={saveMut.isPending} />
      <ConfigProtectedNote configurable="Default views, leaver visibility, archive timing, talent opt-in prompts" protected_="Status transition engine, auto-archival rules, leaver workflow core logic" />
    </div>
  );
}

/* ─── Shared ─── */
function SettingLink({ label, description, to }: { label: string; description: string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </Link>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}

function ConfigProtectedNote({ configurable, protected_ }: { configurable: string; protected_: string }) {
  return (
    <div className="text-[11px] text-muted-foreground space-y-1 pt-3 border-t border-border">
      <p>✅ <span className="font-medium">Configurable:</span> {configurable}</p>
      <p className="flex items-center gap-1"><ProtectedBadge label="Protected" /> {protected_}</p>
    </div>
  );
}

function SaveButton({ onSave, isPending }: { onSave: () => void; isPending: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button size="sm" onClick={onSave} disabled={isPending}>
        {isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Preferences</>}
      </Button>
    </div>
  );
}

function LoadingSpinner() {
  return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
}
