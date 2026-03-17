import { AlertTriangle } from "lucide-react";

const PAIN_POINTS = [
  "Staff appear on the rota before they are fully ready",
  "Overdue training or missing documents are noticed too late",
  "Incidents are recorded, but follow-up is inconsistent",
  "Training, compliance and workforce data sit in different systems",
  "Managers spend too much time checking and chasing",
  "Headcount is visible, but readiness is not",
  "Standards slip because accountability is fragmented",
];

interface SecuritySectionProps {
  className?: string;
}

export function SecuritySection({ className }: SecuritySectionProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PAIN_POINTS.map((p) => (
          <div key={p} className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-destructive/25 hover:bg-destructive/[0.03] transition-all duration-200">
            <AlertTriangle className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5 group-hover:text-destructive transition-colors duration-200" />
            <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-200">{p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
