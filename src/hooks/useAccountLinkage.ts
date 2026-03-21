import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { Employee } from "@/hooks/useEmployees";

export type AccountAccessState =
  | "no_email"
  | "email_no_invite"
  | "invite_sent"
  | "invite_accepted"
  | "linked"
  | "linked_verify"
  | "duplicate_email";

export interface AccountLinkageResult {
  state: AccountAccessState;
  label: string;
  description: string;
  hasRisk: boolean;
  riskDetails?: string;
  duplicateCount?: number;
  inviteCreatedAt?: string;
  inviteAcceptedAt?: string | null;
}

/**
 * Derives the full account-access state for an employee by checking:
 * - employees.email / user_id
 * - tenant_invitations status
 * - duplicate email records
 * - tenant_members for admin/manager overlap
 */
export function useAccountLinkage(employee: Employee | null | undefined) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["account-linkage", employee?.id, employee?.email, employee?.user_id, tenantId],
    queryFn: async (): Promise<AccountLinkageResult> => {
      if (!employee) {
        return { state: "no_email", label: "No data", description: "", hasRisk: false };
      }

      // 1. No email on file
      if (!employee.email) {
        return {
          state: "no_email",
          label: "Record only",
          description: "Employee record exists but no email on file. Cannot send invites or link account.",
          hasRisk: false,
        };
      }

      // 2. Check for duplicate emails across employees in same tenant
      const { count: dupCount } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", employee.tenant_id)
        .ilike("email", employee.email.toLowerCase())
        .is("archived_at", null);

      const hasDuplicate = (dupCount || 0) > 1;

      // 3. Check invitation status
      const { data: invite } = await supabase
        .from("tenant_invitations")
        .select("id, status, accepted_at, created_at")
        .eq("tenant_id", employee.tenant_id)
        .ilike("email", employee.email.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 4. If linked (user_id exists), check for suspicious linkage
      if (employee.user_id) {
        // Check if this user_id belongs to an admin/manager in the same tenant
        const { data: memberRole } = await supabase
          .from("tenant_members")
          .select("role")
          .eq("tenant_id", employee.tenant_id)
          .eq("user_id", employee.user_id)
          .eq("is_active", true)
          .maybeSingle();

        const isAdminOrManager = memberRole?.role === "company_admin" || memberRole?.role === "manager";

        // Check if user_id is linked to multiple employee records
        const { count: multiLinkCount } = await supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("user_id", employee.user_id)
          .is("archived_at", null);

        const isMultiLinked = (multiLinkCount || 0) > 1;

        if (hasDuplicate || isAdminOrManager || isMultiLinked) {
          const risks: string[] = [];
          if (isAdminOrManager) risks.push("Linked account belongs to an admin or manager user");
          if (hasDuplicate) risks.push(`${dupCount} employee records share this email`);
          if (isMultiLinked) risks.push(`This auth account is linked to ${multiLinkCount} employee records`);

          return {
            state: "linked_verify",
            label: "Linked — verify owner",
            description: "Account is linked but may not belong to the intended employee.",
            hasRisk: true,
            riskDetails: risks.join(". "),
            duplicateCount: dupCount || 0,
          };
        }

        return {
          state: "linked",
          label: "Account linked",
          description: "Employee has a linked login account and can access the app.",
          hasRisk: false,
        };
      }

      // 5. Duplicate email risk (no linked account)
      if (hasDuplicate) {
        return {
          state: "duplicate_email",
          label: "Duplicate email",
          description: `${dupCount} employee records use this email. Auto-linkage will be blocked until resolved.`,
          hasRisk: true,
          riskDetails: "Duplicate email detected. This may cause incorrect account linkage.",
          duplicateCount: dupCount || 0,
        };
      }

      // 6. Invite accepted but not yet linked
      if (invite?.accepted_at) {
        return {
          state: "invite_accepted",
          label: "Invite accepted",
          description: "Invite was accepted but account linkage has not completed. User may need to sign in again.",
          hasRisk: false,
          inviteCreatedAt: invite.created_at,
          inviteAcceptedAt: invite.accepted_at,
        };
      }

      // 7. Invite sent
      if (invite && !invite.accepted_at) {
        return {
          state: "invite_sent",
          label: "Invite sent",
          description: "An invitation was sent but has not been accepted yet.",
          hasRisk: false,
          inviteCreatedAt: invite.created_at,
        };
      }

      // 8. Email exists, no invite, no linked account
      return {
        state: "email_no_invite",
        label: "No invite sent",
        description: "Employee record exists with email but no invitation has been sent yet.",
        hasRisk: false,
      };
    },
    enabled: !!employee?.id && !!tenantId,
    staleTime: 30_000,
  });
}
