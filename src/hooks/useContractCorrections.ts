/**
 * Keeping contracts in step with corrected staff details.
 *
 * Three read/write jobs, all administrator-pressed:
 *   1. read the details we hold today for one person (for comparison);
 *   2. correct and reissue an UNSIGNED contract as its next version, keeping
 *      the earlier file untouched in the history;
 *   3. record a dated correction against a SIGNED contract, without producing
 *      or altering any file.
 *
 * Nothing here emails anybody, and nothing here touches a signed, superseded or
 * terminated document.
 */

import { pdf } from "@react-pdf/renderer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getActiveEmploymentTerms } from "@/lib/employment-terms";
import { mapEmployeeToContractDefaults } from "@/lib/contract-employee-defaults";
import type { ContractVariables, ContractType } from "@/components/contracts/contractTemplates";
import { ContractPDF } from "@/components/contracts/ContractPDF";
import { CONTRACT_TEMPLATE_VERSION, CURRENT_CONTRACT_TEMPLATE } from "@/lib/contract-template-version";
import { canReissueContract, LOCKED_CONTRACT_STATES } from "@/lib/contract-detail-drift";
import { createElement } from "react";

/** The contract-shaped values we hold on the staff record today. */
export function useHeldContractDetails(employeeId: string | null | undefined) {
  return useQuery({
    queryKey: ["held-contract-details", employeeId],
    enabled: !!employeeId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: employee, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", employeeId!)
        .maybeSingle();
      if (error) throw error;

      const { data: onboarding } = await supabase
        .from("employee_onboarding_data")
        .select("*")
        .eq("employee_id", employeeId!)
        .maybeSingle();

      let activeTerms: unknown = null;
      try {
        activeTerms = await getActiveEmploymentTerms(employeeId!);
      } catch {
        activeTerms = null;
      }

      const mapped = mapEmployeeToContractDefaults({
        employee: (employee as never) ?? null,
        onboarding: (onboarding as never) ?? null,
        activeTerms: (activeTerms as never) ?? null,
      });

      return {
        variables: mapped.variables as Partial<ContractVariables>,
        contractType: mapped.contractType,
      };
    },
  });
}

interface ReissueInput {
  contractId: string;
  /** The corrected values to print on the new version. */
  variables: ContractVariables;
  contractType: ContractType;
  /** Plain-English note for the audit trail. */
  reason: string;
  /** Field-level record of what changed, for the audit trail. */
  changes: { field: string; label: string; previous: string; next: string }[];
}

/**
 * Produce a corrected copy of an UNSIGNED contract as the next version in the
 * same chain. The earlier document keeps its file and is marked superseded so
 * nothing is ever lost. No email is sent.
 */
