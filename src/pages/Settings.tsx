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
  MapPin, Briefcase, Settings as SettingsIcon, Lock, ChevronLeft,
  CalendarClock, GraduationCap, Palette, ClipboardList, DollarSign,
  ChevronRight, FileText, UserCog,
} from "lucide-react";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/useCompanySettings";
import { RoleManagement } from "@/components/settings/RoleManagement";
import { ModulePricingConfig } from "@/components/settings/ModulePricingConfig";
import { RolePermissionConfig } from "@/components/settings/RolePermissionConfig";
import { TenantConfigSection } from "@/components/settings/TenantConfigSection";
import { HistoricalImport } from "@/components/settings/HistoricalImport";
import { LeaveRulesSettings } from "@/components/settings/LeaveRulesSettings";
import { DepartmentManagement } from "@/components/settings/DepartmentManagement";
import { EmployeeStatusConfig } from "@/components/settings/EmployeeStatusConfig";
import { ProtectedSystemInfo } from "@/components/settings/ProtectedSystemInfo";
import { ProtectedBadge } from "@/components/settings/ProtectedBadge";
import { AdminAuditLog } from "@/components/settings/AdminAuditLog";
import { LocationManagement } from "@/components/settings/LocationManagement";
import {
  SchedulingSettings,
  TrainingDocSettings,
  BrandingSettings,
  FeatureAccessSettings,
  PayrollDisplaySettings,
  HolidayDisplaySettings,
  PeopleLifecycleSettings,
} from "@/components/settings/AdminConfigSections";
import { OnboardingRequirementsConfig } from "@/components/settings/OnboardingRequirementsConfig";
import { ServiceChargeSettings } from "@/components/settings/ServiceChargeSettings";
import { EmailTestButton } from "@/components/settings/EmailTestButton";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/* ─── Settings group & section definitions ─── */
interface SettingsSection {
  id: string;
  label: string;
  description: string;
}

interface SettingsGroup {
  id: string;
  icon: any;
  label: string;
  description: string;
  sections: SettingsSection[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: "company",
    icon: Building2,
    label: "Company",
    description: "Profile, branding, and business identity",
    sections: [
      { id: "profile", label: "Company Profile", description: "Business name, email, and address" },
      { id: "branding", label: "Branding", description: "Logo, colours, and visual identity" },
      { id: "tenant", label: "Workspace Config", description: "Country, timezone, and locale" },
    ],
  },
  {
    id: "people",
    icon: Users,
    label: "People",
    description: "Roles, departments, onboarding, and employee lifecycle",
    sections: [
      { id: "roles", label: "Roles & Permissions", description: "Control what each role can access" },
      { id: "departments", label: "Departments", description: "Team groupings and labels" },
      { id: "statuses", label: "Employee Lifecycle", description: "Status types and onboarding steps" },
      { id: "onboarding", label: "Onboarding Requirements", description: "What new starters must complete" },
    ],
  },
  {
    id: "workplaces",
    icon: MapPin,
    label: "Workplaces",
    description: "Locations, geofencing, and scheduling rules",
    sections: [
      { id: "locations", label: "Locations", description: "Sites, addresses, and geofence settings" },
      { id: "scheduling", label: "Scheduling Rules", description: "Shift defaults and rota preferences" },
    ],
  },
  {
    id: "time-leave",
    icon: Calendar,
    label: "Time & Leave",
    description: "Holiday rules, leave policies, and attendance",
    sections: [
      { id: "leave-rules", label: "Leave Rules", description: "Statutory entitlements and accrual settings" },
      { id: "leave-display", label: "Leave Display", description: "How leave balances appear to staff" },
    ],
  },
  {
    id: "payroll",
    icon: DollarSign,
    label: "Payroll",
    description: "Pay frequency, overtime, service charge, and imports",
    sections: [
      { id: "pay-settings", label: "Pay Settings", description: "Pay period, pay day, and overtime rules" },
      { id: "pay-display", label: "Display Preferences", description: "How payroll data is shown" },
      { id: "service-charge", label: "Service Charge", description: "Tips and tronc distribution" },
      { id: "historical", label: "Historical Import", description: "Import past payroll records" },
    ],
  },
  {
    id: "docs-training",
    icon: GraduationCap,
    label: "Documents & Training",
    description: "Training requirements and document templates",
    sections: [
      { id: "training", label: "Training Settings", description: "Required certifications and modules" },
    ],
  },
  {
    id: "system",
    icon: Shield,
    label: "System & Security",
    description: "Notifications, security, modules, and audit trail",
    sections: [
      { id: "notifications", label: "Notifications", description: "Email alerts and reminders" },
      { id: "security", label: "Security", description: "Authentication and session rules" },
      { id: "features", label: "Feature Access", description: "Enable or disable platform modules" },
      { id: "audit", label: "Audit Log", description: "View all admin actions and changes" },
      { id: "protected", label: "Protected Systems", description: "Core engines that cannot be modified" },
    ],
  },
];

