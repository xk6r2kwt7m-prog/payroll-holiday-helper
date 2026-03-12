import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, CalendarClock } from "lucide-react";
import { ProtectedBadge } from "./ProtectedBadge";

export function SchedulingSettings() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configure scheduling defaults, shift templates, and mobile presets for your team.
      </p>

      <div className="space-y-2">
        <SettingLink label="Shift Templates" description="Pre-built shift patterns for fast scheduling" to="/schedule" />
        <SettingLink label="Location Operating Hours" description="Opening hours and staffing rules per site" to="/locations" />
        <SettingLink label="Schedule Preferences" description="Default views, publish rules, and mobile presets" to="/schedule" />
      </div>

      <div className="text-[11px] text-muted-foreground space-y-1 pt-3 border-t border-border">
        <p>✅ <span className="font-medium">Configurable:</span> Shift templates, operating hours, break policies, scheduling presets, mobile wizards</p>
        <p className="flex items-center gap-1">
          <ProtectedBadge label="Protected" /> Compliance rules, working time regulations, shift validation engine
        </p>
      </div>
    </div>
  );
}

export function TrainingDocSettings() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Manage training modules, certifications, document categories, and compliance reminders.
      </p>

      <div className="space-y-2">
        <SettingLink label="Training Records" description="View and manage certifications and training history" to="/training" />
        <SettingLink label="Contracts & Documents" description="Template and document management" to="/contracts" />
      </div>

      <div className="text-[11px] text-muted-foreground space-y-1 pt-3 border-t border-border">
        <p>✅ <span className="font-medium">Configurable:</span> Training categories, certification types, renewal dates, document categories, acknowledgement rules</p>
        <p className="flex items-center gap-1">
          <ProtectedBadge label="Protected" /> Document storage security, file access policies, tenant isolation
        </p>
      </div>
    </div>
  );
}

export function TalentPoolSettings() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configure how your company participates in the talent pool and manages former staff visibility.
      </p>

      <div className="space-y-2">
        <SettingLink label="Talent Pool" description="Browse talent profiles and manage hiring requests" to="/talent-pool" />
      </div>

      <div className="text-[11px] text-muted-foreground space-y-1 pt-3 border-t border-border">
        <p>✅ <span className="font-medium">Configurable:</span> Leaver opt-in prompts, company visibility preferences, talent request defaults</p>
        <p className="flex items-center gap-1">
          <ProtectedBadge label="Protected" /> Candidate consent architecture, cross-tenant privacy rules, geographic visibility enforcement
        </p>
      </div>
    </div>
  );
}

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

export function FeatureAccessSettings() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        View which modules are enabled for your company under your current plan.
      </p>

      <div className="space-y-1.5">
        {[
          { label: "Scheduling", desc: "Shift management, rota builder, mobile wizard" },
          { label: "Payroll", desc: "Pay runs, reports, analytics, exports" },
          { label: "Training", desc: "Certifications, training records, compliance" },
          { label: "Documents", desc: "Contracts, uploads, digital signing" },
          { label: "Analytics", desc: "Advanced reporting and schedule analytics" },
          { label: "Talent Pool", desc: "Former staff network and hiring requests" },
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
        <div className="flex items-center gap-2 mb-1">
          <ProtectedBadge label="Platform Managed" />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Module entitlements are managed by the platform based on your subscription plan. Contact support to change your plan or enable additional modules.
        </p>
      </div>
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
