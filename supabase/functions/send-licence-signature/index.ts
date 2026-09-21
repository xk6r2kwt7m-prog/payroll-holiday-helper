import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ALL_SITES_BRANCH,
  buildDpsAuthorisation,
  buildDpsAuthorisationAllSites,
  buildSection57,
  buildStaffAlcoholAuthorisation,
  SUBJECT_LABELS,
  withAdditionalSites,
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
 * Sends the notification email and reports back exactly what went wrong.
 * `functions.invoke` hides the reason behind "non-2xx status code", which tells
 * the administrator nothing, so the response body is read and passed through.
 */
async function sendNotificationEmail(
  supabaseUrl: string,
  serviceKey: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; detail: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    if (res.ok) return { ok: true };
    let detail = raw;
    try {
      const parsed = JSON.parse(raw);
      detail = parsed?.error ? String(parsed.error) : raw;
    } catch { /* keep the raw text */ }
    console.error(`send-notification failed [${res.status}]: ${raw}`);
    return { ok: false, detail: detail || `email service returned ${res.status}` };
  } catch (e) {
    console.error("send-notification could not be reached", e);
    return { ok: false, detail: (e as Error).message };
  }
}


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
    // One DPS signature covering every site: the request is filed under the
    // "All sites" marker so per-site requests and their history stay untouched.
    const allSites: boolean = body?.all_sites === true && subjectType === "dps_authorisation";
    const requestedBranches: string[] = Array.isArray(body?.branches) ? body.branches : [];
    const branch: string = allSites ? ALL_SITES_BRANCH : body?.branch;
    const licenceId: string | null = allSites ? null : (body?.licence_id ?? null);
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

    // ── Licence records (the source of every premises detail) ──
    const { data: allLicences } = await admin
      .from("premises_licences")
      .select("*")
      .eq("tenant_id", tenantId);
    const licences = allLicences ?? [];
    const licenceForBranch = (b: string) =>
      licences.find((l: any) => (l.branch ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase()) ?? null;

    const toSite = (l: any, b: string): LicenceSite => ({
      branch: b,
      premises_name: l?.premises_name,
      premises_address: l?.premises_address,
      licence_number: l?.licence_number,
      licence_holder: l?.licence_holder,
      issuing_authority: l?.issuing_authority,
      dps_name: l?.dps_name,
      dps_personal_licence_number: l?.dps_personal_licence_number,
    });

    let licence: any;
    let coveredSites: LicenceSite[] = [];

    if (allSites) {
      const chosen = (requestedBranches.length > 0
        ? requestedBranches
        : licences.map((l: any) => l.branch).filter(Boolean)) as string[];
      const rows = chosen.map((b) => ({ b, l: licenceForBranch(b) })).filter((r) => !!r.l);
      if (rows.length === 0) {
        return json({ error: "No premises licence records yet. Add the licence details first." }, 400);
      }
      const missingLicence = chosen.filter((b) => !licenceForBranch(b));
      if (missingLicence.length > 0) {
        return json({
          error: `No premises licence record for ${missingLicence.join(", ")} yet. Add the licence details first.`,
        }, 400);
      }
      licence = rows[0].l;
      coveredSites = rows.map((r) => toSite(r.l, r.b));
    } else {
      licence = licenceId
        ? licences.find((l: any) => l.id === licenceId) ?? null
        : licenceForBranch(branch);
      if (!licence) {
        return json({ error: `No premises licence record for ${branch} yet. Add the licence details first.` }, 400);
      }
      coveredSites = [toSite(licence, branch)];
    }

    const site: LicenceSite = coveredSites[0];

    const today = new Date().toISOString().slice(0, 10);
    const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString();

    type Target = {
      name: string;
      email: string;
      employeeId: string | null;
      role: string | null;
      branches: string[];
      document: ReturnType<typeof buildDpsAuthorisation>;
    };
    const targets: Target[] = [];

    if (subjectType === "staff_alcohol") {
      if (employeeIds.length === 0) return json({ error: "Select at least one staff member" }, 400);
      const { data: staff, error: staffErr } = await admin
        .from("employees")
        .select("id, forename, surname, email, department, status, archived_at")
        .eq("tenant_id", tenantId)
        .in("id", employeeIds);
      if (staffErr) return json({ error: staffErr.message }, 500);
      // One signature covers every site the person works at, so their sites come
      // from their own record rather than from the site picked on screen.
      const { data: links } = await admin
        .from("employee_branches")
        .select("employee_id, branch")
        .eq("tenant_id", tenantId)
        .in("employee_id", employeeIds);
      const branchesFor = (id: string) => {
        const list = (links ?? [])
          .filter((l: any) => l.employee_id === id)
          .map((l: any) => l.branch)
          .filter((b: string) => !!b && !!licenceForBranch(b));
        const unique = Array.from(new Set(list));
        return unique.length > 0 ? unique : [branch];
      };
      for (const s of staff ?? []) {
        if (s.archived_at || s.status === "leaver") continue;
        const name = `${s.forename} ${s.surname}`.trim();
        const email = testSend ? senderEmail : (s.email || "").trim();
        if (!EMAIL_RE.test(email)) continue;
        const theirBranches = branchesFor(s.id);
        const homeBranch = theirBranches.includes(branch) ? branch : theirBranches[0];
        const homeSite = toSite(licenceForBranch(homeBranch), homeBranch);
        const otherNames = theirBranches
          .filter((b) => b !== homeBranch)
          .map((b) => licenceForBranch(b)?.premises_name?.trim() || b);
        targets.push({
          name,
          email,
          employeeId: s.id,
          role: s.department ?? null,
          branches: theirBranches,
          document: withAdditionalSites(
            buildStaffAlcoholAuthorisation(homeSite, name, today),
            otherNames,
          ),
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
        branches: coveredSites.map((s) => s.branch),
        document: subjectType === "dps_authorisation"
          ? (allSites ? buildDpsAuthorisationAllSites(coveredSites, today) : buildDpsAuthorisation(site, today))
          : buildSection57(site, nominated, today, partALocation),
      });
    }

    let sent = 0;
    const failed: string[] = [];

    for (const t of targets) {
      const token = makeToken();
      const homeBranch = t.branches[0] ?? branch;
      const homeLicence = subjectType === "staff_alcohol"
        ? (licenceForBranch(homeBranch) ?? licence)
        : licence;
      const title = `${SUBJECT_LABELS[subjectType]} — ${
        allSites ? "all sites" : (homeLicence?.premises_name || homeBranch)
      }`;

      const { data: request, error: insertErr } = await admin
        .from("licence_signature_requests")
        .insert({
          tenant_id: tenantId,
          branch: subjectType === "staff_alcohol" ? homeBranch : branch,
          branch_location_id: homeLicence?.branch_location_id ?? null,
          licence_id: homeLicence?.id ?? licence.id,
          subject_type: subjectType,
          document_title: title,
          // The covered sites are stored with the document so the signed record
          // always shows exactly which premises the signature applied to.
          document_body: { ...t.document, covered_branches: t.branches },
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
      // the existing approve / revoke workflow picks it up unchanged. Somebody who
      // works at more than one site gets one record per site from the one signature.
      if (subjectType === "staff_alcohol" && t.employeeId) {
        let firstAuthId: string | null = null;
        for (const b of t.branches) {
          const { data: auth } = await admin
            .from("alcohol_authorisations")
            .insert({
              tenant_id: tenantId,
              employee_id: t.employeeId,
              branch: b,
              licence_id: licenceForBranch(b)?.id ?? null,
              request_id: request.id,
              status: "pending",
              notes: `Sent for signature by ${senderName}`,
            })
            .select("id")
            .single();
          if (auth && !firstAuthId) firstAuthId = auth.id;
        }
        if (firstAuthId) {
          await admin
            .from("licence_signature_requests")
            .update({ authorisation_id: firstAuthId })
            .eq("id", request.id);
        }
      }

      const signingUrl = `${APP_URL}/sign-licence/${token}`;
      const subject = `${testSend ? "[TEST] " : ""}Please sign: ${title}`;

      const siteLabel = allSites
        ? t.branches.join(", ")
        : subjectType === "staff_alcohol"
          ? t.branches.map((b) => licenceForBranch(b)?.premises_name?.trim() || b).join(", ")
          : (licence.premises_name || branch);

      const { error: mailErr } = await admin.functions.invoke("send-notification", {
        body: {
          to: t.email,
          subject,
          // The all-sites DPS request has its own wording: it asks for that one
          // signature and nothing else.
          type: allSites ? "dps_signature_request" : "licence_signature",
          tenant_id: tenantId,
          data: {
            recipient_name: t.name,
            document_title: title,
            branch: siteLabel,
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
