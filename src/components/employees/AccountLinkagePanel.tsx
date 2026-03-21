import { AlertTriangle, Link2, Mail, Send, Unlink, Shield, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountAccessBadge } from "./AccountAccessBadge";
import { useAccountLinkage } from "@/hooks/useAccountLinkage";
import { useInviteEmail } from "@/hooks/useInviteEmail";
import { useUpdateEmployee } from "@/hooks/useEmployees";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Employee } from "@/hooks/useEmployees";
import { useQueryClient } from "@tanstack/react-query";

interface AccountLinkagePanelProps {
  employee: Employee;
  isAdmin: boolean;
  onEditEmployee?: () => void;
}

export function AccountLinkagePanel({ employee, isAdmin, onEditEmployee }: AccountLinkagePanelProps) {
  const { data: linkage, isLoading } = useAccountLinkage(employee);
  const { sendInviteEmail } = useInviteEmail();
  const updateEmployee = useUpdateEmployee();
  const queryClient = useQueryClient();

  if (isLoading || !linkage) return null;

  const handleSendInvite = async () => {
    if (!employee.email) {
      toast.error("No email address on file. Add an email first.");
      return;
    }

    // Create/update invitation DB record
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      await supabase.from("tenant_invitations").upsert(
        {
          tenant_id: employee.tenant_id,
          email: employee.email.toLowerCase(),
          role: "staff" as any,
          invited_by: currentUser?.id,
        },
        { onConflict: "tenant_id,email" }
      );
    } catch {
      // Non-blocking — invitation record is supplementary
    }

    const result = await sendInviteEmail({
      recipientEmail: employee.email,
      employeeName: `${employee.forename} ${employee.surname}`,
      tenantId: employee.tenant_id,
    });
    if (result.success) {
      toast.success(`Invite sent to ${employee.email}`);
      queryClient.invalidateQueries({ queryKey: ["account-linkage"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-invitations"] });
    } else {
      toast.error(`Invite email failed: ${result.error || "Unknown error"}`);
    }
  };

  const handleUnlink = async () => {
    if (!employee.user_id) return;
    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        updates: { user_id: null },
      });
      toast.success("Account unlinked successfully");
      queryClient.invalidateQueries({ queryKey: ["account-linkage"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee_readiness"] });
      queryClient.invalidateQueries({ queryKey: ["team_readiness"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink account");
    }
  };

  return (
    <div className="space-y-3">
      {/* Status badge + description */}
      <div className="flex items-start gap-2">
        <AccountAccessBadge state={linkage.state} size="md" />
        <p className="text-xs text-muted-foreground flex-1 leading-relaxed mt-0.5">
          {linkage.description}
        </p>
      </div>

      {/* Risk warning */}
      {linkage.hasRisk && linkage.riskDetails && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/15 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{linkage.riskDetails}</span>
        </div>
      )}

      {/* Invite timestamp if available */}
      {linkage.inviteCreatedAt && (
        <p className="text-[10px] text-muted-foreground">
          Invite sent: {new Date(linkage.inviteCreatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          {linkage.inviteAcceptedAt && (
            <> · Accepted: {new Date(linkage.inviteAcceptedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>
          )}
        </p>
      )}

      {/* Manager actions */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          {/* No email → Add email */}
          {linkage.state === "no_email" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={onEditEmployee}>
              <Mail className="h-3.5 w-3.5" />
              Add email
            </Button>
          )}

          {/* Email exists, no invite → Send invite */}
          {linkage.state === "email_no_invite" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={handleSendInvite}>
              <Send className="h-3.5 w-3.5" />
              Send invite
            </Button>
          )}

          {/* Invite sent → Resend */}
          {linkage.state === "invite_sent" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={handleSendInvite}>
              <Send className="h-3.5 w-3.5" />
              Resend invite
            </Button>
          )}

          {/* Linked with risk → Review + Unlink */}
          {linkage.state === "linked_verify" && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 border-destructive/30 text-destructive" onClick={handleUnlink}>
                <Unlink className="h-3.5 w-3.5" />
                Unlink account
              </Button>
            </>
          )}

          {/* Linked normally → Unlink option */}
          {linkage.state === "linked" && (
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7 text-muted-foreground" onClick={handleUnlink}>
              <Unlink className="h-3.5 w-3.5" />
              Unlink account
            </Button>
          )}

          {/* Duplicate email → Edit to resolve */}
          {linkage.state === "duplicate_email" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 border-destructive/30 text-destructive" onClick={onEditEmployee}>
              <Mail className="h-3.5 w-3.5" />
              Resolve duplicate email
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
