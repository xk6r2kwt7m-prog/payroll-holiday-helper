/**
 * Ugly Dumpling Allergen Safety — Phase 2 data layer.
 *
 * Assignments, practical observations, certificates and renewal settings.
 * It writes only to the new additive tables. It never publishes a course
 * version, never makes the course available to staff, never sends an email,
 * link, reminder or notification, and never issues a certificate unless every
 * approved gate is met. Test rows always carry is_test = true.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { logComplianceAudit } from "@/hooks/useCompliance";
import {
  certificateNumber,
  certificationGate,
  expiryFor,
  DEFAULT_RENEWAL_SETTINGS,
  type CertificationInput,
  type ObservationResults,
  type RenewalSettings,
} from "@/lib/allergen-certification";
import { ALLERGEN_COURSE_TITLE } from "@/data/allergen/allergen-safety-lessons";
import type { ObservationAudience } from "@/data/allergen/allergen-practical-signoff";

export interface AllergenAssignmentRow {
  id: string;
  tenant_id: string;
  employee_id: string | null;
  user_id: string | null;
  branch_id: string | null;
  audience: ObservationAudience;
  course_version: number | null;
  draft_id: string | null;
  assignment_source: string;
  status: string;
  due_date: string | null;
  notification_state: string;
  assigned_by_name: string | null;
  note: string | null;
  is_test: boolean;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AllergenObservationRow {
  id: string;
  assignment_id: string | null;
  employee_id: string | null;
  user_id: string | null;
  audience: ObservationAudience;
  item_results: ObservationResults;
  items_total: number;
  items_seen: number;
  critical_missed: string[];
  outcome: string;
  observed_on: string | null;
  manager_note: string | null;
  signed_by_name: string | null;
  signed_role: string | null;
  signed_at: string | null;
  is_test: boolean;
  created_at: string;
}

export interface AllergenCertificateRow {
  id: string;
  employee_id: string | null;
  user_id: string | null;
  assignment_id: string | null;
  attempt_id: string | null;
  observation_id: string | null;
  certificate_number: string;
  employee_name: string | null;
  branch_id: string | null;
  course_title: string;
  course_version: number | null;
  score_percent: number | null;
  lessons_completed: number | null;
  lessons_required: number | null;
  practical_signed_by_name: string | null;
  practical_signed_at: string | null;
  issued_at: string;
  issued_by_name: string | null;
  valid_from: string;
  expires_on: string | null;
  status: string;
  superseded_reason: string | null;
  evidence: Record<string, unknown>;
  delivery_state: string;
  is_test: boolean;
}

/* ─────────────────── Assignments ─────────────────── */

export function useAllergenAssignments(isTest: boolean) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-assignments", tenantId, isTest],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_assignments")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_test", isTest)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AllergenAssignmentRow[];
    },
  });
}

export function useCreateAllergenAssignment() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employeeId?: string | null;
      userId?: string | null;
      employeeName?: string | null;
      branchId?: string | null;
      audience: ObservationAudience;
      dueDate?: string | null;
      draftId?: string | null;
      courseVersion?: number | null;
      note?: string | null;
      isTest: boolean;
      assignmentSource?: string;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("allergen_assignments")
        .insert({
          tenant_id: tenantId,
          employee_id: input.employeeId ?? null,
          user_id: input.userId ?? null,
          branch_id: input.branchId ?? null,
          audience: input.audience,
          due_date: input.dueDate ?? null,
          draft_id: input.draftId ?? null,
          course_version: input.courseVersion ?? null,
          assignment_source: input.assignmentSource ?? (input.isTest ? "management_test" : "direct"),
          status: "not_started",
          // Nothing is ever sent without individual approval.
          notification_state: "manual_only",
          assigned_by: user?.id ?? null,
          assigned_by_name: user?.email ?? null,
          note: input.note ?? null,
          is_test: input.isTest,
        } as any)
        .select("*")
        .single();
      if (error) throw error;

      await logComplianceAudit({
        tenantId,
        table: "allergen_assignments",
        recordId: data.id,
        event: "allergen_assignment_created",
        note: `${input.isTest ? "TEST " : ""}assignment created for ${ALLERGEN_COURSE_TITLE}. Nothing sent — the learner is not notified.`,
      });
      return data as unknown as AllergenAssignmentRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-assignments"] }),
  });
}

