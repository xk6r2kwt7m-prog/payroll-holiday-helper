import { Button } from "@/components/ui/button";

interface PricingSectionProps {
  className?: string;
  onBookDemo?: () => void;
  onSeePlatform?: () => void;
}

export function PricingSection({ className, onBookDemo, onSeePlatform }: PricingSectionProps) {
  return (
    <div className={className}>
      <div className="rounded-2xl border border-primary/20 bg-card p-7 sm:p-10 max-w-2xl mx-auto text-center shadow-lg">
        <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug max-w-md mx-auto">
          Better control is not optional in hospitality. It is how you protect margin, standards and management time.
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mt-3">
          UGLŌ is built for operators who need tighter workforce control and stronger day-to-day execution.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
          <Button className="gradient-primary w-full sm:w-auto shadow-sm hover:shadow-lg hover:brightness-105 active:scale-[0.97] transition-all duration-200 text-[15px] font-semibold px-10 h-12" size="lg" onClick={onBookDemo}>Book a demo</Button>
          <Button variant="outline" className="w-full sm:w-auto hover:bg-muted/50 active:scale-[0.97] transition-all duration-200 h-12" size="lg" onClick={onSeePlatform}>See the platform</Button>
        </div>
      </div>
    </div>
  );
}
