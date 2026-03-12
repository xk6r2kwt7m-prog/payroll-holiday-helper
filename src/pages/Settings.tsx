import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Building2, Bell, Shield, CreditCard, Loader2, Users, Calendar,
  MapPin, Briefcase, Settings as SettingsIcon, Lock, ChevronRight,
} from "lucide-react";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/useCompanySettings";
import { RoleManagement } from "@/components/settings/RoleManagement";
import { HistoricalImport } from "@/components/settings/HistoricalImport";
import { LeaveRulesSettings } from "@/components/settings/LeaveRulesSettings";
import { DepartmentManagement } from "@/components/settings/DepartmentManagement";
import { EmployeeStatusConfig } from "@/components/settings/EmployeeStatusConfig";
import { ProtectedSystemInfo } from "@/components/settings/ProtectedSystemInfo";
import { ProtectedBadge } from "@/components/settings/ProtectedBadge";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const Settings = () => {
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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <SettingsIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Company Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your organisation structure and preferences</p>
          </div>
        </div>

        {/* Tabbed Navigation */}
        <Tabs defaultValue="company" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto scrollbar-none h-auto flex-wrap gap-1 bg-transparent p-0">
            {[
              { value: "company", icon: Building2, label: "Company" },
              { value: "people", icon: Users, label: "People" },
              { value: "locations", icon: MapPin, label: "Locations" },
              { value: "payroll-config", icon: CreditCard, label: "Payroll" },
              { value: "leave", icon: Calendar, label: "Leave Rules" },
              { value: "notifications", icon: Bell, label: "Notifications" },
              { value: "security", icon: Shield, label: "Security" },
              { value: "protected", icon: Lock, label: "Protected" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1.5 text-xs gap-1.5"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-4 mt-0">
            <ConfigSection icon={Building2} title="Company Information" description="Basic details about your organisation">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-xs">Company Name</Label>
                  <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email" className="text-xs">Company Email</Label>
                  <Input id="company-email" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="h-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-xs">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="h-9" />
              </div>
            </ConfigSection>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* People Tab */}
          <TabsContent value="people" className="space-y-4 mt-0">
            <ConfigSection icon={Briefcase} title="Departments" description="Team structure and department breakdown">
              <DepartmentManagement />
            </ConfigSection>

            <ConfigSection icon={Users} title="Employee Status Lifecycle" description="Status definitions and current distribution">
              <EmployeeStatusConfig />
            </ConfigSection>

            <ConfigSection icon={Users} title="User Roles & Access" description="Assign roles to control what each team member can access">
              <RoleManagement />
            </ConfigSection>

            <ConfigSection icon={MapPin} title="Locations" description="Manage work locations and site settings">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Configure location-specific settings including operating hours, scheduling rules, and geofencing.
                </p>
                <Link to="/locations">
                  <Button variant="outline" size="sm" className="text-xs">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    Manage Locations
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </ConfigSection>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-4 mt-0">
            <ConfigSection icon={MapPin} title="Location Management" description="Configure your work locations and site-specific rules">
              <div className="space-y-3">
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
                <div className="text-[11px] text-muted-foreground space-y-1 mt-2 pt-2 border-t border-border">
                  <p>✅ <span className="font-medium">Configurable:</span> Operating hours, break policies, shift swap rules, geofence radius, display name</p>
                  <p className="flex items-center gap-1">
                    <ProtectedBadge label="Protected" /> Tenant isolation, RLS policies, branch enum definitions
                  </p>
                </div>
              </div>
            </ConfigSection>
          </TabsContent>

          {/* Payroll Config Tab */}
          <TabsContent value="payroll-config" className="space-y-4 mt-0">
            <ConfigSection icon={CreditCard} title="Payroll Preferences" description="Configure payroll display and reminder settings">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pay-period" className="text-xs">Pay Period</Label>
                    <Input id="pay-period" value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pay-day" className="text-xs">Default Pay Day</Label>
                    <Input id="pay-day" value={payDay} onChange={(e) => setPayDay(e.target.value)} className="h-9" />
                  </div>
                </div>
                <SwitchRow
                  label="Auto-calculate overtime"
                  description="Automatically calculate overtime pay"
                  checked={autoCalculateOvertime}
                  onChange={setAutoCalculateOvertime}
                />
              </div>
            </ConfigSection>

            <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <ProtectedBadge label="Core Engine Protected" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                The payroll calculation engine, total pay formulas, holiday accrual triggers, and closed-period protections cannot be modified from settings. These are platform-level protected rules.
              </p>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>

            <Separator />
            <HistoricalImport />
          </TabsContent>

          {/* Leave Rules Tab */}
          <TabsContent value="leave" className="space-y-4 mt-0">
            <ConfigSection icon={Calendar} title="Leave & Holiday Rules" description="Configure accrual rates, carry-over, workweek, and leave year settings">
              <LeaveRulesSettings />
            </ConfigSection>

            <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <ProtectedBadge label="Protected Logic" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                The holiday ledger engine, balance reconciliation, and accrual calculation formula are protected core logic and cannot be modified. You can adjust configurable parameters (rates, carry-over limits) above.
              </p>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4 mt-0">
            <ConfigSection icon={Bell} title="Notifications" description="Manage how you receive alerts and reminders">
              <div className="space-y-3">
                <SwitchRow label="Email notifications" description="Receive updates via email" checked={emailNotifications} onChange={setEmailNotifications} />
                <Separator />
                <SwitchRow label="Holiday request alerts" description="Get notified of new requests" checked={holidayRequestAlerts} onChange={setHolidayRequestAlerts} />
                <Separator />
                <SwitchRow label="Payroll reminders" description="Remind before payroll due dates" checked={payrollReminders} onChange={setPayrollReminders} />
              </div>
            </ConfigSection>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 mt-0">
            <ConfigSection icon={Shield} title="Security" description="Protect your account and data">
              <div className="space-y-3">
                <SwitchRow label="Two-factor authentication" description="Add an extra layer of security" checked={twoFactorAuth} onChange={setTwoFactorAuth} />
                <Separator />
                <SwitchRow label="Session timeout" description="Automatically log out after inactivity" checked={sessionTimeout} onChange={setSessionTimeout} />
              </div>
            </ConfigSection>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* Protected Tab */}
          <TabsContent value="protected" className="space-y-4 mt-0">
            <ProtectedSystemInfo />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

/* ─── Helper Components ─── */

function ConfigSection({ icon: Icon, title, description, children }: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SwitchRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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

export default Settings;
