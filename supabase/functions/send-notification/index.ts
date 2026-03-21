import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  raw?: unknown;
}

interface EmailProvider {
  name: string;
  sendEmail(payload: EmailPayload): Promise<EmailResponse>;
}

interface NotificationRequest {
  to: string;
  subject: string;
  type: "holiday_request" | "holiday_approved" | "holiday_rejected" | "payroll_reminder" | "shift_update" | "document_expiry" | "employee_invitation" | "schedule_published" | "schedule_published_setup_required" | "payroll_approved" | "contract_signing" | "contract_signature_received" | "contract_fully_signed" | "contract_employer_action_required" | "test";
  data: Record<string, string>;
  tenant_id?: string;
}

// ─── Provider: Postmark (Primary) ────────────────────────────────────────────

class PostmarkProvider implements EmailProvider {
  name = "postmark";
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async sendEmail(p: EmailPayload): Promise<EmailResponse> {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": this.apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        From: p.from,
        To: p.to,
        Subject: p.subject,
        HtmlBody: p.html,
        TextBody: p.text || "",
        MessageStream: "outbound",
      }),
    });
    const data = await res.json();
    if (data.ErrorCode && data.ErrorCode !== 0) {
      return { success: false, error: data.Message, raw: data };
    }
    return { success: true, messageId: data?.MessageID, raw: data };
  }
}

// ─── Fallback Providers ──────────────────────────────────────────────────────

class ResendProvider implements EmailProvider {
  name = "resend";
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async sendEmail(p: EmailPayload): Promise<EmailResponse> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: p.from, to: [p.to], subject: p.subject, html: p.html, text: p.text }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data?.message || res.statusText, raw: data };
    return { success: true, messageId: data?.id, raw: data };
  }
}

class SendGridProvider implements EmailProvider {
  name = "sendgrid";
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async sendEmail(p: EmailPayload): Promise<EmailResponse> {
    const fromEmail = p.from.includes("<") ? p.from.match(/<(.+)>/)?.[1] || p.from : p.from;
    const fromName = p.from.includes("<") ? p.from.split("<")[0].trim() : undefined;
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: p.to }] }],
        from: { email: fromEmail, name: fromName },
        subject: p.subject,
        content: [{ type: "text/html", value: p.html }],
      }),
    });
    if (res.status === 202) return { success: true, messageId: res.headers.get("x-message-id") || undefined };
    const data = await res.json().catch(() => ({}));
    return { success: false, error: (data as any)?.errors?.[0]?.message || res.statusText, raw: data };
  }
}

class MailgunProvider implements EmailProvider {
  name = "mailgun";
  private apiKey: string;
  private domain: string;
  constructor(apiKey: string, domain: string) { this.apiKey = apiKey; this.domain = domain; }

  async sendEmail(p: EmailPayload): Promise<EmailResponse> {
    const form = new FormData();
    form.append("from", p.from);
    form.append("to", p.to);
    form.append("subject", p.subject);
    form.append("html", p.html);
    if (p.text) form.append("text", p.text);
    const res = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`api:${this.apiKey}`)}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data?.message || res.statusText, raw: data };
    return { success: true, messageId: data?.id, raw: data };
  }
}

// ─── Provider Factory ────────────────────────────────────────────────────────

function resolveProvider(): EmailProvider {
  const providerName = (Deno.env.get("EMAIL_PROVIDER") || "postmark").toLowerCase();

  switch (providerName) {
    case "resend": {
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) throw new Error("RESEND_API_KEY is not configured");
      return new ResendProvider(key);
    }
    case "sendgrid": {
      const key = Deno.env.get("SENDGRID_API_KEY");
      if (!key) throw new Error("SENDGRID_API_KEY is not configured");
      return new SendGridProvider(key);
    }
    case "mailgun": {
      const key = Deno.env.get("MAILGUN_API_KEY");
      const domain = Deno.env.get("MAILGUN_DOMAIN");
      if (!key) throw new Error("MAILGUN_API_KEY is not configured");
      if (!domain) throw new Error("MAILGUN_DOMAIN is not configured");
      return new MailgunProvider(key, domain);
    }
    case "postmark":
    default: {
      const key = Deno.env.get("POSTMARK_SERVER_TOKEN");
      if (!key) throw new Error("POSTMARK_SERVER_TOKEN is not configured");
      return new PostmarkProvider(key);
    }
  }
}