export function useUpdateAllergenAssignment() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status?: string; dueDate?: string | null; withdraw?: boolean }) => {
      if (!tenantId) throw new Error("No tenant");
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.status) patch.status = input.status;
      if (input.dueDate !== undefined) patch.due_date = input.dueDate;
      if (input.withdraw) {
        patch.status = "withdrawn";
        patch.withdrawn_at = new Date().toISOString();
      }
      const { error } = await supabase.from("allergen_assignments").update(patch as any).eq("id", input.id);
      if (error) throw error;
      if (input.withdraw) {
        await logComplianceAudit({
          tenantId,
          table: "allergen_assignments",
          recordId: input.id,
          event: "allergen_assignment_withdrawn",
          note: "Assignment withdrawn. The record is kept — nothing was deleted.",
        });
      }
      return input.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-assignments"] }),
  });
}

/* ─────────────────── Practical observations ─────────────────── */

export function useAllergenObservations(isTest: boolean, previewKey?: string | null) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-observations", tenantId, isTest, previewKey ?? null],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("allergen_practical_observations")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_test", isTest);
      q = previewKey ? q.eq("preview_key", previewKey) : q.is("preview_key", null);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AllergenObservationRow[];
    },
  });
}

export function useSaveAllergenObservation() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string | null;
      assignmentId?: string | null;
      employeeId?: string | null;
      userId?: string | null;
      branchId?: string | null;
      audience: ObservationAudience;
      results: ObservationResults;
      itemsTotal: number;
      itemsSeen: number;
      criticalMissed: string[];
      outcome: "in_progress" | "passed" | "not_yet_competent";
      observedOn?: string | null;
      managerNote?: string | null;
      courseVersion?: number | null;
      /** Signing is a separate, deliberate action; a signed record is immutable. */
      sign?: boolean;
      signedByName?: string | null;
      signedRole?: string | null;
      isTest: boolean;
      /** Set for a management preview session, so the record is isolated. */
      previewKey?: string | null;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      if (input.sign && input.outcome === "in_progress") {
        throw new Error("Every observation line must be marked before the record can be signed.");
      }

      const payload: Record<string, unknown> = {
        tenant_id: tenantId,
        assignment_id: input.assignmentId ?? null,
        employee_id: input.employeeId ?? null,
        user_id: input.userId ?? null,
        branch_id: input.branchId ?? null,
        audience: input.audience,
        item_results: input.results as any,
        items_total: input.itemsTotal,
        items_seen: input.itemsSeen,
        critical_missed: input.criticalMissed,
        outcome: input.outcome,
        observed_on: input.observedOn ?? new Date().toISOString().slice(0, 10),
        manager_note: input.managerNote ?? null,
        course_version: input.courseVersion ?? null,
        is_test: input.isTest,
        preview_key: input.previewKey ?? null,
        updated_at: new Date().toISOString(),
      };
      if (input.sign) {
        payload.signed_by = user?.id ?? null;
        payload.signed_by_name = input.signedByName ?? user?.email ?? null;
        payload.signed_role = input.signedRole ?? "Manager";
        payload.signed_at = new Date().toISOString();
      }

      let id = input.id ?? null;
      if (id) {
        const { error } = await supabase
          .from("allergen_practical_observations")
          .update(payload as any)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("allergen_practical_observations")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        id = data.id as string;
        await logComplianceAudit({
          tenantId,
          table: "allergen_practical_observations",
          recordId: id,
          event: "allergen_observation_started",
          note: `${input.isTest ? "TEST " : ""}practical observation started against the approved template.`,
        });
      }

      if (input.sign) {
        await logComplianceAudit({
          tenantId,
          table: "allergen_practical_observations",
          recordId: id!,
          event: "allergen_observation_signed",
          note: `Practical observation signed as ${input.outcome === "passed" ? "passed" : "not yet competent"} by ${input.signedByName ?? user?.email ?? "a manager"}. The signed record cannot be changed.`,
        });
      }
      return id!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergen-observations"] });
      qc.invalidateQueries({ queryKey: ["allergen-assignments"] });
    },
  });
}

/* ─────────────────── Certificates ─────────────────── */

export function useAllergenCertificates(isTest: boolean) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-certificates", tenantId, isTest],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_certificates")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_test", isTest)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AllergenCertificateRow[];
    },
  });
}

export function useRenewalSettings() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-renewal-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_renewal_settings")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { ...DEFAULT_RENEWAL_SETTINGS }) as unknown as RenewalSettings & { id?: string };
    },
  });
}

