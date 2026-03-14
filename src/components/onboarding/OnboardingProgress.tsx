import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="flex items-center gap-1.5 w-full max-w-xs mx-auto">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex-1 flex items-center gap-1.5">
          <div
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-500",
              i < currentStep
                ? "bg-primary"
                : i === currentStep
                ? "bg-primary/60"
                : "bg-muted"
            )}
          />
        </div>
      ))}
    </div>
  );
}
