import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RotaIssue } from "@/lib/schedule-rota-issues";

interface RotaIssuesPanelProps {
  issues: RotaIssue[];
  className?: string;
}

const GROUP_TITLES: Record<RotaIssue["code"], string> = {
  unassigned: "Unassigned shifts",
  employee_unavailable: "Employee unavailable",
  employee_on_leave: "Employee on leave",
  missing_role: "Role mismatch",
  over_contracted_hours: "Over contracted hours",
  overlapping_shift: "Overlapping shifts",
  missing_break: "Insufficient rest between shifts",
  insufficient_cover: "Insufficient cover",
};

export function RotaIssuesPanel({ issues, className }: RotaIssuesPanelProps) {
  if (issues.length === 0) return null;
  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");

  const grouped = new Map<RotaIssue["code"], RotaIssue[]>();
  for (const i of issues) {
    if (!grouped.has(i.code)) grouped.set(i.code, []);
    grouped.get(i.code)!.push(i);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="rota-issues-trigger"
          className={cn(
            "h-7 gap-1.5 rounded-full px-2.5 text-[11px]",
            critical.length > 0
              ? "border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10"
              : "border-amber-500/40 text-amber-700 bg-amber-50 hover:bg-amber-100",
            className
          )}
        >
          {critical.length > 0 ? <ShieldAlert className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {critical.length > 0 && (
            <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">{critical.length}</Badge>
          )}
          {warnings.length > 0 && (
            <span className="text-[11px]">{warnings.length} warning{warnings.length !== 1 ? "s" : ""}</span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md" data-testid="rota-issues-panel">
        <SheetHeader>
          <SheetTitle>Rota issues</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-7rem)] pr-1">
          {Array.from(grouped.entries()).map(([code, items]) => (
            <div key={code}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {GROUP_TITLES[code]} ({items.length})
              </h4>
              <ul className="space-y-1.5">
                {items.map((i, idx) => (
                  <li
                    key={`${code}-${idx}`}
                    className={cn(
                      "rounded-md border px-3 py-2 text-xs leading-relaxed",
                      i.severity === "critical"
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : "border-amber-500/30 bg-amber-50 text-amber-800"
                    )}
                  >
                    {i.message}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
