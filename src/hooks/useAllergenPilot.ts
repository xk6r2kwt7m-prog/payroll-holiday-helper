/**
 * Controlled pilot data layer for Ugly Dumpling Allergen Safety.
 *
 * It reads who could take part and, only when management presses the button,
 * prepares three pilot assignments marked "Pilot — Not sent". It never sends an
 * email, link, reminder or notification, never publishes a course version and
 * never issues a certificate.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { logComplianceAudit } from "@/hooks/useCompliance";
import { UD_SITES } from "@/data/allergen/ud-july-2026-menus";
import type { PilotCandidate } from "@/lib/allergen-preview";

export const PILOT_NOT_SENT_NOTE = "Pilot — Not sent";
export const PILOT_ASSIGNMENT_SOURCE = "controlled_pilot";
/* The record stays at the ordinary starting point; the note carries the pilot hold. */
export const PILOT_ASSIGNMENT_STATUS = "not_started";

/** FOH reads as front of house; kitchen departments read as kitchen. */
function audienceForDepartment(department: string): "foh" | "kitchen" | null {
  const d = (department ?? "").trim().toUpperCase();
  if (d === "FOH") return "foh";
  if (d === "BOH" || d === "KITCHEN") return "kitchen";
  return null;
}

/**
 * Eligible people: currently employed, not a test record, front of house or
 * kitchen, and based at one of the three sites. Nobody is contacted by listing.
 */
export function usePilotCandidates() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-pilot-candidates", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<PilotCandidate[]> => {
      const [{ data: employees, error: eErr }, { data: links, error: lErr }] = await Promise.all([
        supabase
          .from("employees")
          .select("id, forename, surname, department, status, is_test_record, archived_at")
          .eq("tenant_id", tenantId!)
          .is("archived_at", null)
          .eq("is_test_record", false),
        supabase.from("employee_branches").select("employee_id, branch, is_primary").eq("tenant_id", tenantId!),
      ]);
      if (eErr) throw eErr;
      if (lErr) throw lErr;

      const siteFor = new Map<string, string>();
      for (const row of links ?? []) {
        const site = UD_SITES.find((s) => s.toLowerCase() === String((row as any).branch ?? "").trim().toLowerCase());
        if (!site) continue;
        if ((row as any).is_primary || !siteFor.has((row as any).employee_id)) {
          siteFor.set((row as any).employee_id, site);
        }
      }

      const out: PilotCandidate[] = [];
      for (const e of employees ?? []) {
        if (String((e as any).status) === "leaver") continue;
        const audience = audienceForDepartment((e as any).department);
        const site = siteFor.get((e as any).id);
        if (!audience || !site) continue;
        out.push({
          employee_id: (e as any).id,
          name: `${(e as any).forename} ${(e as any).surname}`.trim(),
          site,
          audience,
        });
      }
      return out.sort((a, b) => a.site.localeCompare(b.site) || a.name.localeCompare(b.name));
    },
  });
}

/** Pilot assignments already prepared, so nobody is added twice. */
export function usePilotAssignments() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-pilot-assignments", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_assignments")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("assignment_source", PILOT_ASSIGNMENT_SOURCE)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Prepares the three pilot assignments. Each row is held at "Pilot — Not sent"
 * with manual-only notification, so sending still needs separate approval.
 */
export function usePreparePilotAssignments() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      candidates: PilotCandidate[];
      courseVersion?: number | null;
      draftId?: string | null;
      dueDate?: string | null;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      if (input.candidates.length !== 3) throw new Error("Exactly three people are needed for the pilot.");

      const { data: branches, error: bErr } = await supabase
        .from("branch_locations")
        .select("id, branch, display_name")
        .eq("tenant_id", tenantId);
      if (bErr) throw bErr;
      const norm = (v: string) => String(v ?? "").trim().toLowerCase().replace(/^ud\s+/, "");
      const branchIdFor = (site: string) =>
        (branches ?? []).find(
          (b: any) => norm(b.branch) === site.toLowerCase() || norm(b.display_name) === site.toLowerCase(),
        )?.id ?? null;

      const rows = input.candidates.map((c) => ({
        tenant_id: tenantId,
        employee_id: c.employee_id,
        branch_id: branchIdFor(c.site),
        audience: c.audience,
        course_version: input.courseVersion ?? null,
        draft_id: input.draftId ?? null,
        assignment_source: PILOT_ASSIGNMENT_SOURCE,
        status: PILOT_ASSIGNMENT_STATUS,
        notification_state: "manual_only",
        due_date: input.dueDate ?? null,
        assigned_by: user?.id ?? null,
        assigned_by_name: user?.email ?? null,
        note: PILOT_NOT_SENT_NOTE,
        is_test: false,
      }));

      const { data, error } = await supabase.from("allergen_assignments").insert(rows as any).select("*");
      if (error) throw error;

      for (const row of data ?? []) {
        await logComplianceAudit({
          tenantId,
          table: "allergen_assignments",
          recordId: (row as any).id,
          event: "allergen_assignment_created",
          note: `Controlled pilot assignment prepared and held at "${PILOT_NOT_SENT_NOTE}". Nothing was sent: the learner has not been notified and sending needs separate approval.`,
        });
      }
      return data ?? [];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergen-pilot-assignments"] });
      qc.invalidateQueries({ queryKey: ["allergen-assignments"] });
    },
  });
}
