import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * What a member of staff sent in, waiting for a manager to look at it.
 *
 * Nothing here changes a record on its own. A blank field may be filled from a
 * submission, but a change to a name, date of birth, National Insurance number,
 * email address, bank details or a right-to-work document always waits for a
 * person to accept or reject it — and every decision is recorded with who made
 * it and when.
 *
 * Bank details are the strictest case: even once accepted they are not used for
 * pay until an administrator confirms the change directly with the employee.
 */
export interface StaffDetailChange {
  id: string;
  tenant_id: string;
  employee_id: string;
  request_id: string | null;
  section: string;
  field_name: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
  sensitive: boolean;
  needs_review: boolean;
  state: "pending" | "accepted" | "rejected";
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  notes: string | null;
  created_at: string;
}

/** Bank fields never take effect without a direct conversation first. */
export const BANK_FIELDS = ["bank_account_no", "sort_code"] as const;
export const isBankField = (field: string) => (BANK_FIELDS as readonly string[]).includes(field);

export function useStaffDetailChanges(employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery<StaffDetailChange[]>({
    queryKey: ["staff_detail_changes", tenantId, employeeId],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("staff_detail_changes")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as StaffDetailChange[];
    },
  });
}

/** Everything still waiting for a decision, across the team. */
export function usePendingStaffDetailChanges() {
  const all = useStaffDetailChanges();
  return {
    ...all,
    data: (all.data ?? []).filter((c) => c.state === "pending" && c.needs_review),
  };
}

/**
 * Accept or reject one submitted value.
 *
 * Accepting a non-bank value writes it to the staff record. Accepting bank
 * details records the decision only — the account is not used for pay until the
 * separate direct confirmation below is recorded.
 */
