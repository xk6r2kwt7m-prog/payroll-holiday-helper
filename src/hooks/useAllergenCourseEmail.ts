/**
 * Emailing the allergen course link to staff — one explicit approval per send.
 *
 * Nothing here runs on its own: no reminders, no scheduled chasing, no bulk
 * background sending. The administrator chooses the people and presses send.
 *
 * For each chosen person it:
 *   1. makes sure they have a genuine (non-test) assignment to the course, so
 *      the link actually opens for them;
 *   2. sends one email containing only their first name and the course link;
 *   3. records the attempt on the assignment and in the audit trail.
 *
 * The course must be published first — an unpublished course would send people
 * to a page that politely refuses them.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { logComplianceAudit } from "@/hooks/useCompliance";
import { getCanonicalOrigin } from "@/lib/getCanonicalUrl";
import { UD_SITES } from "@/data/allergen/ud-july-2026-menus";

export const ALLERGEN_COURSE_PATH = "/training/allergen-safety";
export const ALLERGEN_EMAIL_SOURCE = "direct";

export function allergenCourseUrl(): string {
  return `${getCanonicalOrigin()}${ALLERGEN_COURSE_PATH}`;
}

export interface CourseRecipient {
  employee_id: string;
  name: string;
  email: string | null;
  site: string;
  audience: "foh" | "kitchen";
  assignment_id: string | null;
  notification_state: string | null;
  assignment_status: string | null;
  last_note: string | null;
}

/** Simple per-person state for the management panel. */
export function recipientState(r: CourseRecipient): "not_sent" | "link_sent" | "in_progress" | "completed" {
  if (r.assignment_status === "completed" || r.assignment_status === "certified") return "completed";
  if (r.assignment_status && r.assignment_status !== "not_started") return "in_progress";
  if (r.notification_state === "sent") return "link_sent";
  return "not_sent";
}

function audienceForDepartment(department: string): "foh" | "kitchen" | null {
  const d = (department ?? "").trim().toUpperCase();
  if (d === "FOH") return "foh";
  if (d === "BOH" || d === "KITCHEN") return "kitchen";
  return null;
}

/**
 * Everyone who could be sent the course: employed, not a test record, front of
 * house or kitchen, based at one of the three sites. Listing contacts nobody.
 */
export function useCourseRecipients() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-course-recipients", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<CourseRecipient[]> => {
      const [{ data: employees, error: eErr }, { data: links, error: lErr }, { data: assignments, error: aErr }] =
        await Promise.all([
          supabase
            .from("employees")
            .select("id, forename, surname, email, department, status, is_test_record, archived_at")
            .eq("tenant_id", tenantId!)
            .is("archived_at", null)
            .eq("is_test_record", false),
          supabase
            .from("employee_branches")
            .select("employee_id, branch, is_primary")
            .eq("tenant_id", tenantId!),
          supabase
            .from("allergen_assignments")
            .select("id, employee_id, notification_state, status, note, created_at")
            .eq("tenant_id", tenantId!)
            .eq("is_test", false)
            .order("created_at", { ascending: false }),
        ]);
      if (eErr) throw eErr;
      if (lErr) throw lErr;
      if (aErr) throw aErr;

      const siteFor = new Map<string, string>();
      for (const row of links ?? []) {
        const site = UD_SITES.find(
          (s) => s.toLowerCase() === String((row as any).branch ?? "").trim().toLowerCase(),
        );
        if (!site) continue;
        if ((row as any).is_primary || !siteFor.has((row as any).employee_id)) {
          siteFor.set((row as any).employee_id, site);
        }
      }

      const assignmentFor = new Map<string, any>();
      for (const a of assignments ?? []) {
        if (!assignmentFor.has((a as any).employee_id)) assignmentFor.set((a as any).employee_id, a);
      }

      const out: CourseRecipient[] = [];
      for (const e of employees ?? []) {
        if (String((e as any).status) === "leaver") continue;
        const audience = audienceForDepartment((e as any).department);
        const site = siteFor.get((e as any).id);
        if (!audience || !site) continue;
        const assignment = assignmentFor.get((e as any).id) ?? null;
        out.push({
          employee_id: (e as any).id,
          name: `${(e as any).forename ?? ""} ${(e as any).surname ?? ""}`.trim(),
          email: (e as any).email ?? null,
          site,
          audience,
          assignment_id: assignment?.id ?? null,
          notification_state: assignment?.notification_state ?? null,
          assignment_status: assignment?.status ?? null,
          last_note: assignment?.note ?? null,
        });
      }
      return out.sort((a, b) => a.site.localeCompare(b.site) || a.name.localeCompare(b.name));
    },
  });
}

