import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { DEFAULT_INSPECTION_CHECKLIST } from "@/lib/inspection-readiness";

const BUCKET = "employee-documents";
const PREFIX = "compliance";

/** Uploads a compliance file and returns its storage path. */
export async function uploadComplianceFile(
  file: File,
  tenantId: string,
  folder: string
): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${PREFIX}/${tenantId}/${folder}/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;
  return path;
}

export async function complianceFileUrl(path: string, seconds = 300): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/* ─────────────── Document library ─────────────── */

export function useComplianceDocuments(includeArchived = false) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["compliance_documents", tenantId, includeArchived],
    queryFn: async () => {
      let q = supabase
        .from("compliance_documents")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("category")
        .order("name");
      if (!includeArchived) q = q.neq("status", "archived");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export function useSaveComplianceDocument() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (payload: Record<string, any> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { data, error } = await supabase
          .from("compliance_documents")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("compliance_documents")
        .insert({ ...rest, tenant_id: tenantId!, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance_documents"] }),
  });
}

/**
 * Replaces a document with a new version: the old row is archived (kept forever)
 * and a new active row is created pointing back at it.
 */
export function useReplaceComplianceDocument() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ previous, changes }: { previous: any; changes: Record<string, any> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from("compliance_documents")
        .insert({
          tenant_id: tenantId!,
          name: previous.name,
          category: previous.category,
          description: previous.description,
          applies_to_all_branches: previous.applies_to_all_branches,
          branches: previous.branches,
          applies_to_all_roles: previous.applies_to_all_roles,
          roles: previous.roles,
          requires_signature: previous.requires_signature,
          include_in_induction: previous.include_in_induction,
          must_display: previous.must_display,
          inspection_required: previous.inspection_required,
          alcohol_related: previous.alcohol_related,
          ...changes,
          version: (previous.version ?? 1) + 1,
          status: "active",
          supersedes_document_id: previous.id,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;

      const { error: archiveError } = await supabase
        .from("compliance_documents")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", previous.id);
      if (archiveError) throw archiveError;

      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance_documents"] }),
  });
}

export function useArchiveComplianceDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("compliance_documents")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance_documents"] }),
  });
}

/* ─────────────── Induction packs ─────────────── */

export function useInductionPacks(employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["induction_packs", tenantId, employeeId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("induction_packs")
        .select("*, employees(forename, surname, email, status, archived_at)")
        .eq("tenant_id", tenantId!)
        .order("sent_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export function useInductionPackItems(packId?: string) {
  return useQuery({
    queryKey: ["induction_pack_items", packId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("induction_pack_items")
        .select("*")
        .eq("pack_id", packId!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!packId,
  });
}

export interface SendInductionInput {
  employeeIds: string[];
  branch?: string | null;
  staffRole?: string | null;
  documentIds: string[];
  includesAlcohol?: boolean;
  recipientOverride?: string | null;
  testSend?: boolean;
}

export function useSendInduction() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (input: SendInductionInput) => {
      const { data, error } = await supabase.functions.invoke("send-induction-pack", {
        body: { ...input, tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["induction_packs"] });
      qc.invalidateQueries({ queryKey: ["alcohol_authorisations"] });
    },
  });
}

/* ─────────────── Alcohol authorisations ─────────────── */

export function useAlcoholAuthorisations(employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["alcohol_authorisations", tenantId, employeeId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("alcohol_authorisations")
        .select("*, employees!alcohol_authorisations_employee_id_fkey(forename, surname, status, archived_at)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export function useUpdateAlcoholAuthorisation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("alcohol_authorisations")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alcohol_authorisations"] }),
  });
}

/* ─────────────── Branch compliance ─────────────── */

export function useBranchComplianceItems(branch?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["branch_compliance_items", tenantId, branch ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("branch_compliance_items")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("category")
        .order("name");
      if (branch) q = q.eq("branch", branch);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export function useSaveBranchComplianceItem() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (payload: Record<string, any> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await supabase
          .from("branch_compliance_items")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("branch_compliance_items")
        .insert({ ...rest, tenant_id: tenantId!, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branch_compliance_items"] }),
  });
}

/* ─────────────── Certificates ─────────────── */

export function useComplianceCertificates(branch?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["compliance_certificates", tenantId, branch ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("compliance_certificates")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("expiry_date", { ascending: true, nullsFirst: false });
      if (branch) q = q.eq("branch", branch);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export function useSaveComplianceCertificate() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (payload: Record<string, any> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await supabase
          .from("compliance_certificates")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("compliance_certificates")
        .insert({ ...rest, tenant_id: tenantId!, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance_certificates"] }),
  });
}

/* ─────────────── Inspection checklist + actions ─────────────── */

export function useInspectionChecklist(branch?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["inspection_checklist_items", tenantId, branch ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("inspection_checklist_items")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("sort_order");
      if (branch) q = q.eq("branch", branch);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

/** Creates the editable Westminster starting checklist for a branch. */
export function useSeedInspectionChecklist() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (branch: string) => {
      const rows = DEFAULT_INSPECTION_CHECKLIST.map((c) => ({
        tenant_id: tenantId!,
        branch,
        label: c.label,
        detail: c.detail,
        sort_order: c.sort_order,
        status: "missing",
      }));
      const { error } = await supabase.from("inspection_checklist_items").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection_checklist_items"] }),
  });
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("inspection_checklist_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection_checklist_items"] }),
  });
}

export function useComplianceActions(branch?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["compliance_actions", tenantId, branch ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("compliance_actions")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (branch) q = q.eq("branch", branch);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export function useSaveComplianceAction() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (payload: Record<string, any> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await supabase
          .from("compliance_actions")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("compliance_actions")
        .insert({ ...rest, tenant_id: tenantId!, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance_actions"] }),
  });
}
