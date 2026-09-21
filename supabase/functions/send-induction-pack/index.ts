import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://hr.uglyops.com";

const FINAL_STATEMENT =
  "I confirm that I have received, read and understood the documents and instructions provided to me. I agree to follow the procedures relevant to my role.";

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

/**
 * Sends the notification email and reports back exactly what went wrong.
 * `functions.invoke` hides the reason behind "non-2xx status code", which tells
 * the administrator nothing, so the response body is read and passed through.
 */
async function sendNotificationEmail(
  supabaseUrl: string,
  serviceKey: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; detail: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    if (res.ok) return { ok: true };
    let detail = raw;
    try {
      const parsed = JSON.parse(raw);
      detail = parsed?.error ? String(parsed.error) : raw;
    } catch { /* keep the raw text */ }
    console.error(`send-notification failed [${res.status}]: ${raw}`);
    return { ok: false, detail: detail || `email service returned ${res.status}` };
  } catch (e) {
    console.error("send-notification could not be reached", e);
    return { ok: false, detail: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    // ── Caller must be an active admin/manager of the tenant ──
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Not signed in" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Not signed in" }, 401);
    const callerId = userData.user.id;

    const body = await req.json();
    const tenantId: string = body?.tenant_id;
    const employeeIds: string[] = body?.employeeIds || [];
    const documentIds: string[] = body?.documentIds || [];
    const branch: string | null = body?.branch ?? null;
    const staffRole: string | null = body?.staffRole ?? null;
    const includesAlcohol: boolean = body?.includesAlcohol === true;
    const recipientOverride: string | null = body?.recipientOverride ?? null;
    const testSend: boolean = body?.testSend === true;

    if (!tenantId) return json({ error: "Missing tenant" }, 400);
    if (employeeIds.length === 0) return json({ error: "Select at least one staff member" }, 400);
    if (documentIds.length === 0) return json({ error: "Select at least one document" }, 400);

    const { data: membership } = await admin
      .from("tenant_members")
      .select("role, is_active")
      .eq("tenant_id", tenantId)
      .eq("user_id", callerId)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership || !["company_admin", "manager"].includes(membership.role)) {
      return json({ error: "You do not have permission to send inductions" }, 403);
    }

    const { data: issuer } = await admin
      .from("employees")
      .select("forename, surname")
      .eq("tenant_id", tenantId)
      .eq("user_id", callerId)
      .maybeSingle();
    const issuerName = issuer ? `${issuer.forename} ${issuer.surname}` : userData.user.email || "Manager";

    // ── Documents (server-side snapshot of names + versions) ──
    const { data: docs, error: docErr } = await admin
      .from("compliance_documents")
      .select("id, name, category, version, file_path, requires_signature, alcohol_related")
      .eq("tenant_id", tenantId)
      .in("id", documentIds);
    if (docErr) throw docErr;
    if (!docs || docs.length === 0) return json({ error: "Documents not found" }, 400);

    const { data: employees, error: empErr } = await admin
      .from("employees")
      .select("id, forename, surname, email, department")
      .eq("tenant_id", tenantId)
      .in("id", employeeIds);
    if (empErr) throw empErr;

    const results: { employee_id: string; sent: boolean; recipient?: string; error?: string }[] = [];

    for (const emp of employees ?? []) {
      const recipient = recipientOverride || (testSend ? userData.user.email : emp.email);
      if (!recipient) {
        results.push({ employee_id: emp.id, sent: false, error: "No email address on record" });
        continue;
      }

      const token = makeToken();
      const { data: pack, error: packErr } = await admin
        .from("induction_packs")
        .insert({
          tenant_id: tenantId,
          employee_id: emp.id,
          branch,
          staff_role: staffRole,
          token,
          issued_by: callerId,
          issued_by_name: issuerName,
          status: "sent",
          includes_alcohol: includesAlcohol,
          recipient_email: recipient,
          final_statement_text: FINAL_STATEMENT,
          is_test_send: testSend,
        })
        .select()
        .single();
      if (packErr) {
        results.push({ employee_id: emp.id, sent: false, error: packErr.message });
        continue;
      }

      const items = docs.map((d, i) => ({
        tenant_id: tenantId,
        pack_id: pack.id,
        document_id: d.id,
        document_name: d.name,
        document_version: d.version,
        document_category: d.category,
        file_path: d.file_path,
        requires_signature: d.requires_signature,
        sort_order: i,
      }));
      const { error: itemErr } = await admin.from("induction_pack_items").insert(items);
      if (itemErr) {
        results.push({ employee_id: emp.id, sent: false, error: itemErr.message });
        continue;
      }

      // Alcohol-sales authorisation record starts as pending.
      if (includesAlcohol) {
        const { data: existing } = await admin
          .from("alcohol_authorisations")
          .select("id")
          .eq("employee_id", emp.id)
          .in("status", ["pending", "active"])
          .maybeSingle();
        if (!existing) {
          await admin.from("alcohol_authorisations").insert({
            tenant_id: tenantId,
            employee_id: emp.id,
            branch,
            pack_id: pack.id,
            status: "pending",
          });
        }
      }

      const inductionUrl = `${APP_URL}/induction/${token}`;
      const subject = `${testSend ? "[TEST] " : ""}Your induction documents`;

      const mail = await sendNotificationEmail(url, serviceKey, {
        to: recipient,
        subject,
        type: "induction_pack",
        tenant_id: tenantId,
        data: {
          employee_name: `${emp.forename} ${emp.surname}`,
          first_name: emp.forename,
          induction_url: inductionUrl,
          document_count: String(items.length),
          branch: branch || "",
          staff_role: staffRole || "",
        },
      });
      const sent = mail.ok;
      const sendError = mail.ok ? undefined : mail.detail;

      await admin.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: callerId,
        action: "create",
        table_name: sent ? "induction_pack_sent" : "induction_pack_send_failed",
        record_id: pack.id,
        new_data: {
          employee_id: emp.id,
          recipient,
          branch,
          staff_role: staffRole,
          issued_by_name: issuerName,
          documents: items.map((i) => ({ name: i.document_name, version: i.document_version })),
          test_send: testSend,
          error: sendError ?? null,
        },
      });

      results.push({ employee_id: emp.id, sent, recipient, error: sendError });
    }

    const sentCount = results.filter((r) => r.sent).length;
    return json({ success: sentCount > 0, sent: sentCount, results });
  } catch (err) {
    console.error("send-induction-pack failed:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
