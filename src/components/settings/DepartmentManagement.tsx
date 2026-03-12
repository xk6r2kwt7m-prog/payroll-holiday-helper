import { useState } from "react";
import { Plus, Trash2, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEmployees } from "@/hooks/useEmployees";
import { cn } from "@/lib/utils";

const SYSTEM_DEPARTMENTS = [
  { key: "FOH", label: "Front of House", emoji: "🍽️", description: "Customer-facing roles" },
  { key: "BOH", label: "Back of House", emoji: "👨‍🍳", description: "Kitchen & prep roles" },
  { key: "CPU", label: "Central Production", emoji: "🏭", description: "Central production unit" },
];

export function DepartmentManagement() {
  const { data: employees = [] } = useEmployees();

  const deptCounts = SYSTEM_DEPARTMENTS.map(d => ({
    ...d,
    count: employees.filter(e => e.department === d.key && e.status === "active").length,
  }));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Departments define how your team is organized. Active employee counts are shown for reference.
      </p>

      <div className="space-y-2">
        {deptCounts.map((dept) => (
          <div
            key={dept.key}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
          >
            <span className="text-lg">{dept.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{dept.label}</p>
              <p className="text-xs text-muted-foreground">{dept.description}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {dept.count} active
            </Badge>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Department structure is configured at the system level. Contact support to add custom departments.
      </p>
    </div>
  );
}
