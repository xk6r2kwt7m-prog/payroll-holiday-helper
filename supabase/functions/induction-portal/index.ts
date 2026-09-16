import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
 * GET  ?token=...          → pack, documents and signed view links
 * POST { action: ... }     → acknowledge_item | complete | acknowledge_alcohol
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

    if (req.method === "GET") {
      if (!pack.opened_at) {
        await admin
          .from("induction_packs")
          .update({ opened_at: new Date().toISOString(), status: pack.status === "sent" ? "opened" : pack.status })
          .eq("id", pack.id);
      }

      const items = await loadItems();
      const withUrls = await Promise.all(
        items.map(async (item: any) => {
          let view_url: string | null = null;
          if (item.file_path) {
            const { data } = await admin.storage.from(BUCKET).createSignedUrl(item.file_path, 3600);
            view_url = data?.signedUrl ?? null;
          }
          return { ...item, view_url };
        })
      );

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
        items: withUrls,
        alcohol,
      });
    }

    // ── POST actions ──
    const action = body?.action;

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
          title: "Induction completed",
          body: `${emp ? `${emp.forename} ${emp.surname}` : "A staff member"} has completed their induction documents.`,
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
