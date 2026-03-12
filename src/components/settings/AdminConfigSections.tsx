import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Save, Loader2 } from "lucide-react";
import { ProtectedBadge } from "./ProtectedBadge";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════
   SCHEDULING SETTINGS
   ═══════════════════════════════════════════════ */
export function SchedulingSettings() {
  const [defaultView, setDefaultView] = useState("week");
  const [autoPublish, setAutoPublish] = useState(false);
  const [showDeptFilter, setShowDeptFilter] = useState(true);
  const [mobileQuickBuild, setMobileQuickBuild] = useState(true);
  const [shiftSwapNotify, setShiftSwapNotify] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setIsSaving(false);
    toast.success("Scheduling preferences saved");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configure scheduling defaults, presets, and mobile behaviour for your team.
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Default schedule view</Label>
          <select
            value={defaultView}
            onChange={e => setDefaultView(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="week">Week View</option>
            <option value="day">Day View</option>
          </select>
        </div>

        <Separator />

        <ToggleRow label="Department filter visible by default" desc="Show department tabs on schedule page" checked={showDeptFilter} onChange={setShowDeptFilter} />
        <ToggleRow label="Mobile Quick Build mode" desc="Enable guided shift wizard on mobile" checked={mobileQuickBuild} onChange={setMobileQuickBuild} />
        <ToggleRow label="Shift swap notifications" desc="Notify managers of swap requests" checked={shiftSwapNotify} onChange={setShiftSwapNotify} />
        <ToggleRow label="Auto-publish on create" desc="Publish shifts immediately when created" checked={autoPublish} onChange={setAutoPublish} />
      </div>

      <div className="space-y-2 pt-2">
        <SettingLink label="Shift Templates" description="Manage pre-built shift patterns" to="/schedule" />
        <SettingLink label="Location Operating Hours" description="Site-specific hours and rules" to="/settings?section=locations" />
      </div>

      <div className="flex justify-end pt-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Preferences</>}
        </Button>
      </div>

      <ConfigProtectedNote
        configurable="Default views, department filters, shift templates, mobile presets, swap notifications"
        protected_="Compliance rules, working time regulations, shift validation engine"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAYROLL DISPLAY SETTINGS
   ═══════════════════════════════════════════════ */
export function PayrollDisplaySettings() {
  const [showBonusColumn, setShowBonusColumn] = useState(true);
  const [showServiceCharge, setShowServiceCharge] = useState(true);
  const [defaultPdfLogo, setDefaultPdfLogo] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState("3");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setIsSaving(false);
    toast.success("Payroll preferences saved");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configure how payroll data is displayed and exported. These do not affect calculations.
      </p>

      <ToggleRow label="Show bonus column" desc="Display performance/special bonus on payroll table" checked={showBonusColumn} onChange={setShowBonusColumn} />
      <ToggleRow label="Show service charge column" desc="Display service charge breakdown" checked={showServiceCharge} onChange={setShowServiceCharge} />
      <ToggleRow label="Company logo on PDF exports" desc="Include logo in payroll report headers" checked={defaultPdfLogo} onChange={setDefaultPdfLogo} />

      <Separator />

      <div className="space-y-1.5">
        <Label className="text-xs">Payroll reminder (days before due)</Label>
        <Input type="number" min="0" max="14" value={reminderDaysBefore} onChange={e => setReminderDaysBefore(e.target.value)} className="h-9 w-24" />
      </div>

      <div className="flex justify-end pt-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Preferences</>}
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HOLIDAY DISPLAY SETTINGS
   ═══════════════════════════════════════════════ */
export function HolidayDisplaySettings() {
  const [showBalanceSummary, setShowBalanceSummary] = useState(true);
  const [showLedgerTab, setShowLedgerTab] = useState(true);
  const [defaultView, setDefaultView] = useState("cards");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setIsSaving(false);
    toast.success("Holiday preferences saved");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configure holiday page display preferences. Leave calculations remain protected.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">Default holiday view</Label>
        <select
          value={defaultView}
          onChange={e => setDefaultView(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="cards">Card View</option>
          <option value="table">Table View</option>
        </select>
      </div>

      <ToggleRow label="Show balance summary" desc="Display accrual/taken/remaining at top" checked={showBalanceSummary} onChange={setShowBalanceSummary} />
      <ToggleRow label="Show ledger tab" desc="Allow viewing detailed ledger entries" checked={showLedgerTab} onChange={setShowLedgerTab} />

      <div className="flex justify-end pt-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Preferences</>}
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TRAINING & DOCS
   ═══════════════════════════════════════════════ */
export function TrainingDocSettings() {
  const [autoReminders, setAutoReminders] = useState(true);
  const [reminderDays, setReminderDays] = useState("30");
  const [requireAcknowledge, setRequireAcknowledge] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setIsSaving(false);
    toast.success("Training preferences saved");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Manage training modules, certifications, document categories, and compliance reminders.
      </p>

      <ToggleRow label="Auto renewal reminders" desc="Send reminders before certifications expire" checked={autoReminders} onChange={setAutoReminders} />
      {autoReminders && (
        <div className="space-y-1.5 pl-1">
          <Label className="text-xs">Reminder days before expiry</Label>
          <Input type="number" min="1" max="90" value={reminderDays} onChange={e => setReminderDays(e.target.value)} className="h-9 w-24" />
        </div>
      )}
      <ToggleRow label="Require document acknowledgement" desc="Staff must acknowledge receipt of documents" checked={requireAcknowledge} onChange={setRequireAcknowledge} />

      <Separator />

      <div className="space-y-2">
        <SettingLink label="Training Records" description="View and manage certifications" to="/training" />
        <SettingLink label="Contracts & Documents" description="Template and document management" to="/contracts" />
      </div>

      <div className="flex justify-end pt-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Preferences</>}
        </Button>
      </div>

      <ConfigProtectedNote
        configurable="Training categories, renewal dates, document categories, acknowledgement rules, reminder timing"
        protected_="Document storage security, file access policies, tenant isolation"
      />
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
      <p className="text-xs text-muted-foreground">
        Configure how your company participates in the talent pool and manages former staff visibility.
      </p>

      <ToggleRow label="Talent pool enabled" desc="Allow your company to access and participate in the talent pool" checked={enabled} onChange={setEnabled} />
      <ToggleRow label="Prompt leavers for opt-in" desc="Ask departing staff if they'd like to join the talent pool" checked={promptLeavers} onChange={setPromptLeavers} />
      <ToggleRow label="Share profiles regionally" desc="Allow other companies in your region to discover former staff (with consent)" checked={shareRegionally} onChange={setShareRegionally} />

      <Separator />

      <SettingLink label="Talent Pool" description="Browse talent profiles and manage hiring requests" to="/talent-pool" />

      <div className="flex justify-end pt-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Preferences</>}
        </Button>
      </div>

      <ConfigProtectedNote
        configurable="Leaver opt-in prompts, company visibility preferences, talent request defaults"
        protected_="Candidate consent architecture, cross-tenant privacy rules, geographic visibility enforcement"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   BRANDING
   ═══════════════════════════════════════════════ */
export function BrandingSettings() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Customise how your company appears across the platform — on reports, contracts, and team views.
      </p>

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
      <p className="text-xs text-muted-foreground">
        View which modules are enabled for your company under your current plan.
      </p>

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
            <div className="flex items-center gap-2">
              {mod.editable && (
                <span className="text-[9px] text-muted-foreground">Preferences available</span>
              )}
              <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Active</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
        <div className="flex items-center gap-2 mb-1">
          <ProtectedBadge label="Platform Managed" />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Module entitlements are managed by the platform based on your subscription plan. You can configure preferences within active modules. Contact support to change your plan.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PEOPLE & LIFECYCLE SETTINGS
   ═══════════════════════════════════════════════ */
export function PeopleLifecycleSettings() {
  const [hideLeaversDefault, setHideLeaversDefault] = useState(true);
  const [defaultListView, setDefaultListView] = useState("cards");
  const [talentOptIn, setTalentOptIn] = useState(true);
  const [archiveAfterDays, setArchiveAfterDays] = useState("7");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setIsSaving(false);
    toast.success("People preferences saved");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configure employee directory behaviour and lifecycle workflow preferences.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">Default employee list view</Label>
        <select
          value={defaultListView}
          onChange={e => setDefaultListView(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="cards">Card View</option>
          <option value="table">Table View</option>
        </select>
      </div>

      <ToggleRow label="Hide leavers by default" desc="Show only active employees on the Employees page" checked={hideLeaversDefault} onChange={setHideLeaversDefault} />
      <ToggleRow label="Talent pool opt-in for leavers" desc="Prompt departing staff to join the talent pool" checked={talentOptIn} onChange={setTalentOptIn} />

      <Separator />

      <div className="space-y-1.5">
        <Label className="text-xs">Auto-archive leavers after (days)</Label>
        <Input type="number" min="1" max="90" value={archiveAfterDays} onChange={e => setArchiveAfterDays(e.target.value)} className="h-9 w-24" />
        <p className="text-[10px] text-muted-foreground">Leavers automatically move to archive after this period</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Preferences</>}
        </Button>
      </div>

      <ConfigProtectedNote
        configurable="Default views, leaver visibility, archive timing, talent opt-in prompts"
        protected_="Status transition engine, auto-archival rules, leaver workflow core logic"
      />
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
      <p className="flex items-center gap-1">
        <ProtectedBadge label="Protected" /> {protected_}
      </p>
    </div>
  );
}
