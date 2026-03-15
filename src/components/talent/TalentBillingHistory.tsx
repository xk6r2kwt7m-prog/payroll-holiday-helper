import { Coins, Clock, CreditCard, ArrowDown, ArrowUp, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTalentBillingSummary } from "@/hooks/useTalentBilling";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-200",
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-blue-500/10 text-blue-700 border-blue-200",
  expired: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

const RESPONSE_LABELS: Record<string, string> = {
  pending: "Awaiting Response",
  accepted: "Accepted",
  ignored: "No Response",
  blocked: "Blocked",
  expired: "Expired",
};

export function TalentBillingHistory() {
  const { data, isLoading } = useTalentBillingSummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Coins className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{data.balance}</p>
            <p className="text-[10px] text-muted-foreground">Credits Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{data.activeUnlocks}</p>
            <p className="text-[10px] text-muted-foreground">Active Unlocks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{data.totalPurchased}</p>
            <p className="text-[10px] text-muted-foreground">Total Purchased</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{data.totalUsed}</p>
            <p className="text-[10px] text-muted-foreground">Credits Used</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="purchases">
        <TabsList className="w-full h-8">
          <TabsTrigger value="purchases" className="text-xs flex-1">Purchases</TabsTrigger>
          <TabsTrigger value="unlocks" className="text-xs flex-1">Unlocks</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs flex-1">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-3 space-y-2">
          {data.purchases.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No purchases yet</p>
          ) : (
            data.purchases.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{p.credits_purchased} credits</p>
                      <Badge variant="outline" className={cn("text-[10px] h-4", STATUS_STYLES[p.status])}>
                        {p.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {fmt(p.created_at)} · {p.credits_remaining} remaining · Expires {fmt(p.expires_at)}
                    </p>
                  </div>
                  <p className="text-sm font-bold shrink-0">£{p.price_paid.toFixed(2)}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="unlocks" className="mt-3 space-y-2">
          {data.unlocks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No unlocks yet</p>
          ) : (
            data.unlocks.map((u) => (
              <Card key={u.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium font-mono truncate">{u.talent_profile_id.slice(0, 8)}…</p>
                      <p className="text-[10px] text-muted-foreground">
                        {fmt(u.created_at)} · Expires {fmt(u.expires_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] h-4", STATUS_STYLES[u.candidate_response] || "")}>
                      {RESPONSE_LABELS[u.candidate_response] || u.candidate_response}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-3 space-y-1.5">
          {data.ledger.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No ledger entries</p>
          ) : (
            data.ledger.map((e) => (
              <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card text-xs">
                {e.amount > 0 ? (
                  <ArrowDown className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{e.reason || e.entry_type}</p>
                  <p className="text-[10px] text-muted-foreground">{fmt(e.created_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("font-bold", e.amount > 0 ? "text-emerald-600" : "text-destructive")}>
                    {e.amount > 0 ? "+" : ""}{e.amount}
                  </p>
                  <p className="text-[10px] text-muted-foreground">bal: {e.balance_after}</p>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