const Settings = () => {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeGroup = searchParams.get("group") || null;
  const activeSection = searchParams.get("section") || null;
  const isMobile = useIsMobile();

  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

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

  const navigateTo = (group: string | null, section: string | null) => {
    const params: Record<string, string> = {};
    if (group) params.group = group;
    if (section) params.section = section;
    setSearchParams(params);
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

  const currentGroup = SETTINGS_GROUPS.find(g => g.id === activeGroup);

  /* ─── LEVEL 1: Group overview (landing) ─── */
  if (!activeGroup) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <SettingsIcon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Centre</h1>
              <p className="text-xs text-muted-foreground">Manage your workspace settings and configuration</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SETTINGS_GROUPS.map((group) => (
              <button
                key={group.id}
                onClick={() => navigateTo(group.id, null)}
                className="flex items-start gap-3 rounded-xl bg-card border border-border p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0 group-hover:bg-primary/15 transition-colors">
                  <group.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                    {group.sections.length} setting{group.sections.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ─── LEVEL 2: Group detail with section list ─── */
  if (activeGroup && !activeSection && currentGroup) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Back + header */}
          <button
            onClick={() => navigateTo(null, null)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All Settings
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <currentGroup.icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{currentGroup.label}</h1>
              <p className="text-xs text-muted-foreground">{currentGroup.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            {currentGroup.sections.map((section) => (
              <button
                key={section.id}
                onClick={() => navigateTo(activeGroup, section.id)}
                className="flex items-center gap-3 w-full rounded-xl bg-card border border-border p-3.5 text-left hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground">{section.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ─── LEVEL 3: Individual section content ─── */
  const sectionLabel = currentGroup?.sections.find(s => s.id === activeSection)?.label || "Settings";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Back navigation */}
        <button
          onClick={() => navigateTo(activeGroup, null)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {currentGroup?.label || "Settings"}
        </button>

        <div className="flex items-center gap-2">
          {currentGroup && <currentGroup.icon className="h-4 w-4 text-primary" />}
          <h2 className="text-base font-semibold text-foreground">{sectionLabel}</h2>
        </div>

        {/* ─── COMPANY GROUP ─── */}
        {activeSection === "profile" && (
          <>
            <ConfigCard title="Business Details" description="Your company name, contact email, and registered address. Used on documents and correspondence.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company Name" id="company-name" value={companyName} onChange={setCompanyName} />
                <Field label="Contact Email" id="company-email" value={companyEmail} onChange={setCompanyEmail} type="email" />
              </div>
              <Field label="Address" id="address" value={address} onChange={setAddress} />
            </ConfigCard>
            <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
          </>
        )}
        {activeSection === "branding" && (
          <ConfigCard title="Branding" description="Customise your workspace appearance — logo, colours, and display settings.">
            <BrandingSettings />
          </ConfigCard>
        )}
        {activeSection === "tenant" && (
          <ConfigCard title="Workspace Configuration" description="Country, timezone, and regional settings that apply to your whole workspace.">
            <TenantConfigSection />
          </ConfigCard>
        )}

        {/* ─── PEOPLE GROUP ─── */}
        {activeSection === "roles" && (
          <>
            <ConfigCard title="Permissions by Role" description="Control what managers, supervisors, and staff can see and do.">
              <RolePermissionConfig />
            </ConfigCard>
            <ConfigCard title="User Role Assignments" description="Assign roles to individual team members.">
              <RoleManagement />
            </ConfigCard>
          </>
        )}
        {activeSection === "departments" && (
          <ConfigCard title="Departments" description="Create and manage team groupings. Departments are used across scheduling, payroll, and reporting.">
            <DepartmentManagement />
          </ConfigCard>
        )}
        {activeSection === "statuses" && (
          <>
            <ConfigCard title="People Preferences" description="Default settings for how employee records behave.">
              <PeopleLifecycleSettings />
            </ConfigCard>
            <ConfigCard title="Employee Status Types" description="Define the lifecycle statuses (active, leaver, starter, etc.) used across your workforce.">
              <EmployeeStatusConfig />
            </ConfigCard>
          </>
        )}
        {activeSection === "onboarding" && (
          <ConfigCard title="Onboarding Requirements" description="Choose which steps new starters must complete before they're work-ready.">
            <OnboardingRequirementsConfig />
          </ConfigCard>
        )}

        {/* ─── WORKPLACES GROUP ─── */}
        {activeSection === "locations" && (
          <ConfigCard title="Locations" description="Manage your sites — addresses, operating hours, and geofence settings for clock-in validation.">
            <LocationManagement />
          </ConfigCard>
        )}
        {activeSection === "scheduling" && (
          <ConfigCard title="Scheduling Rules" description="Default shift times, rota preferences, and compliance thresholds.">
            <SchedulingSettings />
          </ConfigCard>
        )}

        {/* ─── TIME & LEAVE GROUP ─── */}
        {activeSection === "leave-rules" && (
          <>
            <ConfigCard title="Leave Rules" description="Statutory holiday entitlements, accrual rates, and carryover limits. These rules determine how leave is calculated for all employees.">
              <LeaveRulesSettings />
            </ConfigCard>
            <ProtectedEngineNote label="Holiday Accrual Engine" description="The core accrual engine follows UK statutory rules and cannot be modified by tenant admins." />
          </>
        )}
        {activeSection === "leave-display" && (
          <ConfigCard title="Leave Display" description="Control how leave balances and entitlements appear to staff and managers.">
            <HolidayDisplaySettings />
          </ConfigCard>
        )}

        {/* ─── PAYROLL GROUP ─── */}
        {activeSection === "pay-settings" && (
          <>
            <ConfigCard title="Pay Settings" description="Set your pay cycle, default pay day, and overtime calculation preferences.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pay Period" id="pay-period" value={payPeriod} onChange={setPayPeriod} />
                <Field label="Default Pay Day" id="pay-day" value={payDay} onChange={setPayDay} />
              </div>
              <SwitchRow label="Auto-calculate Overtime" description="Automatically flag and calculate overtime hours based on weekly thresholds." checked={autoCalculateOvertime} onChange={setAutoCalculateOvertime} />
              <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
            </ConfigCard>
            <ProtectedEngineNote label="Payroll Calculation Engine" description="The core payroll engine follows UK best practice and HMRC compliance rules. It cannot be modified." />
          </>
        )}
        {activeSection === "pay-display" && (
          <ConfigCard title="Payroll Display Preferences" description="Control how payroll summaries and reports appear.">
            <PayrollDisplaySettings />
          </ConfigCard>
        )}
        {activeSection === "service-charge" && (
          <ConfigCard title="Service Charge / Tips" description="Configure how service charge, tips, or tronc is distributed across locations, roles, and employees.">
            <ServiceChargeSettings />
          </ConfigCard>
        )}
        {activeSection === "historical" && (
          <ConfigCard title="Historical Import" description="Import past payroll records to build a complete history for analytics and reporting.">
            <HistoricalImport />
          </ConfigCard>
        )}

        {/* ─── DOCUMENTS & TRAINING GROUP ─── */}
        {activeSection === "training" && (
          <ConfigCard title="Training Settings" description="Configure required certifications, training modules, and compliance tracking.">
            <TrainingDocSettings />
          </ConfigCard>
        )}

        {/* ─── SYSTEM GROUP ─── */}
        {activeSection === "notifications" && (
          <>
            <ConfigCard title="Notifications" description="Control which email alerts and reminders are sent to you and your team.">
              <SwitchRow label="Email Notifications" description="Send emails when HR events occur (holiday requests, schedule changes, etc.)" checked={emailNotifications} onChange={setEmailNotifications} />
              <Separator />
              <SwitchRow label="Holiday Request Alerts" description="Get notified when staff submit leave requests." checked={holidayRequestAlerts} onChange={setHolidayRequestAlerts} />
              <Separator />
              <SwitchRow label="Payroll Reminders" description="Receive reminders before payroll deadlines." checked={payrollReminders} onChange={setPayrollReminders} />
            </ConfigCard>
            <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
            <ConfigCard title="Email Delivery Test" description="Check that your email pipeline is connected and delivering correctly.">
              <EmailTestButton />
            </ConfigCard>
          </>
        )}
        {activeSection === "security" && (
          <>
            <ConfigCard title="Security" description="Authentication and session management settings for your workspace.">
              <SwitchRow label="Two-Factor Authentication" description="Require 2FA for all admin accounts." checked={twoFactorAuth} onChange={setTwoFactorAuth} />
              <Separator />
              <SwitchRow label="Session Timeout" description="Automatically sign out inactive users after a period." checked={sessionTimeout} onChange={setSessionTimeout} />
            </ConfigCard>
            <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
          </>
        )}
        {activeSection === "features" && (
          <>
            <ConfigCard title="Feature Access" description="Enable or disable platform modules for your workspace. Disabled modules are hidden from all users.">
              <FeatureAccessSettings />
            </ConfigCard>
            <ConfigCard title="Module Pricing" description="View pricing details for optional modules.">
              <ModulePricingConfig />
            </ConfigCard>
          </>
        )}
        {activeSection === "audit" && (
          <ConfigCard title="Audit Log" description="A complete record of all admin actions. Use this to track changes and maintain accountability.">
            <AdminAuditLog />
          </ConfigCard>
        )}
        {activeSection === "protected" && (
          <ConfigCard title="Protected Systems" description="Core platform engines that are managed centrally and cannot be modified by workspace admins.">
            <ProtectedSystemInfo />
          </ConfigCard>
        )}
      </div>
    </AppLayout>
  );
};

/* ─── Reusable sub-components ─── */
function ConfigCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 sm:p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, id, value, onChange, type = "text" }: { label: string; id: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      <Input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} className="h-9" />
    </div>
  );
}

function SwitchRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SaveButton({ onSave, isPending }: { onSave: () => void; isPending: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button onClick={onSave} disabled={isPending} size="sm">
        {isPending ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}

function ProtectedEngineNote({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-lg bg-muted/50 border border-border p-3 flex items-start gap-2.5">
      <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          {label} <ProtectedBadge />
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default Settings;
