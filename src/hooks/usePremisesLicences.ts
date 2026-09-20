import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { logComplianceAudit, resolveBranchLocationId } from "@/hooks/useCompliance";
import type { LicenceSubjectType, NominatedPerson } from "@/lib/licensing-documents";

/* ─────────────── Premises licences ─────────────── */

export function usePremisesLicence(branch?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["premises_licences", tenantId, branch ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premises_licences")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("branch", branch!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!tenantId && !!branch,
  });
}

export function usePremisesLicences() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["premises_licences", tenantId, "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premises_licences")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("branch");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export function useSavePremisesLicence() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (payload: Record<string, any> & { id?: string; branch: string }) => {
      const { id, ...rest } = payload;
      rest.branch_location_id = await resolveBranchLocationId(tenantId!, rest.branch);

      if (id) {
        const { data: previous } = await supabase
          .from("premises_licences").select("*").eq("id", id).maybeSingle();
        const { data, error } = await supabase
          .from("premises_licences")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        await logComplianceAudit({
          tenantId: tenantId!, table: "premises_licences", recordId: id,
          event: "licence_edited", previous, next: rest, branch: rest.branch,
        });
        return data;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("premises_licences")
        .insert({ ...rest, tenant_id: tenantId!, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      await logComplianceAudit({
        tenantId: tenantId!, table: "premises_licences", recordId: data.id,
        event: "licence_recorded", previous: null, next: rest, branch: rest.branch,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["premises_licences"] }),
  });
}

/* ─────────────── Licence conditions (per site only) ─────────────── */

export function useLicenceConditions(licenceId?: string) {
  return useQuery({
    queryKey: ["premises_licence_conditions", licenceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premises_licence_conditions")
        .select("*")
        .eq("licence_id", licenceId!)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!licenceId,
  });
}

export function useSaveLicenceCondition() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (payload: Record<string, any> & { id?: string; licence_id: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { data: previous } = await supabase
          .from("premises_licence_conditions").select("*").eq("id", id).maybeSingle();
        const { error } = await supabase
          .from("premises_licence_conditions")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        await logComplianceAudit({
          tenantId: tenantId!, table: "premises_licence_conditions", recordId: id,
          event: rest.last_check && rest.last_check !== previous?.last_check
            ? "licence_condition_checked"
            : "licence_condition_edited",
          previous, next: rest,
        });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from("premises_licence_conditions")
        .insert({ ...rest, tenant_id: tenantId!, created_by: user?.id } as any)
        .select("id")
        .single();
      if (error) throw error;
      await logComplianceAudit({
        tenantId: tenantId!, table: "premises_licence_conditions", recordId: created.id,
        event: "licence_condition_created", previous: null, next: rest,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["premises_licence_conditions"] }),
  });
}

/* ─────────────── Signature requests ─────────────── */

export function useLicenceSignatureRequests(opts?: {
  branch?: string;
  subjectType?: LicenceSubjectType;
  licenceId?: string;
}) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: [
      "licence_signature_requests", tenantId,
      opts?.branch ?? "all", opts?.subjectType ?? "all", opts?.licenceId ?? "all",
    ],
    queryFn: async () => {
      let q = supabase
        .from("licence_signature_requests")
        .select("*, employees(forename, surname)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (opts?.branch) q = q.eq("branch", opts.branch);
      if (opts?.subjectType) q = q.eq("subject_type", opts.subjectType);
      if (opts?.licenceId) q = q.eq("licence_id", opts.licenceId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export interface SendSignatureInput {
  subject_type: LicenceSubjectType;
  branch: string;
  licence_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  recipient_role?: string | null;
  employee_ids?: string[];
  nominated?: NominatedPerson[];
  part_a_location?: string | null;
  expiry_days?: number;
  test_send?: boolean;
  /** One DPS signature covering every site listed in `branches`. */
  all_sites?: boolean;
  branches?: string[];
}

export function useSendLicenceSignature() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (input: SendSignatureInput) => {
      const { data, error } = await supabase.functions.invoke("send-licence-signature", {
        body: { ...input, tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { sent: number; failed: string[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["licence_signature_requests"] });
      qc.invalidateQueries({ queryKey: ["alcohol_authorisations"] });
    },
  });
}

export function useCancelLicenceSignature() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("licence_signature_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id)
        .is("signed_at", null);
      if (error) throw error;
      await logComplianceAudit({
        tenantId: tenantId!, table: "licence_signature_requests", recordId: id,
        event: "document_edited", previous: null, next: { status: "cancelled" },
        note: "Signature request cancelled",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["licence_signature_requests"] }),
  });
}
