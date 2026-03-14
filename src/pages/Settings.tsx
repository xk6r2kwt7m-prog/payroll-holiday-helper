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
  CalendarClock, GraduationCap, Sparkles, Palette, Blocks, ClipboardList, DollarSign,
  CalendarClock, GraduationCap, Sparkles, Palette, Blocks, ClipboardList,
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
  TalentPoolSettings,
  BrandingSettings,
  FeatureAccessSettings,
  PayrollDisplaySettings,
  HolidayDisplaySettings,
  PeopleLifecycleSettings,
} from "@/components/settings/AdminConfigSections";
import { ServiceChargeSettings } from "@/components/settings/ServiceChargeSettings";
import { EmailTestButton } from "@/components/settings/EmailTestButton";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const Settings = () => {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "company";
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

  /* ─── Section definitions ─── */
  interface AdminSection {
    id: string;
    icon: any;
    label: string;
    group: "organisation" | "operations" | "system";
  }

  const SECTIONS: AdminSection[] = [
    { id: "company", icon: Building2, label: t("settings.company_profile"), group: "organisation" },
    { id: "locations", icon: MapPin, label: t("settings.locations"), group: "organisation" },
    { id: "departments", icon: Briefcase, label: t("settings.departments"), group: "organisation" },
    { id: "roles", icon: Users, label: t("settings.roles_access"), group: "organisation" },
    { id: "people", icon: Users, label: t("settings.people_lifecycle"), group: "organisation" },
    { id: "scheduling", icon: CalendarClock, label: t("settings.scheduling"), group: "operations" },
    { id: "payroll", icon: CreditCard, label: t("settings.payroll"), group: "operations" },
    { id: "service-charge", icon: DollarSign, label: "Service Charge", group: "operations" },
    { id: "leave", icon: Calendar, label: t("settings.holiday_leave"), group: "operations" },
    { id: "training", icon: GraduationCap, label: t("settings.training_docs"), group: "operations" },
    { id: "talent", icon: Sparkles, label: t("settings.talent_pool"), group: "operations" },
    { id: "notifications", icon: Bell, label: t("settings.notifications"), group: "operations" },
    { id: "branding", icon: Palette, label: t("settings.branding"), group: "system" },
    { id: "features", icon: Blocks, label: t("settings.feature_access"), group: "system" },
    { id: "security", icon: Shield, label: t("settings.security"), group: "system" },
    { id: "audit", icon: ClipboardList, label: t("settings.audit_log"), group: "system" },
    { id: "protected", icon: Lock, label: t("settings.protected_systems"), group: "system" },
  ];

  const GROUP_LABELS: Record<string, string> = {
    organisation: t("settings.organisation"),
    operations: t("settings.operations"),
    system: t("settings.system"),
  };

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
            <h1 className="text-xl font-bold text-foreground">{t("settings.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("settings.subtitle")}</p>
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
                <ConfigCard title={t("settings.company_config")} description={t("settings.company_config_desc")}>
                  <TenantConfigSection />
                </ConfigCard>
                <ConfigCard title={t("settings.company_profile")} description={t("settings.company_profile_desc")}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("settings.company_name")} id="company-name" value={companyName} onChange={setCompanyName} />
                    <Field label={t("settings.company_email")} id="company-email" value={companyEmail} onChange={setCompanyEmail} type="email" />
                  </div>
                  <Field label={t("settings.address")} id="address" value={address} onChange={setAddress} />
                </ConfigCard>
                <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
              </>
            )}

            {/* ─── LOCATIONS ─── */}
            {activeSection === "locations" && (
              <ConfigCard title={t("settings.location_management")} description={t("settings.location_management_desc")}>
                <LocationManagement />
              </ConfigCard>
            )}

            {/* ─── DEPARTMENTS ─── */}
            {activeSection === "departments" && (
              <ConfigCard title={t("settings.departments")} description={t("settings.departments_desc")}>
                <DepartmentManagement />
              </ConfigCard>
            )}

            {/* ─── ROLES ─── */}
            {activeSection === "roles" && (
              <>
                <ConfigCard title={t("settings.role_permissions")} description={t("settings.role_permissions_desc")}>
                  <RolePermissionConfig />
                </ConfigCard>
                <ConfigCard title={t("settings.user_role_assignment")} description={t("settings.user_role_assignment_desc")}>
                  <RoleManagement />
                </ConfigCard>
              </>
            )}

            {/* ─── PEOPLE & LIFECYCLE ─── */}
            {activeSection === "people" && (
              <>
                <ConfigCard title={t("settings.people_preferences")} description={t("settings.people_preferences_desc")}>
                  <PeopleLifecycleSettings />
                </ConfigCard>
                <ConfigCard title={t("settings.employee_status_lifecycle")} description={t("settings.employee_status_lifecycle_desc")}>
                  <EmployeeStatusConfig />
                </ConfigCard>
              </>
            )}

            {/* ─── SCHEDULING ─── */}
            {activeSection === "scheduling" && (
              <ConfigCard title={t("settings.scheduling_settings")} description={t("settings.scheduling_settings_desc")}>
                <SchedulingSettings />
              </ConfigCard>
            )}

            {/* ─── PAYROLL ─── */}
            {activeSection === "payroll" && (
              <>
                <ConfigCard title={t("settings.payroll_preferences")} description={t("settings.payroll_preferences_desc")}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("settings.pay_period")} id="pay-period" value={payPeriod} onChange={setPayPeriod} />
                    <Field label={t("settings.default_pay_day")} id="pay-day" value={payDay} onChange={setPayDay} />
                  </div>
                  <SwitchRow label={t("settings.auto_overtime")} description={t("settings.auto_overtime_desc")} checked={autoCalculateOvertime} onChange={setAutoCalculateOvertime} />
                  <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
                </ConfigCard>
                <ConfigCard title={t("settings.display_preferences")} description={t("settings.display_preferences_desc")}>
                  <PayrollDisplaySettings />
                </ConfigCard>
                <ProtectedEngineNote label={t("settings.payroll_engine_note")} description={t("settings.payroll_engine_desc")} />
                <Separator />
                <HistoricalImport />
              </>
            )}

            {/* ─── LEAVE ─── */}
            {activeSection === "leave" && (
              <>
                <ConfigCard title={t("settings.leave_rules")} description={t("settings.leave_rules_desc")}>
                  <LeaveRulesSettings />
                </ConfigCard>
                <ConfigCard title={t("settings.holiday_display")} description={t("settings.holiday_display_desc")}>
                  <HolidayDisplaySettings />
                </ConfigCard>
                <ProtectedEngineNote label={t("settings.holiday_engine_note")} description={t("settings.holiday_engine_desc")} />
              </>
            )}

            {/* ─── TRAINING ─── */}
            {activeSection === "training" && (
              <ConfigCard title={t("settings.training_docs")} description={t("settings.training_docs_desc")}>
                <TrainingDocSettings />
              </ConfigCard>
            )}

            {/* ─── TALENT POOL ─── */}
            {activeSection === "talent" && (
              <ConfigCard title={t("settings.talent_pool")} description={t("settings.talent_pool_desc")}>
                <TalentPoolSettings />
              </ConfigCard>
            )}

            {/* ─── NOTIFICATIONS ─── */}
            {activeSection === "notifications" && (
              <>
                <ConfigCard title={t("settings.notifications")} description={t("settings.notifications_desc")}>
                  <SwitchRow label="Enable Email Notifications" description="Send transactional emails via Postmark when HR events occur (holiday requests, schedule changes, etc.)" checked={emailNotifications} onChange={setEmailNotifications} />
                  <Separator />
                  <SwitchRow label={t("settings.holiday_alerts")} description={t("settings.holiday_alerts_desc")} checked={holidayRequestAlerts} onChange={setHolidayRequestAlerts} />
                  <Separator />
                  <SwitchRow label={t("settings.payroll_reminders")} description={t("settings.payroll_reminders_desc")} checked={payrollReminders} onChange={setPayrollReminders} />
                </ConfigCard>
                <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
                <ConfigCard title="Email Delivery Test" description="Verify the email pipeline is connected and sending correctly.">
                  <EmailTestButton />
                </ConfigCard>
              </>
            )}

            {/* ─── BRANDING ─── */}
            {activeSection === "branding" && (
              <ConfigCard title={t("settings.branding")} description={t("settings.branding_desc")}>
                <BrandingSettings />
              </ConfigCard>
            )}

            {/* ─── FEATURE ACCESS ─── */}
            {activeSection === "features" && (
              <>
                <ConfigCard title={t("settings.feature_access")} description={t("settings.feature_access_desc")}>
                  <FeatureAccessSettings />
                </ConfigCard>
                <ConfigCard title={t("settings.module_pricing")} description={t("settings.module_pricing_desc")}>
                  <ModulePricingConfig />
                </ConfigCard>
              </>
            )}

            {/* ─── SECURITY ─── */}
            {activeSection === "security" && (
              <>
                <ConfigCard title={t("settings.security")} description={t("settings.security_desc")}>
                  <SwitchRow label={t("settings.two_factor")} description={t("settings.two_factor_desc")} checked={twoFactorAuth} onChange={setTwoFactorAuth} />
                  <Separator />
                  <SwitchRow label={t("settings.session_timeout")} description={t("settings.session_timeout_desc")} checked={sessionTimeout} onChange={setSessionTimeout} />
                </ConfigCard>
                <SaveButton onSave={handleSave} isPending={updateSettings.isPending} />
              </>
            )}

            {/* ─── AUDIT LOG ─── */}
            {activeSection === "audit" && (
              <ConfigCard title={t("settings.audit_log")} description="">
                <AdminAuditLog />
              </ConfigCard>
            )}

            {/* ─── PROTECTED SYSTEMS ─── */}
            {activeSection === "protected" && (
              <ConfigCard title={t("settings.protected_systems")} description="">
                <ProtectedSystemInfo />
              </ConfigCard>
            )}
          </div>
        </div>
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
  const { t } = useI18n();
  return (
    <div className="flex justify-end pt-2">
      <Button onClick={onSave} disabled={isPending} size="sm">
        {isPending ? t("common.saving") : t("settings.save_config")}
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
