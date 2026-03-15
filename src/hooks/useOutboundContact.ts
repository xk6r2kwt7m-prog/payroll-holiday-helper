import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_amount: number;
  price_currency: string;
  validity_days: number;
}

export interface CreditWallet {
  id: string;
  tenant_id: string;
  balance: number;
}

export interface ContactUnlock {
  id: string;
  tenant_id: string;
  talent_profile_id: string;
  conversation_id: string | null;
  expires_at: string;
  candidate_response: string;
  candidate_responded_at: string | null;
  created_at: string;
  // joined
  company_name?: string;
}

// Credit packs catalog
export function useCreditPacks() {
  return useQuery({
    queryKey: ["talent-credit-packs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_credit_packs")
        .select("id, name, credits, price_amount, price_currency, validity_days")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as CreditPack[];
    },
  });
}

// Tenant's credit wallet
export function useCreditWallet() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["talent-credit-wallet", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_credit_wallets")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as CreditWallet | null;
    },
    enabled: !!tenantId,
  });
}

// Purchase credits
export function usePurchaseCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (packId: string) => {
      const { data, error } = await supabase.rpc("purchase_talent_credits", {
        _pack_id: packId,
      });
      if (error) throw error;
      return data as { purchase_id: string; credits_added: number; wallet_balance: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["talent-credit-wallet"] });
      qc.invalidateQueries({ queryKey: ["talent-credit-purchases"] });
    },
  });
}

// Unlock outbound contact
export function useUnlockContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      talentProfileId,
      introMessage,
    }: {
      talentProfileId: string;
      introMessage?: string;
    }) => {
      const { data, error } = await supabase.rpc("unlock_talent_contact", {
        _talent_profile_id: talentProfileId,
        _intro_message: introMessage || null,
      });
      if (error) throw error;
      return data as {
        unlock_id?: string;
        conversation_id?: string;
        already_unlocked?: boolean;
        candidate_response?: string;
        credits_remaining?: number;
        error?: string;
        balance?: number;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["talent-credit-wallet"] });
      qc.invalidateQueries({ queryKey: ["talent-contact-unlocks"] });
      qc.invalidateQueries({ queryKey: ["employer-conversations"] });
    },
  });
}

// Candidate responds to contact request
export function useRespondToContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      unlockId,
      response,
      blockReason,
    }: {
      unlockId: string;
      response: "accepted" | "ignored" | "blocked" | "reported";
      blockReason?: string;
    }) => {
      const { data, error } = await supabase.rpc("respond_to_contact_request", {
        _unlock_id: unlockId,
        _response: response,
        _block_reason: blockReason || null,
      });
      if (error) throw error;
      return data as { status: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker-contact-requests"] });
      qc.invalidateQueries({ queryKey: ["worker-conversations"] });
      qc.invalidateQueries({ queryKey: ["talent-contact-unlocks"] });
    },
  });
}

// Worker: pending contact requests
export function useWorkerContactRequests() {
  return useQuery({
    queryKey: ["worker-contact-requests"],
    queryFn: async () => {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
        .maybeSingle();
      if (!employee) return [];

      const { data: profile } = await supabase
        .from("talent_profiles")
        .select("id")
        .eq("employee_id", employee.id)
        .maybeSingle();
      if (!profile) return [];

      const { data, error } = await supabase
        .from("talent_contact_unlocks")
        .select("*")
        .eq("talent_profile_id", profile.id)
        .eq("candidate_response", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch company names
      const tenantIds = [...new Set((data || []).map((u: any) => u.tenant_id))];
      let companyMap: Record<string, string> = {};
      if (tenantIds.length > 0) {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("tenant_id, company_name")
          .in("tenant_id", tenantIds);
        companyMap = Object.fromEntries((settings || []).map((s: any) => [s.tenant_id, s.company_name]));
      }

      return (data || []).map((u: any) => ({
        ...u,
        company_name: companyMap[u.tenant_id] || "A company",
      })) as ContactUnlock[];
    },
  });
}
