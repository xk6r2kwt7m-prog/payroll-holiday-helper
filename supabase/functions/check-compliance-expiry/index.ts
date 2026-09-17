import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_DAYS = [90, 60, 30, 0];
const APP_URL = "https://udp.lovable.app";

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00Z`);
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target.getTime() - start) / 86400000);
}

/**
 * A reminder is due 90, 60 and 30 days before expiry, on the expiry date,
 * then weekly (and the day after) for as long as it stays overdue.
 */
function reminderDue(days: number): boolean {
  if (REMINDER_DAYS.includes(days)) return true;
  if (days >= 0) return false;
  const overdue = -days;
  return overdue === 1 || overdue % 7 === 0;
}

function statusLine(days: number): string {
  if (days > 0) return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  if (days === 0) return "Expires today";
  const overdue = -days;
  return `Overdue by ${overdue} day${overdue === 1 ? "" : "s"}`;
}

/**
 * Certificate / licence expiry reminders — in the app and by email.
 * Branch managers hear about their own branch; company admins (Operations
 * Manager) hear about everything and are escalated to once an item is overdue.
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
      .select("id, tenant_id, branch, applies_to_all_branches, certificate_type, certificate_number, holder_name, expiry_date, renewal_status")
      .not("expiry_date", "is", null)
      .neq("renewal_status", "renewed");
    if (error) throw error;

    const due = (certs ?? []).filter((c: any) => reminderDue(daysUntil(c.expiry_date)));
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

    // Email addresses for the people we notify.
    const recipientIds = [...new Set((members ?? []).map((m: any) => m.user_id))];
    const emailByUser = new Map<string, string>();
    const nameByUser = new Map<string, string>();
    if (recipientIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", recipientIds);
      (profiles ?? []).forEach((p: any) => {
        if (p.email) emailByUser.set(p.id, p.email);
        if (p.full_name) nameByUser.set(p.id, p.full_name);
      });
    }

    const notifications: any[] = [];
    const emails: any[] = [];

    for (const cert of due as any[]) {
      if (seen.has(cert.id)) continue;
      const days = daysUntil(cert.expiry_date);
      const overdue = days < 0;
      const title = overdue
        ? "Certificate overdue"
        : days === 0
          ? "Certificate expires today"
          : "Certificate expiring";
      const bodyText = `${cert.certificate_type} at ${cert.branch}${
        cert.certificate_number ? ` (${cert.certificate_number})` : ""
      } — ${statusLine(days).toLowerCase()}.`;

      for (const m of members ?? []) {
        if (m.tenant_id !== cert.tenant_id) continue;
        if (m.role === "manager") {
          // Records held company-wide (staff qualifications) reach every manager;
          // site records stay with the managers of that site.
          if (!cert.applies_to_all_branches) {
            const mine = branchesByUser.get(m.user_id);
            if (!mine || !mine.has(cert.branch)) continue;
          }
        }
        notifications.push({
          tenant_id: cert.tenant_id,
          user_id: m.user_id,
          event_type: "compliance_certificate_expiry",
          title,
          body: bodyText,
          link: "/compliance",
          metadata: {
            certificate_id: cert.id, branch: cert.branch, days_until: days, overdue,
          },
        });

        const email = emailByUser.get(m.user_id);
        if (email) {
          emails.push({
            to: email,
            subject: overdue
              ? `Overdue: ${cert.certificate_type} at ${cert.branch}`
              : `${cert.certificate_type} at ${cert.branch} — ${statusLine(days).toLowerCase()}`,
            type: "compliance_certificate_expiry",
            tenant_id: cert.tenant_id,
            data: {
              recipient_name: nameByUser.get(m.user_id) || "",
              headline: overdue ? "This certificate is overdue" : title,
              certificate_type: cert.certificate_type || "Certificate",
              certificate_number: cert.certificate_number || "",
              holder_name: cert.holder_name || "",
              branch: cert.branch || "",
              expiry_date: cert.expiry_date,
              status_line: statusLine(days),
              link_url: `${APP_URL}/compliance`,
            },
          });
        }
      }
    }

    let inserted = 0;
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      const { error: insErr } = await admin.from("notifications").insert(batch);
      if (insErr) console.error("Insert error:", insErr);
      else inserted += batch.length;
    }

    let emailed = 0;
    for (const payload of emails) {
      const { error: mailErr } = await admin.functions.invoke("send-notification", { body: payload });
      if (mailErr) console.error("Email error:", mailErr.message);
      else emailed += 1;
    }

    return new Response(
      JSON.stringify({
        message: "Compliance expiry check complete",
        certificates_due: due.length,
        notifications_sent: inserted,
        emails_sent: emailed,
      }),
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
