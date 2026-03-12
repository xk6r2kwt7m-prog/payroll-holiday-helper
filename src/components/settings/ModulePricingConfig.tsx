import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, DollarSign, Users, FileText, BarChart3, GraduationCap,
  CalendarClock, ClipboardCheck, CreditCard, Lock, Check, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionPlans, useTenantSubscription, useEntitlements } from "@/hooks/useSubscription";
import { useEmployees } from "@/hooks/useEmployees";
import { PlanUpgradeDialog } from "@/components/PlanUpgradeDialog";

const MODULE_ICONS: Record<string, any> = {
  scheduling: CalendarClock,
  payroll: DollarSign,
  training: GraduationCap,
  documents: FileText,
  analytics: BarChart3,
};

export function ModulePricingConfig() {
  const { data: plans = [] } = useSubscriptionPlans();
  const { data: subscription } = useTenantSubscription();
  const entitlements = useEntitlements();
  const { data: employees = [] } = useEmployees();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const activeCount = employees.filter(e => e.status === "active").length;
  const currentPlan = subscription?.plan;
  const pricePerEmp = currentPlan?.price_per_employee_monthly ?? 0;
  const currency = currentPlan?.currency ?? "EUR";
  const estimated = activeCount * pricePerEmp;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);

  return (
    <div className="space-y-4">
      {/* Current plan summary */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {entitlements.isFoundingPartner ? "Founding Partner" : currentPlan?.name || "No Plan"}
            </span>
          </div>
          {entitlements.isFoundingPartner && (
            <Badge className="text-[9px] bg-gradient-to-r from-primary to-accent text-primary-foreground border-0">
              <Sparkles className="h-2.5 w-2.5 mr-1" />
              All Modules
            </Badge>
          )}
        </div>

        {!entitlements.isFoundingPartner && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-background p-2">
              <p className="text-sm font-bold text-foreground tabular-nums">{activeCount}</p>
              <p className="text-[9px] text-muted-foreground">Employees</p>
            </div>
            <div className="rounded-md bg-background p-2">
              <p className="text-sm font-bold text-foreground tabular-nums">{formatPrice(pricePerEmp)}</p>
              <p className="text-[9px] text-muted-foreground">/Emp/Mo</p>
            </div>
            <div className="rounded-md bg-background p-2">
              <p className="text-sm font-bold text-primary tabular-nums">{formatPrice(estimated)}</p>
              <p className="text-[9px] text-muted-foreground">Est. Monthly</p>
            </div>
          </div>
        )}
      </div>

      {/* Module access list */}
      <div className="space-y-2">
        {(["scheduling", "payroll", "training", "documents", "analytics"] as const).map((mod) => {
          const Icon = MODULE_ICONS[mod] || Lock;
          const enabled = (entitlements as any)[mod] === true;
          const label = mod.charAt(0).toUpperCase() + mod.slice(1);

          return (
            <div
              key={mod}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                enabled ? "border-primary/30 bg-primary/5" : "border-border bg-card"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                enabled ? "bg-primary/10" : "bg-muted"
              )}>
                <Icon className={cn("h-4 w-4", enabled ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
              </div>
              {enabled ? (
                <Check className="h-4 w-4 text-success shrink-0" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Available plans */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Available Plans</p>
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentPlan?.slug;
          return (
            <div
              key={plan.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                isCurrent ? "border-primary/30 bg-primary/5" : "border-border"
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{plan.name}</p>
                  {isCurrent && <Badge variant="secondary" className="text-[9px]">Current</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{plan.description}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {formatPrice(plan.price_per_employee_monthly)}
                </span>
                <span className="text-[9px] text-muted-foreground block">/emp/mo</span>
              </div>
            </div>
          );
        })}
      </div>

      <Button size="sm" className="w-full" onClick={() => setUpgradeOpen(true)}>
        {currentPlan ? "Change Plan" : "Select a Plan"}
      </Button>

      <div className="rounded-lg bg-muted/30 border border-border p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>Billing integration with Stripe coming soon. Plan changes are recorded for future invoicing.</span>
        </div>
      </div>

      <PlanUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
