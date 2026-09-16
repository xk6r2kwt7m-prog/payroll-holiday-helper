import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://udp.lovable.app";

const SECTION_LABELS: Record<string, string> = {
  personal: "Your contact details (full name, date of birth, phone, home address)",
  emergency: "An emergency contact",
  bank: "Your bank details for pay",
  rtw: "Your right to work document (photo or file)",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function makeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Not signed in" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Not signed in" }, 401);
    const callerId = userData.user.id;

    const body = await req.json();
    const tenantId: string = body?.tenant_id;
    const employeeIds: string[] = body?.employeeIds || [];
    const sections: string[] = (body?.sections || ["personal", "emergency", "bank", "rtw"]).filter(
      (s: string) => s in SECTION_LABELS,
    );
    const recipientOverride: string | null = body?.recipientOverride ?? null;
    const testSend: boolean = body?.testSend === true;
    const expiryDays: number = Math.min(Math.max(Number(body?.expiryDays) || 14, 1), 60);

    if (!tenantId) return json({ error: "Missing tenant" }, 400);
    if (employeeIds.length === 0) return json({ error: "Select at least one staff member" }, 400);
    if (sections.length === 0) return json({ error: "Select at least one section" }, 400);

    const { data: membership } = await admin
      .from("tenant_members")
      .select("role, is_active")
      .eq("tenant_id", tenantId)
      .eq("user_id", callerId)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership || !["company_admin", "manager"].includes(membership.role)) {
      return json({ error: "You do not have permission to request staff details" }, 403);
    }

    const { data: issuer } = await admin
      .from("employees")
      .select("forename, surname")
      .eq("tenant_id", tenantId)
      .eq("user_id", callerId)
      .maybeSingle();
    const issuerName = issuer
      ? `${issuer.forename} ${issuer.surname}`
      : userData.user.email || "Manager";

    const { data: employees, error: empErr } = await admin
      .from("employees")
      .select("id, forename, surname, email")
      .eq("tenant_id", tenantId)
      .in("id", employeeIds);
    if (empErr) throw empErr;

    const expiresAt = new Date(Date.now() + expiryDays * 86400000);
    const sectionList = sections.map((s) => `• ${SECTION_LABELS[s]}`).join("<br/>");

    const results: { employee_id: string; sent: boolean; recipient?: string; error?: string }[] = [];

    for (const emp of employees ?? []) {
      const recipient = recipientOverride || (testSend ? userData.user.email : emp.email);
      if (!recipient) {
        results.push({ employee_id: emp.id, sent: false, error: "No email address on record" });
        continue;
      }

      const token = makeToken();
      const { data: request, error: reqErr } = await admin
        .from("employee_info_requests")
        .insert({
          tenant_id: tenantId,
          employee_id: emp.id,
          token,
          token_expires_at: expiresAt.toISOString(),
          requested_fields: sections,
          recipient_email: recipient,
          requested_by: callerId,
          requested_by_name: issuerName,
          status: "sent",
        })
        .select()
        .single();
      if (reqErr) {
        results.push({ employee_id: emp.id, sent: false, error: reqErr.message });
        continue;
      }

      const detailsUrl = `${APP_URL}/my-details/${token}`;
      let sent = false;
      let sendError: string | undefined;
      try {
        const { data: mail, error: mailErr } = await admin.functions.invoke("send-notification", {
          body: {
            to: recipient,
            subject: `${testSend ? "[TEST] " : ""}Please complete your details`,
            type: "info_request",
            tenant_id: tenantId,
            data: {
              employee_name: `${emp.forename} ${emp.surname}`,
              first_name: emp.forename,
              details_url: detailsUrl,
              section_list: sectionList,
              expires_on: expiresAt.toISOString().slice(0, 10),
            },
          },
        });
        if (mailErr) sendError = mailErr.message;
        else if (mail?.success === false) sendError = mail?.error || "Email provider rejected the message";
        else sent = true;
      } catch (e) {
        sendError = (e as Error).message;
      }

      await admin.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: callerId,
        action: "create",
        table_name: sent ? "employee_info_request_sent" : "employee_info_request_send_failed",
        record_id: request.id,
        new_data: {
          employee_id: emp.id,
          recipient,
          sections,
          requested_by_name: issuerName,
          test_send: testSend,
          error: sendError ?? null,
        },
      });

      results.push({ employee_id: emp.id, sent, recipient, error: sendError });
    }

    const sentCount = results.filter((r) => r.sent).length;
    return json({ success: sentCount > 0, sent: sentCount, results });
  } catch (err) {
    console.error("send-info-request failed:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
