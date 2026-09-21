import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendPayrollRequest {
  recipients: string[];
  cc?: string[];
  subject: string;
  message: string;
  periodName: string;
  tenantId: string;
  pdfBase64: string;
  fileName: string;
  attachPdf?: boolean;
  replyTo?: string;
}

/**
 * Every payroll email is always copied to this address. Enforced server-side so
 * it cannot be omitted by the caller. Changing it is a deliberate edit.
 */
const PAYROLL_ALWAYS_CC = "barros.aderito@hotmail.com";

/** Providers reject very large attachments — refuse clearly instead of failing silently. */
const MAX_PDF_ATTACHMENT_BYTES = 8 * 1024 * 1024;

function resolveCc(recipients: string[], requested: string[] = []): string[] {
  const directRecipients = new Set(recipients.map((r) => r.trim().toLowerCase()).filter(Boolean));
  const out: string[] = [];
  for (const address of [...requested, PAYROLL_ALWAYS_CC]) {
    const email = address?.trim().toLowerCase();
    if (!email || directRecipients.has(email) || out.includes(email)) continue;
    out.push(email);
  }
  return out;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the user token
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body: SendPayrollRequest = await req.json();
    const { recipients, subject, message, periodName, tenantId, pdfBase64, fileName } = body;
    const attachPdf = body.attachPdf !== false;
    const cc = resolveCc(recipients ?? [], body.cc ?? []);

    if (!recipients?.length || !subject || !pdfBase64 || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipients, subject, pdfBase64, tenantId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user is admin of this tenant
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership || membership.role !== "company_admin") {
      return new Response(JSON.stringify({ error: "Permission denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Decode base64 PDF and upload to storage
    const pdfBytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));

    if (attachPdf && pdfBytes.byteLength > MAX_PDF_ATTACHMENT_BYTES) {
      return new Response(
        JSON.stringify({
          error:
            "This payroll PDF is too large to attach to an email. Send it as a secure download link instead.",
          sizeBytes: pdfBytes.byteLength,
          maxBytes: MAX_PDF_ATTACHMENT_BYTES,
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const storagePath = `${tenantId}/email-exports/${Date.now()}_${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("payroll-files")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("[PAYROLL_EMAIL] Upload failed:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF: " + uploadError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create signed URL (7 days)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("payroll-files")
      .createSignedUrl(storagePath, 7 * 24 * 60 * 60); // 7 days in seconds

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[PAYROLL_EMAIL] Signed URL failed:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to create download link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const downloadUrl = signedUrlData.signedUrl;

    // Build email HTML — when the PDF is attached the body carries no link.
    const html = buildPayrollEmailHtml(periodName, message, attachPdf ? null : downloadUrl);

    // Send to each recipient via existing email provider
    const providerName = (Deno.env.get("EMAIL_PROVIDER") || "postmark").toLowerCase();
    const results: { email: string; success: boolean; error?: string }[] = [];
    const attachment = attachPdf
      ? { fileName: fileName || "payroll.pdf", contentBase64: pdfBase64, contentType: "application/pdf" }
      : undefined;

    for (const recipient of recipients) {
      try {
        const sendResult = await sendEmail(providerName, {
          to: recipient.trim(),
          cc,
          subject,
          html,
          from: "UglyOps HR <support@uglyops.com>",
          replyTo: body.replyTo,
          attachment,
        });
        results.push({ email: recipient, success: sendResult.success, error: sendResult.error });

        console.log(
          `[PAYROLL_EMAIL] recipient=${recipient} status=${sendResult.success ? "sent" : "failed"} period=${periodName}`
        );
      } catch (e) {
        results.push({ email: recipient, success: false, error: String(e) });
        console.error(`[PAYROLL_EMAIL] recipient=${recipient} error=${e}`);
      }
    }

    // Audit log
    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "import" as const,
      table_name: "payroll_periods",
      tenant_id: tenantId,
      new_data: {
        operation: "payroll_email_sent",
        period_name: periodName,
        recipients,
        cc,
        attached: attachPdf,
        attachment_bytes: pdfBytes.byteLength,
        results,
        file_path: storagePath,
      },
    });

    const allSuccess = results.every((r) => r.success);
    const anySuccess = results.some((r) => r.success);

    return new Response(
      JSON.stringify({
        success: anySuccess,
        results,
        downloadUrl,
        message: allSuccess
          ? `Payroll sent to ${results.length} recipient(s)`
          : anySuccess
          ? `Sent to some recipients. Check results for details.`
          : "Failed to send to all recipients",
      }),
      {
        status: allSuccess ? 200 : anySuccess ? 207 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    console.error("[PAYROLL_EMAIL] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error: " + String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ─── Email sending (reuses same provider logic as send-notification) ─────────

interface EmailAttachment {
  fileName: string;
  contentBase64: string;
  contentType: string;
}

interface EmailPayload {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  from: string;
  replyTo?: string;
  attachment?: EmailAttachment;
}

interface EmailResult {
  success: boolean;
  error?: string;
}

async function sendViaPostmark(payload: EmailPayload): Promise<EmailResult> {
  const key = Deno.env.get("POSTMARK_SERVER_TOKEN");
  if (!key) throw new Error("POSTMARK_SERVER_TOKEN not configured");
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      From: payload.from,
      To: payload.to,
      ...(payload.cc?.length ? { Cc: payload.cc.join(",") } : {}),
      ...(payload.replyTo ? { ReplyTo: payload.replyTo } : {}),
      Subject: payload.subject,
      HtmlBody: payload.html,
      TextBody: "",
      MessageStream: "outbound",
      ...(payload.attachment
        ? {
            Attachments: [
              {
                Name: payload.attachment.fileName,
                Content: payload.attachment.contentBase64,
                ContentType: payload.attachment.contentType,
              },
            ],
          }
        : {}),
    }),
  });
  const data = await res.json();
  if (data.ErrorCode && data.ErrorCode !== 0) {
    return { success: false, error: data.Message };
  }
  return { success: true };
}

async function sendEmail(provider: string, payload: EmailPayload): Promise<EmailResult> {
  switch (provider) {
    case "resend": {
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) throw new Error("RESEND_API_KEY not configured");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: payload.from,
          to: [payload.to],
          ...(payload.cc?.length ? { cc: payload.cc } : {}),
          ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
          subject: payload.subject,
          html: payload.html,
          ...(payload.attachment
            ? {
                attachments: [
                  { filename: payload.attachment.fileName, content: payload.attachment.contentBase64 },
                ],
              }
            : {}),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return { success: false, error: (d as any)?.message || res.statusText };
      }
      return { success: true };
    }
    case "postmark":
    default:
      return await sendViaPostmark(payload);
  }
}

// ─── Email HTML ──────────────────────────────────────────────────────────────

function buildPayrollEmailHtml(
  periodName: string,
  message: string,
  downloadUrl: string | null
): string {
  const noReplyParagraph =
    "This is an automated email — replies to this address are not monitored. If you have any questions, please contact us through the usual channel.";
  const noReplyPlaceholder = "__PAYROLL_NO_REPLY_PARAGRAPH__";
  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(noReplyParagraph, noReplyPlaceholder)
    .replace(/\n/g, "<br/>")
    .replace(
      noReplyPlaceholder,
      `<span style="color:#888;font-size:12px;line-height:1.5;">${noReplyParagraph}</span>`
    );

  const linkBlock = downloadUrl
    ? `
    <p style="text-align:center;margin:24px 0;">
      <a href="${downloadUrl}" style="display:inline-block;padding:14px 32px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
        Download Payroll PDF
      </a>
    </p>
    <p style="color:#888;font-size:12px;">This download link will expire in 7 days. Please download and save the file for your records.</p>`
    : `
    <p style="color:#888;font-size:12px;">The payroll report is attached to this email as a PDF.</p>`;

  return `
<div style="max-width:600px;margin:0 auto;background:#ffffff;font-family:sans-serif;">
  <div style="background:#1a1a2e;padding:24px;text-align:center;">
    <h1 style="color:#e94560;margin:0;font-family:sans-serif;font-size:22px;">UglyOps HR Platform</h1>
  </div>
  <div style="padding:24px;color:#333;line-height:1.6;">
    <h2 style="color:#1a1a2e;margin:0 0 16px;">Payroll Report – ${periodName}</h2>
    <p>${escapedMessage}</p>${linkBlock}
  </div>
  <div style="padding:16px;text-align:center;color:#888;font-size:12px;font-family:sans-serif;">
    This is a confidential payroll document from UglyOps HR. Do not forward this email.
  </div>
</div>`;
}
