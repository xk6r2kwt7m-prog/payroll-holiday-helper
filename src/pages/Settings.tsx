import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Bell, Shield, CreditCard, Loader2, Users, Calendar,
  MapPin, Briefcase, Settings as SettingsIcon, Lock, ChevronRight,
  CalendarClock, GraduationCap, Sparkles, Palette, Blocks, ClipboardList,
} from "lucide-react";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/useCompanySettings";
import { RoleManagement } from "@/components/settings/RoleManagement";
import { HistoricalImport } from "@/components/settings/HistoricalImport";
import { LeaveRulesSettings } from "@/components/settings/LeaveRulesSettings";
import { DepartmentManagement } from "@/components/settings/DepartmentManagement";
import { EmployeeStatusConfig } from "@/components/settings/EmployeeStatusConfig";
import { ProtectedSystemInfo } from "@/components/settings/ProtectedSystemInfo";
import { ProtectedBadge } from "@/components/settings/ProtectedBadge";
import { AdminAuditLog } from "@/components/settings/AdminAuditLog";
import {
  SchedulingSettings,
  TrainingDocSettings,
  TalentPoolSettings,
  BrandingSettings,
  FeatureAccessSettings,
} from "@/components/settings/AdminConfigSections";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

/* ─── Section definitions ─── */
interface AdminSection {
  id: string;
  icon: any;
  label: string;
  group: "organisation" | "operations" | "system";
}

const SECTIONS: AdminSection[] = [
  { id: "company", icon: Building2, label: "Company Profile", group: "organisation" },
  { id: "locations", icon: MapPin, label: "Locations", group: "organisation" },
  { id: "departments", icon: Briefcase, label: "Departments", group: "organisation" },
  { id: "roles", icon: Users, label: "Roles & Access", group: "organisation" },
  { id: "people", icon: Users, label: "People & Lifecycle", group: "organisation" },
  { id: "scheduling", icon: CalendarClock, label: "Scheduling", group: "operations" },
  { id: "payroll", icon: CreditCard, label: "Payroll", group: "operations" },
  { id: "leave", icon: Calendar, label: "Holiday & Leave", group: "operations" },
  { id: "training", icon: GraduationCap, label: "Training & Docs", group: "operations" },
  { id: "talent", icon: Sparkles, label: "Talent Pool", group: "operations" },
  { id: "notifications", icon: Bell, label: "Notifications", group: "operations" },
  { id: "branding", icon: Palette, label: "Branding", group: "system" },
  { id: "features", icon: Blocks, label: "Feature Access", group: "system" },
  { id: "security", icon: Shield, label: "Security", group: "system" },
  { id: "audit", icon: ClipboardList, label: "Audit Log", group: "system" },
  { id: "protected", icon: Lock, label: "Protected Systems", group: "system" },
];

