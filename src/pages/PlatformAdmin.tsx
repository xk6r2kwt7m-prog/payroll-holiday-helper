import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTenant } from "@/hooks/useTenant";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Globe, Clock, CalendarDays } from "lucide-react";
import { format } from "date-fns";

const PlatformAdmin = () => {
  const { isPlatformAdmin, loading } = useTenant();
  const navigate = useNavigate();

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
          <p className="text-muted-foreground">Overview of all tenant workspaces</p>
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

              return (
                <div
                  key={tenant.id}
                  className="rounded-xl bg-card shadow-card p-5 border border-border"
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
                    <Badge
                      variant={tenant.status === "active" ? "default" : "secondary"}
                      className="w-fit"
                    >
                      {tenant.status}
                    </Badge>
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
