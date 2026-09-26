import { useRef } from "react";
import { staffApprovalError } from "@/lib/staff-approval-error";
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

/** Direct confirmation evidence, separate from an accepted review decision. */
export function useBankDetailVerifications(employeeId: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["bank_detail_verifications", tenantId, employeeId], enabled: !!tenantId && !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_detail_verifications").select("change_id")
        .eq("tenant_id", tenantId!).eq("employee_id", employeeId).eq("confirmed_directly", true);
      if (error) throw error;
      return (data ?? []).map(row => row.change_id);
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

      // The server re-reads the submission and commits value, decision and audit together.
      const { error } = await supabase.rpc("decide_staff_detail_atomic" as never, {
        _change_id: change.id, _accept: accept, _reviewer: deciderName.trim(), _notes: notes?.trim() || null,
      } as never);
      if (error) throw new Error(staffApprovalError(error));
    },
    onSuccess: (_d, { accept, change }) => {
      qc.invalidateQueries({ queryKey: ["staff_detail_changes"] });
      qc.invalidateQueries({ queryKey: ["contract_auto_draft_record"] });
      qc.invalidateQueries({ queryKey: ["bank_detail_verifications"] });
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
      const { error } = await supabase.rpc("confirm_staff_bank_atomic" as never, {
        _change_ids: bank.map(change => change.id), _reviewer: verifierName.trim(), _notes: notes?.trim() || null,
      } as never);
      if (error) throw new Error(staffApprovalError(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_detail_changes"] });
      qc.invalidateQueries({ queryKey: ["contract_auto_draft_record"] });
      qc.invalidateQueries({ queryKey: ["bank_detail_verifications"] });
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
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["rtw_review", tenantId, employeeId],
    enabled: !!tenantId && !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_onboarding_data")
        .select("id, updated_at, rtw_status, rtw_reviewed_at, rtw_reviewed_by, rtw_reviewed_by_name, rtw_review_notes, rtw_expires_on")
        .eq("tenant_id", tenantId!)
        .eq("employee_id", employeeId!)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        updated_at: string;
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
  const retry = useRef<{ key: string; id: string } | null>(null);
  return useMutation({
    mutationFn: async ({
      employeeId,
      decision,
      checkedByName,
      notes,
      expiresOn,
      expectedUpdatedAt,
    }: {
      employeeId: string;
      decision: RtwState;
      checkedByName: string;
      notes?: string;
      expiresOn?: string | null;
      expectedUpdatedAt: string;
    }) => {
      if (!checkedByName.trim()) throw new Error("Please type your name so the check is recorded");

      if (!expectedUpdatedAt) throw new Error("Reload the evidence before recording a decision");
      if (!notes?.trim()) throw new Error("Record what you checked and where the evidence is held");
      const payload = {
        _employee_id: employeeId, _decision: decision, _reviewer: checkedByName.trim(),
        _notes: notes.trim(), _expires_on: expiresOn || null, _expected_updated_at: expectedUpdatedAt,
      };
      const key = JSON.stringify(payload);
      if (retry.current?.key !== key) retry.current = { key, id: crypto.randomUUID() };
      const { error } = await supabase.rpc("record_rtw_decision_atomic" as never, {
        ...payload, _request_id: retry.current.id,
      } as never);
      if (error) throw new Error(staffApprovalError(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rtw_review"] });
      qc.invalidateQueries({ queryKey: ["employee_readiness"] });
      qc.invalidateQueries({ queryKey: ["contract_auto_draft_record"] });
      toast.success("Right-to-work check recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
