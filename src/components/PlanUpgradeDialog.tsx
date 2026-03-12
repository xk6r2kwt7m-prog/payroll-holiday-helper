import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { useSubscriptionPlans, useTenantSubscription, type SubscriptionPlan } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlanUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightModule?: string;
}

export function PlanUpgradeDialog({ open, onOpenChange, highlightModule }: PlanUpgradeDialogProps) {
  const { data: plans = [] } = useSubscriptionPlans();
  const { data: currentSub } = useTenantSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const currentPlanSlug = currentSub?.plan?.slug;

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan.id);
    toast.success(`Plan "${plan.name}" selected. Billing integration coming soon.`);
    onOpenChange(false);
  };

  const formatPrice = (plan: SubscriptionPlan) => {
    const currency = plan.currency || "EUR";
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(plan.price_per_employee_monthly);
  };

  // Find which plan includes the highlighted module
  const getModuleAvailable = (plan: SubscriptionPlan) => {
    if (!highlightModule) return false;
    return plan.enabled_modules?.[highlightModule] === true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Choose Your Plan</DialogTitle>
          <DialogDescription className="text-xs">
            {highlightModule
              ? `Upgrade to access the ${highlightModule} module and more.`
              : "Select the plan that best fits your team."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = plan.slug === currentPlanSlug;
            const hasModule = getModuleAvailable(plan);

            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-xl border p-4 space-y-3 transition-all",
                  isCurrent && "border-primary/50 bg-primary/5",
                  hasModule && !isCurrent && "border-accent/50 ring-1 ring-accent/30",
                  !isCurrent && !hasModule && "border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                  {isCurrent && <Badge variant="secondary" className="text-[9px]">Current</Badge>}
                  {hasModule && !isCurrent && (
                    <Badge className="text-[9px] bg-accent text-accent-foreground">
                      <Sparkles className="h-2.5 w-2.5 mr-1" />
                      Includes {highlightModule}
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">{plan.description}</p>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    {formatPrice(plan)}
                  </span>
                  <span className="text-xs text-muted-foreground">/employee/mo</span>
                </div>

                <ul className="space-y-1.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                      <Check className="h-3 w-3 text-success mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="sm"
                  className="w-full text-xs h-9"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isCurrent ? "Current Plan" : "Select Plan"}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