export function useSaveRenewalSettings() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: RenewalSettings) => {
      if (!tenantId) throw new Error("No tenant");
      const { data: existing } = await supabase
        .from("allergen_renewal_settings")
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      const payload = {
        tenant_id: tenantId,
        validity_months: settings.validity_months,
        reminder_days_before: settings.reminder_days_before,
        overdue_reminder_days: settings.overdue_reminder_days,
        automatic_sending_enabled: settings.automatic_sending_enabled,
        new_version_action: settings.new_version_action,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      let id = existing?.id as string | undefined;
      if (id) {
        const { error } = await supabase.from("allergen_renewal_settings").update(payload as any).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("allergen_renewal_settings")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        id = data.id as string;
      }
      await logComplianceAudit({
        tenantId,
        table: "allergen_renewal_settings",
        recordId: id!,
        event: "allergen_renewal_settings_changed",
        note: `Validity ${settings.validity_months} months; reminders ${settings.reminder_days_before.join(", ")} days before expiry; automatic sending ${settings.automatic_sending_enabled ? "ON" : "OFF"}.`,
      });
      return id!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-renewal-settings"] }),
  });
}

/**
 * Issues a certificate. The three approved gates are checked here as well as in
 * the screen, so a certificate cannot be produced by any other route.
 * Certificates are never emailed: delivery_state stays "not_sent".
 */
export function useIssueAllergenCertificate() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      gate: CertificationInput;
      assignmentId?: string | null;
      attemptId?: string | null;
      observationId?: string | null;
      employeeId?: string | null;
      userId?: string | null;
      employeeName?: string | null;
      branchId?: string | null;
      courseVersion?: number | null;
      draftId?: string | null;
      settings: RenewalSettings;
      evidence: Record<string, unknown>;
      isTest: boolean;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      const gate = certificationGate(input.gate);
      if (!gate.eligible) {
        throw new Error(`A certificate cannot be issued yet: ${gate.blockers.join(" ")}`);
      }

      const year = new Date().getUTCFullYear();
      const { count } = await supabase
        .from("allergen_certificates")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_test", input.isTest);
      const number = certificateNumber((count ?? 0) + 1, year, input.isTest);
      const validFrom = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("allergen_certificates")
        .insert({
          tenant_id: tenantId,
          employee_id: input.employeeId ?? null,
          user_id: input.userId ?? null,
          assignment_id: input.assignmentId ?? null,
          attempt_id: input.attemptId ?? null,
          observation_id: input.observationId ?? null,
          certificate_number: number,
          employee_name: input.employeeName ?? null,
          branch_id: input.branchId ?? null,
          course_title: ALLERGEN_COURSE_TITLE,
          course_version: input.courseVersion ?? null,
          draft_id: input.draftId ?? null,
          score_percent: input.gate.assessment?.scorePercent ?? null,
          lessons_completed: input.gate.lessonsComplete,
          lessons_required: input.gate.lessonsRequired,
          practical_signed_by_name: input.gate.observation?.signedByName ?? null,
          practical_signed_at: input.gate.observation?.signedAt ?? null,
          issued_by: user?.id ?? null,
          issued_by_name: user?.email ?? null,
          valid_from: validFrom,
          expires_on: expiryFor(validFrom, input.settings.validity_months),
          status: "valid",
          evidence: input.evidence as any,
          delivery_state: "not_sent",
          is_test: input.isTest,
        } as any)
        .select("*")
        .single();
      if (error) throw error;

      if (input.assignmentId) {
        await supabase
          .from("allergen_assignments")
          .update({ status: "complete", updated_at: new Date().toISOString() } as any)
          .eq("id", input.assignmentId);
      }

      await logComplianceAudit({
        tenantId,
        table: "allergen_certificates",
        recordId: data.id,
        event: "allergen_certificate_issued",
        note: `${input.isTest ? "TEST " : ""}certificate ${number} issued after every required lesson, a pass under the approved assessment rules and a signed practical observation. Not sent to anybody.`,
      });
      return data as unknown as AllergenCertificateRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergen-certificates"] });
      qc.invalidateQueries({ queryKey: ["allergen-assignments"] });
    },
  });
}

export function useChangeCertificateStatus() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: "revoked" | "superseded" | "expired"; reason: string }) => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase
        .from("allergen_certificates")
        .update({
          status: input.status,
          superseded_reason: input.reason,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", input.id);
      if (error) throw error;
      await logComplianceAudit({
        tenantId,
        table: "allergen_certificates",
        recordId: input.id,
        event: input.status === "revoked" ? "allergen_certificate_revoked" : "allergen_certificate_superseded",
        note: `${input.status === "revoked" ? "Revoked" : "Superseded"}: ${input.reason}. The issued facts of the certificate are unchanged.`,
      });
      return input.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allergen-certificates"] }),
  });
}
