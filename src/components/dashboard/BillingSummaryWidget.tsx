import { CreditCard, Users, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEntitlements, useTenantSubscription } from "@/hooks/useSubscription";
import { useEmployees } from "@/hooks/useEmployees";
import { cn } from "@/lib/utils";

export function BillingSummaryWidget() {
  const navigate = useNavigate();
  const entitlements = useEntitlements();
  const { data: subscription } = useTenantSubscription();
  const { data: employees = [] } = useEmployees();

  const activeCount = employees.filter(e => e.status === "active").length;
  const pricePerEmployee = subscription?.plan
    ? (subscription.plan as any).price_per_employee_monthly ?? 0
    : 0;
  const currency = (subscription?.plan as any)?.currency ?? "EUR";
  const estimatedCost = activeCount * pricePerEmployee;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Don't render if no plan info at all
  if (!entitlements.planName || entitlements.planName === "Platform Admin") return null;

  return (
    <div className="rounded-xl bg-card border border-border p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Subscription</h3>
            <p className="text-[10px] text-muted-foreground">Current plan & billing</p>
          </div>
        </div>
        <Badge
          variant={entitlements.isFoundingPartner ? "default" : "secondary"}
          className={cn(
            "text-[10px]",
            entitlements.isFoundingPartner && "bg-gradient-to-r from-primary to-accent text-primary-foreground border-0"
          )}
        >
          {entitlements.isFoundingPartner ? "⭐ Founding Partner" : entitlements.planName}
        </Badge>
      </div>

      {/* Founding partner banner */}
      {entitlements.isFoundingPartner && entitlements.foundingDaysRemaining !== null && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">
                All modules unlocked
              </p>
              <p className="text-[10px] text-muted-foreground">
                {entitlements.foundingDaysRemaining > 0
                  ? `${entitlements.foundingDaysRemaining} days remaining in founding partner programme`
                  : "Your founding partner period is ending soon"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center rounded-lg bg-muted/50 p-2.5">
          <p className="text-lg font-bold text-foreground tabular-nums">{activeCount}</p>
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Employees</p>
        </div>
        <div className="text-center rounded-lg bg-muted/50 p-2.5">
          <p className="text-lg font-bold text-foreground tabular-nums">
            {formatPrice(pricePerEmployee)}
          </p>
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">/Employee</p>
        </div>
        <div className="text-center rounded-lg bg-primary/5 border border-primary/10 p-2.5">
          <p className="text-lg font-bold text-primary tabular-nums">
            {entitlements.isFoundingPartner ? formatPrice(0) : formatPrice(estimatedCost)}
          </p>
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Est. /Month</p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs h-9"
        onClick={() => navigate("/settings?section=features")}
      >
        Manage Plan
        <ArrowRight className="h-3 w-3 ml-1.5" />
      </Button>
    </div>
  );
}
