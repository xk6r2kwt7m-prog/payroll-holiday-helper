import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ASSESSMENT_KEY,
  ASSESSMENT_PASS_MARK,
  ASSESSMENT_TOTAL,
  DECLARATION_KEYS,
  INDUCTION_MODULE_SEED,
  PRACTICAL_SEED,
  SITE_FIELDS,
} from "../_shared/induction-content.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "employee-documents";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Public induction portal — no sign-in required.
 * GET  ?token=...          → pack, modules, declaration, assessment, documents, site details
 * POST { action: ... }     → read_module | acknowledge_module | submit_declaration |
 *                            submit_assessment | acknowledge_item | acknowledge_alcohol | complete
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  try {
    const reqUrl = new URL(req.url);
    let token = reqUrl.searchParams.get("token") || "";
    let body: any = {};
    if (req.method === "POST") {
      body = await req.json();
      token = body?.token || token;
    }
    if (!token) return json({ error: "Missing link" }, 400);

    const { data: pack } = await admin
      .from("induction_packs")
      .select("*, employees(forename, surname, email, department, status)")
      .eq("token", token)
      .maybeSingle();

    if (!pack) return json({ error: "invalid", message: "This link is not valid." }, 404);
    if (new Date(pack.token_expires_at).getTime() < Date.now()) {
      return json({ error: "expired", message: "This link has expired. Ask your manager to send it again." }, 410);
    }

    const loadItems = async () => {
      const { data } = await admin
        .from("induction_pack_items")
        .select("*")
        .eq("pack_id", pack.id)
        .order("sort_order");
      return data ?? [];
    };

    const loadModules = async () => {
      const { data } = await admin
        .from("induction_modules")
        .select("*")
        .eq("pack_id", pack.id)
        .order("sort_order");
      return data ?? [];
    };

    /** Creates module and practical rows the first time the pack is opened. */
    const ensureSeeded = async () => {
      const existing = await loadModules();
      if (existing.length === 0) {
        await admin.from("induction_modules").insert(
          INDUCTION_MODULE_SEED.map((m, i) => ({
            pack_id: pack.id,
            module_key: m.key,
            title: m.title,
            sort_order: i,
          })),
        );
      }
      const { count } = await admin
        .from("induction_practical_items")
        .select("id", { count: "exact", head: true })
        .eq("pack_id", pack.id);
      if (!count) {
        const role = pack.staff_role as string | null;
        const tasks = PRACTICAL_SEED.filter((t) => !t.roles || !role || t.roles.includes(role));
        await admin.from("induction_practical_items").insert(
          tasks.map((t, i) => ({
            pack_id: pack.id,
            employee_id: pack.employee_id,
            group_key: t.group,
            label: t.label,
            sort_order: i,
            applicable: true,
          })),
        );
      }
    };

    if (req.method === "GET") {
      if (!pack.opened_at) {
        await admin
          .from("induction_packs")
          .update({ opened_at: new Date().toISOString(), status: pack.status === "sent" ? "opened" : pack.status })
          .eq("id", pack.id);
      }

      await ensureSeeded();

      const items = await loadItems();
      const withUrls = await Promise.all(
        items.map(async (item: any) => {
          let view_url: string | null = null;
          if (item.file_path) {
            const { data } = await admin.storage.from(BUCKET).createSignedUrl(item.file_path, 3600);
            view_url = data?.signedUrl ?? null;
          }
          return { ...item, view_url };
        }),
      );

      const modules = await loadModules();

      const { data: declaration } = await admin
        .from("induction_declarations")
        .select("*")
        .eq("pack_id", pack.id)
        .maybeSingle();

      const { data: assessments } = await admin
        .from("induction_assessments")
        .select("*")
        .eq("pack_id", pack.id)
        .order("attempt_number", { ascending: false });

      const { data: practical } = await admin
        .from("induction_practical_items")
        .select("*")
        .eq("pack_id", pack.id)
        .order("sort_order");

      let site: Record<string, string | null> = {};
      if (pack.branch) {
        const { data: settings } = await admin
          .from("location_settings")
          .select(SITE_FIELDS.join(","))
          .eq("tenant_id", pack.tenant_id)
          .eq("branch", pack.branch)
          .maybeSingle();
        if (settings) site = settings as any;
      }

      let alcohol: any = null;
      if (pack.includes_alcohol) {
        const { data } = await admin
          .from("alcohol_authorisations")
          .select("id, status, employee_signed_at, authoriser_confirmed_at, branch")
          .eq("pack_id", pack.id)
          .maybeSingle();
        alcohol = data ?? null;
      }

      const emp: any = pack.employees;
      return json({
        pack: {
          id: pack.id,
          branch: pack.branch,
          staff_role: pack.staff_role,
          status: pack.status,
          sent_at: pack.sent_at,
          opened_at: pack.opened_at,
          completed_at: pack.completed_at,
          includes_alcohol: pack.includes_alcohol,
          final_statement_text: pack.final_statement_text,
          issued_by_name: pack.issued_by_name,
        },
        employee: { name: emp ? `${emp.forename} ${emp.surname}` : "", first_name: emp?.forename ?? "" },
        modules,
        declaration: declaration ?? null,
        assessment: assessments?.[0] ?? null,
        attempts: assessments?.length ?? 0,
        practical: practical ?? [],
        site,
        items: withUrls,
        alcohol,
      });
    }

    // ── POST actions ──
    const action = body?.action;

    if (action === "read_module" || action === "acknowledge_module") {
      const key = body?.module_key;
      if (!key) return json({ error: "Missing section" }, 400);
      const modules = await loadModules();
      const mod = modules.find((m: any) => m.module_key === key);
      if (!mod) return json({ error: "Section not found" }, 404);
      const now = new Date().toISOString();
      await admin
        .from("induction_modules")
        .update({
          read_at: mod.read_at ?? now,
          acknowledged_at: action === "acknowledge_module" ? (mod.acknowledged_at ?? now) : mod.acknowledged_at,
        })
        .eq("id", mod.id);
      return json({ success: true });
    }

    if (action === "submit_declaration") {
      const answers = body?.answers;
      if (!answers || typeof answers !== "object") return json({ error: "Missing answers" }, 400);
      const missing = DECLARATION_KEYS.filter((k) => answers[k] !== true && answers[k] !== false);
      if (missing.length > 0) {
        return json({ error: `Please answer every question (${missing.length} remaining).` }, 400);
      }
      if (!body?.signature_data) return json({ error: "A signature is required" }, 400);
      const hasYes = DECLARATION_KEYS.some((k) => answers[k] === true);
      const clean = Object.fromEntries(DECLARATION_KEYS.map((k) => [k, answers[k] === true]));

      const { data: existing } = await admin
        .from("induction_declarations")
        .select("id")
        .eq("pack_id", pack.id)
        .maybeSingle();
      if (existing) {
        await admin
          .from("induction_declarations")
          .update({
            answers: clean,
            has_yes_answer: hasYes,
            signature_data: body.signature_data,
            signed_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await admin.from("induction_declarations").insert({
          pack_id: pack.id,
          employee_id: pack.employee_id,
          answers: clean,
          has_yes_answer: hasYes,
          signature_data: body.signature_data,
          signed_at: new Date().toISOString(),
        });
      }

      // A declared symptom needs a manager to see it straight away.
      if (hasYes && pack.issued_by) {
        const emp: any = pack.employees;
        await admin.from("notifications").insert({
          tenant_id: pack.tenant_id,
          user_id: pack.issued_by,
          event_type: "induction_health_declaration",
          title: "Health declaration needs review",
          body: `${emp ? `${emp.forename} ${emp.surname}` : "A staff member"} answered yes to a fitness-to-work question. Review before they handle food.`,
          link: "/compliance",
          metadata: { pack_id: pack.id, employee_id: pack.employee_id },
        });
      }
      return json({ success: true, has_yes_answer: hasYes });
    }

    if (action === "submit_assessment") {
      const answers = body?.answers;
      if (!answers || typeof answers !== "object") return json({ error: "Missing answers" }, 400);
      const keys = Object.keys(ASSESSMENT_KEY);
      const unanswered = keys.filter((k) => typeof answers[k] !== "number");
      if (unanswered.length > 0) {
        return json({ error: `Please answer every question (${unanswered.length} remaining).` }, 400);
      }
      let score = 0;
      for (const k of keys) if (answers[k] === ASSESSMENT_KEY[k]) score += 1;
      const passed = score >= ASSESSMENT_PASS_MARK;

      const { count } = await admin
        .from("induction_assessments")
        .select("id", { count: "exact", head: true })
        .eq("pack_id", pack.id);

      await admin.from("induction_assessments").insert({
        pack_id: pack.id,
        employee_id: pack.employee_id,
        answers,
        score,
        total: ASSESSMENT_TOTAL,
        passed,
        attempt_number: (count ?? 0) + 1,
      });

      return json({
        success: true,
        score,
        total: ASSESSMENT_TOTAL,
        passed,
        wrong: keys.filter((k) => answers[k] !== ASSESSMENT_KEY[k]),
      });
    }

    if (action === "acknowledge_item") {
      const itemId = body?.item_id;
      if (!itemId) return json({ error: "Missing document" }, 400);
      const items = await loadItems();
      const item = items.find((i: any) => i.id === itemId);
      if (!item) return json({ error: "Document not found" }, 404);
      if (item.requires_signature && !body?.signature_data) {
        return json({ error: "A signature is required for this document" }, 400);
      }
      await admin
        .from("induction_pack_items")
        .update({
          acknowledged_at: new Date().toISOString(),
          viewed_at: item.viewed_at ?? new Date().toISOString(),
          signature_data: body?.signature_data ?? item.signature_data,
        })
        .eq("id", itemId);
      return json({ success: true });
    }

    if (action === "acknowledge_alcohol") {
      if (!pack.includes_alcohol) return json({ error: "Not applicable" }, 400);
      if (!body?.signature_data) return json({ error: "A signature is required" }, 400);
      const { data: existing } = await admin
        .from("alcohol_authorisations")
        .select("id")
        .eq("pack_id", pack.id)
        .maybeSingle();
      const payload = {
        employee_signature: body.signature_data,
        employee_signed_at: new Date().toISOString(),
        status: "pending",
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        await admin.from("alcohol_authorisations").update(payload).eq("id", existing.id);
      } else {
        await admin.from("alcohol_authorisations").insert({
          tenant_id: pack.tenant_id,
          employee_id: pack.employee_id,
          branch: pack.branch,
          pack_id: pack.id,
          ...payload,
        });
      }
      return json({ success: true });
    }

    if (action === "complete") {
      if (!body?.signature_data) return json({ error: "A signature is required" }, 400);
      const items = await loadItems();
      const outstanding = items.filter((i: any) => !i.acknowledged_at);
      if (outstanding.length > 0) {
        return json({ error: `Please confirm all documents first (${outstanding.length} remaining).` }, 400);
      }

      const modules = await loadModules();
      const unreadModules = modules.filter((m: any) => !m.acknowledged_at);
      if (unreadModules.length > 0) {
        return json({ error: `Please confirm every section first (${unreadModules.length} remaining).` }, 400);
      }

      const { data: declaration } = await admin
        .from("induction_declarations")
        .select("id")
        .eq("pack_id", pack.id)
        .maybeSingle();
      if (!declaration) return json({ error: "Please complete the health declaration first." }, 400);

      const { data: passedAttempt } = await admin
        .from("induction_assessments")
        .select("id")
        .eq("pack_id", pack.id)
        .eq("passed", true)
        .limit(1)
        .maybeSingle();
      if (!passedAttempt) return json({ error: "Please pass the knowledge check first." }, 400);

      await admin
        .from("induction_packs")
        .update({
          completed_at: new Date().toISOString(),
          status: "completed",
          final_signature_data: body.signature_data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pack.id);

      await admin.from("audit_log").insert({
        tenant_id: pack.tenant_id,
        action: "create",
        table_name: "induction_pack_completed",
        record_id: pack.id,
        new_data: {
          employee_id: pack.employee_id,
          documents: items.map((i: any) => ({ name: i.document_name, version: i.document_version })),
          modules: modules.map((m: any) => ({ key: m.module_key, acknowledged_at: m.acknowledged_at })),
          completed_at: new Date().toISOString(),
        },
      });

      // In-app alert for the manager who issued it.
      if (pack.issued_by) {
        const emp: any = pack.employees;
        await admin.from("notifications").insert({
          tenant_id: pack.tenant_id,
          user_id: pack.issued_by,
          event_type: "induction_completed",
          title: "Induction completed — practical items to verify",
          body: `${emp ? `${emp.forename} ${emp.surname}` : "A staff member"} has completed their induction. Verify the practical items on site.`,
          link: "/compliance",
          metadata: { pack_id: pack.id, employee_id: pack.employee_id },
        });
      }

      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("induction-portal failed:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
