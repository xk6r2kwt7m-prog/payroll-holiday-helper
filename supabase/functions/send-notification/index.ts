import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  to: string;
  subject: string;
  type: "holiday_request" | "holiday_approved" | "holiday_rejected" | "payroll_reminder" | "shift_update" | "test";
  data: Record<string, string>;
}

function buildHtml(type: string, data: Record<string, string>): string {
  const header = `
    <div style="background:#1a1a2e;padding:24px;text-align:center;">
      <h1 style="color:#e94560;margin:0;font-family:sans-serif;font-size:22px;">UGLO HR</h1>
    </div>
  `;
  const footer = `
    <div style="padding:16px;text-align:center;color:#888;font-size:12px;font-family:sans-serif;">
      This is an automated notification from UGLO HR. Do not reply to this email.
    </div>
  `;

  let body = "";

  switch (type) {
    case "holiday_request":
      body = `
        <h2>New Holiday Request</h2>
        <p><strong>${data.employee_name}</strong> has submitted a holiday request.</p>
        <p><strong>Dates:</strong> ${data.start_date} – ${data.end_date}</p>
        <p><strong>Hours:</strong> ${data.hours}</p>
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}
      `;
      break;
    case "holiday_approved":
      body = `
        <h2>Holiday Approved ✅</h2>
        <p>Your holiday request has been approved.</p>
        <p><strong>Dates:</strong> ${data.start_date} – ${data.end_date}</p>
        <p><strong>Hours:</strong> ${data.hours}</p>
      `;
      break;
    case "holiday_rejected":
      body = `
        <h2>Holiday Rejected ❌</h2>
        <p>Your holiday request has been rejected.</p>
        <p><strong>Dates:</strong> ${data.start_date} – ${data.end_date}</p>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
      `;
      break;
    case "payroll_reminder":
      body = `
        <h2>Payroll Reminder ⏰</h2>
        <p>${data.message}</p>
        <p><strong>Period:</strong> ${data.period_name}</p>
        <p><strong>Pay date:</strong> ${data.pay_date}</p>
      `;
      break;
    case "shift_update":
      body = `
        <h2>Shift Update 📅</h2>
        <p>${data.message}</p>
        <p><strong>Date:</strong> ${data.shift_date}</p>
        <p><strong>Time:</strong> ${data.start_time} – ${data.end_time}</p>
        <p><strong>Location:</strong> ${data.branch}</p>
      `;
      break;
    case "test":
      body = `
        <h2>Test Email ✉️</h2>
        <p>This is a diagnostic test email from UGLO HR.</p>
        <p>If you received this, email delivery is working correctly.</p>
        <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
      `;
      break;
    default:
      body = `<h2>Notification</h2><p>${data.message || "You have a new notification."}</p>`;
  }

  return `
    <div style="max-width:600px;margin:0 auto;background:#ffffff;font-family:sans-serif;">
      ${header}
      <div style="padding:24px;color:#333;line-height:1.6;">
        ${body}
      </div>
      ${footer}
    </div>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    resend_api_key_configured: !!RESEND_API_KEY,
    resend_api_key_prefix: RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 6)}...` : "MISSING",
  };

  try {
    const { to, subject, type, data }: NotificationRequest = await req.json();

    diagnostics.recipient = to;
    diagnostics.subject = subject;
    diagnostics.type = type;

    if (!to || !subject || !type) {
      diagnostics.error = "Missing required fields: to, subject, type";
      console.error("[EMAIL_DIAG]", JSON.stringify(diagnostics));
      throw new Error(diagnostics.error);
    }

    if (!resend || !RESEND_API_KEY) {
      diagnostics.error = "RESEND_API_KEY is not configured. Email cannot be sent.";
      console.error("[EMAIL_DIAG]", JSON.stringify(diagnostics));
      return new Response(
        JSON.stringify({ error: diagnostics.error, diagnostics }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const html = buildHtml(type, data || {});
    const fromAddress = "UGLO HR <notifications@hr.uglyops.com>";
    diagnostics.from = fromAddress;

    console.log("[EMAIL_DIAG] Attempting send:", JSON.stringify({
      to, subject, type, from: fromAddress, timestamp: diagnostics.timestamp,
    }));

    const { data: resendData, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html,
    });

    if (error) {
      diagnostics.provider_error = error;
      diagnostics.success = false;
      console.error("[EMAIL_DIAG] Resend error:", JSON.stringify(diagnostics));

      // Common Resend errors and their causes
      if (error.message?.includes("domain")) {
        diagnostics.hint = "The sender domain (hr.uglyops.com) may not be verified in Resend. Verify the domain at https://resend.com/domains";
      }
      if (error.message?.includes("API key")) {
        diagnostics.hint = "The RESEND_API_KEY may be invalid or expired. Regenerate at https://resend.com/api-keys";
      }

      return new Response(
        JSON.stringify({ error: error.message, diagnostics }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    diagnostics.success = true;
    diagnostics.resend_response = resendData;
    console.log("[EMAIL_DIAG] Send successful:", JSON.stringify(diagnostics));

    return new Response(JSON.stringify({ success: true, diagnostics }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    diagnostics.error = error.message;
    diagnostics.success = false;
    console.error("[EMAIL_DIAG] Exception:", JSON.stringify(diagnostics));
    return new Response(
      JSON.stringify({ error: error.message, diagnostics }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
