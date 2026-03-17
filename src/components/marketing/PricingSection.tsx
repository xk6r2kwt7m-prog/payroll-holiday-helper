import { Button } from "@/components/ui/button";

interface PricingSectionProps {
  className?: string;
  onBookDemo?: () => void;
  onSeePlatform?: () => void;
}

export function PricingSection({ className, onBookDemo, onSeePlatform }: PricingSectionProps) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-primary/20 bg-card p-6 sm:p-8 max-w-2xl mx-auto text-center space-y-4 hover:border-primary/35 hover:shadow-lg transition-all duration-300">
        <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug max-w-md mx-auto">
          Better control is not optional in hospitality. It is how you protect margin, standards and management time.
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          UGLŌ is built for operators who need tighter workforce control and stronger day-to-day execution.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button className="gradient-primary w-full sm:w-auto hover:shadow-md hover:brightness-110 active:scale-[0.98] transition-all duration-150" size="lg" onClick={onBookDemo}>Book a demo</Button>
          <Button variant="outline" className="w-full sm:w-auto hover:shadow-sm active:scale-[0.98] transition-all duration-150" size="lg" onClick={onSeePlatform}>See the platform</Button>
        </div>
      </div>
    </div>
  );
}
