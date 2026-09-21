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
      personal_licence_number: r.personal_licence_number,
      personal_licence_authority: r.personal_licence_authority,
      personal_licence_confirmed_at: r.personal_licence_confirmed_at,
      personal_licence_file_on_record: !!r.personal_licence_file_path,
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

    /**
     * The Designated Premises Supervisor confirms his personal licence details
     * before signing. The confirmed number and issuing authority are written
     * into the document being signed, onto every premises record he supervises,
     * and — where he supplies a photo of the badge — into the compliance
     * certificates as an all-sites record. Nothing is overwritten silently:
     * every change is written to the audit log.
     */
    if (action === "confirm_licence") {
      const number = String(body?.personal_licence_number || "").trim();
      const authority = String(body?.issuing_authority || "").trim();
      if (!number) return json({ error: "Enter your personal licence number" }, 400);
      if (!authority) return json({ error: "Enter the council that issued your licence" }, 400);

      // Optional photo or scan of the physical badge.
      let filePath: string | null = request.personal_licence_file_path ?? null;
      const fileData = String(body?.file_data || "");
      if (fileData.startsWith("data:")) {
        const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return json({ error: "The file could not be read. Please try another photo." }, 400);
        const mime = match[1];
        const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
        if (bytes.byteLength > 10 * 1024 * 1024) {
          return json({ error: "That file is larger than 10MB. Please use a smaller photo." }, 400);
        }
        const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1] || "jpg";
        const path = `licensing/personal-licence/${request.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await admin.storage
          .from("evidence-files")
          .upload(path, bytes, { contentType: mime, upsert: false });
        if (upErr) return json({ error: `Upload failed: ${upErr.message}` }, 500);
        filePath = path;
      }

      // Reflect the confirmed details in the document he is about to sign.
      const doc = { ...(request.document_body as any) };
      if (Array.isArray(doc.signature_block)) {
        doc.signature_block = doc.signature_block.map((f: any) => {
          if (f.label === "Personal Licence Number") return { ...f, value: number };
          if (f.label === "Issuing Authority") return { ...f, value: authority };
          return f;
        });
      }

      const now = new Date().toISOString();
      const { data: updated, error } = await admin
        .from("licence_signature_requests")
        .update({
          personal_licence_number: number,
          personal_licence_authority: authority,
          personal_licence_file_path: filePath,
          personal_licence_confirmed_at: now,
          document_body: doc,
          updated_at: now,
        })
        .eq("id", request.id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);

      // Keep every premises he supervises in step with the confirmed number.
      const dpsName = (request.recipient_name || "").trim();
      if (dpsName) {
        await admin
          .from("premises_licences")
          .update({ dps_personal_licence_number: number, updated_at: now })
          .eq("tenant_id", request.tenant_id)
          .eq("dps_name", dpsName);
      }

      // File the badge as an all-sites compliance certificate (no expiry —
      // personal licences no longer expire under the Deregulation Act 2015).
      if (filePath) {
        const { data: existing } = await admin
          .from("compliance_certificates")
          .select("id")
          .eq("tenant_id", request.tenant_id)
          .eq("certificate_type", "personal_licence")
          .eq("certificate_number", number)
          .maybeSingle();
        const certRow = {
          tenant_id: request.tenant_id,
          branch: "All sites",
          certificate_type: "personal_licence",
          certificate_number: number,
          holder_name: dpsName || request.recipient_name,
          holder_job_title: "Designated Premises Supervisor",
          renewal_status: "current",
          expiry_date: null,
          applies_to_all_branches: true,
          file_path: filePath,
          notes: `Issuing authority: ${authority}. Supplied by the Designated Premises Supervisor when signing ${request.document_title}. Personal licences do not expire (Deregulation Act 2015).`,
          updated_at: now,
        };
        if (existing?.id) {
          await admin.from("compliance_certificates").update(certRow).eq("id", existing.id);
        } else {
          await admin.from("compliance_certificates").insert(certRow);
        }
      }

      await admin.from("audit_log").insert({
        tenant_id: request.tenant_id,
        action: "update",
        table_name: "licence_signature_requests",
        record_id: request.id,
        new_data: {
          event: "personal_licence_confirmed",
          event_label: "Personal licence details confirmed by the DPS",
          branch: request.branch,
          next: {
            Person: dpsName,
            "Personal licence number": number,
            "Issuing authority": authority,
            "Copy of licence supplied": filePath ? "Yes" : "No",
          },
        },
      });

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
