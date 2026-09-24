import { useMemo } from "react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePendingDetailDecisions } from "@/hooks/usePendingDetailDecisions";
import { cn } from "@/lib/utils";

/**
 * Shows the values a member of staff has sent in that still need a manager to
 * accept or reject them, grouped by employee. Each row links to that
 * employee's profile on the Employees page.
 */
export function PendingDetailDecisions() {
  const { data: decisions = [], isLoading } = usePendingDetailDecisions();

  const rows = useMemo(() => {
    const byEmployee = new Map<
      string,
      { employee_id: string; name: string; labels: string[]; oldest: string }
    >();
    for (const d of decisions) {
      const existing = byEmployee.get(d.employee_id);
      if (existing) {
        if (!existing.labels.includes(d.field_label)) existing.labels.push(d.field_label);
        if (new Date(d.created_at) < new Date(existing.oldest)) existing.oldest = d.created_at;
      } else {
        byEmployee.set(d.employee_id, {
          employee_id: d.employee_id,
          name: d.employee_name,
          labels: [d.field_label],
          oldest: d.created_at,
        });
      }
    }
    return Array.from(byEmployee.values()).map((r) => ({
      ...r,
      daysWaiting: differenceInCalendarDays(new Date(), new Date(r.oldest)),
    }));
  }, [decisions]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">
          Waiting for your decision
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting</p>
        ) : (
          rows.map((r, i) => (
            <Link
              key={i}
              to={`/employees?edit=${r.employee_id}`}
              className={cn(
                "flex items-start justify-between gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-accent",
                r.daysWaiting > 3
                  ? "border-warning/40 bg-warning/5"
                  : "border-border bg-card",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.labels.join(", ")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={r.daysWaiting > 3 ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {r.daysWaiting} day{r.daysWaiting === 1 ? "" : "s"}
                </Badge>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
