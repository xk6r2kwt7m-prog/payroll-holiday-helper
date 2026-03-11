import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's token to get their identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for privileged operations
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Check user doesn't already belong to a tenant
    const { data: existing } = await admin
      .from("tenant_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "You already belong to a company workspace" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { company_name, country, timezone } = body;

    if (!company_name || !country || !timezone) {
      return new Response(JSON.stringify({ error: "company_name, country, and timezone are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate slug from company name
    const slug = company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 60);

    // Check slug uniqueness
    const { data: slugExists } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    const finalSlug = slugExists ? `${slug}-${Date.now().toString(36)}` : slug;

    // 1. Create tenant
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants")
      .insert({
        name: company_name,
        slug: finalSlug,
        country,
        timezone,
        status: "active",
      })
      .select()
      .single();

    if (tenantErr) throw tenantErr;

    // 2. Add user as company_admin in tenant_members
    const { error: memberErr } = await admin
      .from("tenant_members")
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: "company_admin",
        is_active: true,
      });

    if (memberErr) throw memberErr;

    // 3. Ensure user has admin role in user_roles for backward compat
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingRole) {
      await admin.from("user_roles").insert({
        user_id: user.id,
        role: "admin",
        tenant_id: tenant.id,
      });
    }

    // 4. Create default company_settings
    const { error: settingsErr } = await admin
      .from("company_settings")
      .insert({
        tenant_id: tenant.id,
        company_name: company_name,
      });

    if (settingsErr) throw settingsErr;

    // 5. Create default tenant_leave_settings
    await admin
      .from("tenant_leave_settings")
      .insert({ tenant_id: tenant.id });

    return new Response(
      JSON.stringify({
        tenant_id: tenant.id,
        slug: finalSlug,
        message: "Company workspace created successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("provision-tenant error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
