import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildDpsAuthorisation,
  buildSection57,
  buildStaffAlcoholAuthorisation,
  SUBJECT_LABELS,
  type LicenceSite,
  type LicenceSubjectType,
  type NominatedPerson,
} from "../_shared/licensing-documents.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://udp.lovable.app";

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

function clampExpiryDays(days: unknown): number {
  const n = Number(days);
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(1, Math.round(n)));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a licensing document for signature by secure link.
 * - dps_authorisation / section_57 → one request for the licence holder or DPS
 * - staff_alcohol                  → one request per selected staff member,
 *                                    each with a pending alcohol authorisation
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Not signed in" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Not signed in" }, 401);
    const callerId = userData.user.id;

    const body = await req.json();
    const tenantId: string = body?.tenant_id;
    const subjectType: LicenceSubjectType = body?.subject_type;
    const branch: string = body?.branch;
    const licenceId: string | null = body?.licence_id ?? null;
    const recipientName: string = (body?.recipient_name || "").trim();
    const recipientEmailRaw: string = (body?.recipient_email || "").trim();
    const recipientRole: string | null = body?.recipient_role ?? null;
    const employeeIds: string[] = body?.employee_ids || [];
    const nominated: NominatedPerson[] = body?.nominated || [];
    const partALocation: string | undefined = body?.part_a_location || undefined;
    const expiryDays = clampExpiryDays(body?.expiry_days);
    const testSend: boolean = body?.test_send === true;

    if (!tenantId) return json({ error: "Missing tenant" }, 400);
    if (!["dps_authorisation", "section_57", "staff_alcohol"].includes(subjectType)) {
      return json({ error: "Unknown document type" }, 400);
    }
    if (!branch) return json({ error: "Choose a location" }, 400);

    const { data: membership } = await admin
      .from("tenant_members")
      .select("role, is_active")
      .eq("tenant_id", tenantId)
      .eq("user_id", callerId)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership || !["company_admin", "manager"].includes(membership.role)) {
      return json({ error: "You do not have permission to send documents for signature" }, 403);
    }

    const { data: sender } = await admin
      .from("employees")
      .select("forename, surname, email")
      .eq("tenant_id", tenantId)
      .eq("user_id", callerId)
      .maybeSingle();
    const senderName = sender ? `${sender.forename} ${sender.surname}` : (userData.user.email || "Manager");
    const senderEmail = sender?.email || userData.user.email || "";

    // ── Licence record for the site (the source of every premises detail) ──
    const { data: licence } = await admin
      .from("premises_licences")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq(licenceId ? "id" : "branch", licenceId ?? branch)
      .maybeSingle();

    if (!licence) {
      return json({ error: `No premises licence record for ${branch} yet. Add the licence details first.` }, 400);
    }

    const site: LicenceSite = {
      branch,
      premises_name: licence.premises_name,
      premises_address: licence.premises_address,
      licence_number: licence.licence_number,
      licence_holder: licence.licence_holder,
      issuing_authority: licence.issuing_authority,
      dps_name: licence.dps_name,
      dps_personal_licence_number: licence.dps_personal_licence_number,
    };

    const today = new Date().toISOString().slice(0, 10);
    const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString();

    type Target = {
      name: string;
      email: string;
      employeeId: string | null;
      role: string | null;
      document: ReturnType<typeof buildDpsAuthorisation>;
    };
    const targets: Target[] = [];

    if (subjectType === "staff_alcohol") {
      if (employeeIds.length === 0) return json({ error: "Select at least one staff member" }, 400);
      const { data: staff, error: staffErr } = await admin
        .from("employees")
        .select("id, forename, surname, email, job_title, status, archived_at")
        .eq("tenant_id", tenantId)
        .in("id", employeeIds);
      if (staffErr) return json({ error: staffErr.message }, 500);
      for (const s of staff ?? []) {
        if (s.archived_at || s.status === "leaver") continue;
        const name = `${s.forename} ${s.surname}`.trim();
        const email = testSend ? senderEmail : (s.email || "").trim();
        if (!EMAIL_RE.test(email)) continue;
        targets.push({
          name,
          email,
          employeeId: s.id,
          role: s.job_title ?? null,
          document: buildStaffAlcoholAuthorisation(site, name, today),
        });
      }
      if (targets.length === 0) {
        return json({ error: "None of the selected staff have a valid email address on file" }, 400);
      }
    } else {
      if (!recipientName) return json({ error: "Enter the name of the person signing" }, 400);
      const email = testSend ? senderEmail : recipientEmailRaw;
      if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email address" }, 400);
      targets.push({
        name: recipientName,
        email,
        employeeId: null,
        role: recipientRole,
        document: subjectType === "dps_authorisation"
          ? buildDpsAuthorisation(site, today)
          : buildSection57(site, nominated, today, partALocation),
      });
    }

    let sent = 0;
    const failed: string[] = [];

    for (const t of targets) {
      const token = makeToken();
      const title = `${SUBJECT_LABELS[subjectType]} — ${licence.premises_name || branch}`;

      const { data: request, error: insertErr } = await admin
        .from("licence_signature_requests")
        .insert({
          tenant_id: tenantId,
          branch,
          branch_location_id: licence.branch_location_id,
          licence_id: licence.id,
          subject_type: subjectType,
          document_title: title,
          document_body: t.document,
          token,
          recipient_name: t.name,
          recipient_email: t.email,
          recipient_role: t.role,
          employee_id: t.employeeId,
          personal_licence_number: subjectType === "staff_alcohol"
            ? null
            : licence.dps_personal_licence_number,
          status: "sent",
          expires_at: expiresAt,
          sent_by: callerId,
          sent_by_name: senderName,
          is_test_record: testSend,
        })
        .select("id")
        .single();

      if (insertErr || !request) {
        failed.push(`${t.name}: ${insertErr?.message || "could not be created"}`);
        continue;
      }

      // Staff signing creates the pending authorisation record straight away, so
      // the existing approve / revoke workflow picks it up unchanged.
      if (subjectType === "staff_alcohol" && t.employeeId) {
        const { data: auth } = await admin
          .from("alcohol_authorisations")
          .insert({
            tenant_id: tenantId,
            employee_id: t.employeeId,
            branch,
            licence_id: licence.id,
            request_id: request.id,
            status: "pending",
            notes: `Sent for signature by ${senderName}`,
          })
          .select("id")
          .single();
        if (auth) {
          await admin
            .from("licence_signature_requests")
            .update({ authorisation_id: auth.id })
            .eq("id", request.id);
        }
      }

      const signingUrl = `${APP_URL}/sign-licence/${token}`;
      const subject = `${testSend ? "[TEST] " : ""}Please sign: ${title}`;

      const { error: mailErr } = await admin.functions.invoke("send-notification", {
        body: {
          to: t.email,
          subject,
          type: "licence_signature",
          tenant_id: tenantId,
          data: {
            recipient_name: t.name,
            document_title: title,
            branch: licence.premises_name || branch,
            signing_url: signingUrl,
            sender_name: senderName,
            expiry_days: String(expiryDays),
            is_staff: subjectType === "staff_alcohol" ? "yes" : "no",
          },
        },
      });

      if (mailErr) {
        failed.push(`${t.name}: ${mailErr.message}`);
        continue;
      }
      sent += 1;

      await admin.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: callerId,
        action: "create",
        table_name: "licence_signature_requests",
        record_id: request.id,
        new_data: {
          event: "signature_requested",
          event_label: "Sent for signature",
          branch,
          next: { Document: title, Recipient: t.name, Email: t.email, Test: testSend ? "yes" : "no" },
        },
      });
    }

    return json({ sent, failed });
  } catch (e) {
    console.error("send-licence-signature failed", e);
    return json({ error: (e as Error).message }, 500);
  }
});
