import { Button } from "@/components/ui/button";

interface PricingSectionProps {
  className?: string;
}

export function PricingSection({ className }: PricingSectionProps) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 max-w-2xl mx-auto text-center space-y-5">
        <h3 className="text-base font-semibold text-foreground">
          For hospitality operators, better control is not a nice-to-have
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
          When staffing, training, compliance and follow-through are disconnected, management time gets wasted and avoidable problems build quietly. UGLŌ is built for operators who want tighter workforce control, stronger standards and clearer operational follow-through across the business.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button className="gradient-primary w-full sm:w-auto">Book a demo</Button>
          <Button variant="outline" className="w-full sm:w-auto">See how it works</Button>
        </div>
      </div>
    </div>
  );
}
