import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";

export function PlatformOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["platform-overview-stats"],
    queryFn: async () => {
      const [tenantsRes, membersRes, subsRes] = await Promise.all([
        supabase.from("tenants").select("id, status, created_at"),
        supabase.from("tenant_members").select("id, tenant_id, is_active"),
        supabase.from("tenant_subscriptions").select("id, status, plan_id, subscription_plans(name)"),
      ]);

      const tenants = tenantsRes.data || [];
      const members = membersRes.data || [];
      const subs = subsRes.data || [];

      const active = tenants.filter((t) => t.status === "active").length;
      const trial = tenants.filter((t) => t.status === "trial").length;
      const suspended = tenants.filter((t) => t.status === "suspended").length;
      const activeUsers = members.filter((m) => m.is_active).length;

      const planDist: Record<string, number> = {};
      subs.forEach((s: any) => {
        const name = s.subscription_plans?.name || "No Plan";
        planDist[name] = (planDist[name] || 0) + 1;
      });

      // Recent tenants (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentTenants = tenants.filter(
        (t) => new Date(t.created_at) > thirtyDaysAgo
      ).length;

      return {
        total: tenants.length,
        active,
        trial,
        suspended,
        activeUsers,
        recentTenants,
        planDistribution: planDist,
        tenantsWithoutSub: tenants.length - subs.length,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Companies", value: stats?.total || 0, icon: Building2, color: "text-primary" },
    { label: "Active", value: stats?.active || 0, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Trial", value: stats?.trial || 0, icon: Clock, color: "text-amber-500" },
    { label: "Suspended", value: stats?.suspended || 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Active Users", value: stats?.activeUsers || 0, icon: Users, color: "text-primary" },
    { label: "New (30 days)", value: stats?.recentTenants || 0, icon: Building2, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan Distribution */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Plan Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats?.planDistribution || {}).map(([plan, count]) => (
              <div key={plan} className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium text-card-foreground">{plan}</p>
                <p className="text-xl font-bold text-primary">{count as number}</p>
              </div>
            ))}
            {(stats?.tenantsWithoutSub || 0) > 0 && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium text-muted-foreground">No Plan</p>
                <p className="text-xl font-bold text-muted-foreground">{stats?.tenantsWithoutSub}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
