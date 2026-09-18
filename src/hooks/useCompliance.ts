import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { DEFAULT_INSPECTION_CHECKLIST } from "@/lib/inspection-readiness";
import {
  COMPLIANCE_AUDIT_LABELS, auditActionForEvent, derivedEvents, diffFields,
  type ComplianceAuditEvent,
} from "@/lib/compliance-audit-events";

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

/* ─────────────── Compliance audit trail ─────────────── */

/**
 * Writes one entry per compliance event into the shared audit log.
 * Entries are insert-only: the log cannot be edited or deleted, so history is
 * never silently overwritten.
 */
export async function logComplianceAudit(opts: {
  tenantId: string;
  table: string;
  recordId: string | null;
  event: ComplianceAuditEvent;
  previous?: Record<string, any> | null;
  next?: Record<string, any> | null;
  branch?: string | null;
  note?: string | null;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const changes = opts.next ? diffFields(opts.previous, opts.next) : [];
    const events: ComplianceAuditEvent[] = [opts.event, ...derivedEvents(changes)];
    const rows = events.map((event) => ({
      tenant_id: opts.tenantId,
      user_id: user?.id ?? null,
      action: auditActionForEvent(event),
      table_name: opts.table,
      record_id: opts.recordId,
      old_data: {
        event,
        event_label: COMPLIANCE_AUDIT_LABELS[event],
        branch: opts.branch ?? null,
        previous: changes.reduce<Record<string, string>>((acc, c) => {
          acc[c.label] = c.previous;
          return acc;
        }, {}),
      },
      new_data: {
        event,
        event_label: COMPLIANCE_AUDIT_LABELS[event],
        note: opts.note ?? null,
        branch: opts.branch ?? null,
        changes,
        next: changes.reduce<Record<string, string>>((acc, c) => {
          acc[c.label] = c.next;
          return acc;
        }, {}),
      },
    }));
    const { error } = await supabase.from("audit_log").insert(rows as any);
    if (error) console.error("Compliance audit log failed:", error);
  } catch (e) {
    console.error("Compliance audit log failed:", e);
  }
}

/** Full history for one compliance record, newest first. */
export function useComplianceAuditTrail(table: string, recordId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["compliance_audit", table, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, action, old_data, new_data, created_at, user_id")
        .eq("tenant_id", tenantId!)
        .eq("table_name", table)
        .eq("record_id", recordId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId && !!recordId,
  });
}

async function fetchDocument(id: string) {
  const { data } = await supabase.from("compliance_documents").select("*").eq("id", id).single();
  return data ?? null;
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
        const previous = await fetchDocument(id);
        const { data, error } = await supabase
          .from("compliance_documents")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        if (tenantId) {
          await logComplianceAudit({
            tenantId,
            table: "compliance_documents",
            recordId: id,
            event: rest.file_path && rest.file_path !== previous?.file_path
              ? "file_replaced"
              : "document_edited",
            previous,
            next: rest,
          });
        }
        return data;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("compliance_documents")
        .insert({ ...rest, tenant_id: tenantId!, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      if (tenantId) {
        await logComplianceAudit({
          tenantId,
          table: "compliance_documents",
          recordId: data.id,
          event: "document_created",
          previous: null,
          next: rest,
        });
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance_documents"] }),
  });
}

/** Approves or rejects a document. Only approved documents reach staff. */
export function useSetDocumentApproval() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      id, approval_status, note,
    }: { id: string; approval_status: "draft" | "awaiting_approval" | "approved" | "rejected"; note?: string }) => {
      const previous = await fetchDocument(id);
      const { data: { user } } = await supabase.auth.getUser();
      const updates = {
        approval_status,
        approval_note: note?.trim() || null,
        approved_by: approval_status === "approved" ? user?.id ?? null : null,
        approved_at: approval_status === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("compliance_documents").update(updates).eq("id", id);
      if (error) throw error;
      if (tenantId) {
        await logComplianceAudit({
          tenantId,
          table: "compliance_documents",
          recordId: id,
          event: approval_status === "approved" ? "document_approved"
            : approval_status === "rejected" ? "document_rejected" : "document_edited",
          previous,
          next: { approval_status, approval_note: updates.approval_note },
          note: note?.trim() || null,
        });
      }
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
          branch_ids: previous.branch_ids ?? [],
          applies_to_all_roles: previous.applies_to_all_roles,
          roles: previous.roles,
          requires_signature: previous.requires_signature,
          include_in_induction: previous.include_in_induction,
          must_display: previous.must_display,
          inspection_required: previous.inspection_required,
          alcohol_related: previous.alcohol_related,
          issue_date: previous.issue_date,
          review_date: previous.review_date,
          owner_name: previous.owner_name,
          owner_job_title: previous.owner_job_title,
          issuing_authority: previous.issuing_authority,
          reference_number: previous.reference_number,
          requirement_classification: previous.requirement_classification,
          ...changes,
          version: (previous.version ?? 1) + 1,
          status: "active",
          approval_status: "awaiting_approval",
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

      if (tenantId) {
        await logComplianceAudit({
          tenantId,
          table: "compliance_documents",
          recordId: created.id,
          event: "version_issued",
          previous,
          next: { version: created.version, file_path: created.file_path, approval_status: "awaiting_approval" },
        });
        await logComplianceAudit({
          tenantId,
          table: "compliance_documents",
          recordId: previous.id,
          event: "document_archived",
          previous: { status: previous.status },
          next: { status: "archived" },
          note: `Superseded by version ${created.version}`,
        });
      }

      // Who completed the previous version? Recorded for a manager decision.
      // Nothing is resent automatically and no completed record is changed.
      if (tenantId) {
        const { data: items } = await supabase
          .from("induction_pack_items")
          .select("document_version, acknowledged_at, pack:induction_packs(employee_id, completed_at, is_test_send)")
          .eq("tenant_id", tenantId)
          .eq("document_id", previous.id);

        const affected = [...new Set(
          (items ?? [])
            .filter((i: any) =>
              i.acknowledged_at && i.pack?.completed_at && !i.pack?.is_test_send && i.pack?.employee_id)
            .map((i: any) => i.pack.employee_id as string)
        )];

        const fileReplaced = !!changes.file_path && changes.file_path !== previous.file_path;
        await supabase.from("document_version_reissues").insert({
          tenant_id: tenantId,
          document_id: created.id,
          document_name: created.name,
          previous_document_id: previous.id,
          from_version: previous.version ?? 1,
          to_version: created.version,
          change_significance: fileReplaced ? "significant" : "minor",
          decision: "pending",
          affected_employee_ids: affected,
          affected_count: affected.length,
          created_by: user?.id ?? null,
        });
      }

      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance_documents"] }),
  });
}

