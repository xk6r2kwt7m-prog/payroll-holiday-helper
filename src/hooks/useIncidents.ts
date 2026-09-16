import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { logComplianceAudit, resolveBranchLocationId, uploadComplianceFile } from "@/hooks/useCompliance";
import { diffFields } from "@/lib/compliance-audit-events";
import { defaultConfidentiality, requiresLicenceRecord, incidentDeadline } from "@/lib/incident-categories";

export interface IncidentRow {
  id: string;
  tenant_id: string;
  report_number: string | null;
  branch: string | null;
  branch_location_id: string | null;
  status: string;
  category: string;
  incident_date: string | null;
  incident_time: string | null;
  location_detail: string | null;
  people_involved: string | null;
  description: string | null;
  immediate_action: string | null;
  manager_notified: boolean;
  manager_notified_name: string | null;
  evidence_available: boolean;
  details: Record<string, any>;
  confidentiality: string;
  licence_condition_28: boolean;
  due_at: string | null;
  reported_by_name: string | null;
  submitted_at: string | null;
  created_by: string | null;
  created_at: string;
  [key: string]: any;
}

/** All incidents the signed-in manager is allowed to see (row access enforced by the database). */
export function useIncidents(filters?: { branch?: string; status?: string; category?: string }) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["incident_reports", tenantId, filters?.branch ?? "all", filters?.status ?? "all", filters?.category ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("incident_reports")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("incident_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (filters?.branch) q = q.eq("branch", filters.branch);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.category) q = q.eq("category", filters.category);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as IncidentRow[];
    },
    enabled: !!tenantId,
  });
}

/** A staff member's own reports — they never see anyone else's. */
export function useMyIncidents() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["my_incident_reports", tenantId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("incident_reports")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as IncidentRow[];
    },
    enabled: !!tenantId,
  });
}

export function useIncident(id?: string) {
  return useQuery({
    queryKey: ["incident_report", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("incident_reports").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as unknown as IncidentRow;
    },
    enabled: !!id,
  });
}

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export interface IncidentFormValues {
  id?: string;
  branch?: string | null;
  category: string;
  incident_date?: string | null;
  incident_time?: string | null;
  location_detail?: string | null;
  people_involved?: string | null;
  description?: string | null;
  immediate_action?: string | null;
  manager_notified?: boolean;
  manager_notified_name?: string | null;
  evidence_available?: boolean;
  details?: Record<string, any>;
  reported_by_name?: string | null;
  reported_by_employee_id?: string | null;
  confidentiality?: string;
}

/**
 * Saves a draft or submits a report. Submitting stamps the report number,
 * the submission time and the person who submitted it; the original incident
 * date and time stay separately visible.
 */
export function useSaveIncident() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ values, submit }: { values: IncidentFormValues; submit: boolean }) => {
      const userId = await currentUserId();
      const branchLocationId = values.branch
        ? await resolveBranchLocationId(tenantId!, values.branch)
        : null;
      const row: Record<string, any> = {
        branch: values.branch ?? null,
        branch_location_id: branchLocationId,
        category: values.category,
        incident_date: values.incident_date || null,
        incident_time: values.incident_time || null,
        location_detail: values.location_detail || null,
        people_involved: values.people_involved || null,
        description: values.description || null,
        immediate_action: values.immediate_action || null,
        manager_notified: !!values.manager_notified,
        manager_notified_name: values.manager_notified_name || null,
        evidence_available: !!values.evidence_available,
        details: values.details ?? {},
        reported_by_name: values.reported_by_name || null,
        reported_by_employee_id: values.reported_by_employee_id || null,
        confidentiality: values.confidentiality || defaultConfidentiality(values.category),
        licence_condition_28: requiresLicenceRecord(values.category),
        due_at: incidentDeadline(values.incident_date, values.incident_time)?.toISOString() ?? null,
        status: submit ? "submitted" : "draft",
        updated_at: new Date().toISOString(),
      };
      if (submit) row.submitted_by = userId;

      if (values.id) {
        const { data, error } = await supabase
          .from("incident_reports").update(row as any).eq("id", values.id).select().single();
        if (error) throw error;
        if (tenantId) {
          await logComplianceAudit({
            tenantId, table: "incident_reports", recordId: values.id,
            event: submit ? "incident_submitted" : "incident_created",
            previous: null, next: { status: row.status }, branch: values.branch ?? null,
          });
        }
        return data;
      }

      const { data, error } = await supabase
        .from("incident_reports")
        .insert({ ...row, tenant_id: tenantId!, created_by: userId } as any)
        .select().single();
      if (error) throw error;
      if (tenantId) {
        await logComplianceAudit({
          tenantId, table: "incident_reports", recordId: data.id,
          event: submit ? "incident_submitted" : "incident_created",
          previous: null, next: { status: row.status, category: values.category },
          branch: values.branch ?? null,
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incident_reports"] });
      qc.invalidateQueries({ queryKey: ["my_incident_reports"] });
    },
  });
}

/**
 * Corrects a submitted report. The original entry is preserved: the change is
 * recorded as a dated amendment naming who made it, why, and both values.
 */
