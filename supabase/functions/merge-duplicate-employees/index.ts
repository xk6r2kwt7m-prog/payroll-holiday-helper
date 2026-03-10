import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { dry_run = true } = await req.json().catch(() => ({ dry_run: true }));

    // Step 1: Find all duplicate employee groups (same forename + surname)
    const { data: allEmployees } = await supabase
      .from("employees")
      .select("id, forename, surname, start_date, status, hourly_rate");

    if (!allEmployees) throw new Error("Failed to fetch employees");

    // Group by forename|surname
    const groups = new Map<string, typeof allEmployees>();
    for (const emp of allEmployees) {
      const key = `${emp.forename.toLowerCase()}|${emp.surname.toLowerCase()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(emp);
    }

    const mergeActions: { canonical: string; canonicalName: string; duplicates: string[]; entriesMoved: number; holidaysMoved: number }[] = [];
    let totalDuplicatesRemoved = 0;
    let totalEntriesMoved = 0;
    let totalHolidaysMoved = 0;
    const errors: string[] = [];

    for (const [key, emps] of groups) {
      if (emps.length <= 1) continue;

      // Pick canonical: prefer one with start_date set, then most entries, then first created
      // Employees with start_date are "real" (pre-existing), those without are import-created
      const sorted = [...emps].sort((a, b) => {
        if (a.start_date && !b.start_date) return -1;
        if (!a.start_date && b.start_date) return 1;
        return 0;
      });

      const canonical = sorted[0];
      const duplicates = sorted.slice(1);

      let entriesMoved = 0;
      let holidaysMoved = 0;

      for (const dup of duplicates) {
        if (!dry_run) {
          // Move payroll entries
          const { data: movedEntries, error: e1 } = await supabase
            .from("payroll_entries")
            .update({ employee_id: canonical.id })
            .eq("employee_id", dup.id)
            .select("id");
          if (e1) { errors.push(`Entry move error ${dup.id}: ${e1.message}`); continue; }
          entriesMoved += movedEntries?.length || 0;

          // Move holiday payments
          const { data: movedHolidays, error: e2 } = await supabase
            .from("holiday_payments")
            .update({ employee_id: canonical.id })
            .eq("employee_id", dup.id)
            .select("id");
          if (e2) { errors.push(`Holiday move error ${dup.id}: ${e2.message}`); }
          holidaysMoved += movedHolidays?.length || 0;

          // Move holiday balances
          await supabase
            .from("holiday_balances")
            .update({ employee_id: canonical.id })
            .eq("employee_id", dup.id);

          // Move holiday adjustments
          await supabase
            .from("holiday_adjustments")
            .update({ employee_id: canonical.id })
            .eq("employee_id", dup.id);

          // Delete duplicate employee
          const { error: delErr } = await supabase
            .from("employees")
            .delete()
            .eq("id", dup.id);
          if (delErr) { errors.push(`Delete error ${dup.forename} ${dup.surname} (${dup.id}): ${delErr.message}`); }
        } else {
          // Dry run: count what would be moved
          const { count: ec } = await supabase
            .from("payroll_entries")
            .select("id", { count: "exact", head: true })
            .eq("employee_id", dup.id);
          entriesMoved += ec || 0;

          const { count: hc } = await supabase
            .from("holiday_payments")
            .select("id", { count: "exact", head: true })
            .eq("employee_id", dup.id);
          holidaysMoved += hc || 0;
        }
      }

      mergeActions.push({
        canonical: canonical.id,
        canonicalName: `${canonical.forename} ${canonical.surname}`,
        duplicates: duplicates.map(d => d.id),
        entriesMoved,
        holidaysMoved,
      });

      totalDuplicatesRemoved += duplicates.length;
      totalEntriesMoved += entriesMoved;
      totalHolidaysMoved += holidaysMoved;
    }

    return new Response(JSON.stringify({
      dry_run,
      summary: {
        duplicateGroupsFound: mergeActions.length,
        duplicatesRemoved: totalDuplicatesRemoved,
        entriesMoved: totalEntriesMoved,
        holidaysMoved: totalHolidaysMoved,
      },
      mergeActions,
      errors,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
