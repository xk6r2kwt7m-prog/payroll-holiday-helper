import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Search, FileText, CreditCard, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TALENT_POOL_ROUTE } from "@/lib/routes";

export function TalentPoolWidget() {
  const { tenantId } = useTenant();

  // Visible talent profiles (public counts — no tenant leak)
  const { data: profileStats } = useQuery({
    queryKey: ["talent-pool-widget-stats", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_profiles")
        .select("talent_pool_status")
        .in("talent_pool_status", ["open_to_work", "available_now", "available_from_date"])
        .neq("visibility_mode", "hidden");

      if (error) throw error;
      const profiles = data || [];
      return {
        total: profiles.length,
        availableNow: profiles.filter(p => p.talent_pool_status === "available_now").length,
        openToWork: profiles.filter(p => p.talent_pool_status === "open_to_work").length,
      };
    },
    enabled: !!tenantId,
  });

  // Pending contact requests for this tenant
  const { data: pendingRequests = 0 } = useQuery({
    queryKey: ["talent-pool-widget-requests", tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count, error } = await supabase
        .from("talent_contact_unlocks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("candidate_response", "pending");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!tenantId,
  });

  const stats = [
    { label: "Visible", value: profileStats?.total ?? 0, color: "text-primary" },
    { label: "Available", value: profileStats?.availableNow ?? 0, color: "text-success" },
    { label: "Open", value: profileStats?.openToWork ?? 0, color: "text-accent" },
    { label: "Pending", value: pendingRequests, color: pendingRequests > 0 ? "text-warning" : "text-muted-foreground" },
  ];

  const actions = [
    { label: "View Talent", icon: Search, path: "/talent-pool?tab=browse", primary: true },
    { label: "Requests", icon: FileText, path: "/talent-pool?tab=requests", primary: false },
    { label: "Billing", icon: CreditCard, path: "/talent-pool?tab=billing", primary: false },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Talent Pool</h2>
        <Link to="/talent-pool?tab=browse" className="text-xs text-primary font-medium flex items-center gap-0.5">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-card border border-border p-2.5 text-center shadow-sm">
            <p className={cn("text-lg font-bold tabular-nums leading-none", s.color)}>{s.value}</p>
            <p className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            to={a.path}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]",
              a.primary
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-foreground hover:bg-muted/50"
            )}
          >
            <a.icon className="h-3.5 w-3.5" />
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
