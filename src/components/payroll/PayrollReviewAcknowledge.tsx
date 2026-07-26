import { AlertTriangle, CheckCircle2 } from "lucide-react";

export interface ReviewItem {
  id: string;
  title: string;
  detail?: string;
  count?: number;
}

export interface PayrollReviewAcknowledgeProps {
  items: ReviewItem[];
}

/**
 * Phase B — "Review & Acknowledge" panel. Warnings only, never blockers.
 * Read-only presentational surface. Never mutates data.
 */
export function PayrollReviewAcknowledge({ items }: PayrollReviewAcknowledgeProps) {
  const hasWarnings = items.length > 0;

  return (
    <div
      className="rounded-xl border shadow-card p-4"
      data-testid="payroll-review-acknowledge"
      data-has-warnings={hasWarnings ? "true" : "false"}
      style={{
        borderColor: hasWarnings ? "hsl(var(--warning) / 0.35)" : "hsl(var(--border) / 0.6)",
        background: hasWarnings ? "hsl(var(--warning) / 0.04)" : "hsl(var(--card))",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {hasWarnings ? (
          <AlertTriangle className="h-4 w-4 text-warning" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-success" />
        )}
        <h2 className="text-sm font-semibold text-foreground">
          {hasWarnings ? `Review & acknowledge (${items.length})` : "Review & acknowledge"}
        </h2>
      </div>
      {hasWarnings ? (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="rounded-md border border-warning/25 bg-card px-3 py-2"
              data-testid={`review-item-${it.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{it.title}</p>
                {typeof it.count === "number" && it.count > 0 && (
                  <span className="text-xs text-warning font-semibold shrink-0">
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
        <p className="text-sm text-muted-foreground" data-testid="review-empty">
          No warnings to acknowledge.
        </p>
      )}
    </div>
  );
}
