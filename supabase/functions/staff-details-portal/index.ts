import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { allocateStaffDetails, buildContactAliases } from "./allocation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "employee-documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const str = (v: unknown, max = 200) =>
  typeof v === "string" ? v.trim().slice(0, max) || null : null;

/**
 * Public "complete your details" portal — no sign-in required.
 * GET  ?token=...   → request, sections, employee name, saved answers
 * POST { token, action } → save | upload_rtw | submit
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const reqUrl = new URL(req.url);
    let token = reqUrl.searchParams.get("token") || "";
    let body: any = {};
    if (req.method === "POST") {
      body = await req.json();
      token = body?.token || token;
    }
    if (!token) return json({ error: "Missing link" }, 400);

    const { data: request } = await admin
      .from("employee_info_requests")
      .select(
        "*, employees(forename, surname, preferred_name, email, date_of_birth, nationality, ni_number, passport_no, sharing_code, settlement_status, bank_account_no, sort_code)",
      )
      .eq("token", token)
      .maybeSingle();

    if (!request) return json({ error: "invalid", message: "This link is not valid." }, 404);
    if (new Date(request.token_expires_at).getTime() < Date.now()) {
      return json(
        { error: "expired", message: "This link has expired. Ask your manager to send it again." },
        410,
      );
    }

    const emp: any = request.employees;

    if (req.method === "GET") {
      if (!request.opened_at) {
        await admin
          .from("employee_info_requests")
          .update({
            opened_at: new Date().toISOString(),
            status: request.status === "sent" ? "opened" : request.status,
          })
          .eq("id", request.id);
      }

      return json({
        request: {
          id: request.id,
          sections: request.requested_fields,
          status: request.status,
          submitted_at: request.submitted_at,
          expires_at: request.token_expires_at,
          requested_by_name: request.requested_by_name,
          rtw_uploaded_count: request.rtw_uploaded_count,
        },
        employee: {
          first_name: emp?.preferred_name || emp?.forename || "",
          full_name: emp ? `${emp.forename} ${emp.surname}` : "",
        },
        saved: request.submitted_data ?? {},
        prefill: {
          forename: emp?.forename ?? "",
          surname: emp?.surname ?? "",
          date_of_birth: emp?.date_of_birth ?? "",
          nationality: emp?.nationality ?? "",
          email: emp?.email ?? "",
        },
      });
    }

    if (request.submitted_at && body.action !== "upload_rtw") {
      return json({ error: "done", message: "Your details have already been sent." }, 409);
    }

    const action = body?.action;

    // ── Save progress ──
    if (action === "save") {
      const answers = typeof body.answers === "object" && body.answers ? body.answers : {};
      await admin
        .from("employee_info_requests")
        .update({ submitted_data: { ...(request.submitted_data ?? {}), ...answers }, status: "in_progress" })
        .eq("id", request.id);
      return json({ success: true });
    }

    // ── Right-to-work photo / file ──
    if (action === "upload_rtw") {
      const fileName = str(body.file_name, 120) || "right-to-work";
      const mime = str(body.mime_type, 100) || "application/octet-stream";
      const base64 = typeof body.file_base64 === "string" ? body.file_base64 : "";
      if (!base64) return json({ error: "No file received" }, 400);

      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      if (bytes.byteLength > MAX_FILE_BYTES) {
        return json({ error: "That file is too large. Please keep it under 10MB." }, 400);
      }

      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `right-to-work/${request.tenant_id}/${request.employee_id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (upErr) throw upErr;

      const { error: docErr } = await admin.from("employee_documents").insert({
        tenant_id: request.tenant_id,
        employee_id: request.employee_id,
        document_type: "right_to_work",
        document_name: str(body.document_label, 120) || "Right to work (staff upload)",
        file_path: path,
        file_size: bytes.byteLength,
        mime_type: mime,
        document_status: "uploaded",
        notes: "Uploaded by the employee from their details link — awaiting manager review",
      });
      if (docErr) throw docErr;

      await admin
        .from("employee_info_requests")
        .update({ rtw_uploaded_count: (request.rtw_uploaded_count ?? 0) + 1, status: "in_progress" })
        .eq("id", request.id);

      return json({ success: true, uploaded: (request.rtw_uploaded_count ?? 0) + 1 });
    }

    // ── Final submission ──
    if (action === "submit") {
      const answers = { ...(request.submitted_data ?? {}), ...(body.answers ?? {}) };
      const sections: string[] = request.requested_fields ?? [];

      const personal = answers.personal ?? {};
      const emergency = answers.emergency ?? {};
      const bank = answers.bank ?? {};
      const rtw = answers.rtw ?? {};

      // Everything the staff member supplied, keyed by the employee column it
      // belongs to. The allocation rules then decide what can be written now
      // and what needs the admin to confirm (never a silent overwrite).
      const candidates: Record<string, unknown> = {};
      if (sections.includes("personal")) {
        candidates.forename = str(personal.forename, 80);
        candidates.surname = str(personal.surname, 80);
        candidates.preferred_name = str(personal.preferred_name, 80);
        candidates.email = str(personal.email, 160);
        candidates.date_of_birth = str(personal.date_of_birth, 10);
        candidates.ni_number = str(personal.ni_number, 20);
      }
      if (sections.includes("bank")) {
        candidates.bank_account_no = str(bank.account_number, 20);
        candidates.sort_code = str(bank.sort_code, 12);
      }
      if (sections.includes("rtw")) {
        candidates.nationality = str(rtw.nationality, 80);
        candidates.passport_no = str(rtw.passport_no, 40);
        candidates.sharing_code = str(rtw.sharing_code, 40);
        candidates.settlement_status = str(rtw.settlement_status, 60);
        if (!candidates.ni_number) candidates.ni_number = str(rtw.ni_number, 20);
      }

      const allocation = allocateStaffDetails(candidates, emp ?? {});
      const empUpdates: Record<string, unknown> = { ...allocation.updates };
      if (Object.keys(empUpdates).length > 0) {
        const { error } = await admin.from("employees").update(empUpdates).eq("id", request.employee_id);
        if (error) throw error;
      }

      // Onboarding record holds contact / emergency / bank detail.
      const { data: existingOnb } = await admin
        .from("employee_onboarding_data")
        .select("id, personal_info, emergency_contact, bank_details")
        .eq("employee_id", request.employee_id)
        .maybeSingle();

      const line1 = str(personal.address_line1, 120);
      const line2 = str(personal.address_line2, 120);
      const city = str(personal.city, 80);
      const postcode = str(personal.postcode, 12);
      const composedAddress = [line1, line2, city, postcode].filter(Boolean).join(", ") || null;

      const personalInfo = {
        ...((existingOnb?.personal_info as Record<string, unknown>) ?? {}),
        ...(sections.includes("personal")
          ? {
              legal_forename: str(personal.forename, 80),
              legal_surname: str(personal.surname, 80),
              preferred_name: str(personal.preferred_name, 80),
              date_of_birth: str(personal.date_of_birth, 10),
              phone: str(personal.phone, 30),
              ni_number: str(personal.ni_number, 20),
              // Contract generation reads these keys — write all supported shapes
              // so the address never has to be asked for twice.
              address: composedAddress,
              address_line_1: line1,
              address_line_2: line2,
              address_line1: line1,
              address_line2: line2,
              city,
              postcode,
            }
          : {}),
        ...(sections.includes("rtw")
          ? {
              nationality: str(rtw.nationality, 80),
              passport_no: str(rtw.passport_no, 40),
              sharing_code: str(rtw.sharing_code, 40),
              settlement_status: str(rtw.settlement_status, 60),
              ...(str(rtw.ni_number, 20) ? { ni_number: str(rtw.ni_number, 20) } : {}),
            }
          : {}),
      };


      const emergencyContact = sections.includes("emergency")
        ? {
            ...((existingOnb?.emergency_contact as Record<string, unknown>) ?? {}),
            name: str(emergency.name, 100),
            relationship: str(emergency.relationship, 60),
            phone: str(emergency.phone, 30),
          }
        : ((existingOnb?.emergency_contact as Record<string, unknown>) ?? {});

      const bankDetails = sections.includes("bank")
        ? {
            ...((existingOnb?.bank_details as Record<string, unknown>) ?? {}),
            account_holder: str(bank.account_holder, 100),
            account_number: str(bank.account_number, 20),
            sort_code: str(bank.sort_code, 12),
            bank_name: str(bank.bank_name, 80),
          }
        : ((existingOnb?.bank_details as Record<string, unknown>) ?? {});

      const rtwPending = sections.includes("rtw") && (request.rtw_uploaded_count ?? 0) > 0;

      if (existingOnb) {
        await admin
          .from("employee_onboarding_data")
          .update({
            personal_info: personalInfo,
            emergency_contact: emergencyContact,
            bank_details: bankDetails,
            ...(rtwPending ? { rtw_status: "pending_review" } : {}),
          })
          .eq("id", existingOnb.id);
      } else {
        await admin.from("employee_onboarding_data").insert({
          tenant_id: request.tenant_id,
          employee_id: request.employee_id,
          personal_info: personalInfo,
          emergency_contact: emergencyContact,
          bank_details: bankDetails,
          ...(rtwPending ? { rtw_status: "pending_review" } : {}),
        });
      }

      await admin
        .from("employee_info_requests")
        .update({
          submitted_data: answers,
          submitted_at: new Date().toISOString(),
          status: "submitted",
        })
        .eq("id", request.id);

      // Notify managers in the app.
      const { data: managers } = await admin
        .from("tenant_members")
        .select("user_id")
        .eq("tenant_id", request.tenant_id)
        .in("role", ["company_admin", "manager"])
        .eq("is_active", true);
      if (managers?.length) {
        await admin.from("notifications").insert(
          managers
            .map((m: any) => m.user_id)
            .filter(Boolean)
            .map((uid: string) => ({
              tenant_id: request.tenant_id,
              user_id: uid,
              event_type: "onboarding_completed",
              title: "Staff details received",
              body: `${emp?.forename ?? "A staff member"} ${emp?.surname ?? ""} has completed their details${
                rtwPending ? " and uploaded a right to work document for your review" : ""
              }.`,
              link: "/onboarding",
              metadata: { employee_id: request.employee_id, info_request_id: request.id },
            })),
        );
      }

      await admin.from("audit_log").insert({
        tenant_id: request.tenant_id,
        action: "update",
        table_name: "employee_info_request_submitted",
        record_id: request.id,
        new_data: {
          employee_id: request.employee_id,
          sections,
          rtw_documents: request.rtw_uploaded_count ?? 0,
          rtw_status: rtwPending ? "pending_review" : "not_submitted",
        },
      });

      return json({ success: true, rtw_pending: rtwPending });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("staff-details-portal failed:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
