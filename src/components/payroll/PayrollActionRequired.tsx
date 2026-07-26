import { AlertOctagon, CheckCircle2 } from "lucide-react";

export interface ActionRequiredItem {
  id: string;
  title: string;
  detail?: string;
  count?: number;
}

export interface PayrollActionRequiredProps {
  items: ActionRequiredItem[];
}

/**
 * Phase B — "Action Required" panel. Shows true blockers only.
 * Read-only presentational surface. Never mutates data.
 */
export function PayrollActionRequired({ items }: PayrollActionRequiredProps) {
  const hasBlockers = items.length > 0;

  return (
    <div
      className="rounded-xl border shadow-card p-4"
      data-testid="payroll-action-required"
      data-has-blockers={hasBlockers ? "true" : "false"}
      style={{
        borderColor: hasBlockers ? "hsl(var(--destructive) / 0.4)" : "hsl(var(--border) / 0.6)",
        background: hasBlockers ? "hsl(var(--destructive) / 0.04)" : "hsl(var(--card))",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {hasBlockers ? (
          <AlertOctagon className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-success" />
        )}
        <h2 className="text-sm font-semibold text-foreground">
          {hasBlockers ? `Action required (${items.length})` : "Action required"}
        </h2>
      </div>
      {hasBlockers ? (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="rounded-md border border-destructive/20 bg-card px-3 py-2"
              data-testid={`action-required-item-${it.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{it.title}</p>
                {typeof it.count === "number" && it.count > 0 && (
                  <span className="text-xs text-destructive font-semibold shrink-0">
                    {it.count}
                  </span>
                )}
              </div>
              {it.detail && (
                <p className="text-xs text-muted-foreground mt-0.5">{it.detail}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="action-required-empty">
          No blocking issues found.
        </p>
      )}
    </div>
  );
}