const GROUP_LABELS: Record<string, string> = {
  organisation: "Organisation",
  operations: "Operations",
  system: "System",
};

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "company";
  const isMobile = useIsMobile();

  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const { isAdmin } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [address, setAddress] = useState("");
  const [payPeriod, setPayPeriod] = useState("");
  const [payDay, setPayDay] = useState("");
  const [autoCalculateOvertime, setAutoCalculateOvertime] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [holidayRequestAlerts, setHolidayRequestAlerts] = useState(true);
  const [payrollReminders, setPayrollReminders] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(true);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || "");
      setCompanyEmail(settings.company_email || "");
      setAddress(settings.address || "");
      setPayPeriod(settings.pay_period || "Monthly");
      setPayDay(settings.default_pay_day || "Last day of month");
      setAutoCalculateOvertime(settings.auto_calculate_overtime ?? true);
      setEmailNotifications(settings.email_notifications ?? true);
      setHolidayRequestAlerts(settings.holiday_request_alerts ?? true);
      setPayrollReminders(settings.payroll_reminders ?? true);
      setTwoFactorAuth(settings.two_factor_auth ?? false);
      setSessionTimeout(settings.session_timeout ?? true);
    }
  }, [settings]);

  const setSection = (id: string) => {
    setSearchParams({ section: id });
  };

  const handleSave = () => {
    updateSettings.mutate({
      company_name: companyName,
      company_email: companyEmail || null,
      address: address || null,
      pay_period: payPeriod || null,
      default_pay_day: payDay || null,
      auto_calculate_overtime: autoCalculateOvertime,
      email_notifications: emailNotifications,
      holiday_request_alerts: holidayRequestAlerts,
      payroll_reminders: payrollReminders,
      two_factor_auth: twoFactorAuth,
      session_timeout: sessionTimeout,
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const currentSection = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <SettingsIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Centre</h1>
            <p className="text-xs text-muted-foreground">Company configuration and system settings</p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Navigation (desktop) */}
          {!isMobile && (
            <nav className="w-52 shrink-0 space-y-4 sticky top-20 self-start">
              {(["organisation", "operations", "system"] as const).map((group) => (
                <div key={group}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-2">
                    {GROUP_LABELS[group]}
                  </p>
                  <div className="space-y-0.5">
                    {SECTIONS.filter(s => s.group === group).map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setSection(section.id)}
                        className={cn(
                          "flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left",
                          activeSection === section.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <section.icon className="h-3.5 w-3.5 shrink-0" />
                        {section.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          )}

          {/* Mobile section picker */}
          {isMobile && (
            <div className="fixed left-0 right-0 top-[64px] z-30 bg-background/95 backdrop-blur border-b border-border px-3 py-2 overflow-x-auto scrollbar-none">
              <div className="flex gap-1.5 w-max">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setSection(section.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap shrink-0",
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <section.icon className="h-3 w-3" />
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className={cn("flex-1 min-w-0 space-y-4", isMobile && "mt-12")}>
            {/* Section header */}
            <div className="flex items-center gap-2">
              <currentSection.icon className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">{currentSection.label}</h2>
            </div>

            {/* ─── COMPANY PROFILE ─── */}
            {activeSection === "company" && (
              <>
                <ConfigCard title="Company Information" description="Basic details about your organisation">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Company Name" id="company-name" value={companyName} onChange={setCompanyName} />
                    <Field label="Company Email" id="company-email" value={companyEmail} onChange={setCompanyEmail} type="email" />
                  </div>
                  <Field label="Address" id="address" value={address} onChange={setAddress} />
                </ConfigCard>
                <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
              </>
            )}

            {/* ─── LOCATIONS ─── */}
            {activeSection === "locations" && (
              <ConfigCard title="Location Management" description="Configure work locations and site-specific rules">
                <p className="text-xs text-muted-foreground">
                  Each location can have its own operating hours, scheduling preferences, break policies, and geofence settings.
                </p>
                <Link to="/locations">
                  <Button variant="outline" size="sm" className="text-xs">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    Open Location Settings
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
                <ConfigProtectedNote
                  configurable="Operating hours, break policies, shift swap rules, geofence radius, display name"
                  protected_="Tenant isolation, RLS policies, branch enum definitions"
                />
              </ConfigCard>
            )}

            {/* ─── DEPARTMENTS ─── */}
            {activeSection === "departments" && (
              <ConfigCard title="Departments" description="Team structure and department breakdown">
                <DepartmentManagement />
              </ConfigCard>
            )}

            {/* ─── ROLES ─── */}
            {activeSection === "roles" && (
              <ConfigCard title="User Roles & Access" description="Assign roles to control what each team member can access">
                <RoleManagement />
                <ConfigProtectedNote
                  configurable="Role assignment within your company, team access levels"
                  protected_="Permission model architecture, role hierarchy engine, platform-level access rules"
                />
              </ConfigCard>
            )}

            {/* ─── PEOPLE & LIFECYCLE ─── */}
            {activeSection === "people" && (
              <>
                <ConfigCard title="Employee Status Lifecycle" description="Status definitions and current distribution">
                  <EmployeeStatusConfig />
                </ConfigCard>
              </>
            )}

            {/* ─── SCHEDULING ─── */}
            {activeSection === "scheduling" && (
              <ConfigCard title="Scheduling Settings" description="Shift templates, presets, and scheduling preferences">
                <SchedulingSettings />
              </ConfigCard>
            )}

            {/* ─── PAYROLL ─── */}
            {activeSection === "payroll" && (
              <>
                <ConfigCard title="Payroll Preferences" description="Configure payroll display and reminder settings">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Pay Period" id="pay-period" value={payPeriod} onChange={setPayPeriod} />
                    <Field label="Default Pay Day" id="pay-day" value={payDay} onChange={setPayDay} />
                  </div>
                  <SwitchRow label="Auto-calculate overtime" description="Automatically calculate overtime pay" checked={autoCalculateOvertime} onChange={setAutoCalculateOvertime} />
                </ConfigCard>
                <ProtectedEngineNote label="Payroll Core Engine" description="The payroll calculation engine, total pay formulas, holiday accrual triggers, and closed-period protections cannot be modified. These are platform-level protected rules." />
                <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
                <Separator />
                <HistoricalImport />
              </>
            )}

            {/* ─── LEAVE ─── */}
            {activeSection === "leave" && (
              <>
                <ConfigCard title="Leave & Holiday Rules" description="Configure accrual rates, carry-over, workweek, and leave year settings">
                  <LeaveRulesSettings />
                </ConfigCard>
                <ProtectedEngineNote label="Holiday Engine" description="The holiday ledger engine, balance reconciliation, and accrual calculation formula are protected core logic. You can adjust configurable parameters above." />
              </>
            )}

            {/* ─── TRAINING ─── */}
            {activeSection === "training" && (
              <ConfigCard title="Training & Documents" description="Certifications, document categories, and compliance">
                <TrainingDocSettings />
              </ConfigCard>
            )}

            {/* ─── TALENT POOL ─── */}
            {activeSection === "talent" && (
              <ConfigCard title="Talent Pool Settings" description="Former staff network and visibility preferences">
                <TalentPoolSettings />
              </ConfigCard>
            )}

            {/* ─── NOTIFICATIONS ─── */}
            {activeSection === "notifications" && (
              <>
                <ConfigCard title="Notifications & Reminders" description="Manage how you receive alerts">
                  <SwitchRow label="Email notifications" description="Receive updates via email" checked={emailNotifications} onChange={setEmailNotifications} />
                  <Separator />
                  <SwitchRow label="Holiday request alerts" description="Get notified of new requests" checked={holidayRequestAlerts} onChange={setHolidayRequestAlerts} />
                  <Separator />
                  <SwitchRow label="Payroll reminders" description="Remind before payroll due dates" checked={payrollReminders} onChange={setPayrollReminders} />
                </ConfigCard>
                <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
              </>
            )}

            {/* ─── BRANDING ─── */}
            {activeSection === "branding" && (
              <ConfigCard title="Branding & Display" description="Customise your company appearance">
                <BrandingSettings />
              </ConfigCard>
            )}

            {/* ─── FEATURE ACCESS ─── */}
            {activeSection === "features" && (
              <ConfigCard title="Feature Access" description="Modules enabled for your company">
                <FeatureAccessSettings />
              </ConfigCard>
            )}

            {/* ─── SECURITY ─── */}
            {activeSection === "security" && (
              <>
                <ConfigCard title="Security" description="Account and data protection settings">
                  <SwitchRow label="Two-factor authentication" description="Add an extra layer of security" checked={twoFactorAuth} onChange={setTwoFactorAuth} />
                  <Separator />
                  <SwitchRow label="Session timeout" description="Automatically log out after inactivity" checked={sessionTimeout} onChange={setSessionTimeout} />
                </ConfigCard>
                <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
              </>
            )}

            {/* ─── AUDIT LOG ─── */}
            {activeSection === "audit" && (
              <ConfigCard title="Configuration Audit Log" description="Track admin configuration changes">
                <AdminAuditLog />
              </ConfigCard>
            )}

            {/* ─── PROTECTED ─── */}
            {activeSection === "protected" && (
              <ProtectedSystemInfo />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

/* ─── Reusable Helper Components ─── */

function ConfigCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, id, value, onChange, type = "text" }: { label: string; id: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
    </div>
  );
}

function SwitchRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-card-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SaveButton({ onSave, isPending }: { onSave: () => void; isPending: boolean }) {
  return (
    <div className="flex justify-end">
      <Button size="sm" onClick={onSave} disabled={isPending}>
        {isPending ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Saving...</> : "Save Changes"}
      </Button>
    </div>
  );
}

function ProtectedEngineNote({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
      <div className="flex items-center gap-2 mb-1">
        <ProtectedBadge label={`${label} Protected`} />
      </div>
      <p className="text-[11px] text-muted-foreground">{description}</p>
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

export default Settings;
