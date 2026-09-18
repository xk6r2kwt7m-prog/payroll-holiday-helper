import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant, useRequiredTenantId } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";
import { useInviteEmail } from "@/hooks/useInviteEmail";

export interface InvitationRow {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  token: string | null;
  status: string | null;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  opened_at: string | null;
  last_reminder_at: string | null;
  reminder_count: number | null;
  employee_id: string | null;
  employees?: { id: string; forename: string; surname: string; status: string | null } | null;
}

export type InvitationState = "joined" | "opened" | "waiting" | "expired" | "cancelled";

/** Truthful state of an invitation — never inferred from anything else. */
export function invitationState(inv: InvitationRow, now = new Date()): InvitationState {
  if (inv.accepted_at || inv.status === "accepted") return "joined";
  if (inv.status === "revoked" || inv.status === "cancelled") return "cancelled";
  if (inv.expires_at && new Date(inv.expires_at).getTime() < now.getTime()) return "expired";
  if (inv.opened_at) return "opened";
  return "waiting";
}

export const INVITATION_STATE_LABELS: Record<InvitationState, string> = {
  joined: "Joined",
  opened: "Link opened",
  waiting: "Waiting",
  expired: "Expired",
  cancelled: "Cancelled",
};

/** The name to show for an invitation — the attached staff record, never a guess. */
export function invitationPersonName(inv: InvitationRow): string {
  const e = inv.employees;
  if (e) return `${e.forename} ${e.surname}`.trim();
  return "No staff record attached";
}

export function useInvitations() {
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["tenant-invitations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_invitations")
        .select("*, employees(id, forename, surname, status)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as InvitationRow[];
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
    mutationFn: async ({
      email,
      role,
      name,
      employeeId,
    }: { email: string; role: string; name?: string; employeeId?: string | null }) => {
      await assertPermission("edit_employees", tenantId);
      const { data, error } = await supabase
        .from("tenant_invitations")
        .insert({
          tenant_id: tenantId,
          email,
          role: role as any,
          invited_by: user?.id,
          employee_id: employeeId ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Send the actual email
      const result = await sendInviteEmail({
        recipientEmail: email,
        employeeName: name || email,
        tenantId,
        inviteToken: (data as any)?.token ?? null,
      });

      return { invitation: data, emailResult: result };
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-invitations", tenantId] });
      if (_data.emailResult.success) {
        toast.success("Invite email submitted successfully");
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, invitationId, name }: { email: string; invitationId: string; name?: string }) => {
      if (!tenantId) throw new Error("No tenant context");
      await assertPermission("edit_employees", tenantId);

      const { data, error } = await supabase.rpc("rotate_pending_invitation", {
        _invitation_id: invitationId,
      });
      if (error) throw error;

      const replacement = Array.isArray(data) ? data[0] : data;
      if (!replacement?.token) throw new Error("A replacement link could not be created");

      const result = await sendInviteEmail({
        recipientEmail: email,
        employeeName: name || email,
        tenantId,
        inviteToken: replacement.token,
      });

      if (!result.success) {
        throw new Error(result.error || "Email delivery failed");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-invitations", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["account-linkage"] });
      toast.success("A new joining link was sent. The previous link no longer works.");
    },
    onError: (err: any) => {
      toast.error(`Failed to resend invite: ${err.message}`);
    },
  });
}

/**
 * Sends a reminder using the SAME link that is already waiting — nothing is
 * replaced, so a link the person may already have open keeps working.
 * Manual only: no reminder is ever sent automatically.
 */
export function useSendInvitationReminder() {
  const { tenantId } = useTenant();
  const { sendInviteEmail } = useInviteEmail();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invitationId }: { invitationId: string }) => {
      if (!tenantId) throw new Error("No tenant context");
      await assertPermission("edit_employees", tenantId);

      const { data: inv, error } = await supabase
        .from("tenant_invitations")
        .select("id, email, token, status, accepted_at, expires_at, employees(forename, surname)")
        .eq("id", invitationId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      if (!inv) throw new Error("That invitation could not be found");
      if ((inv as any).accepted_at || inv.status === "accepted")
        throw new Error("This person has already joined, so no reminder is needed");
      if (inv.status === "revoked" || inv.status === "cancelled")
        throw new Error("This invitation was cancelled — send a new link instead");
      if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now())
        throw new Error("This link has expired — send a new link instead");
      if (!inv.token) throw new Error("This invitation has no link — send a new link instead");

      const person = (inv as any).employees;
      const result = await sendInviteEmail({
        recipientEmail: inv.email,
        employeeName: person ? `${person.forename} ${person.surname}` : inv.email,
        tenantId,
        inviteToken: inv.token,
      });
      if (!result.success) throw new Error(result.error || "Email delivery failed");

      await supabase
        .from("tenant_invitations")
        .update({
          last_reminder_at: new Date().toISOString(),
          reminder_count: (((inv as any).reminder_count as number) ?? 0) + 1,
        } as any)
        .eq("id", invitationId);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-invitations", tenantId] });
      toast.success("Reminder sent — the same joining link still works");
    },
    onError: (err: any) => toast.error(err.message || "Reminder could not be sent"),
  });
}

/** Cancels a waiting invitation so the link can no longer be opened. */
export function useCancelInvitation() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!tenantId) throw new Error("No tenant context");
      await assertPermission("edit_employees", tenantId);
      const { error } = await supabase
        .from("tenant_invitations")
        .update({ status: "cancelled" } as any)
        .eq("id", invitationId)
        .eq("tenant_id", tenantId)
        .is("accepted_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-invitations", tenantId] });
      toast.success("Invitation cancelled — that link no longer opens");
    },
    onError: (err: any) => toast.error(err.message || "Could not cancel the invitation"),
  });
}
