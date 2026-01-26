import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Building2, Bell, Shield, CreditCard } from "lucide-react";

const Settings = () => {
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
                <Input id="company-name" defaultValue="Acme Corporation" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email">Company Email</Label>
                <Input id="company-email" type="email" defaultValue="hr@acme.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" defaultValue="123 Business Ave, Suite 100, San Francisco, CA 94102" />
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
                <Input id="pay-period" defaultValue="Monthly" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-day">Default Pay Day</Label>
                <Input id="pay-day" defaultValue="Last day of month" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Auto-calculate overtime</p>
                <p className="text-sm text-muted-foreground">Automatically calculate overtime pay</p>
              </div>
              <Switch defaultChecked />
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
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Holiday request alerts</p>
                <p className="text-sm text-muted-foreground">Get notified of new requests</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Payroll reminders</p>
                <p className="text-sm text-muted-foreground">Remind before payroll due dates</p>
              </div>
              <Switch defaultChecked />
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
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Session timeout</p>
                <p className="text-sm text-muted-foreground">Automatically log out after inactivity</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="gradient-primary">Save Changes</Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
