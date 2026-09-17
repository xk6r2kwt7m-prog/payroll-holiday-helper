// Daily job: chases unfinished inductions and (optionally) sends the induction
// automatically to new starters. Never touches a completed induction, a test
// record, or anything a manager has not switched on.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildStaffAlcoholAuthorisation,
  SUBJECT_LABELS,
} from "../_shared/licensing-documents.ts";
import { isFrontOfHouse, hasLiveAlcoholRecord } from "../_shared/front-of-house.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_DAYS = [3, 7, 14];
const WEEKLY_AFTER = 14;
const APP_URL = "https://udp.lovable.app";

const daysBetween = (from: string, to: Date) =>
  Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000);

function reminderDue(pack: any, now: Date): boolean {
  if (pack.is_test_send || pack.completed_at || !pack.sent_at) return false;
  if (pack.token_expires_at && new Date(pack.token_expires_at).getTime() < now.getTime()) return false;
  const since = daysBetween(pack.sent_at, now);
  if (since < REMINDER_DAYS[0]) return false;
  if (pack.reminder_sent_at && daysBetween(pack.reminder_sent_at, now) < 1) return false;
  if (REMINDER_DAYS.includes(since)) return true;
  if (since > WEEKLY_AFTER) return (since - WEEKLY_AFTER) % 7 === 0;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const now = new Date();
  let reminders = 0;
  let autoSent = 0;
  let alcoholSent = 0;
  const notes: string[] = [];

  try {
    // ── 1. Chase unfinished inductions ──────────────────────────────────────
    const { data: packs } = await supabase
      .from("induction_packs")
      .select("id, tenant_id, employee_id, token, sent_at, completed_at, reminder_sent_at, reminder_count, token_expires_at, is_test_send, recipient_email, branch, staff_role, employees(forename, surname, email, status, archived_at)")
      .is("completed_at", null);

    for (const pack of packs ?? []) {
      if (!reminderDue(pack, now)) continue;
      const emp: any = (pack as any).employees;
      if (emp?.archived_at || emp?.status === "leaver") continue;
      const email = pack.recipient_email || emp?.email;
      if (!email) continue;

      const { count } = await supabase
        .from("induction_pack_items")
        .select("id", { count: "exact", head: true })
        .eq("pack_id", pack.id);

      const days = daysBetween(pack.sent_at, now);
      await supabase.functions.invoke("send-notification", {
        body: {
          to: email,
          subject: "Reminder: please finish your induction",
          type: "induction_reminder",
          tenant_id: pack.tenant_id,
          data: {
            first_name: emp?.forename ?? "there",
            induction_url: `${APP_URL}/induction/${pack.token}`,
            document_count: String(count ?? 0),
            branch: pack.branch ?? "",
            days_outstanding: String(days),
          },
        },
      });

      await supabase
        .from("induction_packs")
        .update({
          reminder_sent_at: now.toISOString(),
          reminder_count: (pack.reminder_count ?? 0) + 1,
        })
        .eq("id", pack.id);
      reminders++;
    }

    // ── 2. Optional automatic induction for new starters ────────────────────
    const { data: prefRows } = await supabase
      .from("tenant_preferences")
      .select("tenant_id, preferences")
      .eq("category", "training_docs");

    for (const row of prefRows ?? []) {
      const prefs: any = row.preferences ?? {};
      if (prefs.auto_assign_induction !== true) continue;

      const { data: employees } = await supabase
        .from("employees")
        .select("id, forename, surname, email, branch, department, job_title, status, archived_at, is_test_record")
        .eq("tenant_id", row.tenant_id)
        .is("archived_at", null)
        .neq("status", "leaver");

      const candidates = (employees ?? []).filter(
        (e: any) => !e.is_test_record && !!e.email
      );
      if (candidates.length === 0) continue;

      const { data: existing } = await supabase
        .from("induction_packs")
        .select("employee_id")
        .eq("tenant_id", row.tenant_id);
      const hasPack = new Set((existing ?? []).map((p: any) => p.employee_id));

      const { data: docs } = await supabase
        .from("compliance_documents")
        .select("id, branches, applies_to_all_branches, roles, applies_to_all_roles, include_in_induction, alcohol_related, status, archived_at, expires_at, approval_status")
        .eq("tenant_id", row.tenant_id)
        .eq("status", "active")
        .eq("include_in_induction", true)
        .eq("approval_status", "approved");

      for (const emp of candidates) {
        if (hasPack.has(emp.id)) continue;
        const applicable = (docs ?? []).filter((d: any) => {
          if (d.archived_at) return false;
          if (d.expires_at && new Date(`${d.expires_at}T23:59:59`) < now) return false;
          if (d.alcohol_related) return false;
          const branchOk = d.applies_to_all_branches || (d.branches ?? []).includes(emp.branch);
          const roleOk = d.applies_to_all_roles;
          return branchOk && roleOk;
        });
        if (applicable.length === 0) continue;

        const docIds = applicable.map((d: any) => d.id);
        const { data: docRows } = await supabase
          .from("compliance_documents")
          .select("id, name, version, category, file_path, requires_signature")
          .in("id", docIds);

        const token = [...crypto.getRandomValues(new Uint8Array(32))]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        const { data: pack, error: packErr } = await supabase
          .from("induction_packs")
          .insert({
            tenant_id: row.tenant_id,
            employee_id: emp.id,
            branch: emp.branch,
            token,
            issued_by_name: "Automatic assignment",
            status: "sent",
            includes_alcohol: false,
            recipient_email: emp.email,
            sent_at: now.toISOString(),
            auto_assigned: true,
          })
          .select()
          .single();
        if (packErr || !pack) {
          notes.push(`${emp.forename} ${emp.surname}: ${packErr?.message ?? "could not create induction"}`);
          continue;
        }

        await supabase.from("induction_pack_items").insert(
          (docRows ?? []).map((d: any, i: number) => ({
            tenant_id: row.tenant_id,
            pack_id: pack.id,
            document_id: d.id,
            document_name: d.name,
            document_version: d.version,
            document_category: d.category,
            file_path: d.file_path,
            requires_signature: d.requires_signature,
            sort_order: i,
          }))
        );

        await supabase.functions.invoke("send-notification", {
          body: {
            to: emp.email,
            subject: "Your induction documents",
            type: "induction_pack",
            tenant_id: row.tenant_id,
            data: {
              employee_name: `${emp.forename} ${emp.surname}`,
              first_name: emp.forename,
              induction_url: `${APP_URL}/induction/${token}`,
              document_count: String(docRows?.length ?? 0),
              branch: emp.branch ?? "",
              staff_role: "",
            },
          },
        });

        await supabase.from("audit_log").insert({
          tenant_id: row.tenant_id,
          action: "create",
          table_name: "induction_pack_sent",
          record_id: pack.id,
          new_data: {
            employee_id: emp.id,
            recipient: emp.email,
            branch: emp.branch,
            auto_assigned: true,
            documents: (docRows ?? []).map((d: any) => ({ name: d.name, version: d.version })),
          },
        });

        hasPack.add(emp.id);
        autoSent++;
      }
    }

    // ── 3. Optional automatic alcohol authorisation for front-of-house staff ──
    for (const row of prefRows ?? []) {
      const prefs: any = row.preferences ?? {};
      if (prefs.auto_alcohol_authorisation !== true) continue;
      const allRoles = prefs.auto_alcohol_all_roles === true;

      const { data: licences } = await supabase
        .from("premises_licences")
        .select("*")
        .eq("tenant_id", row.tenant_id);
      if (!licences || licences.length === 0) continue;

      const { data: staff } = await supabase
        .from("employees")
        .select("id, forename, surname, email, branch, department, job_title, status, archived_at, is_test_record")
        .eq("tenant_id", row.tenant_id)
        .is("archived_at", null)
        .neq("status", "leaver");

      const { data: existingRequests } = await supabase
        .from("licence_signature_requests")
        .select("employee_id, status, expires_at, is_test_record")
        .eq("tenant_id", row.tenant_id)
        .eq("subject_type", "staff_alcohol");

      const { data: existingAuths } = await supabase
        .from("alcohol_authorisations")
        .select("employee_id, status, revoked_at")
        .eq("tenant_id", row.tenant_id);

      for (const licence of licences) {
        if (!licence.licence_number || !licence.licence_holder) continue; // never send an incomplete document
        const candidates = (staff ?? []).filter(
          (e: any) =>
            e.branch === licence.branch &&
            !!e.email &&
            !e.is_test_record &&
            (allRoles || isFrontOfHouse(e.job_title, e.department)) &&
            !hasLiveAlcoholRecord(e.id, existingRequests ?? [], existingAuths ?? [], now)
        );

        for (const emp of candidates) {
          const name = `${emp.forename} ${emp.surname}`.trim();
          const site = {
            branch: licence.branch,
            premises_name: licence.premises_name,
            premises_address: licence.premises_address,
            licence_number: licence.licence_number,
            licence_holder: licence.licence_holder,
            issuing_authority: licence.issuing_authority,
            dps_name: licence.dps_name,
            dps_personal_licence_number: licence.dps_personal_licence_number,
          };
          const document = buildStaffAlcoholAuthorisation(site, name, now.toISOString().slice(0, 10));
          const title = `${SUBJECT_LABELS.staff_alcohol} — ${licence.premises_name || licence.branch}`;
          const token = [...crypto.getRandomValues(new Uint8Array(32))]
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          const { data: request, error: reqErr } = await supabase
            .from("licence_signature_requests")
            .insert({
              tenant_id: row.tenant_id,
              branch: licence.branch,
              branch_location_id: licence.branch_location_id,
              licence_id: licence.id,
              subject_type: "staff_alcohol",
              document_title: title,
              document_body: document,
              token,
              recipient_name: name,
              recipient_email: emp.email,
              recipient_role: emp.job_title ?? null,
              employee_id: emp.id,
              status: "sent",
              expires_at: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
              sent_by_name: "Automatic assignment",
              is_test_record: false,
            })
            .select("id")
            .single();

          if (reqErr || !request) {
            notes.push(`${name}: ${reqErr?.message ?? "could not create alcohol authorisation"}`);
            continue;
          }

          const { data: auth } = await supabase
            .from("alcohol_authorisations")
            .insert({
              tenant_id: row.tenant_id,
              employee_id: emp.id,
              branch: licence.branch,
              licence_id: licence.id,
              request_id: request.id,
              status: "pending",
              notes: "Sent automatically to front-of-house staff",
            })
            .select("id")
            .single();
          if (auth) {
            await supabase
              .from("licence_signature_requests")
              .update({ authorisation_id: auth.id })
              .eq("id", request.id);
          }

          await supabase.functions.invoke("send-notification", {
            body: {
              to: emp.email,
              subject: `Please sign: ${title}`,
              type: "licence_signature",
              tenant_id: row.tenant_id,
              data: {
                recipient_name: name,
                document_title: title,
                branch: licence.premises_name || licence.branch,
                signing_url: `${APP_URL}/sign-licence/${token}`,
                sender_name: "Automatic assignment",
                expiry_days: "30",
                is_staff: "yes",
              },
            },
          });

          await supabase.from("audit_log").insert({
            tenant_id: row.tenant_id,
            action: "create",
            table_name: "licence_signature_requests",
            record_id: request.id,
            new_data: {
              event: "signature_requested",
              event_label: "Sent for signature (automatic)",
              branch: licence.branch,
              next: { Document: title, Recipient: name, Email: emp.email, Automatic: "yes" },
            },
          });

          (existingRequests ?? []).push({
            employee_id: emp.id,
            status: "sent",
            expires_at: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
            is_test_record: false,
          } as any);
          alcoholSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({ reminders, auto_assigned: autoSent, alcohol_sent: alcoholSent, notes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
