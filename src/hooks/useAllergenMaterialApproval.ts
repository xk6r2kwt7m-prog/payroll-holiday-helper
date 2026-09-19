/**
 * The administrator's approval of the allergen training material.
 *
 * Recording an approval does not publish the course and contacts nobody. It only
 * records, with a name and a time, that the material has been approved so the
 * course can be published and used in the ordinary way. The device walkthroughs
 * stay listed as outstanding work — approving does not claim they were done.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { logComplianceAudit } from "@/hooks/useCompliance";

export interface MaterialApprovalRow {
  id: string;
  approved_version: number | null;
  approved_by_name: string;
  note: string | null;
  device_walkthroughs_outstanding: boolean;
  created_at: string;
}

export function useAllergenMaterialApproval() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-material-approval", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_material_approvals" as any)
        .select("id, approved_version, approved_by_name, note, device_walkthroughs_outstanding, created_at")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as MaterialApprovalRow | null;
    },
  });
}

export function useApproveAllergenMaterial() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      approvedByName: string;
      proposedVersion?: number | null;
      note?: string | null;
      deviceWalkthroughsOutstanding: boolean;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      if (!input.approvedByName.trim()) throw new Error("Please type your name to record the approval.");

      const { data, error } = await supabase
        .from("allergen_material_approvals" as any)
        .insert({
          tenant_id: tenantId,
          approved_version: input.proposedVersion ?? null,
          approved_by: user?.id ?? null,
          approved_by_name: input.approvedByName.trim(),
          note: (input.note ?? "").trim() || null,
          device_walkthroughs_outstanding: input.deviceWalkthroughsOutstanding,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      await logComplianceAudit({
        tenantId,
        table: "allergen_material_approvals",
        recordId: (data as any).id,
        event: "allergen_material_approved",
        note: `Allergen training material approved by ${input.approvedByName.trim()}.${
          input.deviceWalkthroughsOutstanding
            ? " The phone and computer walkthroughs remain outstanding and stay listed as open work."
            : ""
        } Nothing was published, assigned, sent or certified by this approval.`,
      });
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-material-approval"] }),
  });
}