// ─── Default sender ──────────────────────────────────────────────────────────

const FROM_ADDRESS = "UglyOps HR <support@uglyops.com>";

// ─── HTML Templates ──────────────────────────────────────────────────────────

function buildHtml(type: string, data: Record<string, string>): string {
  const header = `
    <div style="background:#1a1a2e;padding:24px;text-align:center;">
      <h1 style="color:#e94560;margin:0;font-family:sans-serif;font-size:22px;">UglyOps HR Platform</h1>
    </div>`;
  const footer = `
    <div style="padding:16px;text-align:center;color:#888;font-size:12px;font-family:sans-serif;">
      This is an automated notification from UglyOps HR. Do not reply to this email.
    </div>`;

  let body = "";
  switch (type) {
    case "holiday_request":
      body = `<h2>New Holiday Request</h2><p><strong>${data.employee_name}</strong> has submitted a holiday request.</p><p><strong>Dates:</strong> ${data.start_date} – ${data.end_date}</p><p><strong>Hours:</strong> ${data.hours}</p>${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}`;
      break;
    case "holiday_approved":
      body = `<h2>Holiday Approved ✅</h2><p>Your holiday request has been approved.</p><p><strong>Dates:</strong> ${data.start_date} – ${data.end_date}</p><p><strong>Hours:</strong> ${data.hours}</p>`;
      break;
    case "holiday_rejected":
      body = `<h2>Holiday Rejected ❌</h2><p>Your holiday request has been rejected.</p><p><strong>Dates:</strong> ${data.start_date} – ${data.end_date}</p>${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}`;
      break;
    case "payroll_reminder":
      body = `<h2>Payroll Reminder ⏰</h2><p>${data.message}</p><p><strong>Period:</strong> ${data.period_name}</p><p><strong>Pay date:</strong> ${data.pay_date}</p>`;
      break;
    case "payroll_approved":
      body = `<h2>Payroll Approved ✅</h2><p>The payroll period <strong>${data.period_name}</strong> has been approved and finalised.</p>`;
      break;
    case "shift_update":
      body = `<h2>Shift Update 📅</h2><p>${data.message}</p><p><strong>Date:</strong> ${data.shift_date}</p><p><strong>Time:</strong> ${data.start_time} – ${data.end_time}</p><p><strong>Location:</strong> ${data.branch}</p>`;
      break;
    case "schedule_published": {
      const schedFirstName = (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your Rota is Ready</h2>
        <p>Hi ${schedFirstName},</p>
        <p>Your rota for <strong>${data.branch || "your location"}</strong> for the week <strong>${data.week || data.week_label || "upcoming"}</strong> is now available.</p>
        <p>Use the link below to log in and view your shifts:</p>
        ${data.login_url ? `<p style="text-align:center;margin:24px 0;"><a href="${data.login_url}" style="display:inline-block;padding:12px 28px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View my rota</a></p>` : ""}
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling</strong></p>`;
      break;
    }
    case "schedule_published_setup_required": {
      const setupFirstName = (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your Rota is Ready</h2>
        <p>Hi ${setupFirstName},</p>
        <p>Your rota has been prepared, but you need to complete your access to the UglyOps HR app before you can view your shifts.</p>
        <p>Please use the link below to access or finish setting up your account:</p>
        ${data.access_url ? `<p style="text-align:center;margin:24px 0;"><a href="${data.access_url}" style="display:inline-block;padding:12px 28px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Access my account</a></p>` : ""}
        <p>Once your access is complete, you will be able to view your rota and other updates.</p>
        <p style="color:#666;">If you have any difficulty, please contact your manager.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling</strong></p>`;
      break;
    }
    case "document_expiry":
      body = `<h2>Document Expiry Warning ⚠️</h2><p>A document for <strong>${data.employee_name}</strong> is expiring soon.</p><p><strong>Document:</strong> ${data.document_name}</p><p><strong>Expires:</strong> ${data.expiry_date}</p>`;
      break;
    case "employee_invitation": {
      const firstName = (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Welcome to Ugly Dumpling</h2>
        <p>Hello ${firstName},</p>
        <p>You have been added to the <strong>Ugly Dumpling</strong> team.</p>
        <p>Please use the link below to access your account and complete your setup.</p>
        ${data.login_url ? `<p style="text-align:center;margin:24px 0;"><a href="${data.login_url}" style="display:inline-block;padding:12px 28px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Join / Sign In</a></p>` : ""}
        <p>Once inside, you may be asked to complete your personal details, upload documents, and review your onboarding information.</p>
        <p>Your right to work documents, if submitted, will be reviewed by management before final approval.</p>
        <p style="color:#666;">If you have any difficulty accessing your account, or if you do not receive further updates, please contact your manager.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling</strong></p>`;
      break;
    }
    case "contract_signing": {
      const empFirstName = (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your contract is ready to sign</h2>
        <p>Hi ${empFirstName},</p>
        <p>Your contract is now ready.</p>
        <p>Please review and sign it using the link below:</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${data.signing_url}" style="display:inline-block;padding:14px 32px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Sign your contract</a>
        </p>
        <p>It only takes a couple of minutes and can be completed on your phone.</p>
        <p>If you have any questions, just reply to this email.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "contract_signed_confirmation": {
      const confFirstName = data.first_name || (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your contract has been signed</h2>
        <p>Hi ${confFirstName},</p>
        <p>Your contract has been successfully signed.</p>
        <p><strong>Signed on:</strong> ${data.signed_at || new Date().toISOString()}</p>
        <p>If you have any questions, please contact your manager.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "contract_signature_received": {
      const rcvFirstName = data.first_name || (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your signature has been received</h2>
        <p>Hi ${rcvFirstName},</p>
        <p>We have received your signature.</p>
        <p>Your contract is not yet finalised. It will be completed once the employer also signs it.</p>
        <p>You will receive a final copy once the contract has been fully completed.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "contract_fully_signed": {
      const fsFirstName = data.first_name || (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your contract is now complete</h2>
        <p>Hi ${fsFirstName},</p>
        <p>Your contract has now been fully signed by both you and the employer.</p>
        <p>A final signed copy has been stored in the system.</p>
        <p><strong>Completed on:</strong> ${data.signed_at || new Date().toISOString()}</p>
        <p>If you have any questions, please contact your manager.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "test":
      body = `<h2>UglyOps HR Platform</h2><p>This confirms that the email notification system is working.</p><p><strong>Sent at:</strong> ${new Date().toISOString()}</p>`;
      break;
    default:
      body = `<h2>Notification</h2><p>${data.message || "You have a new notification."}</p>`;
  }

  return `<div style="max-width:600px;margin:0 auto;background:#ffffff;font-family:sans-serif;">${header}<div style="padding:24px;color:#333;line-height:1.6;">${body}</div>${footer}</div>`;
}

// ─── CORS ────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Handler ─────────────────────────────────────────────────────────────────

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const log: Record<string, unknown> = { timestamp: new Date().toISOString() };

  try {
    const provider = resolveProvider();
    log.provider = provider.name;

    const { to, subject, type, data, tenant_id }: NotificationRequest = await req.json();
    log.recipient = to;
    log.template = type;
    log.tenant_id = tenant_id || "unknown";

    if (!to || !subject || !type) {
      throw new Error("Missing required fields: to, subject, type");
    }

    const html = buildHtml(type, data || {});

    console.log(`[EMAIL_SEND] provider=${provider.name} recipient=${to} template=${type} tenant=${tenant_id || "unknown"} status=sending`);

    const result = await provider.sendEmail({ to, subject, html, from: FROM_ADDRESS });

    log.status = result.success ? "sent" : "failed";
    log.provider_response = result.raw;
    if (result.messageId) log.message_id = result.messageId;
    if (result.error) log.error = result.error;

    console.log(`[EMAIL_SEND] provider=${provider.name} recipient=${to} template=${type} tenant=${tenant_id || "unknown"} status=${log.status}${result.messageId ? ` message_id=${result.messageId}` : ""}`);

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error, diagnostics: log }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, diagnostics: log }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log.status = "error";
    log.error = msg;
    console.error(`[EMAIL_SEND] error: ${msg}`, JSON.stringify(log));
    return new Response(JSON.stringify({ error: msg, diagnostics: log }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
