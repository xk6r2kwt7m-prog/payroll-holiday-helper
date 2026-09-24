import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { allocateStaffDetails, buildContactAliases } from "./allocation.ts";
import {
  documentKindForItems,
  expandRequestedFields,
  rtwBasisNeedsExpiry,
  rtwDocumentFiledAs,
  rtwDocumentLabel,
  sectionsForItems,
} from "../_shared/info-request-items.ts";

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
    if (request.status === "prepared") {
      return json({ error: "This link is not active yet. Your manager will send it to you." }, 403);
    }

    if (request.status === "revoked") {
      return json(
        { error: "revoked", message: "This link has been cancelled. Ask your manager to send a new one." },
        410,
      );
    }
    // Single use: once the form has been submitted the link stops working, so a
    // forwarded link can never be reopened to read back personal details.
    if (request.status === "submitted" || request.submitted_at) {
      return json(
        {
          error: "already_submitted",
          message:
            "Thank you — your details have already been sent to your manager. This link is now closed. Contact your manager if something needs changing.",
        },
        410,
      );
    }

    const emp: any = request.employees;

    // When the link is tied to a contract, the same session carries on to it
    // once the details are in, so nothing is asked for twice.
    const contractSignPath = async (): Promise<string | null> => {
      if (!request.contract_document_id) return null;
      const { data: tok } = await admin
        .from("signing_tokens")
        .select("token, expires_at, used_at")
        .eq("employee_document_id", request.contract_document_id)
        .eq("signer_type", "employee")
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return tok?.token ? `/sign/${tok.token}` : null;
    };

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
          // Legacy rows hold section keys; both shapes expand to item keys.
          items: expandRequestedFields(request.requested_fields),
          sections: sectionsForItems(request.requested_fields ?? []),
          kind: request.request_kind ?? "onboarding",
          status: request.status,
          submitted_at: request.submitted_at,
          expires_at: request.token_expires_at,
          requested_by_name: request.requested_by_name,
          rtw_uploaded_count: request.rtw_uploaded_count,
          contract_document_id: request.contract_document_id ?? null,
          contract_sign_path: await contractSignPath(),
          last_saved_at: request.last_saved_at ?? null,
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
        .update({
          submitted_data: { ...(request.submitted_data ?? {}), ...answers },
          status: "in_progress",
          last_saved_at: new Date().toISOString(),
        })
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

      // Filed as the kind of document the person said they were sending, with
      // the expiry date when one was given, so it can be chased before it lapses.
      const chosenType = str(body.document_type, 40);
      const docKind = chosenType
        ? rtwDocumentFiledAs(chosenType)
        : documentKindForItems(request.requested_fields ?? []);
      const rawExpiry = str(body.expires_at, 10);
      const expiresAt = rawExpiry && /^\d{4}-\d{2}-\d{2}$/.test(rawExpiry) ? rawExpiry : null;

      const { error: docErr } = await admin.from("employee_documents").insert({
        tenant_id: request.tenant_id,
        employee_id: request.employee_id,
        document_type: docKind,
        document_name:
          str(body.document_label, 120) ||
          (chosenType ? `${rtwDocumentLabel(chosenType)} (staff upload)` : "Right to work (staff upload)"),
        file_path: path,
        file_size: bytes.byteLength,
        mime_type: mime,
        document_status: "uploaded",
        ...(expiresAt ? { expires_at: expiresAt } : {}),
        notes: `Uploaded by the employee from their details link${
          chosenType ? ` as: ${rtwDocumentLabel(chosenType)}` : ""
        } — awaiting manager review`,
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
      // Sections drive which answers are read; item-level requests map onto the
      // same sections, and only values the person actually typed are considered.
      const sections: string[] = sectionsForItems(request.requested_fields ?? []);

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
        // The email we already hold cannot be changed from the staff page — a
        // wrong address has to go through the manager.
        if (!emp?.email) candidates.email = str(personal.email, 160);
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
        const basis = str(rtw.rtw_basis, 40);
        if (rtwBasisNeedsExpiry(basis) && !str(rtw.expires_at, 10)) {
          return json(
            {
              error: "rtw_expiry_required",
              message: "Please give the date your permission to work runs out before sending.",
            },
            400,
          );
        }
        if (!candidates.ni_number) candidates.ni_number = str(rtw.ni_number, 20);
      }

      const allocation = allocateStaffDetails(candidates, emp ?? {});

      // Every submitted value is written to the review trail: what was already
      // held, what was sent, and whether an administrator must decide. Bank
      // details and National Insurance numbers are marked protected so only
      // administrators can read the row at all.
      const SENSITIVE_FIELDS = [
        "ni_number",
        "bank_account_no",
        "sort_code",
        "passport_no",
        "sharing_code",
        "residence_permit",
      ];
      const sectionOf = (field: string) =>
        field === "bank_account_no" || field === "sort_code"
          ? "bank"
          : ["nationality", "passport_no", "sharing_code", "settlement_status"].includes(field)
            ? "rtw"
            : "personal";
      const changeRows = [
        ...allocation.filled.map((f) => ({
          field_name: f.field,
          field_label: f.label,
          old_value: null as string | null,
          new_value: f.value,
          needs_review: false,
          state: "accepted",
          notes: "Filled a blank field on the staff record",
        })),
        ...allocation.conflicts.map((c) => ({
          field_name: c.field,
          field_label: c.label,
          old_value: c.current,
          new_value: c.submitted,
          needs_review: true,
          state: "pending",
          notes: "Differs from the value already held — needs a manager decision",
        })),
        ...allocation.held.map((h) => ({
          field_name: h.field,
          field_label: h.label,
          old_value: h.current || null,
          new_value: h.submitted,
          needs_review: true,
          state: "pending",
          notes:
            "Bank details are not used for pay until an administrator confirms them directly with the employee",
        })),
      ].map((row) => ({
        ...row,
        tenant_id: request.tenant_id,
        employee_id: request.employee_id,
        request_id: request.id,
        section: sectionOf(row.field_name),
        sensitive: SENSITIVE_FIELDS.includes(row.field_name),
        decided_at: row.state === "accepted" ? new Date().toISOString() : null,
      }));
      if (changeRows.length > 0) {
        const { error: changeErr } = await admin.from("staff_detail_changes").insert(changeRows);
        if (changeErr) console.error("could not record submitted changes:", changeErr.message);
      }
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
      const aliases = buildContactAliases({
        line1,
        line2,
        city,
        postcode,
        phone: str(personal.phone, 30),
        email: str(personal.email, 160),
      });

      const prevPending = Array.isArray((existingOnb?.personal_info as any)?.pending_confirmations)
        ? ((existingOnb?.personal_info as any).pending_confirmations as any[])
        : [];
      const submittedAtIso = new Date().toISOString();
      const pendingConfirmations = [
        // Keep any earlier unresolved item that this submission does not touch.
        ...prevPending.filter(
          (p: any) => !allocation.conflicts.some((c) => c.field === p?.field),
        ),
        ...allocation.conflicts.map((c) => ({ ...c, submitted_at: submittedAtIso })),
      ];

      const personalInfo = {
        ...((existingOnb?.personal_info as Record<string, unknown>) ?? {}),
        pending_confirmations: pendingConfirmations,
        ...(sections.includes("personal")
          ? {
              legal_forename: str(personal.forename, 80),
              legal_surname: str(personal.surname, 80),
              preferred_name: str(personal.preferred_name, 80),
              date_of_birth: str(personal.date_of_birth, 10),
              ni_number: str(personal.ni_number, 20),
              // Contracts, letters and the staff profile each read a different
              // key shape — write them all so nothing is asked for twice.
              ...aliases,
            }
          : {}),
        ...(sections.includes("rtw")
          ? {
              nationality: str(rtw.nationality, 80),
              passport_no: str(rtw.passport_no, 40),
              sharing_code: str(rtw.sharing_code, 40),
              settlement_status: str(rtw.settlement_status, 60),
              rtw_basis: str(rtw.rtw_basis, 40),
              rtw_document_type: str(rtw.document_type, 40),
              rtw_expires_at: str(rtw.expires_at, 10),
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
            ...(!request.request_kind || request.request_kind === "onboarding"
              ? { submitted_at: submittedAtIso }
              : {}),
            ...(str(rtw.expires_at, 10) ? { rtw_expires_on: str(rtw.expires_at, 10) } : {}),
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
          ...(!request.request_kind || request.request_kind === "onboarding"
            ? { submitted_at: submittedAtIso }
            : {}),
          ...(str(rtw.expires_at, 10) ? { rtw_expires_on: str(rtw.expires_at, 10) } : {}),
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
              }. ${allocation.filled.length} detail${allocation.filled.length === 1 ? "" : "s"} saved to their record automatically${
                allocation.conflicts.length
                  ? `; ${allocation.conflicts.length} need${allocation.conflicts.length === 1 ? "s" : ""} your confirmation because it differs from what we already hold`
                  : ""
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
          rtw_status: rtwPending ? "submitted" : "not_submitted",
          auto_allocated: allocation.filled.map((f) => f.field),
          needs_confirmation: allocation.conflicts.map((c) => ({
            field: c.field,
            previous: c.current,
            submitted: c.submitted,
          })),
        },
      });

      return json({
        success: true,
        contract_sign_path: await contractSignPath(),
        rtw_pending: rtwPending,
        allocated: allocation.filled.length,
        needs_confirmation: allocation.conflicts.length,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("staff-details-portal failed:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
