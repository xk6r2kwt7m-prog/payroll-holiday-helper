import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import type { AmendmentType, FieldChange } from "@/lib/contract-amendments";
import { isMaterialChange } from "@/lib/contract-amendments";

/**
 * All contract versions in a single chain, ordered newest → oldest.
 * Pass any contract id in the chain (root, current, or historical) and the
 * hook returns every related row keyed off root_contract_id.
 */
export function useContractVersionHistory(contractId: string | null | undefined) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["contract_version_history", tenantId, contractId],
    enabled: !!tenantId && !!contractId,
    queryFn: async () => {
      if (!tenantId || !contractId) return [];
      // Resolve root_contract_id first
      const { data: anchor, error: anchorErr } = await supabase
        .from("employee_documents")
        .select("id, root_contract_id")
        .eq("id", contractId)
        .maybeSingle();
      if (anchorErr) throw anchorErr;
      const rootId = (anchor as { root_contract_id?: string } | null)?.root_contract_id || contractId;

      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("document_type", "contract")
        .or(`id.eq.${rootId},root_contract_id.eq.${rootId}`)
        .order("version_number", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useContractAmendmentsLog(rootContractId: string | null | undefined) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["contract_amendments_log", tenantId, rootContractId],
    enabled: !!tenantId && !!rootContractId,
    queryFn: async () => {
      if (!tenantId || !rootContractId) return [];
      const { data, error } = await supabase
        .from("contract_amendments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

interface CreateAmendmentInput {
  previousContractId: string;
  amendmentType: AmendmentType;
  amendmentSummary: string;
  reason?: string;
  effectiveDate: string; // ISO yyyy-mm-dd
  fieldChanges: FieldChange[];
  /** Optional override of the new document name. */
  documentName?: string;
}

/**
 * Creates a draft amendment row referencing the previous contract.
 * The new row is a `draft` — file upload, edit and send happen in the existing
 * contract flow. The previous contract is only marked `superseded` once the
 * new amendment is fully signed (handled in the sign-contract edge function).
 */
export function useCreateContractAmendment() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAmendmentInput) => {
      if (!tenantId) throw new Error("Tenant not resolved");
      if (!user?.id) throw new Error("Not authenticated");

      const { data: parent, error: parentErr } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("id", input.previousContractId)
        .maybeSingle();
      if (parentErr) throw parentErr;
      if (!parent) throw new Error("Previous contract not found");

      const parentRow = parent as Record<string, unknown>;
      const parentState = parentRow.contract_state as string | undefined;
      if (parentState && !["signed", "issued"].includes(parentState)) {
        throw new Error(`Cannot amend a contract in state "${parentState}"`);
      }

      const rootId = (parentRow.root_contract_id as string | null) || (parentRow.id as string);
      const versionNumber = ((parentRow.version_number as number | null) ?? 1) + 1;
      const employeeId = parentRow.employee_id as string;

      // Insert new draft contract row pointing at the parent.
      const insertPayload: Record<string, unknown> = {
        tenant_id: tenantId,
        employee_id: employeeId,
        document_type: "contract",
        document_name:
          input.documentName ||
          `${String(parentRow.document_name || "Contract")} — Amendment v${versionNumber}`,
        file_path: "", // will be filled when admin uploads / generates the PDF
        contract_state: "draft",
        contract_send_status: "draft",
        version_number: versionNumber,
        parent_contract_id: input.previousContractId,
        root_contract_id: rootId,
        effective_date: input.effectiveDate,
        amendment_type: input.amendmentType,
        amendment_summary: input.amendmentSummary,
        amendment_reason: input.reason || null,
        uploaded_by: user.id,
      };

      const { data: newDoc, error: insertErr } = await supabase
        .from("employee_documents")
        .insert(insertPayload as never)
        .select()
        .single();
      if (insertErr) throw insertErr;

      // Audit row in contract_amendments
      const requiresResignature = isMaterialChange(input.fieldChanges);
      const { error: amendErr } = await supabase.from("contract_amendments").insert({
        tenant_id: tenantId,
        previous_contract_id: input.previousContractId,
        new_contract_id: (newDoc as { id: string }).id,
        employee_id: employeeId,
        amendment_type: input.amendmentType,
        field_changes: input.fieldChanges as unknown as never,
        reason: input.reason || null,
        effective_date: input.effectiveDate,
        requires_resignature: requiresResignature,
        created_by: user.id,
      } as never);
      if (amendErr) throw amendErr;

      return newDoc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_contracts"] });
      qc.invalidateQueries({ queryKey: ["contract_version_history"] });
      qc.invalidateQueries({ queryKey: ["contract_amendments_log"] });
    },
  });
}

/** Mark a signed contract as terminated. The DB trigger enforces that this is
 *  the only field set on the transition, and that the contract was previously
 *  in `signed` state. */
export function useTerminateContract() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contractId, reason }: { contractId: string; reason: string }) => {
      if (!tenantId) throw new Error("Tenant not resolved");
      const { error } = await supabase
        .from("employee_documents")
        .update({
          contract_state: "terminated",
          terminated_at: new Date().toISOString(),
          terminated_reason: reason,
        } as never)
        .eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_contracts"] });
      qc.invalidateQueries({ queryKey: ["contract_version_history"] });
    },
  });
}
