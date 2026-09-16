import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_DAYS = [90, 60, 30, 0];

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00Z`);
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target.getTime() - start) / 86400000);
}

/**
 * Certificate / licence expiry reminders at 90, 60, 30 days and on the day.
 * Branch managers are notified for their own branch only; admins see all.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: certs, error } = await admin
      .from("compliance_certificates")
      .select("id, tenant_id, branch, certificate_type, certificate_number, expiry_date, renewal_status")
      .not("expiry_date", "is", null)
      .neq("renewal_status", "renewed");
    if (error) throw error;

    const due = (certs ?? []).filter((c: any) => REMINDER_DAYS.includes(daysUntil(c.expiry_date)));
    if (due.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders due", notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: alreadySent } = await admin
      .from("notifications")
      .select("metadata")
      .eq("event_type", "compliance_certificate_expiry")
      .gte("created_at", `${todayStr}T00:00:00Z`);
    const seen = new Set<string>();
    (alreadySent ?? []).forEach((n: any) => {
      if (n.metadata?.certificate_id) seen.add(`${n.metadata.certificate_id}`);
    });

    const tenantIds = [...new Set(due.map((c: any) => c.tenant_id))];
    const { data: members } = await admin
      .from("tenant_members")
      .select("user_id, tenant_id, role")
      .in("tenant_id", tenantIds)
      .in("role", ["company_admin", "manager"])
      .eq("is_active", true);

    // Branch scoping: a manager's branches come from their employee record.
    const { data: employeeBranches } = await admin
      .from("employee_branches")
      .select("branch, employees(user_id)")
      .in("branch", [...new Set(due.map((c: any) => c.branch))]);
    const branchesByUser = new Map<string, Set<string>>();
    (employeeBranches ?? []).forEach((row: any) => {
      const uid = row.employees?.user_id;
      if (!uid) return;
      if (!branchesByUser.has(uid)) branchesByUser.set(uid, new Set());
      branchesByUser.get(uid)!.add(row.branch);
    });

    const notifications: any[] = [];
    for (const cert of due as any[]) {
      if (seen.has(cert.id)) continue;
      const days = daysUntil(cert.expiry_date);
      const label =
        days === 0
          ? "expires today"
          : `expires in ${days} days`;
      const title = days === 0 ? "Certificate expires today" : "Certificate expiring";
      const bodyText = `${cert.certificate_type} at ${cert.branch}${
        cert.certificate_number ? ` (${cert.certificate_number})` : ""
      } ${label}.`;

      for (const m of members ?? []) {
        if (m.tenant_id !== cert.tenant_id) continue;
        if (m.role === "manager") {
          const mine = branchesByUser.get(m.user_id);
          if (!mine || !mine.has(cert.branch)) continue;
        }
        notifications.push({
          tenant_id: cert.tenant_id,
          user_id: m.user_id,
          event_type: "compliance_certificate_expiry",
          title,
          body: bodyText,
          link: "/compliance",
          metadata: { certificate_id: cert.id, branch: cert.branch, days_until: days },
        });
      }
    }

    let inserted = 0;
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      const { error: insErr } = await admin.from("notifications").insert(batch);
      if (insErr) console.error("Insert error:", insErr);
      else inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ message: "Compliance expiry check complete", certificates_due: due.length, notifications_sent: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-compliance-expiry failed:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
