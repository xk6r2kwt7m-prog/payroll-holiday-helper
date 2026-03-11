import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus } from "lucide-react";

const ROLES = ["Platform Owner", "Company Admin", "Manager", "Supervisor", "Staff", "Viewer"];

interface PermissionRow {
  category: string;
  permission: string;
  access: Record<string, "full" | "view" | "own" | "none">;
}

const PERMISSIONS: PermissionRow[] = [
  {
    category: "Dashboard",
    permission: "View Dashboard",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "full", Supervisor: "full", Staff: "full", Viewer: "view" },
  },
  {
    category: "Employees",
    permission: "View Employees",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "full", Supervisor: "view", Staff: "none", Viewer: "none" },
  },
  {
    category: "Employees",
    permission: "Manage Employees",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "none", Supervisor: "none", Staff: "none", Viewer: "none" },
  },
  {
    category: "Scheduling",
    permission: "View Schedule",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "full", Supervisor: "view", Staff: "own", Viewer: "none" },
  },
  {
    category: "Scheduling",
    permission: "Manage Shifts",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "full", Supervisor: "none", Staff: "none", Viewer: "none" },
  },
  {
    category: "Payroll",
    permission: "View Payroll",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "none", Supervisor: "none", Staff: "none", Viewer: "none" },
  },
  {
    category: "Payroll",
    permission: "Manage Payroll",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "none", Supervisor: "none", Staff: "none", Viewer: "none" },
  },
  {
    category: "Holidays",
    permission: "View Holidays",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "full", Supervisor: "view", Staff: "own", Viewer: "none" },
  },
  {
    category: "Training",
    permission: "View Training",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "view", Supervisor: "none", Staff: "own", Viewer: "none" },
  },
  {
    category: "Documents",
    permission: "Manage Contracts",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "none", Supervisor: "none", Staff: "none", Viewer: "none" },
  },
  {
    category: "Settings",
    permission: "Company Settings",
    access: { "Platform Owner": "full", "Company Admin": "full", Manager: "none", Supervisor: "none", Staff: "none", Viewer: "none" },
  },
  {
    category: "Platform",
    permission: "Platform Admin",
    access: { "Platform Owner": "full", "Company Admin": "none", Manager: "none", Supervisor: "none", Staff: "none", Viewer: "none" },
  },
  {
    category: "Platform",
    permission: "Manage Subscriptions",
    access: { "Platform Owner": "full", "Company Admin": "none", Manager: "none", Supervisor: "none", Staff: "none", Viewer: "none" },
  },
  {
    category: "Platform",
    permission: "Manage All Tenants",
    access: { "Platform Owner": "full", "Company Admin": "none", Manager: "none", Supervisor: "none", Staff: "none", Viewer: "none" },
  },
];

const AccessIcon = ({ level }: { level: string }) => {
  switch (level) {
    case "full":
      return <Check className="h-4 w-4 text-emerald-500" />;
    case "view":
      return <Badge variant="outline" className="text-[10px] px-1 py-0 text-blue-600 border-blue-200">View</Badge>;
    case "own":
      return <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-200">Own</Badge>;
    default:
      return <X className="h-4 w-4 text-muted-foreground/30" />;
  }
};

export function PermissionVisualizer() {
  const categories = [...new Set(PERMISSIONS.map((p) => p.category))];

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader>
        <CardTitle className="text-sm">Role & Access Matrix</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground min-w-[180px]">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className="text-center p-3 font-medium text-muted-foreground min-w-[90px] text-xs">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <>
                  <tr key={`cat-${cat}`} className="bg-muted/20">
                    <td colSpan={ROLES.length + 1} className="p-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {cat}
                    </td>
                  </tr>
                  {PERMISSIONS.filter((p) => p.category === cat).map((perm) => (
                    <tr key={perm.permission} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 text-card-foreground">{perm.permission}</td>
                      {ROLES.map((role) => (
                        <td key={role} className="p-3 text-center">
                          <div className="flex justify-center">
                            <AccessIcon level={perm.access[role] || "none"} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
