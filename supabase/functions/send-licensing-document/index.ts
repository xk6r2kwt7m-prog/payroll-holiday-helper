import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Emails a copy of a licensing document (DPS written authorisation with the
 * site alcohol register) to a named recipient, and records the issue.
 *
 * Rules:
 *  - Only a signed-in company admin or manager of the tenant may send.
 *  - The PDF is the exact file the manager saw: it is uploaded first, then
 *    attached and/or served behind a secure link.
 *  - The snapshot of the register is stored and never edited afterwards.
 *  - Nothing here authorises anyone or changes a licence or signature.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "employee-documents";
const FROM_ADDRESS = "UglyOps HR <support@uglyops.com>";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function base64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const escape = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Please sign in again and retry." }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Please sign in again and retry." }, 401);

    const body = await req.json();
    const {
      branch, licence_id, subject_type, recipient_name, recipient_email, message,
      attach_pdf, include_link, link_expiry_days, file_path, snapshot,
      authorised_count, listed_count,
    } = body ?? {};

    if (!branch || !subject_type || !file_path) return json({ error: "Missing document details" }, 400);
    if (!recipient_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(recipient_email))) {
      return json({ error: "Enter a valid email address" }, 400);
    }
    if (!attach_pdf && !include_link) {
      return json({ error: "Choose to attach the PDF, include a link, or both" }, 400);
    }

    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("role", ["company_admin", "manager"])
      .maybeSingle();
    if (!membership) return json({ error: "You do not have permission to send this document." }, 403);
    const tenantId = membership.tenant_id;

    if (!String(file_path).startsWith(`compliance/${tenantId}/`)) {
      return json({ error: "The document could not be verified." }, 400);
    }

    const { data: sender } = await supabase
      .from("employees")
      .select("forename, surname")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .maybeSingle();
    const senderName = sender ? `${sender.forename ?? ""} ${sender.surname ?? ""}`.trim() : "";

    const days = Math.min(90, Math.max(1, Math.round(Number(link_expiry_days) || 14)));
    const token = include_link ? crypto.randomUUID().replace(/-/g, "") : null;
    const expiresAt = include_link
      ? new Date(Date.now() + days * 86400000).toISOString()
      : null;
    const deliveryMethod = attach_pdf && include_link
      ? "email_both"
      : include_link ? "email_link" : "email_attachment";

    const { data: issue, error: issueError } = await supabase
      .from("licence_document_issues")
      .insert({
        tenant_id: tenantId,
        branch,
        licence_id: licence_id ?? null,
        subject_type,
        issued_by: user.id,
        issued_by_name: senderName || null,
        recipient_name: recipient_name || null,
        recipient_email,
        delivery_method: deliveryMethod,
        message: message || null,
        snapshot: snapshot ?? {},
        authorised_count: Number(authorised_count) || 0,
        listed_count: Number(listed_count) || 0,
        file_path,
        access_token: token,
        token_expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (issueError) {
      console.error("send-licensing-document: could not record issue", issueError.message);
      return json({ error: "The copy could not be recorded, so nothing was sent." }, 500);
    }

    const linkUrl = token
      ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/licensing-document?token=${token}`
      : null;

    let attachments: unknown[] = [];
    if (attach_pdf) {
      const { data: file, error: fileError } = await supabase.storage
        .from(BUCKET).download(file_path);
      if (fileError || !file) {
        console.error("send-licensing-document: file missing", fileError?.message);
        return json({ error: "The document file could not be read, so nothing was sent." }, 500);
      }
      attachments = [{
        Name: `${String(branch).replace(/[^a-z0-9]+/gi, "-")}-alcohol-authorisation.pdf`,
        Content: base64(new Uint8Array(await file.arrayBuffer())),
        ContentType: "application/pdf",
      }];
    }

    const html = `
      <div style="font-family:sans-serif;color:#1a1a2e;line-height:1.6">
        <p>Hello${recipient_name ? ` ${escape(String(recipient_name))}` : ""},</p>
        <p>Please find the written authorisation to sell alcohol for <strong>${escape(String(branch))}</strong>,
        including the current register of staff at that premises.</p>
        <p><strong>${Number(authorised_count) || 0}</strong> of <strong>${Number(listed_count) || 0}</strong>
        people listed are currently authorised to sell alcohol.</p>
        ${message ? `<p>${escape(String(message)).replace(/\n/g, "<br>")}</p>` : ""}
        ${linkUrl ? `<p><a href="${linkUrl}" style="background:#e94560;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open the document</a></p>
          <p style="font-size:12px;color:#666">This link works for ${days} ${days === 1 ? "day" : "days"} and can be withdrawn at any time.</p>` : ""}
        ${attach_pdf ? `<p style="font-size:12px;color:#666">A PDF copy is attached to this email.</p>` : ""}
        <p>${senderName ? `Sent by ${escape(senderName)}` : "Sent"} from UglyOps HR.</p>
      </div>`;

    const postmarkKey = Deno.env.get("POSTMARK_SERVER_TOKEN");
    if (!postmarkKey) {
      return json({ error: "Email sending is not configured yet." }, 500);
    }

    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": postmarkKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        From: FROM_ADDRESS,
        To: recipient_email,
        Subject: `Authorisation to sell alcohol — ${branch}`,
        HtmlBody: html,
        MessageStream: "outbound",
        ...(attachments.length ? { Attachments: attachments } : {}),
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || (result?.ErrorCode && result.ErrorCode !== 0)) {
      console.error("send-licensing-document: send failed", result?.Message);
      return json({ error: "The email could not be sent. The copy is recorded but not delivered." }, 502);
    }

    await supabase.from("audit_log").insert({
      tenant_id: tenantId,
      user_id: user.id,
      action: "update",
      table_name: "licence_document_issues",
      record_id: issue.id,
      new_data: {
        event: "licence_document_issued",
        event_label: "Licensing document emailed",
        branch,
        subject_type,
        recipient_email,
        delivery_method: deliveryMethod,
        authorised_count: Number(authorised_count) || 0,
        listed_count: Number(listed_count) || 0,
      },
    });

    return json({ sent: true, link: linkUrl });
  } catch (e) {
    console.error("send-licensing-document: unexpected failure", (e as Error).message);
    return json({ error: "The copy could not be sent. Please try again." }, 500);
  }
});