export function useDecideStaffDetailChange() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      change,
      accept,
      notes,
      deciderName,
    }: {
      change: StaffDetailChange;
      accept: boolean;
      notes?: string;
      deciderName: string;
    }) => {
      if (!deciderName.trim()) throw new Error("Please type your name so the decision is recorded");

      if (accept && !isBankField(change.field_name) && change.new_value) {
        const { error } = await supabase
          .from("employees")
          .update({ [change.field_name]: change.new_value } as never)
          .eq("id", change.employee_id);
        if (error) throw error;
      }

      const { error: updErr } = await supabase
        .from("staff_detail_changes")
        .update({
          state: accept ? "accepted" : "rejected",
          decided_by: user?.id ?? null,
          decided_by_name: deciderName.trim(),
          decided_at: new Date().toISOString(),
          notes: notes?.trim() || change.notes,
        } as never)
        .eq("id", change.id);
      if (updErr) throw updErr;

      await supabase.from("audit_log").insert({
        tenant_id: change.tenant_id,
        action: "update",
        table_name: "staff_detail_changes",
        record_id: change.id,
        old_data: { field: change.field_name, value: change.old_value },
        new_data: {
          field: change.field_name,
          submitted: change.new_value,
          decision: accept ? "accepted" : "rejected",
          decided_by_name: deciderName.trim(),
          applied_to_record: accept && !isBankField(change.field_name),
          awaiting_direct_confirmation: accept && isBankField(change.field_name),
        },
      } as never);
    },
    onSuccess: (_d, { accept, change }) => {
      qc.invalidateQueries({ queryKey: ["staff_detail_changes"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employee-sensitive"] });
      toast.success(
        !accept
          ? "Rejected — the record is unchanged"
          : isBankField(change.field_name)
            ? "Accepted. Pay still uses the old account until you confirm the change with them directly."
            : "Record updated",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Records that an administrator confirmed a bank change directly with the
 * employee, and only then writes the new account to the staff record.
 */
export function useVerifyBankChange() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      changes,
      verifierName,
      notes,
    }: {
      changes: StaffDetailChange[];
      verifierName: string;
      notes?: string;
    }) => {
      if (!verifierName.trim()) throw new Error("Please type your name so the check is recorded");
      const bank = changes.filter((c) => isBankField(c.field_name));
      if (bank.length === 0) throw new Error("There are no bank details waiting");

      const updates: Record<string, string> = {};
      for (const c of bank) if (c.new_value) updates[c.field_name] = c.new_value;

      const { error } = await supabase
        .from("employees")
        .update(updates as never)
        .eq("id", bank[0].employee_id);
      if (error) throw error;

      for (const c of bank) {
        const { error: vErr } = await supabase.from("bank_detail_verifications").insert({
          tenant_id: c.tenant_id,
          employee_id: c.employee_id,
          change_id: c.id,
          verified_by: user?.id ?? null,
          verified_by_name: verifierName.trim(),
          confirmed_directly: true,
          notes: notes?.trim() || null,
        } as never);
        if (vErr) throw vErr;

        await supabase
          .from("staff_detail_changes")
          .update({
            state: "accepted",
            decided_by: user?.id ?? null,
            decided_by_name: verifierName.trim(),
            decided_at: new Date().toISOString(),
            notes: "Confirmed directly with the employee before pay used the new account",
          } as never)
          .eq("id", c.id);
      }

      await supabase.from("audit_log").insert({
        tenant_id: bank[0].tenant_id,
        action: "update",
        table_name: "bank_detail_verifications",
        record_id: bank[0].employee_id,
        old_data: { fields: bank.map((c) => c.field_name) },
        new_data: {
          confirmed_directly: true,
          verified_by_name: verifierName.trim(),
          fields: bank.map((c) => c.field_name),
        },
      } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_detail_changes"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employee-sensitive"] });
      qc.invalidateQueries({ queryKey: ["tenant-sensitive"] });
      toast.success("Bank details confirmed and now used for pay");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** The five states a right-to-work submission can be in. */
export const RTW_STATES = ["requested", "submitted", "verified", "rejected", "expired"] as const;
export type RtwState = (typeof RTW_STATES)[number];

export const RTW_LABELS: Record<string, string> = {
  requested: "Requested",
  submitted: "Submitted — not yet checked",
  pending_review: "Submitted — not yet checked",
  verified: "Verified",
  rejected: "Rejected",
  expired: "Expired",
  not_submitted: "Not requested",
};

export function useRightToWorkReview(employeeId?: string) {
  return useQuery({
    queryKey: ["rtw_review", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_onboarding_data")
        .select("id, rtw_status, rtw_reviewed_at, rtw_reviewed_by, rtw_reviewed_by_name, rtw_review_notes, rtw_expires_on")
        .eq("employee_id", employeeId!)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        rtw_status: string | null;
        rtw_reviewed_at: string | null;
        rtw_reviewed_by: string | null;
        rtw_reviewed_by_name: string | null;
        rtw_review_notes: string | null;
        rtw_expires_on: string | null;
      } | null;
    },
  });
}

/** Records the right-to-work decision, who made it and when. Nothing is cancelled automatically. */
export function useRecordRightToWorkDecision() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      employeeId,
      decision,
      checkedByName,
      notes,
      expiresOn,
    }: {
      employeeId: string;
      decision: RtwState;
      checkedByName: string;
      notes?: string;
      expiresOn?: string | null;
    }) => {
      if (!checkedByName.trim()) throw new Error("Please type your name so the check is recorded");

      const { data: existing } = await supabase
        .from("employee_onboarding_data")
        .select("id")
        .eq("employee_id", employeeId)
        .maybeSingle();

      const payload = {
        rtw_status: decision,
        rtw_reviewed_at: new Date().toISOString(),
        rtw_reviewed_by: user?.id ?? null,
        rtw_reviewed_by_name: checkedByName.trim(),
        rtw_review_notes: notes?.trim() || null,
        ...(expiresOn ? { rtw_expires_on: expiresOn } : {}),
      };

      if (existing?.id) {
        const { error } = await supabase
          .from("employee_onboarding_data")
          .update(payload as never)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("employee_onboarding_data")
          .insert({ tenant_id: tenantId, employee_id: employeeId, ...payload } as never);
        if (error) throw error;
      }

      await supabase.from("audit_log").insert({
        tenant_id: tenantId,
        action: "update",
        table_name: "right_to_work_review",
        record_id: employeeId,
        new_data: { decision, checked_by_name: checkedByName.trim(), notes: notes?.trim() || null },
      } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rtw_review"] });
      qc.invalidateQueries({ queryKey: ["employee_readiness"] });
      toast.success("Right-to-work check recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
