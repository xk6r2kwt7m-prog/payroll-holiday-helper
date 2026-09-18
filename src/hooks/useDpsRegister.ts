import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useEmployees } from "@/hooks/useEmployees";
import { useAllEmployeeBranches } from "@/hooks/useBranches";
import { useAlcoholAuthorisations } from "@/hooks/useCompliance";
import {
  buildDpsRegister, registerSummary, registerSummaryLine,
  type RegisterEmployee, type RegisterAuthorisation, type DeliveryMethod,
} from "@/lib/dps-register";

/** Staff with the sites they are assigned to, ready for the register. */
export function useEmployeesWithBranches(): RegisterEmployee[] {
  const { data: employees = [] } = useEmployees();
  const { data: links = [] } = useAllEmployeeBranches();

  return useMemo(() => {
    const byEmployee = new Map<string, string[]>();
    for (const l of links as any[]) {
      const list = byEmployee.get(l.employee_id) ?? [];
      list.push(l.branch);
      byEmployee.set(l.employee_id, list);
    }
    // Every other field is kept so callers (such as the send dialog) still see
    // the email address and the rest of the record.
    return (employees as any[]).map((e) => ({
      ...e,
      branches: byEmployee.get(e.id) ?? [],
    }));
  }, [employees, links]);
}

/**
 * Manager decisions about who counts as front of house for the alcohol list.
 * A decision always beats the guess made from the job title.
 */
export function useAlcoholListDecisions(branch?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["alcohol_list_decisions", tenantId, branch ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("alcohol_list_decisions")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (branch) q = q.eq("branch", branch);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!tenantId,
  });
}

/** Records the manager's decision. Nothing is sent to the person by doing this. */
export function useSetAlcoholListDecision() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      branch: string;
      decision: "front_of_house" | "not_front_of_house";
      note?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("alcohol_list_decisions")
        .upsert(
          {
            tenant_id: tenantId!,
            employee_id: input.employee_id,
            branch: input.branch,
            decision: input.decision,
            note: input.note ?? null,
            decided_by: user?.id ?? null,
            decided_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,employee_id,branch" },
        )
        .select()
        .single();
      if (error) throw error;
      await logComplianceAudit({
        tenantId: tenantId!,
        table: "alcohol_list_decisions",
        recordId: data.id,
        event: "alcohol_list_decision_recorded",
        branch: input.branch,
        next: { decision: input.decision, employee_id: input.employee_id },
        note: input.note ?? null,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alcohol_list_decisions"] });
    },
  });
}

/** The live register for one site, plus anyone whose role is not yet settled. */
export function useDpsRegister(branch?: string) {
  const employees = useEmployeesWithBranches();
  const { data: authorisations = [] } = useAlcoholAuthorisations();
  const { data: decisions = [] } = useAlcoholListDecisions();

  return useMemo(() => {
    const auths = authorisations as unknown as RegisterAuthorisation[];
    const rows = branch
      ? buildDpsRegister({ branch, employees, authorisations: auths, decisions: decisions as any })
      : [];
    return {
      rows,
      unclassified: branch
        ? unclassifiedForSite({ branch, employees, authorisations: auths, decisions: decisions as any })
        : [],
      summary: registerSummary(rows),
      summaryLine: branch ? registerSummaryLine(rows, branch) : "",
    };
  }, [branch, employees, authorisations, decisions]);
}

/* ─────────────── Issued copies ─────────────── */

export function useLicenceDocumentIssues(branch?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["licence_document_issues", tenantId, branch ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("licence_document_issues")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (branch) q = q.eq("branch", branch);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export interface IssueSnapshot {
  document: unknown;
  rows: unknown;
  summary_line: string;
}

/** Records that a copy was taken. Snapshots are never edited afterwards. */
export function useRecordLicenceDocumentIssue() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (input: {
      branch: string;
      licence_id?: string | null;
      subject_type: string;
      snapshot: IssueSnapshot;
      authorised_count: number;
      listed_count: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("licence_document_issues")
        .insert({
          tenant_id: tenantId!,
          branch: input.branch,
          licence_id: input.licence_id ?? null,
          subject_type: input.subject_type,
          issued_by: user?.id ?? null,
          delivery_method: "download" as DeliveryMethod,
          snapshot: input.snapshot as any,
          authorised_count: input.authorised_count,
          listed_count: input.listed_count,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["licence_document_issues"] }),
  });
}

/** Sends a copy by email — PDF attached and/or a secure link. */
export function useEmailLicensingDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      branch: string;
      licence_id?: string | null;
      subject_type: string;
      recipient_name: string;
      recipient_email: string;
      message?: string;
      attach_pdf: boolean;
      include_link: boolean;
      link_expiry_days: number;
      file_path: string;
      snapshot: IssueSnapshot;
      authorised_count: number;
      listed_count: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("send-licensing-document", {
        body: input,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { sent: boolean; link?: string | null };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["licence_document_issues"] }),
  });
}

export function useRevokeLicenceDocumentLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("licence_document_issues")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user?.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["licence_document_issues"] }),
  });
}
