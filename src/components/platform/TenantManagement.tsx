import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Globe, Clock, CalendarDays, ChevronDown, ChevronUp, Settings2, CreditCard, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { ModuleKey } from "@/components/ProtectedRoute";
import { useSubscriptionPlans } from "@/hooks/useSubscription";

const MODULE_LABELS: Record<ModuleKey, string> = {
  scheduling: "Scheduling",
  payroll: "Payroll & Leave",
  training: "Training & Compliance",
  documents: "Documents & Contracts",
  analytics: "Analytics & Reporting",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  trial: "bg-amber-500/10 text-amber-700 border-amber-200",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  pending_setup: "bg-blue-500/10 text-blue-700 border-blue-200",
};

export function TenantManagement() {
  const queryClient = useQueryClient();
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const { data: plans } = useSubscriptionPlans();

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["platform-admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_members(id, user_id, role, is_active), tenant_subscriptions(id, status, billing_cycle, plan_id, subscription_plans(name, slug))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateModules = useMutation({
    mutationFn: async ({ tenantId, modules }: { tenantId: string; modules: Record<string, boolean> }) => {
      const { error } = await supabase
        .from("tenants")
        .update({ enabled_modules: modules } as any)
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-tenants"] });
      toast.success("Modules updated");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ tenantId, status }: { tenantId: string; status: string }) => {
      const { error } = await supabase
        .from("tenants")
        .update({ status } as any)
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-tenants"] });
      toast.success("Tenant status updated");
    },
  });

  const assignPlan = useMutation({
    mutationFn: async ({ tenantId, planId }: { tenantId: string; planId: string }) => {
      // Upsert subscription
      const { error } = await supabase
        .from("tenant_subscriptions")
        .upsert(
          {
            tenant_id: tenantId,
            plan_id: planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: "tenant_id" }
        );
      if (error) throw error;

      // Update tenant enabled_modules to match plan
      const plan = plans?.find((p) => p.id === planId);
      if (plan) {
        await supabase
          .from("tenants")
          .update({ enabled_modules: plan.enabled_modules } as any)
          .eq("id", tenantId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admin-tenants"] });
      toast.success("Plan assigned");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tenants?.map((tenant: any) => {
        const totalMembers = tenant.tenant_members?.filter((m: any) => m.is_active)?.length || 0;
        const isExpanded = expandedTenant === tenant.id;
        const modules = tenant.enabled_modules || {};
        const sub = tenant.tenant_subscriptions?.[0];
        const planName = sub?.subscription_plans?.name;

        return (
          <div key={tenant.id} className="rounded-xl bg-card shadow-card border border-border overflow-hidden">
            <button
              onClick={() => setExpandedTenant(isExpanded ? null : tenant.id)}
              className="w-full p-5 text-left"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">{tenant.name}</h3>
                    <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {planName && (
                    <Badge variant="outline" className="text-xs">
                      <CreditCard className="h-3 w-3 mr-1" />
                      {planName}
                    </Badge>
                  )}
                  <Badge className={`w-fit border ${STATUS_COLORS[tenant.status] || ""}`} variant="outline">
                    {tenant.status}
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" /><span>{tenant.country || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /><span>{tenant.timezone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /><span>{format(new Date(tenant.created_at), "dd MMM yyyy")}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /><span>{totalMembers} members</span>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border px-5 py-4 space-y-4">
                {/* Plan Assignment */}
                <div>
                  <h4 className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Subscription Plan
                  </h4>
                  <Select
                    value={sub?.plan_id || ""}
                    onValueChange={(planId) => assignPlan.mutate({ tenantId: tenant.id, planId })}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Assign a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — £{p.price_monthly}/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Module Toggles */}
                <div>
                  <h4 className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" /> Module Overrides
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((mod) => (
                      <div key={mod} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                        <span className="text-sm text-card-foreground">{MODULE_LABELS[mod]}</span>
                        <Switch
                          checked={modules[mod] !== false}
                          onCheckedChange={(checked) => {
                            updateModules.mutate({ tenantId: tenant.id, modules: { ...modules, [mod]: checked } });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Set status:</span>
                  {["active", "trial", "suspended", "cancelled"].map((s) => (
                    <Button
                      key={s}
                      variant={tenant.status === s ? "default" : "outline"}
                      size="sm"
                      className="capitalize"
                      disabled={tenant.status === s}
                      onClick={() => updateStatus.mutate({ tenantId: tenant.id, status: s })}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {tenants?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No tenants found.</div>
      )}
    </div>
  );
}
