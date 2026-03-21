import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant, useRequiredTenantId } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";
import { useInviteEmail } from "@/hooks/useInviteEmail";

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
  const { sendInviteEmail } = useInviteEmail();

  return useMutation({
    mutationFn: async ({ email, role, name }: { email: string; role: string; name?: string }) => {
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

      // Send the actual email
      const result = await sendInviteEmail({
        recipientEmail: email,
        employeeName: name || email,
        tenantId,
      });

      return { invitation: data, emailResult: result };
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-invitations", tenantId] });
      if (_data.emailResult.success) {
        toast.success("Invitation sent");
      } else {
        toast.warning("Invitation created but email delivery failed", {
          description: _data.emailResult.error || "You can resend the email.",
          duration: 8000,
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send invitation");
    },
  });
}

export function useResendInvitation() {
  const { tenantId } = useTenant();
  const { sendInviteEmail } = useInviteEmail();

  return useMutation({
    mutationFn: async ({ email, invitationId }: { email: string; invitationId: string }) => {
      if (!tenantId) throw new Error("No tenant context");

      console.log("[INVITE_RESEND] Resending invite", { invitationId, email, tenantId });

      const result = await sendInviteEmail({
        recipientEmail: email,
        employeeName: email,
        tenantId,
      });

      if (!result.success) {
        throw new Error(result.error || "Email delivery failed");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Invite email resent successfully");
    },
    onError: (err: any) => {
      toast.error(`Failed to resend invite: ${err.message}`);
    },
  });
}