export function useCorrectAndReissueContract() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { data: companySettings } = useCompanySettings();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReissueInput) => {
      if (!tenantId) throw new Error("Tenant not resolved");
      if (!user?.id) throw new Error("Not signed in");

      const { data: oldRow, error: readErr } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("id", input.contractId)
        .maybeSingle();
      if (readErr) throw readErr;
      if (!oldRow) throw new Error("Contract not found");

      const old = oldRow as Record<string, unknown>;
      const state = (old.contract_state as string | null) ?? "draft";
      if (!canReissueContract(state)) {
        throw new Error(
          `This contract is ${state} and is kept exactly as it is. Record a correction or a dated variation instead.`,
        );
      }

      const employeeId = old.employee_id as string;
      const snapshot = (old.terms_snapshot as Record<string, unknown> | null) ?? {};
      const versionNumber = ((old.version_number as number | null) ?? 1) + 1;
      const rootId = (old.root_contract_id as string | null) || (old.id as string);

      const issueDate = new Date().toISOString().slice(0, 10);
      let contractReference: string | null = null;
      const { data: refData, error: refError } = await supabase.rpc("allocate_contract_reference", {
        _tenant_id: tenantId,
      });
      if (refError) console.error("Failed to allocate contract reference:", refError);
      else contractReference = (refData as unknown as string) || null;

      const companyLegalName =
        (snapshot.company_legal_name as string | undefined) || companySettings?.company_name || "Your Company";
      const companyAddress =
        (snapshot.company_address as string | undefined) || companySettings?.address || "";

      const blob = await pdf(
        createElement(ContractPDF, {
          variables: input.variables,
          contractType: input.contractType,
          companyLegalName,
          companyAddress,
          contractReference,
          issueDate,
          templateVersion: CONTRACT_TEMPLATE_VERSION,
          contractVersion: versionNumber,
        }) as never,
      ).toBlob();

      const safeName = input.variables.employeeName.replace(/\s+/g, "_");
      const filePath = `${employeeId}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from("employee-documents")
        .upload(filePath, new File([blob], `Employment_Contract_${safeName}.pdf`, { type: "application/pdf" }));
      if (uploadErr) throw uploadErr;

      const { data: newDoc, error: insertErr } = await supabase
        .from("employee_documents")
        .insert({
          tenant_id: tenantId,
          employee_id: employeeId,
          document_type: "contract",
          document_name: `Employment Contract — ${input.variables.employeeName}`,
          file_path: filePath,
          file_size: blob.size,
          mime_type: "application/pdf",
          uploaded_by: user.id,
          contract_state: "draft",
          contract_send_status: "draft",
          version_number: versionNumber,
          parent_contract_id: input.contractId,
          root_contract_id: rootId,
          contract_reference: contractReference,
          issue_date: issueDate,
          template_version: CONTRACT_TEMPLATE_VERSION,
          requires_details_first: (old.requires_details_first as boolean | null) ?? false,
          terms_snapshot: {
            template_version: CONTRACT_TEMPLATE_VERSION,
            template_effective_date: CURRENT_CONTRACT_TEMPLATE.effectiveDate,
            contract_type: input.contractType,
            company_legal_name: companyLegalName,
            company_address: companyAddress,
            issued_at: new Date().toISOString(),
            corrected_from_contract_id: input.contractId,
            correction_reason: input.reason,
            correction_changes: input.changes,
            variables: input.variables,
          },
        } as never)
        .select()
        .single();
      if (insertErr) throw insertErr;

      const newId = (newDoc as { id: string }).id;

      // The earlier copy keeps its file; it is only marked as replaced.
      const { error: supErr } = await supabase
        .from("employee_documents")
        .update({
          contract_state: "superseded",
          superseded_by: newId,
          superseded_at: new Date().toISOString(),
        } as never)
        .eq("id", input.contractId);
      if (supErr) throw supErr;

      await supabase.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: user.id,
        action: "update",
        table_name: "employee_documents",
        record_id: newId,
        old_data: { contract_id: input.contractId, state } as never,
        new_data: {
          event: "contract_corrected_and_reissued",
          replaces_contract_id: input.contractId,
          version_number: versionNumber,
          reason: input.reason,
          changes: input.changes,
        } as never,
      } as never);

      if (input.changes.length) {
        await supabase.from("employee_changes").insert(
          input.changes.map((c) => ({
            tenant_id: tenantId,
            employee_id: employeeId,
            changed_by: user.id,
            change_type: "contract_corrected",
            field_name: c.field,
            old_value: c.previous,
            new_value: c.next,
            notes: input.reason,
          })) as never,
        );
      }

      return newDoc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_contracts"] });
      qc.invalidateQueries({ queryKey: ["contract_version_history"] });
      qc.invalidateQueries({ queryKey: ["employee_documents"] });
    },
  });
}

interface CorrectionInput {
  contractId: string;
  employeeId: string;
  field: string;
  label: string;
  previousValue: string;
  newValue: string;
  reason: string;
}

/** Corrections recorded against one contract, newest first. */
export function useContractCorrections(contractId: string | null | undefined) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["contract_corrections", tenantId, contractId],
    enabled: !!tenantId && !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_corrections")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("contract_id", contractId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Record a dated correction against a signed contract. No file is produced,
 * altered, restamped or reworded — the signed copy stays exactly as it is.
 */
export function useRecordContractCorrection() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CorrectionInput) => {
      if (!tenantId) throw new Error("Tenant not resolved");
      if (!user?.id) throw new Error("Not signed in");
      if (!input.reason.trim()) throw new Error("Please say why this is being corrected");

      const { data, error } = await supabase
        .from("contract_corrections")
        .insert({
          tenant_id: tenantId,
          contract_id: input.contractId,
          employee_id: input.employeeId,
          field: input.field,
          label: input.label,
          previous_value: input.previousValue,
          new_value: input.newValue,
          reason: input.reason.trim(),
          corrected_by: user.id,
        } as never)
        .select()
        .single();
      if (error) throw error;

      await supabase.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: user.id,
        action: "create",
        table_name: "contract_corrections",
        record_id: (data as { id: string }).id,
        new_data: {
          event: "contract_correction_recorded",
          contract_id: input.contractId,
          field: input.field,
          previous_value: input.previousValue,
          new_value: input.newValue,
          reason: input.reason.trim(),
          note: "Signed document unchanged — correction recorded alongside it.",
        } as never,
      } as never);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract_corrections"] });
    },
  });
}

export { LOCKED_CONTRACT_STATES };
