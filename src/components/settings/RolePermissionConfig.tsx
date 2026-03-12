import { useState } from "react";
import { Shield, Save, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProtectedBadge } from "./ProtectedBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PermissionDef {
  key: string;
  label: string;
  description: string;
  category: string;
}

const PERMISSIONS: PermissionDef[] = [
  // People
  { key: "view_employees", label: "View employee profiles", description: "See employee directory and details", category: "People" },
  { key: "edit_employees", label: "Edit employee profiles", description: "Modify employee information", category: "People" },
  { key: "manage_lifecycle", label: "Manage employee lifecycle", description: "Handle starters, leavers, archiving", category: "People" },
  // Scheduling
  { key: "view_schedules", label: "View schedules", description: "See shift schedules", category: "Scheduling" },
  { key: "edit_schedules", label: "Edit schedules", description: "Create and modify shifts", category: "Scheduling" },
  { key: "publish_schedules", label: "Publish schedules", description: "Publish rotas to staff", category: "Scheduling" },
  // Timesheets
  { key: "view_timesheets", label: "View timesheets", description: "See clock-in records", category: "Timesheets" },
  { key: "approve_timesheets", label: "Approve timesheets", description: "Approve/reject time entries", category: "Timesheets" },
  // Holidays
  { key: "view_holidays", label: "View holiday requests", description: "See leave requests", category: "Holidays" },
  { key: "approve_holidays", label: "Approve holiday requests", description: "Approve/reject leave", category: "Holidays" },
  // Training
  { key: "view_training", label: "View training records", description: "See certifications", category: "Training" },
  { key: "manage_training", label: "Manage training", description: "Assign and update training", category: "Training" },
  // Documents
  { key: "view_documents", label: "View documents", description: "Access employee documents", category: "Documents" },
  { key: "manage_documents", label: "Manage documents", description: "Upload and manage docs", category: "Documents" },
  // Pay
  { key: "view_pay_data", label: "View pay data", description: "See compensation fields", category: "Pay & Finance" },
  { key: "reveal_sensitive", label: "Reveal protected fields", description: "Unmask NI, bank details, pay", category: "Pay & Finance" },
  // Admin
  { key: "access_admin_centre", label: "Access Admin Centre", description: "Open settings/config", category: "Administration" },
];

type RoleKey = "admin" | "manager" | "supervisor" | "staff";

interface RoleConfig {
  label: string;
  color: string;
  locked?: boolean;
}

const ROLES: Record<RoleKey, RoleConfig> = {
  admin: { label: "Admin", color: "bg-primary/10 text-primary", locked: true },
  manager: { label: "Manager", color: "bg-accent/10 text-accent-foreground" },
  supervisor: { label: "Supervisor", color: "bg-warning/10 text-warning" },
  staff: { label: "Staff", color: "bg-muted text-muted-foreground" },
};

// Defaults
const DEFAULT_PERMS: Record<RoleKey, Record<string, boolean>> = {
  admin: Object.fromEntries(PERMISSIONS.map(p => [p.key, true])),
  manager: {
    view_employees: true, edit_employees: true, manage_lifecycle: false,
    view_schedules: true, edit_schedules: true, publish_schedules: true,
    view_timesheets: true, approve_timesheets: true,
    view_holidays: true, approve_holidays: true,
    view_training: true, manage_training: true,
    view_documents: true, manage_documents: true,
    view_pay_data: false, reveal_sensitive: false,
    access_admin_centre: false,
  },
  supervisor: {
    view_employees: true, edit_employees: false, manage_lifecycle: false,
    view_schedules: true, edit_schedules: false, publish_schedules: false,
    view_timesheets: true, approve_timesheets: false,
    view_holidays: true, approve_holidays: false,
    view_training: true, manage_training: false,
    view_documents: true, manage_documents: false,
    view_pay_data: false, reveal_sensitive: false,
    access_admin_centre: false,
  },
  staff: {
    view_employees: false, edit_employees: false, manage_lifecycle: false,
    view_schedules: true, edit_schedules: false, publish_schedules: false,
    view_timesheets: false, approve_timesheets: false,
    view_holidays: false, approve_holidays: false,
    view_training: false, manage_training: false,
    view_documents: false, manage_documents: false,
    view_pay_data: false, reveal_sensitive: false,
    access_admin_centre: false,
  },
};

export function RolePermissionConfig() {
  const [perms, setPerms] = useState(DEFAULT_PERMS);
  const [activeRole, setActiveRole] = useState<RoleKey>("manager");
  const [isSaving, setIsSaving] = useState(false);

  const togglePerm = (key: string) => {
    if (activeRole === "admin") return; // Admin always has all
    setPerms(prev => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [key]: !prev[activeRole][key],
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // In future this would persist to a role_permissions table
    await new Promise(r => setTimeout(r, 500));
    setIsSaving(false);
    toast.success(`${ROLES[activeRole].label} permissions saved`);
  };

  const categories = [...new Set(PERMISSIONS.map(p => p.category))];
  const currentPerms = perms[activeRole];
  const isLocked = activeRole === "admin";

  return (
    <div className="space-y-4">
      {/* Role tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(Object.entries(ROLES) as [RoleKey, RoleConfig][]).map(([key, role]) => (
          <button
            key={key}
            onClick={() => setActiveRole(key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              activeRole === key
                ? "bg-primary text-primary-foreground"
                : `${role.color} hover:opacity-80`
            )}
          >
            {role.label}
          </button>
        ))}
      </div>

      {isLocked && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Admin has full access to all features. Permissions cannot be restricted.
        </div>
      )}

      {/* Permission grid */}
      <div className="space-y-4">
        {categories.map(cat => {
          const catPerms = PERMISSIONS.filter(p => p.category === cat);
          return (
            <div key={cat}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</p>
              <div className="space-y-1">
                {catPerms.map(perm => (
                  <div
                    key={perm.key}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg border border-border",
                      isLocked ? "bg-muted/30 opacity-70" : "bg-card hover:bg-muted/20"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{perm.label}</p>
                      <p className="text-[10px] text-muted-foreground">{perm.description}</p>
                    </div>
                    <Switch
                      checked={currentPerms[perm.key] ?? false}
                      onCheckedChange={() => togglePerm(perm.key)}
                      disabled={isLocked}
                      className="scale-90"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!isLocked && (
        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Permissions</>}
          </Button>
        </div>
      )}

      <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3 mt-2">
        <div className="flex items-center gap-2 mb-1">
          <ProtectedBadge label="Protected" />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Permission model architecture, role hierarchy engine, and platform-level access rules are protected system logic.
        </p>
      </div>
    </div>
  );
}
