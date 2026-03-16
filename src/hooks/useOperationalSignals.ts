/**
 * Hook for operational signals — query + sync mutation.
 * Admin/manager-only — gated by caller.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { syncOperationalSignals, type SyncResult } from "@/lib/operational-signals-sync";
import { toast } from "sonner";

export interface OperationalSignal {
  id: string;
  tenant_id: string;
  source_table: string;
  source_record_id: string;
  signal_tag: string;
  signal_date: string;
  location_id: string | null;
  severity: string | null;
  confidence: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useOperationalSignals(enabled: boolean) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const queryKey = ["operational_signals", tenantId];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<OperationalSignal[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("operational_signals" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("signal_date", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error fetching operational signals:", error);
        return [];
      }
      return (data ?? []) as unknown as OperationalSignal[];
    },
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
  });

  const runSync = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      if (!tenantId) throw new Error("No tenant");
      return syncOperationalSignals(tenantId);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey });
      if (result.status === "completed") {
        toast.success(`Sync complete: ${result.totalInserted} signals processed`);
      } else {
        toast.error(`Sync failed: ${result.error ?? "Unknown error"}`);
      }
    },
    onError: (err: any) => {
      toast.error("Sync failed: " + (err.message || "Unknown error"));
    },
  });

  // Aggregate stats
  const signals = query.data ?? [];
  const sourceBreakdown = signals.reduce<Record<string, number>>((acc, s) => {
    acc[s.source_table] = (acc[s.source_table] || 0) + 1;
    return acc;
  }, {});

  const tagBreakdown = signals.reduce<Record<string, number>>((acc, s) => {
    acc[s.signal_tag] = (acc[s.signal_tag] || 0) + 1;
    return acc;
  }, {});

  return {
    ...query,
    signals,
    sourceBreakdown,
    tagBreakdown,
    runSync,
  };
}
