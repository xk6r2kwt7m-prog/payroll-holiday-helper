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
  plan_version: number;
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
  price_locked: boolean;
  locked_price_per_employee: number | null;
  locked_currency: string | null;
  plan_version_at_signup: number | null;
  grace_period_days: number;
  payment_due_date: string | null;
  last_payment_at: string | null;
  plan?: SubscriptionPlan;
}

export type BillingStatus = "active" | "trial" | "past_due" | "restricted" | "suspended" | "cancelled";

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .is("superseded_by", null) // Only show latest versions
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        price_per_employee_monthly: p.price_per_employee_monthly ?? 0,
        price_per_employee_annual: p.price_per_employee_annual ?? 0,
        currency: p.currency ?? "EUR",
        billing_model: p.billing_model ?? "per_employee",
        plan_version: p.plan_version ?? 1,
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

      const sub: TenantSubscription = {
        ...data,
        price_locked: (data as any).price_locked ?? false,
        locked_price_per_employee: (data as any).locked_price_per_employee ?? null,
        locked_currency: (data as any).locked_currency ?? null,
        plan_version_at_signup: (data as any).plan_version_at_signup ?? null,
        grace_period_days: (data as any).grace_period_days ?? 7,
        payment_due_date: (data as any).payment_due_date ?? null,
        last_payment_at: (data as any).last_payment_at ?? null,
        plan: data.subscription_plans
          ? {
              ...(data.subscription_plans as any),
              price_per_employee_monthly: (data.subscription_plans as any).price_per_employee_monthly ?? 0,
              price_per_employee_annual: (data.subscription_plans as any).price_per_employee_annual ?? 0,
              currency: (data.subscription_plans as any).currency ?? "EUR",
              billing_model: (data.subscription_plans as any).billing_model ?? "per_employee",
              plan_version: (data.subscription_plans as any).plan_version ?? 1,
              enabled_modules: (data.subscription_plans as any).enabled_modules || {},
              features: Array.isArray((data.subscription_plans as any).features)
                ? (data.subscription_plans as any).features
                : [],
            }
          : undefined,
      };
      return sub;
    },
    enabled: !!tenantId,
  });
}

/**
 * Returns the effective price per employee for a tenant,
 * respecting price_locked (grandfathered) pricing.
 */
export function useEffectivePrice() {
  const { data: subscription } = useTenantSubscription();

  if (!subscription) return { pricePerEmployee: 0, currency: "EUR", isLocked: false, planVersion: 1 };

  // If price is locked (grandfathered), use locked price
  if (subscription.price_locked && subscription.locked_price_per_employee != null) {
    return {
      pricePerEmployee: subscription.locked_price_per_employee,
      currency: subscription.locked_currency || subscription.plan?.currency || "EUR",
      isLocked: true,
      planVersion: subscription.plan_version_at_signup || subscription.plan?.plan_version || 1,
    };
  }

  return {
    pricePerEmployee: subscription.plan?.price_per_employee_monthly ?? 0,
    currency: subscription.plan?.currency ?? "EUR",
    isLocked: false,
    planVersion: subscription.plan?.plan_version ?? 1,
  };
}

/**
 * Determines the billing account status including grace period logic.
 */
export function useBillingStatus(): { status: BillingStatus; daysOverdue: number; graceRemaining: number } {
  const { data: subscription } = useTenantSubscription();

  if (!subscription) return { status: "active", daysOverdue: 0, graceRemaining: 0 };

  const subStatus = subscription.status as BillingStatus;
  if (subStatus === "suspended" || subStatus === "cancelled") {
    return { status: subStatus, daysOverdue: 0, graceRemaining: 0 };
  }

  // Check grace period
  if (subscription.payment_due_date) {
    const dueDate = new Date(subscription.payment_due_date);
    const now = new Date();
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const graceDays = subscription.grace_period_days || 7;
    const graceRemaining = Math.max(0, graceDays - daysOverdue);

    if (daysOverdue > 0 && graceRemaining > 0) {
      return { status: "past_due", daysOverdue, graceRemaining };
    }
    if (daysOverdue > 0 && graceRemaining <= 0) {
      return { status: "restricted", daysOverdue, graceRemaining: 0 };
    }
  }

  return { status: subStatus || "active", daysOverdue: 0, graceRemaining: 0 };
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
 * Check plan limits against current usage.
 */
export function usePlanLimits() {
  const { data: subscription } = useTenantSubscription();
  const { data: founding } = useFoundingPartner();

  const maxEmployees = subscription?.plan?.max_employees ?? null;
  const maxLocations = subscription?.plan?.max_locations ?? null;

  // Founding partners have no limits
  if (founding?.isActive) {
    return {
      maxEmployees: null,
      maxLocations: null,
      hasEmployeeLimit: false,
      hasLocationLimit: false,
    };
  }

  return {
    maxEmployees,
    maxLocations,
    hasEmployeeLimit: maxEmployees !== null,
    hasLocationLimit: maxLocations !== null,
  };
}

/**
 * Resolves the effective module entitlements for the current tenant.
 * Priority: founding partner → subscription plan modules → tenant-level overrides → defaults.
 */
export function useEntitlements() {
  const { enabledModules, tenantId, isPlatformAdmin } = useTenant();
  const { data: subscription } = useTenantSubscription();
  const { data: founding } = useFoundingPartner();
  const billingStatus = useBillingStatus();

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
      billingStatus: "active" as BillingStatus,
      isTrialExpired: false,
      isSuspended: false,
      isFoundingPartner: false,
      foundingDaysRemaining: null as number | null,
      planVersion: 1,
      priceLocked: false,
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
      billingStatus: "active" as BillingStatus,
      isTrialExpired: false,
      isSuspended: false,
      isFoundingPartner: true,
      foundingDaysRemaining: founding.daysRemaining,
      planVersion: subscription?.plan?.plan_version ?? 1,
      priceLocked: subscription?.price_locked ?? false,
    };
  }

  // If billing is restricted, limit to basic modules only
  if (billingStatus.status === "restricted") {
    return {
      scheduling: true,
      payroll: false,
      training: false,
      documents: false,
      analytics: false,
      planName: subscription?.plan?.name || "Restricted",
      subscriptionStatus: subscription?.status || "restricted",
      billingStatus: billingStatus.status,
      isTrialExpired: false,
      isSuspended: false,
      isFoundingPartner: founding?.isFoundingPartner ?? false,
      foundingDaysRemaining: founding?.daysRemaining ?? null,
      planVersion: subscription?.plan?.plan_version ?? 1,
      priceLocked: subscription?.price_locked ?? false,
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
    billingStatus: billingStatus.status,
    isTrialExpired,
    isSuspended,
    isFoundingPartner: founding?.isFoundingPartner ?? false,
    foundingDaysRemaining: founding?.daysRemaining ?? null,
    planVersion: subscription?.plan?.plan_version ?? 1,
    priceLocked: subscription?.price_locked ?? false,
  };
}
