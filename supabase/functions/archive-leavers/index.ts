import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardRequest, guardCorsHeaders } from "../_shared/auth-guard.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: guardCorsHeaders });

  try {
    let body: { tenant_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const guard = await guardRequest(req, { tenantId: body.tenant_id ?? null, adminOnly: true });
    if (!guard.ok) return guard.response;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Archive leavers whose status changed to 'leaver' more than 7 days ago
    // and haven't been archived yet
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("employees")
      .update({ archived_at: new Date().toISOString() })
      .eq("status", "leaver")
      .is("archived_at", null)
      .lte("updated_at", sevenDaysAgo);

    // Signed-in callers may only archive within their own company.
    if (!guard.internal && guard.tenantId) {
      query = query.eq("tenant_id", guard.tenantId);
    }

    const { data, error } = await query.select("id, forename, surname");

    if (error) throw error;

    return new Response(
      JSON.stringify({ archived: data?.length ?? 0, employees: data }),
      { headers: { ...guardCorsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...guardCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});
