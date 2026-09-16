import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface ComplianceBranchOption {
  id: string;
  branch: string;
  display_name: string;
  address: string | null;
  needs_review: boolean;
  review_note: string | null;
}

/**
 * The single list of real locations used by every compliance record.
 * Branches are chosen from here (never typed by hand), so a spelling variation
 * can no longer create a silent extra branch. Locations flagged as needing
 * review are returned separately and are not offered for selection.
 */
export function useComplianceBranches() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["compliance_branches", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_locations")
        .select("id, branch, display_name, address, needs_review, review_note")
        .eq("tenant_id", tenantId!)
        .order("display_name");
      if (error) throw error;
      const all = (data ?? []) as ComplianceBranchOption[];
      return {
        selectable: all.filter((b) => !b.needs_review),
        needsReview: all.filter((b) => b.needs_review),
        all,
      };
    },
    enabled: !!tenantId,
  });
}

/** Confirms a flagged location so it can be used for compliance records again. */
export function useConfirmBranchLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("branch_locations")
        .update({
          needs_review: false,
          review_note: null,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance_branches"] });
    },
  });
}

/** Looks up the location id for a branch name, for records that store both. */
export function branchIdFor(
  options: ComplianceBranchOption[] | undefined,
  branch: string | null | undefined
): string | null {
  if (!branch) return null;
  const match = (options ?? []).find(
    (b) => b.branch.trim().toLowerCase() === branch.trim().toLowerCase()
  );
  return match?.id ?? null;
}
