import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant, useRequiredTenantId } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";

export function useInvitations() {
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["tenant-invitations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_invitations")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  return query;
}

export function useSendInvitation() {
  const tenantId = useRequiredTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      await assertPermission("edit_employees", tenantId);
      const { data, error } = await supabase
        .from("tenant_invitations")
        .insert({
          tenant_id: tenantId,
          email,
          role: role as any,
          invited_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-invitations", tenantId] });
      toast.success("Invitation sent");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send invitation");
    },
  });
}
