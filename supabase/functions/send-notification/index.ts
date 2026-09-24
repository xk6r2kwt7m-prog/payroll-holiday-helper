import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardRequest } from "../_shared/auth-guard.ts";

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
  type: "holiday_request" | "holiday_approved" | "holiday_rejected" | "payroll_reminder" | "shift_update" | "document_expiry" | "compliance_certificate_expiry" | "employee_invitation" | "schedule_published" | "schedule_published_setup_required" | "payroll_approved" | "contract_signing" | "contract_signature_received" | "contract_fully_signed" | "contract_employer_action_required" | "contract_employer_sign_now" | "contract_fully_signed_manager" | "contract_email_verification" | "induction_pack" | "induction_reminder" | "inspection_pack" | "licence_signature" | "dps_signature_request" | "test";
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

/**
 * Staff emails are sent from an unmonitored address. Every staff-facing template
 * says so in the body as well as the footer, so the two never disagree.
 */
const DO_NOT_REPLY =
  `<p style="color:#666;">Please do not reply to this email — it is not monitored. If you have a question, speak to your manager.</p>`;


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
    case "compliance_certificate_expiry":
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">${data.headline || "Certificate expiry reminder"}</h2>
        <p><strong>${data.certificate_type}</strong>${data.certificate_number ? ` (${data.certificate_number})` : ""} at <strong>${data.branch}</strong></p>
        <p><strong>Expiry date:</strong> ${data.expiry_date}<br/><strong>Status:</strong> ${data.status_line}</p>
        ${data.holder_name ? `<p><strong>Held by:</strong> ${data.holder_name}</p>` : ""}
        <p style="text-align:center;margin:24px 0;">
          <a href="${data.link_url}" style="display:inline-block;padding:14px 32px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Open the compliance file</a>
        </p>
        <p style="color:#666;">Reminders are sent 90, 60 and 30 days before expiry, on the expiry date, and weekly while a certificate remains overdue.</p>`;
      break;
    case "info_request": {
      const infoFirst = data.first_name || (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Please complete your details</h2>
        <p>Hi ${infoFirst},</p>
        <p>We need a few details from you before your first shift. It takes about 5 minutes on your phone and you do not need an account.</p>
        ${data.section_list ? `<p><strong>You will be asked for:</strong><br/>${data.section_list}</p>` : ""}
        <p style="text-align:center;margin:24px 0;">
          <a href="${data.details_url}" style="display:inline-block;padding:14px 32px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Complete my details</a>
        </p>
        <p>If you are asked for your right to work document, you can take a photo of it with your phone camera.</p>
        <p style="color:#666;">This link is personal to you and expires on ${data.expires_on || "the date shown in the app"}. Please do not forward it.</p>
        ${DO_NOT_REPLY}
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "employee_invitation": {
      const firstName = (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Set up your access</h2>
        <p>Hi ${firstName},</p>
        <p>You have been added to the <strong>Ugly Dumpling</strong> team.</p>
        <p>We already have some of your information in our system.</p>
        <p>Please use the link below to set up your access and open the app.</p>
        ${data.login_url ? `<p style="text-align:center;margin:24px 0;"><a href="${data.login_url}" style="display:inline-block;padding:12px 28px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Set up my access</a></p>` : ""}
        <p>Once inside, you can review your details, update information where needed, upload documents, and complete the remaining onboarding steps.</p>
        <p style="color:#666;">If you have any difficulty accessing your account, please contact your manager.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    // EMAIL CONTENT RULE (contract emails): emails may contain the recipient's
    // first name, the employee's name, a contract reference and secure links
    // ONLY. Never include stored personal data — home address, NI number, bank
    // details, date of birth, phone number, emergency contact — in any email
    // body. Emails can be forwarded or read from shared inboxes; held details
    // are only ever shown behind the secure, single-use signing link. We only
    // ever ASK for information the system does not already hold.
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
        ${DO_NOT_REPLY}
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "contract_employer_action_required": {
      const adminName = data.admin_name || "Manager";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Employer signature required</h2>
        <p>Hi ${adminName},</p>
        <p><strong>${data.employee_name || "An employee"}</strong> has signed their contract.</p>
        <p>Your countersignature is now required to finalise this contract.</p>
        <p><strong>Employee signed on:</strong> ${data.signed_at || "recently"}</p>
        <p>Please log in to the UglyOps HR platform to review and sign.</p>
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
        ${DO_NOT_REPLY}
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "contract_fully_signed": {
      const fsFirstName = data.first_name || (data.employee_name || "").split(" ")[0] || "there";
      const finalContractLink = data.final_contract_url
        ? `<p style="margin:20px 0;"><a href="${data.final_contract_url}" style="display:inline-block;padding:12px 24px;background-color:#1a1a2e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">View final contract</a></p>`
        : `<p>Your final signed copy has been stored securely and is now available through your manager.</p>`;
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your contract is now complete</h2>
        <p>Hi ${fsFirstName},</p>
        <p>Your contract has now been fully signed by both you and the employer.</p>
        <p>Your final signed copy has been stored securely and is now available.</p>
        ${finalContractLink}
        <p><strong>Completed on:</strong> ${data.signed_at || new Date().toISOString()}</p>
        ${DO_NOT_REPLY}
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "contract_employer_sign_now": {
      const mgrName = data.admin_name || "Manager";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your countersignature is required</h2>
        <p>Hi ${mgrName},</p>
        <p><strong>${data.employee_name || "An employee"}</strong> has signed their contract.</p>
        <p>Your employer signature is now required to complete this contract.</p>
        <p><strong>Employee signed on:</strong> ${data.signed_at || "recently"}</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${data.signing_url}" style="display:inline-block;padding:14px 32px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Sign as employer</a>
        </p>
        <p>This signing link expires in 7 days. You can sign from any device — no login required.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "contract_fully_signed_manager": {
      const mgr2Name = data.admin_name || "Manager";
      const mgrContractLink = data.final_contract_url
        ? `<p style="margin:20px 0;"><a href="${data.final_contract_url}" style="display:inline-block;padding:12px 24px;background-color:#1a1a2e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Download signed contract</a></p>`
        : `<p>The signed contract is available in the Contracts section of UglyOps HR.</p>`;
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Contract complete — ${data.employee_name}</h2>
        <p>Hi ${mgr2Name},</p>
        <p>The employment contract for <strong>${data.employee_name}</strong> has been fully signed by both parties.</p>
        ${mgrContractLink}
        <p><strong>Completed on:</strong> ${data.signed_at || new Date().toISOString()}</p>
        <p>The signed contract has been stored securely in the system.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    /**
     * Training course link. Sent only when an administrator presses send for a
     * named person. Contains the first name and the course link only — never
     * any held personal details, and never any automatic reminder.
     */
    case "training_course_link": {
      const trFirst = (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your ${data.course_name || "training"} course</h2>
        <p>Hi ${trFirst},</p>
        <p>Your <strong>${data.course_name || "training"}</strong> course is ready for you to complete. It covers how we take and handle allergy orders, and finishes with a short exam.</p>
        ${data.due_date ? `<p><strong>Please complete it by:</strong> ${data.due_date}</p>` : ""}
        <p style="text-align:center;margin:24px 0;">
          <a href="${data.course_url}" style="display:inline-block;padding:14px 32px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Start my training</a>
        </p>
        <p>Sign in with your usual work account. It works on your phone, and your progress is saved as you go, so you can stop and come back.</p>
        <p style="color:#666;">If the link does not open, please speak to your manager.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>${data.company_name || "Ugly Dumpling"} Team</strong></p>`;
      break;
    }
    case "induction_pack": {
      const indFirst = data.first_name || (data.employee_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your induction documents</h2>
        <p>Hi ${indFirst},</p>
        <p>Welcome to the team. Please read and confirm the documents below before your first shift.</p>
        <p><strong>${data.document_count || ""} document(s)</strong>${data.branch ? ` for ${data.branch}` : ""}${data.staff_role ? ` (${data.staff_role})` : ""}.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${data.induction_url}" style="display:inline-block;padding:14px 32px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Open my induction</a>
        </p>
        <p>Everything is in one place and can be completed on your phone in a few minutes. You do not need to create an account.</p>
        <p style="color:#666;">This link is personal to you. Please do not forward it.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "induction_reminder": {
      const remFirst = data.first_name || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your induction is still waiting</h2>
        <p>Hi ${remFirst},</p>
        <p>You started ${data.days_outstanding || "a few"} days ago and your induction is not finished yet. It only takes a few minutes on your phone.</p>
        <p><strong>${data.document_count || ""} document(s)</strong>${data.branch ? ` for ${data.branch}` : ""}.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${data.induction_url}" style="display:inline-block;padding:14px 32px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Finish my induction</a>
        </p>
        <p>If anything is unclear, please speak to your manager before signing.</p>
        <p style="color:#666;">This link is personal to you. Please do not forward it.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "inspection_pack": {
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Inspection file — ${data.branch || ""}</h2>
        <p>${data.intro || "Please find the current inspection file summary below."}</p>
        <div style="font-size:14px;">${data.summary_html || ""}</div>
        <p style="color:#666;margin-top:16px;">Documents themselves are held securely in UglyOps HR and can be opened from the Documents &amp; Compliance section.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "dps_signature_request": {
      // One request, one purpose: the DPS signature authorising front-of-house
      // staff to sell alcohol at the premises he supervises. Nothing else.
      const dpsFirst = (data.recipient_name || "").split(" ")[0] || "there";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your signature is needed — authorisation to sell alcohol</h2>
        <p>Hi ${dpsFirst},</p>
        <p>${data.sender_name || "Your manager"} is asking for your signature as Designated Premises Supervisor on one document only: the written authorisation for front-of-house staff to sell alcohol at <strong>${data.branch || ""}</strong>.</p>
        <p>It is a standing authorisation, so it keeps applying as people join or leave until it is withdrawn in writing. Please read it in full before signing.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${data.signing_url}" style="display:inline-block;padding:14px 32px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Read and sign</a>
        </p>
        <p>You can read it now and sign later — the link stays open for ${data.expiry_days || "30"} days. No login is needed.</p>
        <p style="color:#666;">This link is personal to you. Please do not forward it.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "licence_signature": {
      const sigFirst = (data.recipient_name || "").split(" ")[0] || "there";
      const staffLine = data.is_staff === "yes"
        ? "<p>This confirms what you are authorised to do when selling alcohol, and the age-verification and refusal procedures you must follow.</p>"
        : "<p>Please read the document in full before signing. It is a licensing record and is kept as part of the premises file.</p>";
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">${data.document_title || "Document for signature"}</h2>
        <p>Hi ${sigFirst},</p>
        <p>${data.sender_name || "Your manager"} has sent you a licensing document to read and sign for <strong>${data.branch || ""}</strong>.</p>
        ${staffLine}
        <p style="text-align:center;margin:24px 0;">
          <a href="${data.signing_url}" style="display:inline-block;padding:14px 32px;background:#e94560;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Read and sign</a>
        </p>
        <p>You can read it now and sign later — the link stays open for ${data.expiry_days || "30"} days. No login is needed.</p>
        <p style="color:#666;">This link is personal to you. Please do not forward it.</p>
        <p style="margin-top:24px;">Thank you,<br/><strong>Ugly Dumpling Team</strong></p>`;
      break;
    }
    case "contract_email_verification": {
      // One-time code only — never any personal data beyond the code itself.
      body = `
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Your verification code</h2>
        <p>Hello,</p>
        <p>You asked to use this email address for signing your contract. Enter the code below to confirm it belongs to you:</p>
        <p style="text-align:center;margin:24px 0;"><span style="display:inline-block;padding:12px 28px;background:#1a1a2e;color:#ffffff;border-radius:6px;font-weight:bold;font-size:24px;letter-spacing:6px;">${data.code || ""}</span></p>
        <p>The code lasts ${data.expires_minutes || 15} minutes. If you did not ask for this, you can ignore this email.</p>
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

// ─── Recipient allow-list ────────────────────────────────────────────────────

/**
 * Templates that are addressed to someone outside the company by design — an
 * inspection file for a licensing or environmental health officer, and a test
 * message. An administrator may type these addresses in; nobody else can.
 */
const OUTSIDE_RECIPIENT_TYPES = new Set(["inspection_pack", "test"]);
const ADMIN_ROLE_NAMES = new Set(["company_admin", "admin", "owner", "platform_admin"]);

/**
 * True when the address is one the company already holds: a member of staff, a
 * pending invitation, a recorded recipient of a contract / induction / licensing
 * document, the company's own or signatory address, the supervisor's address, or
 * the signed-in person's own address. Anything else is refused, so the company's
 * email account cannot be used to mail strangers.
 */
async function recipientBelongsToTenant(
  to: string,
  tenantId: string | null,
  userId: string | null,
): Promise<boolean> {
  const address = String(to || "").trim().toLowerCase();
  if (!address) return false;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // The sender's own address is always allowed (test sends to yourself).
  if (userId) {
    const { data: me } = await admin.auth.admin.getUserById(userId);
    if (String(me?.user?.email || "").trim().toLowerCase() === address) return true;
  }

  if (!tenantId) return false;

  const checks: Array<[string, string]> = [
    ["employees", "email"],
    ["tenant_invitations", "email"],
    ["employee_info_requests", "recipient_email"],
    ["induction_packs", "recipient_email"],
    ["licence_signature_requests", "recipient_email"],
    ["licence_document_issues", "recipient_email"],
    ["contract_delivery_attempts", "recipient_email"],
    ["premises_licences", "dps_email"],
    ["company_settings", "company_email"],
    ["company_settings", "default_signatory_email"],
  ];

  for (const [table, column] of checks) {
    const { data } = await admin
      .from(table)
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike(column, address)
      .limit(1);
    if (data && data.length > 0) return true;
  }

  return false;
}

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

    // Only trusted internal callers, or a signed-in manager/administrator of the
    // named company, may send mail from the company's account.
    const guard = await guardRequest(req, {
      tenantId: tenant_id ?? null,
      managerOrAbove: true,
      cors: corsHeaders,
    });
    if (!guard.ok) return guard.response;

    if (!to || !subject || !type) {
      throw new Error("Missing required fields: to, subject, type");
    }

    // The company's email account may not be used to mail arbitrary addresses.
    // A person signed in to the app may only send to an address the company
    // already holds (a member of staff, a colleague's sign-in address) or to
    // their own address. Scheduled and internal runs are exempt.
    const adminDirected =
      OUTSIDE_RECIPIENT_TYPES.has(type) &&
      (guard.isPlatformAdmin || ADMIN_ROLE_NAMES.has(String(guard.role)));

    if (!guard.internal && !adminDirected) {
      const allowed = await recipientBelongsToTenant(to, guard.tenantId, guard.userId);
      if (!allowed) {
        return new Response(
          JSON.stringify({
            error:
              "That email address is not held by this company, so nothing was sent. Add the address to the person's record first.",
          }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
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
