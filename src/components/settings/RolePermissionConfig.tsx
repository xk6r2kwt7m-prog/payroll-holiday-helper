import { useState, useEffect } from "react";
import { Save, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ProtectedBadge } from "./ProtectedBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRolePermissions, useSaveRolePermissions, PERMISSION_KEYS } from "@/hooks/useRolePermissions";

interface PermissionDef {
  key: string;
  label: string;
  description: string;
  category: string;
}

const PERMISSIONS: PermissionDef[] = [
  { key: "view_employees", label: "View employee profiles", description: "See employee directory and details", category: "People" },
  { key: "edit_employees", label: "Edit employee profiles", description: "Modify employee information", category: "People" },
  { key: "manage_lifecycle", label: "Manage employee lifecycle", description: "Handle starters, leavers, archiving", category: "People" },
  { key: "view_schedules", label: "View schedules", description: "See shift schedules", category: "Scheduling" },
  { key: "edit_schedules", label: "Edit schedules", description: "Create and modify shifts", category: "Scheduling" },
  { key: "publish_schedules", label: "Publish schedules", description: "Publish rotas to staff", category: "Scheduling" },
  { key: "view_timesheets", label: "View timesheets", description: "See clock-in records", category: "Timesheets" },
  { key: "approve_timesheets", label: "Approve timesheets", description: "Approve/reject time entries", category: "Timesheets" },
  { key: "view_holidays", label: "View holiday requests", description: "See leave requests", category: "Holidays" },
  { key: "approve_holidays", label: "Approve holiday requests", description: "Approve/reject leave", category: "Holidays" },
  { key: "view_training", label: "View training records", description: "See certifications", category: "Training" },
  { key: "manage_training", label: "Manage training", description: "Assign and update training", category: "Training" },
  { key: "view_documents", label: "View documents", description: "Access employee documents", category: "Documents" },
  { key: "manage_documents", label: "Manage documents", description: "Upload and manage docs", category: "Documents" },
  { key: "view_pay_data", label: "View pay data", description: "See compensation fields", category: "Pay & Finance" },
  { key: "reveal_sensitive", label: "Reveal protected fields", description: "Unmask NI, bank details, pay", category: "Pay & Finance" },
  { key: "access_admin_centre", label: "Access Admin Centre", description: "Open settings/config", category: "Administration" },
];

type RoleKey = "admin" | "manager" | "supervisor" | "staff";

const ROLES: Record<RoleKey, { label: string; color: string; locked?: boolean }> = {
  admin: { label: "Admin", color: "bg-primary/10 text-primary", locked: true },
  manager: { label: "Manager", color: "bg-accent/10 text-accent-foreground" },
  supervisor: { label: "Supervisor", color: "bg-warning/10 text-warning" },
  staff: { label: "Staff", color: "bg-muted text-muted-foreground" },
};

export function RolePermissionConfig() {
  const { data: dbPerms, isLoading } = useRolePermissions();
  const savePerms = useSaveRolePermissions();
  const [localPerms, setLocalPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [activeRole, setActiveRole] = useState<RoleKey>("manager");
  const [isDirty, setIsDirty] = useState(false);

  // Sync from DB
  useEffect(() => {
    if (dbPerms) {
      setLocalPerms(JSON.parse(JSON.stringify(dbPerms)));
      setIsDirty(false);
    }
  }, [dbPerms]);

  const togglePerm = (key: string) => {
    if (activeRole === "admin") return;
    setLocalPerms(prev => ({
      ...prev,
      [activeRole]: { ...prev[activeRole], [key]: !prev[activeRole]?.[key] },
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await savePerms.mutateAsync({ role: activeRole, permissions: localPerms[activeRole] || {} });
      toast.success(`${ROLES[activeRole].label} permissions saved`);
      setIsDirty(false);
    } catch {
      toast.error("Failed to save permissions");
    }
  };

  const categories = [...new Set(PERMISSIONS.map(p => p.category))];
  const currentPerms = localPerms[activeRole] || {};
  const isLocked = activeRole === "admin";

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {(Object.entries(ROLES) as [RoleKey, any][]).map(([key, role]) => (
          <button
            key={key}
            onClick={() => setActiveRole(key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              activeRole === key ? "bg-primary text-primary-foreground" : `${role.color} hover:opacity-80`
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

      <div className="space-y-4">
        {categories.map(cat => (
          <div key={cat}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</p>
            <div className="space-y-1">
              {PERMISSIONS.filter(p => p.category === cat).map(perm => (
                <div key={perm.key} className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg border border-border",
                  isLocked ? "bg-muted/30 opacity-70" : "bg-card hover:bg-muted/20"
                )}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{perm.label}</p>
                    <p className="text-[10px] text-muted-foreground">{perm.description}</p>
                  </div>
                  <Switch checked={currentPerms[perm.key] ?? false} onCheckedChange={() => togglePerm(perm.key)} disabled={isLocked} className="scale-90" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!isLocked && (
        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={handleSave} disabled={savePerms.isPending || !isDirty}>
            {savePerms.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Permissions</>}
          </Button>
        </div>
      )}

      <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3 mt-2">
        <div className="flex items-center gap-2 mb-1"><ProtectedBadge label="Protected" /></div>
        <p className="text-[11px] text-muted-foreground">
          Permission model architecture, role hierarchy engine, and platform-level access rules are protected system logic.
        </p>
      </div>
    </div>
  );
}