export function useAmendIncident() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      incident, updates, reason,
    }: { incident: IncidentRow; updates: Record<string, any>; reason: string }) => {
      if (!reason.trim()) throw new Error("Say why the record is being corrected.");
      const changes = diffFields(incident, updates);
      if (changes.length === 0) throw new Error("Nothing has changed.");
      const userId = await currentUserId();

      const { error } = await supabase
        .from("incident_reports")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", incident.id);
      if (error) throw error;

      const { error: amendError } = await supabase.from("incident_amendments").insert({
        tenant_id: incident.tenant_id,
        incident_id: incident.id,
        reason: reason.trim(),
        changes: changes as any,
        amended_by: userId,
      } as any);
      if (amendError) throw amendError;

      if (tenantId) {
        await logComplianceAudit({
          tenantId, table: "incident_reports", recordId: incident.id,
          event: "incident_amended", previous: incident, next: updates,
          branch: incident.branch, note: reason.trim(),
        });
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["incident_reports"] });
      qc.invalidateQueries({ queryKey: ["incident_report", vars.incident.id] });
      qc.invalidateQueries({ queryKey: ["incident_amendments", vars.incident.id] });
    },
  });
}

/** Investigation fields, status moves and closure — every change is logged. */
export function useUpdateIncidentInvestigation() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      incident, updates, note,
    }: { incident: IncidentRow; updates: Record<string, any>; note?: string }) => {
      const userId = await currentUserId();
      const payload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
      if (updates.status && updates.status !== incident.status) {
        payload.reviewed_by = userId;
        payload.reviewed_at = new Date().toISOString();
        if (updates.status === "closed") {
          payload.closed_at = new Date().toISOString();
          payload.closed_by = userId;
        }
      }
      const { error } = await supabase
        .from("incident_reports").update(payload as any).eq("id", incident.id);
      if (error) throw error;

      if (tenantId) {
        const event = updates.status === "closed"
          ? "incident_closed"
          : updates.status && updates.status !== incident.status
            ? "incident_status_changed"
            : updates.confidentiality && updates.confidentiality !== incident.confidentiality
              ? "incident_confidentiality_changed"
              : "incident_amended";
        await logComplianceAudit({
          tenantId, table: "incident_reports", recordId: incident.id,
          event, previous: incident, next: updates, branch: incident.branch, note: note ?? null,
        });
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["incident_reports"] });
      qc.invalidateQueries({ queryKey: ["incident_report", vars.incident.id] });
    },
  });
}

/** Records that someone opened a report, so every view is traceable. */
export function useLogIncidentView() {
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (incident: { id: string; branch?: string | null }) => {
      if (!tenantId) return;
      await logComplianceAudit({
        tenantId, table: "incident_reports", recordId: incident.id,
        event: "incident_viewed", previous: null, next: null, branch: incident.branch ?? null,
      });
    },
  });
}

export function useIncidentAmendments(incidentId?: string) {
  return useQuery({
    queryKey: ["incident_amendments", incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_amendments")
        .select("*")
        .eq("incident_id", incidentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!incidentId,
  });
}

export function useIncidentEvidence(incidentId?: string) {
  return useQuery({
    queryKey: ["incident_evidence", incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_evidence")
        .select("*")
        .eq("incident_id", incidentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!incidentId,
  });
}

export function useAddIncidentEvidence() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      incidentId, file, label,
    }: { incidentId: string; file: File; label?: string }) => {
      if (file.size > 15 * 1024 * 1024) throw new Error("Files must be 15MB or smaller.");
      const path = await uploadComplianceFile(file, tenantId!, `incidents/${incidentId}`);
      const userId = await currentUserId();
      const { error } = await supabase.from("incident_evidence").insert({
        tenant_id: tenantId!,
        incident_id: incidentId,
        kind: file.type.startsWith("image/") ? "photo" : "file",
        label: label || file.name,
        file_path: path,
        file_name: file.name,
        uploaded_by: userId,
      } as any);
      if (error) throw error;
      if (tenantId) {
        await logComplianceAudit({
          tenantId, table: "incident_evidence", recordId: incidentId,
          event: "incident_evidence_added", previous: null, next: { file_name: file.name },
        });
      }
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["incident_evidence", vars.incidentId] }),
  });
}

export function useWitnessStatements(incidentId?: string) {
  return useQuery({
    queryKey: ["incident_witness_statements", incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_witness_statements")
        .select("*")
        .eq("incident_id", incidentId!)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!incidentId,
  });
}

export function useAddWitnessStatement() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (input: { incidentId: string; witness_name: string; witness_role?: string; statement?: string }) => {
      const userId = await currentUserId();
      const { error } = await supabase.from("incident_witness_statements").insert({
        tenant_id: tenantId!,
        incident_id: input.incidentId,
        witness_name: input.witness_name,
        witness_role: input.witness_role || null,
        statement: input.statement || null,
        taken_by: userId,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["incident_witness_statements", vars.incidentId] }),
  });
}

/* ─────────────── Who may see restricted records ─────────────── */

export function useIncidentAccessGrants() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["incident_access_grants", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_access_grants")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });
}

export function useSetIncidentAccess() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      userId, can_view_medical, can_view_senior, note,
    }: { userId: string; can_view_medical: boolean; can_view_senior: boolean; note?: string }) => {
      const grantedBy = await currentUserId();
      const { error } = await supabase.from("incident_access_grants").upsert({
        tenant_id: tenantId!,
        user_id: userId,
        can_view_medical,
        can_view_senior,
        note: note || null,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
      } as any, { onConflict: "tenant_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incident_access_grants"] }),
  });
}
