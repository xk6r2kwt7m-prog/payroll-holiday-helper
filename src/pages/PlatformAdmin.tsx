import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTenant } from "@/hooks/useTenant";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Building2, Globe, Clock, CalendarDays, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { ModuleKey } from "@/components/ProtectedRoute";

const MODULE_LABELS: Record<ModuleKey, string> = {
  scheduling: "Scheduling",
  payroll: "Payroll & Leave",
  training: "Training & Compliance",
  documents: "Documents & Contracts",
  analytics: "Analytics & Reporting",
};

const PlatformAdmin = () => {
  const { isPlatformAdmin, loading } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isPlatformAdmin) {
      navigate("/", { replace: true });
    }
  }, [loading, isPlatformAdmin, navigate]);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["platform-admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, tenant_members(id, user_id, role, is_active)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isPlatformAdmin,
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
    onError: (err: any) => {
      toast.error(err.message || "Failed to update modules");
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

  if (loading || !isPlatformAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Administration</h1>
          <p className="text-muted-foreground">Overview of all tenant workspaces · {tenants?.length || 0} companies</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {tenants?.map((tenant: any) => {
              const adminMembers = tenant.tenant_members?.filter(
                (m: any) => m.role === "company_admin" && m.is_active
              ) || [];
              const totalMembers = tenant.tenant_members?.filter((m: any) => m.is_active)?.length || 0;
              const isExpanded = expandedTenant === tenant.id;
              const modules = tenant.enabled_modules || {};

              return (
                <div
                  key={tenant.id}
                  className="rounded-xl bg-card shadow-card border border-border overflow-hidden"
                >
                  {/* Header */}
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
                        <Badge
                          variant={tenant.status === "active" ? "default" : "secondary"}
                          className="w-fit"
                        >
                          {tenant.status}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <span>{tenant.country || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{tenant.timezone || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <span>{format(new Date(tenant.created_at), "dd MMM yyyy")}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">{totalMembers}</span> members
                        {adminMembers.length > 0 && (
                          <span> · {adminMembers.length} admin{adminMembers.length > 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4 space-y-4">
                      {/* Module toggles */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Settings2 className="h-4 w-4 text-primary" />
                          <h4 className="font-medium text-card-foreground text-sm">Enabled Modules</h4>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(Object.keys(MODULE_LABELS) as ModuleKey[]).map((mod) => (
                            <div
                              key={mod}
                              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                            >
                              <span className="text-sm text-card-foreground">{MODULE_LABELS[mod]}</span>
                              <Switch
                                checked={modules[mod] !== false}
                                onCheckedChange={(checked) => {
                                  const updated = { ...modules, [mod]: checked };
                                  updateModules.mutate({ tenantId: tenant.id, modules: updated });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status control */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Tenant status:</span>
                        {tenant.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => updateStatus.mutate({ tenantId: tenant.id, status: "suspended" })}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary"
                            onClick={() => updateStatus.mutate({ tenantId: tenant.id, status: "active" })}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {tenants?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No tenants found.
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PlatformAdmin;
