import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Archive leavers whose status changed to 'leaver' more than 7 days ago
    // and haven't been archived yet
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("employees")
      .update({ archived_at: new Date().toISOString() })
      .eq("status", "leaver")
      .is("archived_at", null)
      .lte("updated_at", sevenDaysAgo)
      .select("id, forename, surname");

    if (error) throw error;

    return new Response(
      JSON.stringify({ archived: data?.length ?? 0, employees: data }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
