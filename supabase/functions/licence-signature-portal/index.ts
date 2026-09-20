import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Public licensing-signature portal — no sign-in required.
 * GET  ?token=...                → the document to read
 * POST { action: "mark_read" }   → reader confirms they have read it
 * POST { action: "sign" }        → signature captured (read must come first)
 * POST { action: "not_ready" }   → reader stops for now; the link stays live
 *
 * A signed document is never changed: signing twice is refused.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  try {
    const reqUrl = new URL(req.url);
    let token = reqUrl.searchParams.get("token") || "";
    let body: any = {};
    if (req.method === "POST") {
      body = await req.json();
      token = body?.token || token;
    }
    if (!token) return json({ error: "Missing link" }, 400);

    const { data: request } = await admin
      .from("licence_signature_requests")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!request) return json({ error: "invalid", message: "This link is not valid." }, 404);
    if (request.status === "cancelled") {
      return json({ error: "cancelled", message: "This request was cancelled. Ask your manager to send it again." }, 410);
    }
    if (new Date(request.expires_at).getTime() < Date.now() && !request.signed_at) {
      return json({ error: "expired", message: "This link has expired. Ask your manager to send it again." }, 410);
    }

    const publicView = (r: any) => ({
      id: r.id,
      subject_type: r.subject_type,
      document_title: r.document_title,
      document: r.document_body,
      recipient_name: r.recipient_name,
      recipient_role: r.recipient_role,
      branch: r.branch,
      status: r.status,
      read_at: r.read_at,
      signed_at: r.signed_at,
      signer_name: r.signer_name,
      expires_at: r.expires_at,
      sent_by_name: r.sent_by_name,
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;

    if (req.method === "GET") {
      if (request.status === "sent") {
        await admin
          .from("licence_signature_requests")
          .update({ status: "viewed", updated_at: new Date().toISOString() })
          .eq("id", request.id);
      }
      return json({ request: publicView({ ...request, status: request.status === "sent" ? "viewed" : request.status }) });
    }

    const action = body?.action;

    if (request.signed_at && action !== "state") {
      return json({ error: "already_signed", message: "This document has already been signed." }, 409);
    }

    if (action === "mark_read") {
      const { data: updated, error } = await admin
        .from("licence_signature_requests")
        .update({
          status: "read",
          read_at: request.read_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ request: publicView(updated) });
    }

    if (action === "not_ready") {
      const note = String(body?.note || "").slice(0, 500) || null;
      const { data: updated, error } = await admin
        .from("licence_signature_requests")
        .update({ status: "declined", declined_note: note, updated_at: new Date().toISOString() })
        .eq("id", request.id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      await admin.from("audit_log").insert({
        tenant_id: request.tenant_id,
        action: "update",
        table_name: "licence_signature_requests",
        record_id: request.id,
        new_data: {
          event: "signature_declined",
          event_label: "Reader not ready to sign yet",
          branch: request.branch,
          next: { Reader: request.recipient_name, Note: note ?? "" },
        },
      });
      return json({ request: publicView(updated) });
    }

    if (action === "sign") {
      if (!request.read_at) {
        return json({ error: "not_read", message: "Please read the document and confirm before signing." }, 400);
      }
      const signature = String(body?.signature || "");
      const signerName = String(body?.signer_name || "").trim();
      if (!signature.startsWith("data:image/")) {
        return json({ error: "Signature is missing" }, 400);
      }
      if (!signerName) return json({ error: "Enter your full name" }, 400);

      const signedAt = new Date().toISOString();
      const { data: updated, error } = await admin
        .from("licence_signature_requests")
        .update({
          status: "signed",
          signed_at: signedAt,
          signature,
          signer_name: signerName,
          signer_ip: ip,
          signer_user_agent: ua,
          updated_at: signedAt,
        })
        .eq("id", request.id)
        .is("signed_at", null)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);

      // A staff signature completes their half of the alcohol authorisation.
      // Approval by the DPS or licence holder is unchanged and still required.
      // Every site record created from this one request is signed together, so a
      // person who works at more than one site only signs once.
      if (request.subject_type === "staff_alcohol" && request.authorisation_id) {
        await admin
          .from("alcohol_authorisations")
          .update({
            employee_signature: signature,
            employee_signed_at: signedAt,
            updated_at: signedAt,
          })
          .eq("request_id", request.id);
      }

      await admin.from("audit_log").insert({
        tenant_id: request.tenant_id,
        action: "update",
        table_name: "licence_signature_requests",
        record_id: request.id,
        new_data: {
          event: "signature_recorded",
          event_label: "Signature recorded",
          branch: request.branch,
          next: {
            Document: request.document_title,
            "Signed by": signerName,
            "Signed at": signedAt,
            Device: ua ?? "",
            "IP address": ip ?? "",
          },
        },
      });

      return json({ request: publicView(updated) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("licence-signature-portal failed", e);
    return json({ error: (e as Error).message }, 500);
  }
});
