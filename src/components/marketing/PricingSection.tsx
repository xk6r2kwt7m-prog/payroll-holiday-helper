import { Check } from "lucide-react";

const POINTS = [
  "Simple, transparent pricing — no hidden fees",
  "Post vacancies and receive applications at no cost",
  "Outbound contact credits only when reaching passive candidates",
  "No per-feature paywalls",
  "Works for single-site teams and multi-location groups",
  "Start with what you need — add modules as you grow",
];

interface PricingSectionProps {
  className?: string;
}

export function PricingSection({ className }: PricingSectionProps) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 max-w-2xl mx-auto">
        <h3 className="text-base font-semibold text-foreground mb-1">Straightforward pricing</h3>
        <p className="text-sm text-muted-foreground mb-6">
          You know what you're paying for before you commit.
        </p>
        <ul className="space-y-3">
          {POINTS.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-6 pt-5 border-t border-border">
          Detailed pricing will be published before general availability. Early access is available now.
        </p>
      </div>
    </div>
  );
}
