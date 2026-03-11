import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Building2, Bell, Shield, CreditCard, Loader2, Users, Calendar } from "lucide-react";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/useCompanySettings";
import { RoleManagement } from "@/components/settings/RoleManagement";
import { HistoricalImport } from "@/components/settings/HistoricalImport";
import { LeaveRulesSettings } from "@/components/settings/LeaveRulesSettings";

const Settings = () => {
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

  // Form state
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

  // Load settings into form when data arrives
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
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="animate-slide-in-left">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization preferences and configurations
          </p>
        </div>

        {/* Company Settings */}
        <div className="rounded-xl bg-card shadow-card p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Company Information</h3>
              <p className="text-sm text-muted-foreground">Basic details about your organization</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input 
                  id="company-name" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email">Company Email</Label>
                <Input 
                  id="company-email" 
                  type="email" 
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Payroll Settings */}
        <div className="rounded-xl bg-card shadow-card p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CreditCard className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Payroll Settings</h3>
              <p className="text-sm text-muted-foreground">Configure payroll preferences</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pay-period">Pay Period</Label>
                <Input 
                  id="pay-period" 
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-day">Default Pay Day</Label>
                <Input 
                  id="pay-day" 
                  value={payDay}
                  onChange={(e) => setPayDay(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Auto-calculate overtime</p>
                <p className="text-sm text-muted-foreground">Automatically calculate overtime pay</p>
              </div>
              <Switch 
                checked={autoCalculateOvertime}
                onCheckedChange={setAutoCalculateOvertime}
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="rounded-xl bg-card shadow-card p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Notifications</h3>
              <p className="text-sm text-muted-foreground">Manage how you receive notifications</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Email notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch 
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Holiday request alerts</p>
                <p className="text-sm text-muted-foreground">Get notified of new requests</p>
              </div>
              <Switch 
                checked={holidayRequestAlerts}
                onCheckedChange={setHolidayRequestAlerts}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Payroll reminders</p>
                <p className="text-sm text-muted-foreground">Remind before payroll due dates</p>
              </div>
              <Switch 
                checked={payrollReminders}
                onCheckedChange={setPayrollReminders}
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="rounded-xl bg-card shadow-card p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Security</h3>
              <p className="text-sm text-muted-foreground">Protect your account and data</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Two-factor authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Switch 
                checked={twoFactorAuth}
                onCheckedChange={setTwoFactorAuth}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Session timeout</p>
                <p className="text-sm text-muted-foreground">Automatically log out after inactivity</p>
              </div>
              <Switch 
                checked={sessionTimeout}
                onCheckedChange={setSessionTimeout}
              />
            </div>
          </div>
        </div>

        {/* Role Management */}
        <div className="rounded-xl bg-card shadow-card p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">User Roles</h3>
              <p className="text-sm text-muted-foreground">Assign roles to control what each team member can access</p>
            </div>
          </div>
          <RoleManagement />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            className="gradient-primary"
            onClick={handleSave}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

        {/* Historical Data Import */}
        <Separator />
        <HistoricalImport />
      </div>
    </AppLayout>
  );
};

export default Settings;