/** Brings an archived document back into the active library (history preserved). */
export function useRestoreComplianceDocument() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      const previous = await fetchDocument(id);
      const { error } = await supabase
        .from("compliance_documents")
        .update({ status: "active", archived_at: null, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (tenantId) {
        await logComplianceAudit({
          tenantId,
          table: "compliance_documents",
          recordId: id,
          event: "document_restored",
          previous: { status: previous?.status },
          next: { status: "active" },
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance_documents"] }),
  });
}

export function useArchiveComplianceDocument() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      const previous = await fetchDocument(id);
      const { error } = await supabase
        .from("compliance_documents")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (tenantId) {
        await logComplianceAudit({
          tenantId,
          table: "compliance_documents",
          recordId: id,
          event: "document_archived",
          previous: { status: previous?.status },
          next: { status: "archived" },
        });
      }
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
        // Roles live in `department` — there is no job_title column on employees.
        .select("*, employees!alcohol_authorisations_employee_id_fkey(forename, surname, department, status, archived_at, is_test_record)")

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

/**
 * Resolves the confirmed location id for a branch name. Every new compliance
 * record stores this id, so records can no longer drift onto a mistyped branch.
 */
export async function resolveBranchLocationId(
  tenantId: string,
  branch?: string | null
): Promise<string | null> {
  if (!branch) return null;
  const { data } = await supabase
    .from("branch_locations")
    .select("id, branch, needs_review")
    .eq("tenant_id", tenantId);
  const match = (data ?? []).find(
    (b: any) => String(b.branch).trim().toLowerCase() === branch.trim().toLowerCase()
  );
  if (!match) {
    throw new Error(
      `"${branch}" is not one of your confirmed locations. Choose a branch from the list.`
    );
  }
  if (match.needs_review) {
    throw new Error(
      `"${branch}" still needs to be confirmed by an administrator before compliance records can be filed against it.`
    );
  }
  return match.id;
}

export function useSaveBranchComplianceItem() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (payload: Record<string, any> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (rest.branch && tenantId) {
        rest.branch_location_id = await resolveBranchLocationId(tenantId, rest.branch);
      }
      if (id) {
        const { data: previous } = await supabase
          .from("branch_compliance_items").select("*").eq("id", id).single();
        const { error } = await supabase
          .from("branch_compliance_items")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        if (tenantId) {
          await logComplianceAudit({
            tenantId, table: "branch_compliance_items", recordId: id,
            event: "document_edited", previous, next: rest,
            branch: previous?.branch ?? rest.branch ?? null,
          });
        }
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from("branch_compliance_items")
        .insert({ ...rest, tenant_id: tenantId!, created_by: user?.id } as any)
        .select("id")
        .single();
      if (error) throw error;
      if (tenantId && created) {
        await logComplianceAudit({
          tenantId, table: "branch_compliance_items", recordId: created.id,
          event: "document_created", previous: null, next: rest, branch: rest.branch ?? null,
        });
      }
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
      // Staff qualifications held company-wide (e.g. Level 2 Food Safety) stay
      // visible whichever site is being viewed.
      if (branch) {
        const safe = branch.replace(/[(),"]/g, "");
        q = q.or(`branch.eq.${safe},applies_to_all_branches.is.true`);
      }
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
      if (rest.branch && tenantId) {
        rest.branch_location_id = await resolveBranchLocationId(tenantId, rest.branch);
      }
      if (id) {
        const { data: previous } = await supabase
          .from("compliance_certificates").select("*").eq("id", id).single();
        const { error } = await supabase
          .from("compliance_certificates")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        if (tenantId) {
          await logComplianceAudit({
            tenantId, table: "compliance_certificates", recordId: id,
            event: "document_edited", previous, next: rest,
            branch: previous?.branch ?? rest.branch ?? null,
          });
        }
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from("compliance_certificates")
        .insert({ ...rest, tenant_id: tenantId!, created_by: user?.id } as any)
        .select("id")
        .single();
      if (error) throw error;
      if (tenantId && created) {
        await logComplianceAudit({
          tenantId, table: "compliance_certificates", recordId: created.id,
          event: "document_created", previous: null, next: rest, branch: rest.branch ?? null,
        });
      }
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
      const branchLocationId = await resolveBranchLocationId(tenantId!, branch);
      const rows = DEFAULT_INSPECTION_CHECKLIST.map((c) => ({
        tenant_id: tenantId!,
        branch,
        branch_location_id: branchLocationId,
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
      if (rest.branch && tenantId) {
        rest.branch_location_id = await resolveBranchLocationId(tenantId, rest.branch);
      }
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
