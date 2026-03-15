import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface CreditLedgerEntry {
  id: string;
  tenant_id: string;
  purchase_id: string | null;
  unlock_id: string | null;
  entry_type: string;
  amount: number;
  balance_after: number;
  reason: string | null;
  created_at: string;
}

export interface PurchaseRecord {
  id: string;
  tenant_id: string;
  pack_id: string;
  credits_purchased: number;
  credits_remaining: number;
  price_paid: number;
  price_currency: string;
  status: string;
  payment_method: string | null;
  purchased_by: string;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
}

export interface UnlockRecord {
  id: string;
  tenant_id: string;
  talent_profile_id: string;
  conversation_id: string | null;
  candidate_response: string;
  expires_at: string;
  created_at: string;
}

// Tenant billing summary
export function useTalentBillingSummary() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["talent-billing-summary", tenantId],
    queryFn: async () => {
      const [walletRes, purchasesRes, unlocksRes, ledgerRes] = await Promise.all([
        supabase
          .from("talent_credit_wallets")
          .select("balance")
          .eq("tenant_id", tenantId!)
          .maybeSingle(),
        supabase
          .from("talent_credit_purchases")
          .select("id, credits_purchased, credits_remaining, price_paid, price_currency, status, payment_method, expires_at, paid_at, created_at")
          .eq("tenant_id", tenantId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("talent_contact_unlocks")
          .select("id, talent_profile_id, conversation_id, candidate_response, expires_at, created_at")
          .eq("tenant_id", tenantId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("talent_credit_ledger")
          .select("id, entry_type, amount, balance_after, reason, purchase_id, unlock_id, created_at")
          .eq("tenant_id", tenantId!)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const purchases = (purchasesRes.data || []) as PurchaseRecord[];
      const unlocks = (unlocksRes.data || []) as UnlockRecord[];
      const ledger = (ledgerRes.data || []) as CreditLedgerEntry[];

      const totalPurchased = purchases.reduce((s, p) => s + (["paid", "expired", "refunded"].includes(p.status) ? p.credits_purchased : 0), 0);
      const totalUsed = ledger.filter(e => e.entry_type === "credit_consumed").length;
      const totalExpired = Math.abs(ledger.filter(e => e.entry_type === "credit_expired").reduce((s, e) => s + e.amount, 0));
      const activeUnlocks = unlocks.filter(u => new Date(u.expires_at) > new Date() && !["blocked", "expired"].includes(u.candidate_response)).length;

      return {
        balance: walletRes.data?.balance || 0,
        totalPurchased,
        totalUsed,
        totalExpired,
        activeUnlocks,
        purchases,
        unlocks,
        ledger: (ledgerRes.data || []) as CreditLedgerEntry[],
      };
    },
    enabled: !!tenantId,
  });
}

// Purchase credits (creates pending)
export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (packId: string) => {
      const { data, error } = await supabase.rpc("purchase_talent_credits", {
        _pack_id: packId,
      });
      if (error) throw error;
      return data as { purchase_id: string; status: string; credits: number; price: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["talent-billing-summary"] });
      qc.invalidateQueries({ queryKey: ["talent-credit-wallet"] });
    },
  });
}

// Finalise purchase (test mode: pending → paid)
export function useFinalisePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ purchaseId, status }: { purchaseId: string; status: "paid" | "failed" | "cancelled" | "refunded" }) => {
      const { data, error } = await supabase.rpc("finalise_talent_purchase", {
        _purchase_id: purchaseId,
        _new_status: status,
      });
      if (error) throw error;
      return data as { purchase_id: string; status: string; credits_added?: number; wallet_balance?: number; already_processed?: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["talent-billing-summary"] });
      qc.invalidateQueries({ queryKey: ["talent-credit-wallet"] });
      qc.invalidateQueries({ queryKey: ["talent-credit-purchases"] });
    },
  });
}

// Admin: all tenant billing (platform admin only)
export function useAdminBillingOverview() {
  return useQuery({
    queryKey: ["admin-talent-billing"],
    queryFn: async () => {
      const [purchasesRes, unlocksRes] = await Promise.all([
        supabase
          .from("talent_credit_purchases")
          .select("id, tenant_id, credits_purchased, credits_remaining, price_paid, price_currency, status, payment_method, expires_at, paid_at, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("talent_contact_unlocks")
          .select("id, tenant_id, talent_profile_id, candidate_response, expires_at, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      // Get tenant names
      const tenantIds = [...new Set([
        ...(purchasesRes.data || []).map((p: any) => p.tenant_id),
        ...(unlocksRes.data || []).map((u: any) => u.tenant_id),
      ])];

      let tenantMap: Record<string, string> = {};
      if (tenantIds.length > 0) {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("tenant_id, company_name")
          .in("tenant_id", tenantIds);
        tenantMap = Object.fromEntries((settings || []).map((s: any) => [s.tenant_id, s.company_name]));
      }

      return {
        purchases: (purchasesRes.data || []).map((p: any) => ({ ...p, company_name: tenantMap[p.tenant_id] || "Unknown" })),
        unlocks: (unlocksRes.data || []).map((u: any) => ({ ...u, company_name: tenantMap[u.tenant_id] || "Unknown" })),
      };
    },
  });
}
