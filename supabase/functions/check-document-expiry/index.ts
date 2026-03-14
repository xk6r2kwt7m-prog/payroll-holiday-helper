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
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const todayStr = today.toISOString().split("T")[0];
    const in7Str = in7Days.toISOString().split("T")[0];
    const in30Str = in30Days.toISOString().split("T")[0];

    // Fetch documents expiring within 30 days or already expired (within last 7 days)
    const pastWeekStr = new Date(today.getTime() - 7 * 86400000)
      .toISOString()
      .split("T")[0];

    const { data: docs, error } = await supabase
      .from("employee_documents")
      .select(
        "id, document_name, document_type, expires_at, employee_id, tenant_id, employees(user_id, forename, surname)"
      )
      .not("expires_at", "is", null)
      .gte("expires_at", pastWeekStr)
      .lte("expires_at", in30Str)
      .in("document_status", ["verified", "pending"]);

    if (error) throw error;
    if (!docs || docs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expiring documents found", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate: check which notifications were already sent today
    const docIds = docs.map((d: any) => d.id);
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("metadata")
      .gte("created_at", todayStr + "T00:00:00Z")
      .in("event_type", [
        "document_expiry_warning",
        "document_expired",
      ]);

    const alreadyNotified = new Set<string>();
    if (existingNotifs) {
      for (const n of existingNotifs) {
        const meta = n.metadata as any;
        if (meta?.document_id) alreadyNotified.add(meta.document_id);
      }
    }

    // Get tenant admins/managers for admin notifications
    const tenantIds = [...new Set(docs.map((d: any) => d.tenant_id))];
    const { data: tenantMembers } = await supabase
      .from("tenant_members")
      .select("user_id, tenant_id, role")
      .in("tenant_id", tenantIds)
      .in("role", ["company_admin", "manager"])
      .eq("is_active", true);

    const adminsByTenant = new Map<string, string[]>();
    if (tenantMembers) {
      for (const m of tenantMembers) {
        if (!adminsByTenant.has(m.tenant_id)) {
          adminsByTenant.set(m.tenant_id, []);
        }
        adminsByTenant.get(m.tenant_id)!.push(m.user_id);
      }
    }

    const notifications: any[] = [];

    for (const doc of docs) {
      if (alreadyNotified.has(doc.id)) continue;

      const expiryDate = new Date(doc.expires_at + "T00:00:00");
      const daysUntil = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / 86400000
      );
      const emp = (doc as any).employees;
      const empName = emp ? `${emp.forename} ${emp.surname}` : "Unknown";
      const dateLabel = expiryDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      let eventType: string;
      let urgency: string;
      let employeeTitle: string;
      let employeeBody: string;
      let adminTitle: string;
      let adminBody: string;

      if (daysUntil < 0) {
        // Already expired
        eventType = "document_expired";
        urgency = "expired";
        employeeTitle = "Document expired";
        employeeBody = `Your ${doc.document_name} expired on ${dateLabel}. Please upload a new version as soon as possible.`;
        adminTitle = "Employee document expired";
        adminBody = `${empName}'s ${doc.document_name} expired on ${dateLabel}. Action required.`;
      } else if (daysUntil <= 7) {
        // Urgent: expires within 7 days
        eventType = "document_expiry_warning";
        urgency = "7_days";
        employeeTitle = "Document expiring soon";
        employeeBody = `Your ${doc.document_name} expires on ${dateLabel} (${daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}). Please renew it now.`;
        adminTitle = "Document expiring soon";
        adminBody = `${empName}'s ${doc.document_name} expires on ${dateLabel} (${daysUntil <= 1 ? "urgent" : `${daysUntil} days`}).`;
      } else {
        // 30-day warning
        eventType = "document_expiry_warning";
        urgency = "30_days";
        employeeTitle = "Document expiring in 30 days";
        employeeBody = `Your ${doc.document_name} expires on ${dateLabel}. Consider renewing it soon.`;
        adminTitle = "Document expiring";
        adminBody = `${empName}'s ${doc.document_name} expires on ${dateLabel} (${daysUntil} days).`;
      }

      const metadata = {
        document_id: doc.id,
        document_type: doc.document_type,
        expires_at: doc.expires_at,
        urgency,
      };

      // Notify employee
      if (emp?.user_id) {
        notifications.push({
          tenant_id: doc.tenant_id,
          user_id: emp.user_id,
          event_type: eventType,
          title: employeeTitle,
          body: employeeBody,
          link: "/staff",
          metadata,
        });
      }

      // Notify admins/managers
      const admins = adminsByTenant.get(doc.tenant_id) || [];
      for (const adminId of admins) {
        notifications.push({
          tenant_id: doc.tenant_id,
          user_id: adminId,
          event_type: eventType,
          title: adminTitle,
          body: adminBody,
          link: "/employees",
          metadata,
        });
      }
    }

    // Filter against user notification preferences
    const userIds = [...new Set(notifications.map((n: any) => n.user_id))];
    const { data: prefRows } = await supabase
      .from("notification_preferences")
      .select("user_id, documents")
      .in("user_id", userIds);

    const disabledUsers = new Set<string>();
    if (prefRows) {
      for (const p of prefRows) {
        if (p.documents === false) disabledUsers.add(p.user_id);
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
          console.error("Insert error:", insertError);
        } else {
          insertedCount += batch.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Document expiry check complete",
        documents_checked: docs.length,
        notifications_sent: insertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Document expiry check failed:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
