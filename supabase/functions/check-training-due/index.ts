import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7Str = in7Days.toISOString().split("T")[0];

    // Past 7 days for overdue window
    const past7 = new Date(today);
    past7.setDate(past7.getDate() - 7);
    const past7Str = past7.toISOString().split("T")[0];

    // Fetch assignments that are assigned/in-progress with a due_date in range
    const { data: assignments, error } = await supabase
      .from("training_assignments")
      .select(
        "id, due_date, employee_id, document_id, tenant_id, status, training_library(title), employees(user_id, forename, surname)"
      )
      .in("status", ["assigned", "in_progress"])
      .not("due_date", "is", null)
      .gte("due_date", past7Str)
      .lte("due_date", in7Str);

    if (error) throw error;
    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No training due", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate: check which notifications were already sent today
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("metadata")
      .gte("created_at", todayStr + "T00:00:00Z")
      .in("event_type", ["training_due_soon", "training_overdue"]);

    const alreadyNotified = new Set<string>();
    if (existingNotifs) {
      for (const n of existingNotifs) {
        const meta = n.metadata as any;
        if (meta?.assignment_id) alreadyNotified.add(meta.assignment_id);
      }
    }

    // Get tenant admins/managers
    const tenantIds = [...new Set(assignments.map((a: any) => a.tenant_id))];
    const { data: tenantMembers } = await supabase
      .from("tenant_members")
      .select("user_id, tenant_id")
      .in("tenant_id", tenantIds)
      .in("role", ["company_admin", "manager"])
      .eq("is_active", true);

    const adminsByTenant = new Map<string, string[]>();
    if (tenantMembers) {
      for (const m of tenantMembers) {
        if (!adminsByTenant.has(m.tenant_id)) adminsByTenant.set(m.tenant_id, []);
        adminsByTenant.get(m.tenant_id)!.push(m.user_id);
      }
    }

    const notifications: any[] = [];

    for (const a of assignments as any[]) {
      if (alreadyNotified.has(a.id)) continue;

      const dueDate = new Date(a.due_date + "T00:00:00");
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
      const title = a.training_library?.title || "Training";
      const emp = a.employees;
      const empName = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
      const dateLabel = dueDate.toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      });

      const metadata = {
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

      // Notify employee
      if (emp?.user_id) {
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

    let insertedCount = 0;
    if (notifications.length > 0) {
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from("notifications")
          .insert(batch);
        if (insertError) {
          console.error("Insert error:", insertError);
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
