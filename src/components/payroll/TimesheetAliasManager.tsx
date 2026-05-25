import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePayrollImportAliases } from "@/hooks/usePayrollImportAliases";
import { useEmployees } from "@/hooks/useEmployees";
import { Power, Search, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Admin/Manager screen to review and manage saved timesheet import aliases.
 *
 * Strictly read + deactivate. Never deletes (history preserved).
 * Never modifies the linked employee's legal name or profile.
 */
export function TimesheetAliasManager() {
  const { aliases, isLoading, deactivateAlias } = usePayrollImportAliases();
  const { data: employees = [] } = useEmployees(true);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const employeeById = useMemo(() => {
    const map = new Map<string, (typeof employees)[number]>();
    for (const e of employees) map.set(e.id, e);
    return map;
  }, [employees]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return aliases
      .filter((a) => (showInactive ? true : a.is_active))
      .filter((a) => {
        if (!q) return true;
        const emp = employeeById.get(a.employee_id);
        const empName = emp ? `${emp.forename} ${emp.surname}`.toLowerCase() : "";
        return (
          a.raw_timesheet_name.toLowerCase().includes(q) ||
          empName.includes(q)
        );
      });
  }, [aliases, search, showInactive, employeeById]);

  const handleDeactivate = async (id: string, name: string) => {
    try {
      await deactivateAlias(id);
      toast({ title: "Alias deactivated", description: `"${name}" will no longer auto-match.` });
    } catch (err: any) {
      toast({ title: "Failed to deactivate", description: err?.message ?? "Try again.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Saved timesheet aliases
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Names confirmed during past imports. Saved aliases auto-match future imports
              but never change an employee's legal name.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInactive((v) => !v)}
          >
            {showInactive ? "Hide inactive" : "Show inactive"}
          </Button>
        </div>
        <div className="relative mt-3">
          <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by timesheet name or employee…"
            className="pl-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved aliases yet. Aliases are created when you confirm an unclear name
            during a timesheet import and tick "Remember this match".
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-2">
              {rows.map((a) => {
                const emp = employeeById.get(a.employee_id);
                const empName = emp ? `${emp.forename} ${emp.surname}` : "Unknown employee";
                return (
                  <div
                    key={a.id}
                    className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${
                      a.is_active ? "bg-background" : "bg-muted/40 opacity-70"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{a.raw_timesheet_name}</p>
                        <span className="text-xs text-muted-foreground">→</span>
                        <p className="text-sm">{empName}</p>
                        {emp?.status && emp.status !== "active" && (
                          <Badge variant="outline" className="text-[10px]">{emp.status}</Badge>
                        )}
                        {!a.is_active && (
                          <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Used {a.usage_count} {a.usage_count === 1 ? "time" : "times"}
                        {a.last_used_at && ` · last used ${new Date(a.last_used_at).toLocaleDateString()}`}
                        {a.source_system && ` · ${a.source_system}`}
                      </p>
                    </div>
                    {a.is_active && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleDeactivate(a.id, a.raw_timesheet_name)}
                      >
                        <Power className="h-3 w-3 mr-1" /> Deactivate
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
