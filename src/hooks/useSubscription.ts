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
  price_per_employee_monthly: number;
  price_per_employee_annual: number;
  currency: string;
  billing_model: string;
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
        price_per_employee_monthly: p.price_per_employee_monthly ?? 0,
        price_per_employee_annual: p.price_per_employee_annual ?? 0,
        currency: p.currency ?? "EUR",
        billing_model: p.billing_model ?? "per_employee",
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
              price_per_employee_monthly: (data.subscription_plans as any).price_per_employee_monthly ?? 0,
              price_per_employee_annual: (data.subscription_plans as any).price_per_employee_annual ?? 0,
              currency: (data.subscription_plans as any).currency ?? "EUR",
              billing_model: (data.subscription_plans as any).billing_model ?? "per_employee",
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
 * Check if the current tenant is a founding partner with active benefits.
 */
export function useFoundingPartner() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["founding-partner", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("founding_partner, founding_partner_expires_at")
        .eq("id", tenantId!)
        .single();
      if (error) throw error;

      const isFoundingPartner = !!(data as any)?.founding_partner;
      const expiresAt = (data as any)?.founding_partner_expires_at
        ? new Date((data as any).founding_partner_expires_at)
        : null;
      const isActive = isFoundingPartner && (!expiresAt || expiresAt > new Date());
      const daysRemaining = expiresAt
        ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

      return { isFoundingPartner, isActive, expiresAt, daysRemaining };
    },
    enabled: !!tenantId,
  });
}

/**
 * Resolves the effective module entitlements for the current tenant.
 * Priority: founding partner → subscription plan modules → tenant-level overrides → defaults.
 */
export function useEntitlements() {
  const { enabledModules, tenantId, isPlatformAdmin } = useTenant();
  const { data: subscription } = useTenantSubscription();
  const { data: founding } = useFoundingPartner();

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
      isFoundingPartner: false,
      foundingDaysRemaining: null as number | null,
    };
  }

  // Founding partners get everything unlocked
  if (founding?.isActive) {
    return {
      scheduling: true,
      payroll: true,
      training: true,
      documents: true,
      analytics: true,
      planName: "Founding Partner",
      subscriptionStatus: "active" as string,
      isTrialExpired: false,
      isSuspended: false,
      isFoundingPartner: true,
      foundingDaysRemaining: founding.daysRemaining,
    };
  }

  // Resolve from subscription plan if available
  const planModules = subscription?.plan?.enabled_modules;
  const tenantOverrides = enabledModules;

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
    isFoundingPartner: founding?.isFoundingPartner ?? false,
    foundingDaysRemaining: founding?.daysRemaining ?? null,
  };
}
