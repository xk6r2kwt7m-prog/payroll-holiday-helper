import { Button } from "@/components/ui/button";

interface PricingSectionProps {
  className?: string;
}

export function PricingSection({ className }: PricingSectionProps) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-primary/20 bg-card p-6 sm:p-8 max-w-2xl mx-auto text-center space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug max-w-md mx-auto">
          Better control is not optional in hospitality. It is how you protect margin, standards and management time.
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          UGLŌ is built for operators who need tighter workforce control and stronger day-to-day execution.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button className="gradient-primary w-full sm:w-auto" size="lg">Book a demo</Button>
          <Button variant="outline" className="w-full sm:w-auto" size="lg">See the platform</Button>
        </div>
      </div>
    </div>
  );
}
