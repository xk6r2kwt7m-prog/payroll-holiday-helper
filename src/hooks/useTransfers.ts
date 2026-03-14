import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export interface StaffTransfer {
  id: string;
  employee_id: string;
  tenant_id: string;
  from_branch: string;
  to_branch: string;
  transfer_date: string;
  end_date: string | null;
  is_temporary: boolean;
  reason: string | null;
  transferred_by: string | null;
  status: string;
  created_at: string;
}

export function useStaffTransfers(employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["staff_transfers", tenantId, employeeId],
    queryFn: async () => {
      if (!tenantId) return [] as StaffTransfer[];
      let query = supabase
        .from("staff_transfers" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("transfer_date", { ascending: false });
      if (employeeId) query = query.eq("employee_id", employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as StaffTransfer[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      employeeId,
      fromBranch,
      toBranch,
      transferDate,
      endDate,
      isTemporary,
      reason,
    }: {
      employeeId: string;
      fromBranch: string;
      toBranch: string;
      transferDate: string;
      endDate?: string;
      isTemporary: boolean;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Create transfer record
      const { error } = await supabase.from("staff_transfers" as any).insert({
        employee_id: employeeId,
        tenant_id: tenantId!,
        from_branch: fromBranch,
        to_branch: toBranch,
        transfer_date: transferDate,
        end_date: endDate || null,
        is_temporary: isTemporary,
        reason: reason || null,
        transferred_by: user?.id || null,
        status: "active",
      } as any);
      if (error) throw error;

      // If permanent, update primary branch in employee_branches
      if (!isTemporary) {
        // Set old primary to non-primary
        await supabase
          .from("employee_branches")
          .update({ is_primary: false } as any)
          .eq("employee_id", employeeId)
          .eq("is_primary", true);

        // Check if toBranch exists
        const { data: existing } = await supabase
          .from("employee_branches")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("branch", toBranch)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("employee_branches")
            .update({ is_primary: true } as any)
            .eq("id", existing.id);
        } else {
          await supabase.from("employee_branches").insert({
            employee_id: employeeId,
            branch: toBranch,
            is_primary: true,
            tenant_id: tenantId!,
          } as any);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_transfers"] });
      qc.invalidateQueries({ queryKey: ["employee_branches"] });
      toast.success("Transfer created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
