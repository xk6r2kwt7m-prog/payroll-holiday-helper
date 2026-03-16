import { AlertTriangle } from "lucide-react";

const PAIN_POINTS = [
  "People appear on the rota before they are fully ready",
  "Overdue training or missing documents are noticed too late",
  "Incidents are recorded, but follow-up is inconsistent",
  "Training, compliance and workforce data live in different systems",
  "Managers spend too much time checking and chasing",
  "Headcount is visible, but readiness is not",
  "Standards slip because accountability is too fragmented",
];

interface SecuritySectionProps {
  className?: string;
}

export function SecuritySection({ className }: SecuritySectionProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PAIN_POINTS.map((p) => (
          <div key={p} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">{p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
