import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  expandRequestedFields,
  infoItemLabel,
  INFO_ITEM_KEYS,
} from "../_shared/info-request-items.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://hr.uglyops.com";

const LEGACY_SECTIONS = ["personal", "emergency", "bank", "rtw"];
const ALLOWED_FIELDS = [...INFO_ITEM_KEYS, ...LEGACY_SECTIONS];

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Not signed in" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Not signed in" }, 401);
    const callerId = userData.user.id;

    const body = await req.json();
    const tenantId: string = body?.tenant_id;
    const action: string = body?.action || "send";
    const employeeIds: string[] = body?.employeeIds || [];
    const contractDocumentId: string | null = body?.contractDocumentId ?? null;
    const sections: string[] = (body?.sections || ["personal", "emergency", "bank", "rtw"]).filter(
      (s: string) => ALLOWED_FIELDS.includes(s),
    );
    const requestKind: string =
      body?.requestKind === "existing_staff_update" ? "existing_staff_update" : "onboarding";
    const preset: string | null = typeof body?.preset === "string" ? body.preset.slice(0, 60) : null;
    const recipientOverride: string | null = body?.recipientOverride ?? null;
    const testSend: boolean = body?.testSend === true;
    /** Prepares the request and its link but sends nothing — an administrator sends it later. */
    const prepareOnly: boolean = body?.prepareOnly === true;
    const expiryDays: number = Math.min(Math.max(Number(body?.expiryDays) || 7, 1), 30);

    if (!tenantId) return json({ error: "Missing tenant" }, 400);

    const { data: membership } = await admin
      .from("tenant_members")
      .select("role, is_active")
      .eq("tenant_id", tenantId)
      .eq("user_id", callerId)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership || !["company_admin", "manager"].includes(membership.role)) {
      return json({ error: "You do not have permission to request staff details" }, 403);
    }

    const itemList = (fields: string[]) =>
      expandRequestedFields(fields).map((k) => `• ${infoItemLabel(k)}`).join("<br/>");

    // ── Sending a request that was prepared earlier and left unsent ──
    if (action === "send_prepared") {
      const requestId: string = body?.requestId;
      if (!requestId) return json({ error: "Missing request" }, 400);

      const { data: existing } = await admin
        .from("employee_info_requests")
        .select("*, employees(forename, surname)")
        .eq("id", requestId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!existing) return json({ error: "That request could not be found" }, 404);
      if (existing.status !== "prepared") return json({ error: "That request is not waiting to be sent" }, 409);
      if (new Date(existing.token_expires_at).getTime() < Date.now()) {
        return json({ error: "That link has expired — prepare a new one" }, 409);
      }
      const recipient = existing.recipient_email;
      if (!recipient) return json({ error: "No email address on that request" }, 400);
      const emp: any = existing.employees;

      let sent = false;
      let sendError: string | undefined;
      try {
        const { data: mail, error: mailErr } = await admin.functions.invoke("send-notification", {
          body: {
            to: recipient,
            subject:
              existing.request_kind === "existing_staff_update"
                ? "We need a couple of details from you"
                : "Please complete your details",
            type: "info_request",
            tenant_id: tenantId,
            data: {
              employee_name: `${emp?.forename ?? ""} ${emp?.surname ?? ""}`.trim(),
              first_name: emp?.forename ?? "there",
              details_url: `${APP_URL}/my-details/${existing.token}`,
              section_list: itemList(existing.requested_fields ?? []),
              expires_on: String(existing.token_expires_at).slice(0, 10),
            },
          },
        });
        if (mailErr) sendError = mailErr.message;
        else if (mail?.success === false) sendError = mail?.error || "Email provider rejected the message";
        else sent = true;
      } catch (e) {
        sendError = (e as Error).message;
      }

      if (sent) {
        await admin
          .from("employee_info_requests")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", existing.id);
      }

      await admin.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: callerId,
        action: "update",
        table_name: sent ? "employee_info_request_sent" : "employee_info_request_send_failed",
        record_id: existing.id,
        new_data: { recipient, employee_id: existing.employee_id, from_prepared: true, error: sendError ?? null },
      });

      if (!sent) return json({ error: sendError ?? "The request could not be sent" }, 502);
      return json({ success: true, sent: 1, results: [{ employee_id: existing.employee_id, sent: true, recipient }] });
    }

    // ── Reminder: the same link again, so part-filled answers survive ──
    if (action === "remind") {
      const requestId: string = body?.requestId;
      if (!requestId) return json({ error: "Missing request" }, 400);

      const { data: existing } = await admin
        .from("employee_info_requests")
        .select("*, employees(forename, surname)")
        .eq("id", requestId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!existing) return json({ error: "That request could not be found" }, 404);
      if (existing.submitted_at) return json({ error: "They have already completed this" }, 409);
      if (existing.status === "revoked") return json({ error: "That link was cancelled — send a new one" }, 409);
      if (new Date(existing.token_expires_at).getTime() < Date.now()) {
        return json({ error: "That link has expired — send a new one" }, 409);
      }

      const recipient = existing.recipient_email;
      if (!recipient) return json({ error: "No email address on that request" }, 400);
      const emp: any = existing.employees;

      let sent = false;
      let sendError: string | undefined;
      try {
        const { data: mail, error: mailErr } = await admin.functions.invoke("send-notification", {
          body: {
            to: recipient,
            subject: "Reminder: please complete your details",
            type: "info_request",
            tenant_id: tenantId,
            data: {
              employee_name: `${emp?.forename ?? ""} ${emp?.surname ?? ""}`.trim(),
              first_name: emp?.forename ?? "there",
              details_url: `${APP_URL}/my-details/${existing.token}`,
              section_list: itemList(existing.requested_fields ?? []),
              expires_on: String(existing.token_expires_at).slice(0, 10),
            },
          },
        });
        if (mailErr) sendError = mailErr.message;
        else if (mail?.success === false) sendError = mail?.error || "Email provider rejected the message";
        else sent = true;
      } catch (e) {
        sendError = (e as Error).message;
      }

      if (sent) {
        await admin
          .from("employee_info_requests")
          .update({
            reminder_count: (existing.reminder_count ?? 0) + 1,
            last_reminder_at: new Date().toISOString(),
            reminder_sent_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }

      await admin.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: callerId,
        action: "update",
        table_name: sent ? "employee_info_request_reminded" : "employee_info_request_reminder_failed",
        record_id: existing.id,
        new_data: { recipient, employee_id: existing.employee_id, error: sendError ?? null },
      });

      if (!sent) return json({ error: sendError ?? "The reminder could not be sent" }, 502);
      return json({ success: true, sent: true });
    }

    if (employeeIds.length === 0) return json({ error: "Select at least one staff member" }, 400);
    if (sections.length === 0) return json({ error: "Select at least one thing to ask for" }, 400);

    const { data: issuer } = await admin
      .from("employees")
      .select("forename, surname")
      .eq("tenant_id", tenantId)
      .eq("user_id", callerId)
      .maybeSingle();
    const issuerName = issuer
      ? `${issuer.forename} ${issuer.surname}`
      : userData.user.email || "Manager";

    const { data: employees, error: empErr } = await admin
      .from("employees")
      .select("id, forename, surname, email")
      .eq("tenant_id", tenantId)
      .in("id", employeeIds);
    if (empErr) throw empErr;

    const expiresAt = new Date(Date.now() + expiryDays * 86400000);
    const sectionList = itemList(sections);
    const isUpdate = requestKind === "existing_staff_update";

    const results: { employee_id: string; sent: boolean; recipient?: string; error?: string }[] = [];

    for (const emp of employees ?? []) {
      const recipient = recipientOverride || (testSend ? userData.user.email : emp.email);
      if (!recipient) {
        results.push({ employee_id: emp.id, sent: false, error: "No email address on record" });
        continue;
      }

      const token = makeToken();
      const { data: request, error: reqErr } = await admin
        .from("employee_info_requests")
        .insert({
          tenant_id: tenantId,
          employee_id: emp.id,
          token,
          token_expires_at: expiresAt.toISOString(),
          requested_fields: sections,
          request_kind: requestKind,
          preset,
          recipient_email: recipient,
          requested_by: callerId,
          requested_by_name: issuerName,
          status: prepareOnly ? "prepared" : "sent",
          // When the request was raised from a contract, the same session
          // carries straight on to signing once the details are in.
          ...(contractDocumentId ? { contract_document_id: contractDocumentId } : {}),
        })
        .select()
        .single();
      if (reqErr) {
        results.push({ employee_id: emp.id, sent: false, error: reqErr.message });
        continue;
      }

      // Nothing is sent or changed while a request is only being prepared.
      if (prepareOnly) {
        await admin.from("audit_log").insert({
          tenant_id: tenantId,
          user_id: callerId,
          action: "create",
          table_name: "employee_info_request_prepared",
          record_id: request.id,
          new_data: {
            employee_id: emp.id,
            recipient,
            sections,
            request_kind: requestKind,
            preset,
            requested_by_name: issuerName,
            test_send: testSend,
          },
        });
        results.push({ employee_id: emp.id, sent: false, recipient, prepared: true } as any);
        continue;
      }

      // Only one live link per person: any earlier unfinished one is closed and
      // pointed at this one, so an old link can never be used by mistake.
      await admin
        .from("employee_info_requests")
        .update({
          status: "revoked",
          cancelled_at: new Date().toISOString(),
          token_expires_at: new Date().toISOString(),
          replaced_by: request.id,
        })
        .eq("tenant_id", tenantId)
        .eq("employee_id", emp.id)
        .neq("id", request.id)
        .is("submitted_at", null)
        .in("status", ["sent", "opened", "in_progress"]);

      const detailsUrl = `${APP_URL}/my-details/${token}`;
      let sent = false;
      let sendError: string | undefined;
      try {
        const { data: mail, error: mailErr } = await admin.functions.invoke("send-notification", {
          body: {
            to: recipient,
            subject: `${testSend ? "[TEST] " : ""}${
              isUpdate ? "We need a couple of details from you" : "Please complete your details"
            }`,
            type: "info_request",
            tenant_id: tenantId,
            data: {
              employee_name: `${emp.forename} ${emp.surname}`,
              first_name: emp.forename,
              details_url: detailsUrl,
              section_list: sectionList,
              expires_on: expiresAt.toISOString().slice(0, 10),
            },
          },
        });
        if (mailErr) sendError = mailErr.message;
        else if (mail?.success === false) sendError = mail?.error || "Email provider rejected the message";
        else sent = true;
      } catch (e) {
        sendError = (e as Error).message;
      }

      await admin.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: callerId,
        action: "create",
        table_name: sent ? "employee_info_request_sent" : "employee_info_request_send_failed",
        record_id: request.id,
        new_data: {
          employee_id: emp.id,
          recipient,
          sections,
          request_kind: requestKind,
          preset,
          requested_by_name: issuerName,
          test_send: testSend,
          error: sendError ?? null,
        },
      });

      results.push({ employee_id: emp.id, sent, recipient, error: sendError });
    }

    const sentCount = results.filter((r) => r.sent).length;
    const preparedCount = results.filter((r: any) => r.prepared).length;
    return json({
      success: prepareOnly ? preparedCount > 0 : sentCount > 0,
      sent: sentCount,
      prepared: preparedCount,
      results,
    });
  } catch (err) {
    console.error("send-info-request failed:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
