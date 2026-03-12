import { Badge } from "@/components/ui/badge";
import { useEmployees } from "@/hooks/useEmployees";
import { ProtectedBadge } from "./ProtectedBadge";

const STATUSES = [
  { key: "active", label: "Active", emoji: "✅", description: "Currently employed and working", style: "bg-success/10 text-success border-success/20" },
  { key: "starter", label: "Starter", emoji: "🆕", description: "New employee, onboarding in progress", style: "bg-primary/10 text-primary border-primary/20" },
  { key: "leaver", label: "Leaver", emoji: "👋", description: "Departed or departing. Auto-archived after 7 days", style: "bg-destructive/10 text-destructive border-destructive/20" },
];

export function EmployeeStatusConfig() {
  const { data: employees = [] } = useEmployees(true);

  const counts = {
    active: employees.filter(e => e.status === "active" && !e.archived_at).length,
    starter: employees.filter(e => e.status === "starter" && !e.archived_at).length,
    leaver: employees.filter(e => e.status === "leaver" && !e.archived_at).length,
    archived: employees.filter(e => !!e.archived_at).length,
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Employee lifecycle statuses and their current counts. Status transitions follow protected business rules.
      </p>

      <div className="space-y-2">
        {STATUSES.map((status) => (
          <div
            key={status.key}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
          >
            <span className="text-lg">{status.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{status.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{status.description}</p>
            </div>
            <Badge variant="outline" className={`text-xs ${status.style}`}>
              {counts[status.key as keyof typeof counts]}
            </Badge>
          </div>
        ))}
        
        {/* Archived */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
          <span className="text-lg">📦</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Archived</p>
            <p className="text-xs text-muted-foreground">Leavers auto-archive after 7 days. Records preserved for compliance</p>
          </div>
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
            {counts.archived}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
        <div className="flex items-center gap-2 mb-1">
          <ProtectedBadge label="Protected Logic" />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Auto-archival rules, status transitions, and leaver workflows are protected system logic and cannot be modified by company admins.
        </p>
      </div>
    </div>
  );
}
