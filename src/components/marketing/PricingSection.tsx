import { Check } from "lucide-react";

const POINTS = [
  "Simple, transparent pricing",
  "Free inbound hiring — post vacancies and receive applications at no cost",
  "Paid outbound contact only when you proactively reach passive candidates",
  "No per-feature paywalls or hidden add-ons",
  "Suitable for single-site teams and growing multi-location groups",
  "Start with the modules you need, expand as your team grows",
];

interface PricingSectionProps {
  className?: string;
}

export function PricingSection({ className }: PricingSectionProps) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-foreground mb-1">Straightforward pricing</h3>
        <p className="text-sm text-muted-foreground mb-5">
          No surprises. You know what you're paying for before you commit.
        </p>
        <ul className="space-y-3">
          {POINTS.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
          Final commercial pricing will be published before general availability. Current access is available for early adopters.
        </p>
      </div>
    </div>
  );
}
