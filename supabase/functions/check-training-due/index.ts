import { londonDateKey, trainingReminderDecision } from "../_shared/training-reminder-policy.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardRequest } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Reminder runs send email. Only the scheduler (service role) or a signed-in
  // company administrator may start one — never an anonymous caller.
  const guard = await guardRequest(req, { adminOnly: true, cors: corsHeaders });
  if (!guard.ok) return guard.response;
  if (!guard.internal && !guard.tenantId) return new Response(JSON.stringify({ error: "Company must be specified" }), { status: 403, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const todayStr = londonDateKey(today);
    const in7Str = new Date(Date.parse(todayStr) + 7 * 86400000).toISOString().slice(0, 10);

    // Human administrators can only run their own workspace. Only scheduler runs span tenants.
    let assignmentQuery = supabase.from("training_assignments")
      .select("id, due_date, employee_id, document_id, tenant_id, status, viewed_at, acknowledged_at, quiz_passed, signoff_required, signed_off_at, training_library(title, status, requires_quiz, requires_acknowledgement), employees(user_id, forename, surname, status, archived_at, end_date, is_test_record)")
      .in("status", ["assigned", "viewed", "in_progress", "acknowledged"])
      .not("due_date", "is", null).lte("due_date", in7Str);
    if (!guard.internal) assignmentQuery = assignmentQuery.eq("tenant_id", guard.tenantId!);
    const { data: assignments, error } = await assignmentQuery;

    if (error) throw error;
    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No training due", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate: check which notifications were already sent today
    const { data: existingNotifs, error: dedupeError } = await supabase
      .from("notifications")
      .select("metadata, user_id")
      .gte("created_at", new Date(today.getTime() - 26 * 3600000).toISOString())
      .in("event_type", ["training_due_soon", "training_overdue"]);

    if (dedupeError) throw dedupeError;
    const alreadyNotified = new Set<string>();
    if (existingNotifs) {
      for (const n of existingNotifs) {
        const meta = n.metadata as any;
        if (meta?.assignment_id && meta?.reminder_date === todayStr) alreadyNotified.add(`${meta.assignment_id}:${n.user_id}`);
      }
    }

    // Get tenant admins/managers
    const tenantIds = [...new Set(assignments.map((a: any) => a.tenant_id))];
    const { data: tenantMembers, error: membersError } = await supabase
      .from("tenant_members")
      .select("user_id, tenant_id")
      .in("tenant_id", tenantIds)
      .in("role", ["company_admin", "manager"])
      .eq("is_active", true);

    if (membersError) throw membersError;
    const adminsByTenant = new Map<string, string[]>();
    if (tenantMembers) {
      for (const m of tenantMembers) {
        if (!adminsByTenant.has(m.tenant_id)) adminsByTenant.set(m.tenant_id, []);
        adminsByTenant.get(m.tenant_id)!.push(m.user_id);
      }
    }

    const notifications: any[] = [];

    for (const a of assignments as any[]) {
      const decision = trainingReminderDecision(a, todayStr);
      if (!decision) continue;

      const dueDate = new Date(a.due_date + "T00:00:00");
      const { daysUntil, managerOnly } = decision;
      const title = a.training_library?.title || "Training";
      const emp = a.employees;
      const empName = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
      const dateLabel = dueDate.toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });

      const metadata = {
        reminder_date: todayStr,
        assignment_id: a.id,
        document_id: a.document_id,
        due_date: a.due_date,
      };

      let eventType: string;
      let employeeTitle: string;
      let employeeBody: string;
      let adminTitle: string;
      let adminBody: string;

      if (daysUntil < 0) {
        // Overdue
        eventType = "training_overdue";
        employeeTitle = `Training overdue: ${title}`;
        employeeBody = `This was due on ${dateLabel}. Please complete it as soon as possible.`;
        adminTitle = `Training overdue: ${empName}`;
        adminBody = `${empName} has not completed "${title}" (due ${dateLabel}).`;
      } else if (daysUntil <= 1) {
        // Due tomorrow or today
        eventType = "training_due_soon";
        const when = daysUntil === 0 ? "today" : "tomorrow";
        employeeTitle = `Training due ${when}: ${title}`;
        employeeBody = `Please complete this before ${dateLabel}.`;
        adminTitle = `Training due ${when}: ${empName}`;
        adminBody = `${empName}'s "${title}" is due ${when} (${dateLabel}).`;
      } else {
        // 7-day warning
        eventType = "training_due_soon";
        employeeTitle = `Training due in ${daysUntil} days: ${title}`;
        employeeBody = `Due on ${dateLabel}. Plan time to complete this soon.`;
        adminTitle = `Training due soon: ${empName}`;
        adminBody = `${empName}'s "${title}" is due on ${dateLabel} (${daysUntil} days).`;
      }

      if (managerOnly) {
        adminTitle = `Training sign-off needed: ${empName}`;
        adminBody = `${empName} has completed the staff steps for "${title}". Please review the practical evidence and sign off when satisfied.`;
      }
      // Staff are not chased for a step that only their manager can complete.
      if (!managerOnly && emp?.user_id && !alreadyNotified.has(`${a.id}:${emp.user_id}`)) {
        notifications.push({
          tenant_id: a.tenant_id,
          user_id: emp.user_id,
          event_type: eventType,
          title: employeeTitle,
          body: employeeBody,
          link: "/staff",
          metadata,
        });
      }

      // Notify admins/managers
      const admins = adminsByTenant.get(a.tenant_id) || [];
      for (const adminId of admins) {
        if (alreadyNotified.has(`${a.id}:${adminId}`) || (!managerOnly && adminId === emp?.user_id)) continue;
        notifications.push({
          tenant_id: a.tenant_id,
          user_id: adminId,
          event_type: eventType,
          title: adminTitle,
          body: adminBody,
          link: "/training",
          metadata,
        });
      }
    }

    // Filter notifications against user preferences
    const userIds = [...new Set(notifications.map((n: any) => n.user_id))];
    if (notifications.length === 0) return new Response(JSON.stringify({ notifications_sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: prefRows, error: preferencesError } = await supabase
      .from("notification_preferences")
      .select("user_id, training")
      .in("user_id", userIds);

    if (preferencesError) throw preferencesError;
    const disabledUsers = new Set<string>();
    if (prefRows) {
      for (const p of prefRows) {
        if (p.training === false) disabledUsers.add(p.user_id);
      }
    }
    const filtered = notifications.filter((n: any) => !disabledUsers.has(n.user_id));

    let insertedCount = 0;
    if (filtered.length > 0) {
      for (let i = 0; i < filtered.length; i += 100) {
        const batch = filtered.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from("notifications")
          .insert(batch);
        if (insertError) {
          throw insertError;
        } else {
          insertedCount += batch.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Training reminder check complete",
        assignments_checked: assignments.length,
        notifications_sent: insertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Training reminder check failed:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
