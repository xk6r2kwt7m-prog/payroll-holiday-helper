import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  to: string;
  subject: string;
  type: "holiday_request" | "holiday_approved" | "holiday_rejected" | "payroll_reminder" | "shift_update";
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

  try {
    const { to, subject, type, data }: NotificationRequest = await req.json();

    if (!to || !subject || !type) {
      throw new Error("Missing required fields: to, subject, type");
    }

    const html = buildHtml(type, data || {});

    const { error } = await resend.emails.send({
      from: "UGLO HR <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(error.message);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