export interface CourseEmailOutcome {
  employee_id: string;
  name: string;
  success: boolean;
  error?: string;
}

/**
 * Sends the course link to the chosen people. One email each, only on this
 * explicit press. Never called automatically.
 */
export function useSendAllergenCourseEmail() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      recipients: CourseRecipient[];
      courseVersion: number | null;
      dueDate?: string | null;
      companyName?: string | null;
    }): Promise<CourseEmailOutcome[]> => {
      if (!tenantId) throw new Error("No tenant");
      if (!input.recipients.length) throw new Error("Choose at least one person first.");

      const url = allergenCourseUrl();
      const outcomes: CourseEmailOutcome[] = [];

      for (const person of input.recipients) {
        if (!person.email) {
          outcomes.push({
            employee_id: person.employee_id,
            name: person.name,
            success: false,
            error: "No email address on file — add one on their record first.",
          });
          continue;
        }

        let assignmentId = person.assignment_id;
        try {
          if (!assignmentId) {
            const { data: branch } = await supabase
              .from("branch_locations")
              .select("id, branch, display_name")
              .eq("tenant_id", tenantId)
              .limit(50);
            const norm = (v: string) => String(v ?? "").trim().toLowerCase().replace(/^ud\s+/, "");
            const branchId =
              (branch ?? []).find(
                (b: any) =>
                  norm(b.branch) === person.site.toLowerCase() ||
                  norm(b.display_name) === person.site.toLowerCase(),
              )?.id ?? null;

            const { data: created, error: insErr } = await supabase
              .from("allergen_assignments")
              .insert({
                tenant_id: tenantId,
                employee_id: person.employee_id,
                branch_id: branchId,
                audience: person.audience,
                course_version: input.courseVersion ?? null,
                assignment_source: ALLERGEN_EMAIL_SOURCE,
                status: "not_started",
                notification_state: "approved_to_send",
                due_date: input.dueDate ?? null,
                assigned_by: user?.id ?? null,
                assigned_by_name: user?.email ?? null,
                note: "Assigned by the administrator so the course link opens for this person.",
                is_test: false,
              } as any)
              .select("id")
              .single();
            if (insErr) throw insErr;
            assignmentId = (created as any)?.id ?? null;
          }

          const { data, error } = await supabase.functions.invoke("send-notification", {
            body: {
              to: person.email,
              subject: "Your allergen safety training is ready",
              type: "training_course_link",
              data: {
                employee_name: person.name,
                course_name: "Allergen Safety",
                course_url: url,
                company_name: input.companyName || "Ugly Dumpling",
                due_date: input.dueDate ?? "",
              },
              tenant_id: tenantId,
            },
          });

          const failure = error?.message ?? (data as any)?.error ?? null;

          if (assignmentId) {
            await supabase
              .from("allergen_assignments")
              .update({
                notification_state: failure ? "approved_to_send" : "sent",
                note: failure
                  ? `Course link email failed on ${new Date().toISOString().slice(0, 10)}: ${failure}`
                  : `Course link emailed by the administrator on ${new Date().toISOString().slice(0, 10)}.`,
              } as any)
              .eq("id", assignmentId)
              .eq("tenant_id", tenantId);

            await logComplianceAudit({
              tenantId,
              table: "allergen_assignments",
              recordId: assignmentId,
              event: failure ? "allergen_course_link_email_failed" : "allergen_course_link_emailed",
              note: failure
                ? `Administrator approved sending the allergen course link to ${person.name}; the email was not accepted: ${failure}`
                : `Administrator sent the allergen course link to ${person.name}. Email contained the first name and the course link only.`,
            });
          }

          outcomes.push({
            employee_id: person.employee_id,
            name: person.name,
            success: !failure,
            error: failure ?? undefined,
          });
        } catch (err: any) {
          outcomes.push({
            employee_id: person.employee_id,
            name: person.name,
            success: false,
            error: err?.message ?? "Could not send",
          });
        }
      }

      return outcomes;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergen-course-recipients"] });
      qc.invalidateQueries({ queryKey: ["allergen-assignments"] });
      qc.invalidateQueries({ queryKey: ["allergen-pilot-assignments"] });
    },
  });
}
