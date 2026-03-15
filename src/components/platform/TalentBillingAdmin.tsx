import { useState } from "react";
import { Loader2, Search, CreditCard, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminBillingOverview, useFinalisePurchase } from "@/hooks/useTalentBilling";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700",
  paid: "bg-emerald-500/10 text-emerald-700",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-blue-500/10 text-blue-700",
  expired: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-700",
};

export function TalentBillingAdmin() {
  const { data, isLoading, refetch } = useAdminBillingOverview();
  const finalise = useFinalisePurchase();
  const [search, setSearch] = useState("");

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const handleFinalise = async (purchaseId: string, status: "paid" | "failed" | "cancelled" | "refunded") => {
    try {
      const result = await finalise.mutateAsync({ purchaseId, status });
      if (result.already_processed) {
        toast.info("Already processed — no changes made");
      } else {
        toast.success(`Purchase marked as ${status}`);
      }
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to update purchase");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const filteredPurchases = data.purchases.filter((p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.company_name?.toLowerCase().includes(s) || p.status?.includes(s) || p.tenant_id?.includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by company, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs defaultValue="purchases">
        <TabsList className="w-full h-8">
          <TabsTrigger value="purchases" className="text-xs flex-1">Purchases ({data.purchases.length})</TabsTrigger>
          <TabsTrigger value="unlocks" className="text-xs flex-1">Unlocks ({data.unlocks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-3 space-y-2 max-h-[60vh] overflow-y-auto">
          {filteredPurchases.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.company_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.credits_purchased} credits · £{p.price_paid.toFixed(2)} · {fmt(p.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={cn("text-[10px] h-4", STATUS_STYLES[p.status])}>
                      {p.status}
                    </Badge>
                    {p.payment_method === "test" && (
                      <Badge variant="outline" className="text-[10px] h-4 bg-amber-500/10 text-amber-700">test</Badge>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Remaining: {p.credits_remaining}/{p.credits_purchased} · Expires: {fmt(p.expires_at)}
                </div>
                {p.status === "pending" && (
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => handleFinalise(p.id, "paid")}
                      disabled={finalise.isPending}
                    >
                      ✓ Mark Paid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px]"
                      onClick={() => handleFinalise(p.id, "failed")}
                      disabled={finalise.isPending}
                    >
                      ✗ Failed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px]"
                      onClick={() => handleFinalise(p.id, "cancelled")}
                      disabled={finalise.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                {p.status === "paid" && (
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 text-[10px]"
                      onClick={() => handleFinalise(p.id, "refunded")}
                      disabled={finalise.isPending}
                    >
                      Refund
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="unlocks" className="mt-3 space-y-2 max-h-[60vh] overflow-y-auto">
          {data.unlocks.map((u: any) => (
            <Card key={u.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{u.company_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Profile: {u.talent_profile_id.slice(0, 8)}… · {fmt(u.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] h-4", STATUS_STYLES[u.candidate_response] || "")}>
                    {u.candidate_response}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Expires: {fmt(u.expires_at)}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
