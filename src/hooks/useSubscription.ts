import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_annual: number;
  max_employees: number | null;
  max_locations: number | null;
  enabled_modules: Record<string, boolean>;
  features: string[];
  sort_order: number;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  plan?: SubscriptionPlan;
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        enabled_modules: p.enabled_modules || {},
        features: Array.isArray(p.features) ? p.features : [],
      })) as SubscriptionPlan[];
    },
  });
}

export function useTenantSubscription() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["tenant-subscription", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        plan: data.subscription_plans
          ? {
              ...data.subscription_plans,
              enabled_modules: (data.subscription_plans as any).enabled_modules || {},
              features: Array.isArray((data.subscription_plans as any).features)
                ? (data.subscription_plans as any).features
                : [],
            }
          : undefined,
      } as TenantSubscription;
    },
    enabled: !!tenantId,
  });
}

/**
 * Resolves the effective module entitlements for the current tenant.
 * Priority: subscription plan modules → tenant-level overrides → defaults.
 */
export function useEntitlements() {
  const { enabledModules, tenantId, isPlatformAdmin } = useTenant();
  const { data: subscription } = useTenantSubscription();

  // If platform admin, everything is enabled
  if (isPlatformAdmin) {
    return {
      scheduling: true,
      payroll: true,
      training: true,
      documents: true,
      analytics: true,
      planName: "Platform Admin",
      subscriptionStatus: "active" as string,
      isTrialExpired: false,
      isSuspended: false,
    };
  }

  // Resolve from subscription plan if available
  const planModules = subscription?.plan?.enabled_modules;
  const tenantOverrides = enabledModules;

  // Merge: plan modules as base, tenant overrides can only ADD, not remove
  const resolved = {
    scheduling: planModules?.scheduling ?? tenantOverrides?.scheduling ?? true,
    payroll: planModules?.payroll ?? tenantOverrides?.payroll ?? false,
    training: planModules?.training ?? tenantOverrides?.training ?? false,
    documents: planModules?.documents ?? tenantOverrides?.documents ?? false,
    analytics: planModules?.analytics ?? tenantOverrides?.analytics ?? false,
  };

  const now = new Date();
  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const isTrialExpired = subscription?.status === "trial" && trialEndsAt ? now > trialEndsAt : false;
  const isSuspended = subscription?.status === "suspended";

  return {
    ...resolved,
    planName: subscription?.plan?.name || "No Plan",
    subscriptionStatus: subscription?.status || "none",
    isTrialExpired,
    isSuspended,
  };
}
