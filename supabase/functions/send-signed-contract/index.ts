import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CANONICAL_APP_URL = "https://udp.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ── Authenticate the caller ──
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResult } = await userClient.auth.getUser();
    const user = userResult?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const documentId = typeof body?.document_id === "string" ? body.document_id : null;
    if (!documentId) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc } = await admin
      .from("employee_documents")
      .select("id, tenant_id, employee_id, document_name, final_signed_pdf_url, employees ( forename, surname, email )")
      .eq("id", documentId)
      .maybeSingle();

    if (!doc) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Authorise: caller must be an active admin/manager of this tenant ──
    const { data: membership } = await admin
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", doc.tenant_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership || !["company_admin", "manager"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Not permitted" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Must be fully signed ──
    const { data: sigs } = await admin
      .from("contract_signatures")
      .select("signer_type")
      .eq("employee_document_id", documentId);

    const hasEmployee = sigs?.some((s: any) => s.signer_type === "employee");
    const hasEmployer = sigs?.some((s: any) => s.signer_type === "employer");
    if (!hasEmployee || !hasEmployer) {
      return new Response(JSON.stringify({ error: "This contract is not fully signed yet." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const employee = (doc as any).employees;
    const recipient = body?.recipient_email || employee?.email;
    if (!recipient) {
      return new Response(JSON.stringify({ error: "No email address on file for this employee." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const employeeName = `${employee?.forename || ""} ${employee?.surname || ""}`.trim();
    const firstName = employee?.forename || "there";

    // ── Long-lived download token (90 days) so staff can open without login ──
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const { data: token, error: tokenError } = await admin
      .from("signing_tokens")
      .insert({
        employee_document_id: documentId,
        employee_id: doc.employee_id,
        signer_type: "download",
        expires_at: expiresAt.toISOString(),
        tenant_id: doc.tenant_id,
      })
      .select()
      .single();

    if (tokenError || !token) {
      return new Response(JSON.stringify({ error: "Could not create the download link." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalContractUrl = `${CANONICAL_APP_URL}/document/view?token=${token.token}&variant=final`;

    const { error: sendError } = await admin.functions.invoke("send-notification", {
      body: {
        to: recipient,
        subject: "Your signed contract",
        type: "contract_fully_signed",
        data: {
          employee_name: employeeName,
          first_name: firstName,
          signed_at: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
          final_contract_url: finalContractUrl,
        },
        tenant_id: doc.tenant_id,
      },
    });

    await admin.from("audit_log").insert({
      action: "create",
      table_name: sendError ? "email_failed" : "email_sent",
      record_id: documentId,
      tenant_id: doc.tenant_id,
      user_id: user.id,
      new_data: {
        event: "completed_contract_sent_to_employee",
        status: sendError ? "failed" : "sent",
        email_type: "contract_fully_signed",
        recipient_email: recipient,
        employee_name: employeeName,
        trigger: "manual_admin",
      },
    });

    if (sendError) {
      return new Response(JSON.stringify({ error: "The email could not be sent. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, recipient }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-signed-contract error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
