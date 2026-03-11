import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { tenant_id, dry_run = true } = await req.json();
    if (!tenant_id) throw new Error("tenant_id required");

    // 1. Load all holiday_balances for this tenant
    const { data: balances, error: balErr } = await supabase
      .from("holiday_balances")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("leave_year_start", { ascending: true });
    if (balErr) throw balErr;

    // 2. Load all holiday_adjustments
    const { data: adjustments, error: adjErr } = await supabase
      .from("holiday_adjustments")
      .select("*")
      .eq("tenant_id", tenant_id);
    if (adjErr) throw adjErr;

    // Group balances by employee
    const byEmployee: Record<string, typeof balances> = {};
    for (const bal of balances || []) {
      const eid = bal.employee_id;
      if (!byEmployee[eid]) byEmployee[eid] = [];
      byEmployee[eid].push(bal);
    }

    // Group adjustments by employee+year
    const adjByEmpYear: Record<string, number> = {};
    for (const adj of adjustments || []) {
      const key = `${adj.employee_id}|${adj.leave_year_start}`;
      adjByEmpYear[key] = (adjByEmpYear[key] || 0) + Number(adj.hours);
    }

    const changes: any[] = [];
    const auditEntries: any[] = [];

    for (const [employeeId, empBalances] of Object.entries(byEmployee)) {
      // Sort by year
      const sorted = empBalances.sort((a: any, b: any) =>
        a.leave_year_start.localeCompare(b.leave_year_start)
      );

      for (let i = 0; i < sorted.length; i++) {
        const bal = sorted[i];
        const yr = new Date(bal.leave_year_start).getFullYear();

        let expectedCarryOver = 0;
        if (i > 0) {
          const prev = sorted[i - 1];
          const prevAdj = adjByEmpYear[`${employeeId}|${prev.leave_year_start}`] || 0;
          const prevClosing =
            Number(prev.hours_accrued || 0) +
            Number(prev.hours_carried_over || 0) +
            prevAdj -
            Number(prev.hours_taken || 0);
          // Clamp to >= 0 per business rules (no negative carry-over)
          expectedCarryOver = Math.max(0, Math.round(prevClosing * 100) / 100);
        }

        const currentCarryOver = Math.round(Number(bal.hours_carried_over || 0) * 100) / 100;

        if (Math.abs(expectedCarryOver - currentCarryOver) > 0.01) {
          changes.push({
            balance_id: bal.id,
            employee_id: employeeId,
            leave_year_start: bal.leave_year_start,
            year: yr,
            old_carry_over: currentCarryOver,
            new_carry_over: expectedCarryOver,
            delta: Math.round((expectedCarryOver - currentCarryOver) * 100) / 100,
          });

          auditEntries.push({
            employee_id: employeeId,
            tenant_id,
            leave_year_start: bal.leave_year_start,
            leave_year_end: bal.leave_year_end,
            old_hours_accrued: bal.hours_accrued,
            old_hours_taken: bal.hours_taken,
            old_hours_carried_over: currentCarryOver,
            old_updated_at: bal.updated_at,
            new_hours_accrued: bal.hours_accrued,
            new_hours_taken: bal.hours_taken,
            new_hours_carried_over: expectedCarryOver,
            accrued_delta: 0,
            taken_delta: 0,
            carried_over_delta: Math.round((expectedCarryOver - currentCarryOver) * 100) / 100,
            reason: `Carry-over chain rebuild: prior year closing → ${expectedCarryOver}`,
            source_table: "rebuild-holiday-carryover",
          });

          // Update the in-memory record so subsequent years cascade correctly
          sorted[i] = { ...bal, hours_carried_over: expectedCarryOver };
        }
      }
    }

    if (dry_run) {
      // Load employee names for the report
      const affectedIds = [...new Set(changes.map((c: any) => c.employee_id))];
      let employeeNames: Record<string, string> = {};
      if (affectedIds.length > 0) {
        const { data: emps } = await supabase
          .from("employees")
          .select("id, forename, surname")
          .in("id", affectedIds);
        for (const e of emps || []) {
          employeeNames[e.id] = `${e.forename} ${e.surname}`;
        }
      }

      const enrichedChanges = changes.map((c: any) => ({
        ...c,
        employee_name: employeeNames[c.employee_id] || "Unknown",
      }));

      return new Response(JSON.stringify({
        dry_run: true,
        total_changes: changes.length,
        affected_employees: affectedIds.length,
        changes: enrichedChanges,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Apply changes
    // 1. Write audit log entries
    if (auditEntries.length > 0) {
      const BATCH = 200;
      for (let i = 0; i < auditEntries.length; i += BATCH) {
        const batch = auditEntries.slice(i, i + BATCH);
        const { error: auditErr } = await supabase
          .from("holiday_balance_audit_log")
          .insert(batch);
        if (auditErr) console.error("Audit insert error:", auditErr);
      }
    }

    // 2. Update holiday_balances
    let updated = 0;
    for (const change of changes) {
      const { error: updErr } = await supabase
        .from("holiday_balances")
        .update({ hours_carried_over: change.new_carry_over })
        .eq("id", change.balance_id);
      if (updErr) {
        console.error(`Failed to update balance ${change.balance_id}:`, updErr);
      } else {
        updated++;
      }
    }

    // 3. Update holiday_ledger carry_over_in entries
    let ledgerUpdated = 0;
    for (const change of changes) {
      // Find and update the carry_over_in ledger entry for this employee+year
      const { data: ledgerEntries, error: ledgerErr } = await supabase
        .from("holiday_ledger")
        .select("id, hours")
        .eq("employee_id", change.employee_id)
        .eq("leave_year_start", change.leave_year_start)
        .eq("entry_type", "carry_over_in")
        .eq("tenant_id", tenant_id);

      if (ledgerErr) {
        console.error("Ledger query error:", ledgerErr);
        continue;
      }

      if (ledgerEntries && ledgerEntries.length > 0) {
        // Update existing carry_over_in entry
        for (const le of ledgerEntries) {
          const { error: luErr } = await supabase
            .from("holiday_ledger")
            .update({ hours: change.new_carry_over, notes: `Carry-over chain rebuild: corrected from ${change.old_carry_over} to ${change.new_carry_over}` })
            .eq("id", le.id);
          if (!luErr) ledgerUpdated++;
        }
      } else if (change.new_carry_over > 0) {
        // Insert new carry_over_in entry if none exists and carry-over > 0
        const { error: liErr } = await supabase
          .from("holiday_ledger")
          .insert({
            employee_id: change.employee_id,
            tenant_id,
            leave_year_start: change.leave_year_start,
            entry_date: change.leave_year_start,
            entry_type: "carry_over_in",
            hours: change.new_carry_over,
            notes: `Carry-over chain rebuild: inserted ${change.new_carry_over} from prior year closing balance`,
            source_table: "holiday_balances",
          });
        if (!liErr) ledgerUpdated++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_changes: changes.length,
      balances_updated: updated,
      ledger_entries_updated: ledgerUpdated,
      audit_entries_created: auditEntries.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
