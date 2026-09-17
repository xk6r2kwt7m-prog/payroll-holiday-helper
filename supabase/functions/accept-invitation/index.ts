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

function makeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** tenant_role → legacy app_role used by user_roles. */
function appRole(role: string): string {
  switch (role) {
    case "company_admin": return "admin";
    case "manager": return "manager";
    case "supervisor": return "supervisor";
    case "viewer": return "viewer";
    default: return "staff";
  }
}

/**
 * Public invitation acceptance — a personal, single-use link.
 *
 * GET  ?token=...            → who the invitation is for (no personal data beyond their own name/email)
 * POST { token, password }   → creates the account, grants access to the inviting company only,
 *                              links the existing staff record, and opens a details form that asks
 *                              for the basics only (identity + address, right to work, bank details).
 *
 * Deliberately never touches company setup: an invited staff member can never create a tenant.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    let body: any = {};
    let token = url.searchParams.get("token") || "";
    if (req.method === "POST") {
      body = await req.json().catch(() => ({}));
      token = body?.token || token;
    }
    if (!token) return json({ error: "invalid", message: "This link is not valid." }, 400);

    const { data: invite } = await admin
      .from("tenant_invitations")
      .select("id, tenant_id, email, role, status, accepted_at, expires_at, tenants(company_name)")
      .eq("token", token)
      .maybeSingle();

    if (!invite) {
      return json({ error: "invalid", message: "This invitation link is not valid. Ask your manager to send a new one." }, 404);
    }
    if (invite.accepted_at || invite.status === "accepted") {
      return json({
        error: "already_used",
        message: "This invitation has already been used. Please sign in with the password you chose.",
      }, 410);
    }
    if (invite.status === "revoked" || invite.status === "cancelled") {
      return json({ error: "revoked", message: "This invitation has been cancelled. Ask your manager to send a new one." }, 410);
    }
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return json({ error: "expired", message: "This invitation has expired. Ask your manager to send a new one." }, 410);
    }

    const companyName = (invite as any).tenants?.company_name ?? "your team";

    // Staff record for this email, in the inviting company only.
    const { data: employee } = await admin
      .from("employees")
      .select("id, forename, surname, preferred_name, user_id")
      .eq("tenant_id", invite.tenant_id)
      .ilike("email", invite.email)
      .limit(1)
      .maybeSingle();

    if (req.method === "GET") {
      return json({
        email: invite.email,
        company_name: companyName,
        first_name: employee?.preferred_name || employee?.forename || "",
        full_name: employee ? `${employee.forename} ${employee.surname}` : "",
      });
    }

    const password: string = typeof body?.password === "string" ? body.password : "";
    if (password.length < 8) {
      return json({ error: "weak_password", message: "Please choose a password of at least 8 characters." }, 400);
    }

    // 1. Account — create it, or reuse an account that already exists for this email.
    let userId: string | null = null;
    let existingAccount = false;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: employee ? `${employee.forename} ${employee.surname}` : invite.email },
    });
    if (created?.user) {
      userId = created.user.id;
    } else {
      existingAccount = true;
      // Find the existing account by listing (email filter is not exposed on admin API).
      for (let page = 1; page <= 20 && !userId; page++) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        const match = list?.users?.find((u) => (u.email ?? "").toLowerCase() === invite.email.toLowerCase());
        if (match) userId = match.id;
        if (!list?.users?.length) break;
      }
      if (!userId) {
        console.error("accept-invitation: could not create or find account", createErr?.message);
        return json({ error: "account_failed", message: "We could not set up your account. Please ask your manager for help." }, 500);
      }
    }

    // 2. Access to the inviting company only.
    const { data: member } = await admin
      .from("tenant_members")
      .select("id")
      .eq("tenant_id", invite.tenant_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (member) {
      await admin.from("tenant_members").update({ role: invite.role, is_active: true }).eq("id", member.id);
    } else {
      await admin.from("tenant_members").insert({
        tenant_id: invite.tenant_id,
        user_id: userId,
        role: invite.role,
        is_active: true,
      });
    }

    const { data: legacyRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("tenant_id", invite.tenant_id)
      .maybeSingle();
    if (!legacyRole) {
      await admin.from("user_roles").insert({
        user_id: userId,
        tenant_id: invite.tenant_id,
        role: appRole(invite.role) as any,
      });
    }

    // 3. Link the staff record.
    if (employee && !employee.user_id) {
      await admin.from("employees").update({ user_id: userId }).eq("id", employee.id);
    }

    // 4. Mark the invitation used — single use.
    await admin
      .from("tenant_invitations")
      .update({ accepted_at: new Date().toISOString(), status: "accepted" })
      .eq("id", invite.id);

    // 5. Open a details form asking for the basics only.
    let detailsToken: string | null = null;
    if (employee) {
      const sections = ["personal", "rtw", "bank"];
      const { data: openRequest } = await admin
        .from("employee_info_requests")
        .select("token, token_expires_at, status, submitted_at")
        .eq("tenant_id", invite.tenant_id)
        .eq("employee_id", employee.id)
        .is("submitted_at", null)
        .in("status", ["sent", "opened"])
        .gt("token_expires_at", new Date().toISOString())
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openRequest?.token) {
        detailsToken = openRequest.token;
      } else {
        detailsToken = makeToken();
        const { error: reqErr } = await admin.from("employee_info_requests").insert({
          tenant_id: invite.tenant_id,
          employee_id: employee.id,
          token: detailsToken,
          token_expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
          requested_fields: sections,
          recipient_email: invite.email,
          requested_by_name: "Joining form",
          status: "sent",
        });
        if (reqErr) {
          console.error("accept-invitation: details form not created", reqErr.message);
          detailsToken = null;
        }
      }
    }

    await admin.from("audit_log").insert({
      tenant_id: invite.tenant_id,
      user_id: userId,
      action: "create",
      table_name: "tenant_invitation_accepted",
      record_id: invite.id,
      new_data: {
        email: invite.email,
        role: invite.role,
        employee_id: employee?.id ?? null,
        existing_account: existingAccount,
        details_form_opened: !!detailsToken,
      },
    });

    return json({
      success: true,
      existing_account: existingAccount,
      email: invite.email,
      company_name: companyName,
      details_token: detailsToken,
    });
  } catch (err) {
    console.error("accept-invitation failed:", (err as Error).message);
    return json({ error: "failed", message: "Something went wrong setting up your access. Ask your manager for help." }, 500);
  }
});
