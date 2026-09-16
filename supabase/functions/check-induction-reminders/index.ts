// Daily job: chases unfinished inductions and (optionally) sends the induction
// automatically to new starters. Never touches a completed induction, a test
// record, or anything a manager has not switched on.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_DAYS = [3, 7, 14];
const WEEKLY_AFTER = 14;
const APP_URL = "https://udp.lovable.app";

const daysBetween = (from: string, to: Date) =>
  Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000);

function reminderDue(pack: any, now: Date): boolean {
  if (pack.is_test_send || pack.completed_at || !pack.sent_at) return false;
  if (pack.token_expires_at && new Date(pack.token_expires_at).getTime() < now.getTime()) return false;
  const since = daysBetween(pack.sent_at, now);
  if (since < REMINDER_DAYS[0]) return false;
  if (pack.reminder_sent_at && daysBetween(pack.reminder_sent_at, now) < 1) return false;
  if (REMINDER_DAYS.includes(since)) return true;
  if (since > WEEKLY_AFTER) return (since - WEEKLY_AFTER) % 7 === 0;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const now = new Date();
  let reminders = 0;
  let autoSent = 0;
  const notes: string[] = [];

  try {
    // ── 1. Chase unfinished inductions ──────────────────────────────────────
    const { data: packs } = await supabase
      .from("induction_packs")
      .select("id, tenant_id, employee_id, token, sent_at, completed_at, reminder_sent_at, reminder_count, token_expires_at, is_test_send, recipient_email, branch, staff_role, employees(forename, surname, email, status, archived_at)")
      .is("completed_at", null);

    for (const pack of packs ?? []) {
      if (!reminderDue(pack, now)) continue;
      const emp: any = (pack as any).employees;
      if (emp?.archived_at || emp?.status === "leaver") continue;
      const email = pack.recipient_email || emp?.email;
      if (!email) continue;

      const { count } = await supabase
        .from("induction_pack_items")
        .select("id", { count: "exact", head: true })
        .eq("pack_id", pack.id);

      const days = daysBetween(pack.sent_at, now);
      await supabase.functions.invoke("send-notification", {
        body: {
          to: email,
          subject: "Reminder: please finish your induction",
          type: "induction_reminder",
          tenant_id: pack.tenant_id,
          data: {
            first_name: emp?.forename ?? "there",
            induction_url: `${APP_URL}/induction/${pack.token}`,
            document_count: String(count ?? 0),
            branch: pack.branch ?? "",
            days_outstanding: String(days),
          },
        },
      });

      await supabase
        .from("induction_packs")
        .update({
          reminder_sent_at: now.toISOString(),
          reminder_count: (pack.reminder_count ?? 0) + 1,
        })
        .eq("id", pack.id);
      reminders++;
    }

    // ── 2. Optional automatic induction for new starters ────────────────────
    const { data: prefRows } = await supabase
      .from("tenant_preferences")
      .select("tenant_id, preferences")
      .eq("category", "training_docs");

    for (const row of prefRows ?? []) {
      const prefs: any = row.preferences ?? {};
      if (prefs.auto_assign_induction !== true) continue;

      const { data: employees } = await supabase
        .from("employees")
        .select("id, forename, surname, email, branch, department, job_title, status, archived_at, is_test_record")
        .eq("tenant_id", row.tenant_id)
        .is("archived_at", null)
        .neq("status", "leaver");

      const candidates = (employees ?? []).filter(
        (e: any) => !e.is_test_record && !!e.email
      );
      if (candidates.length === 0) continue;

      const { data: existing } = await supabase
        .from("induction_packs")
        .select("employee_id")
        .eq("tenant_id", row.tenant_id);
      const hasPack = new Set((existing ?? []).map((p: any) => p.employee_id));

      const { data: docs } = await supabase
        .from("compliance_documents")
        .select("id, branches, applies_to_all_branches, roles, applies_to_all_roles, include_in_induction, alcohol_related, status, archived_at, expires_at, approval_status")
        .eq("tenant_id", row.tenant_id)
        .eq("status", "active")
        .eq("include_in_induction", true)
        .eq("approval_status", "approved");

      for (const emp of candidates) {
        if (hasPack.has(emp.id)) continue;
        const applicable = (docs ?? []).filter((d: any) => {
          if (d.archived_at) return false;
          if (d.expires_at && new Date(`${d.expires_at}T23:59:59`) < now) return false;
          if (d.alcohol_related) return false;
          const branchOk = d.applies_to_all_branches || (d.branches ?? []).includes(emp.branch);
          const roleOk = d.applies_to_all_roles;
          return branchOk && roleOk;
        });
        if (applicable.length === 0) continue;

        const { error } = await supabase.functions.invoke("send-induction-pack", {
          body: {
            tenant_id: row.tenant_id,
            employeeIds: [emp.id],
            branch: emp.branch,
            staffRole: null,
            documentIds: applicable.map((d: any) => d.id),
            includesAlcohol: false,
            autoAssigned: true,
          },
        });
        if (error) {
          notes.push(`${emp.forename} ${emp.surname}: ${error.message}`);
          continue;
        }
        autoSent++;
      }
    }

    return new Response(
      JSON.stringify({ reminders, auto_assigned: autoSent, notes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
