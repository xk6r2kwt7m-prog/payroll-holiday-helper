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

    const { tenant_id, dry_run = false } = await req.json();
    if (!tenant_id) throw new Error("tenant_id required");

    // ─── STEP 1: Get all orphaned holiday_payments ───
    const { data: orphans, error: orphErr } = await supabase
      .from("holiday_payments")
      .select("*")
      .eq("tenant_id", tenant_id)
      .is("employee_id", null);
    if (orphErr) throw orphErr;

    if (!orphans || orphans.length === 0) {
      return new Response(JSON.stringify({ message: "No orphaned payments found", resolved: 0, flagged: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── STEP 2: Get all employees for name matching ───
    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, forename, surname, hourly_rate, tenant_id")
      .eq("tenant_id", tenant_id);
    if (empErr) throw empErr;

    // Build name-matching helpers
    const nameIndex: Record<string, { id: string; forename: string; surname: string; hourly_rate: number }[]> = {};
    for (const emp of employees || []) {
      const fullLower = `${emp.forename} ${emp.surname}`.toLowerCase().trim();
      const forenameLower = emp.forename.toLowerCase().trim();
      const surnameLower = emp.surname.toLowerCase().trim();
      // Index by full name, forename only, surname only
      for (const key of [fullLower, forenameLower, surnameLower]) {
        if (!nameIndex[key]) nameIndex[key] = [];
        nameIndex[key].push(emp);
      }
    }

    // ─── STEP 3: Get payroll_entries for cross-reference ───
    // For each orphan, find payroll_entries in the same period to confirm match
    const periodIds = [...new Set(orphans.map(o => o.payroll_period_id))];
    let allPE: any[] = [];
    // Fetch in batches of period IDs
    for (let i = 0; i < periodIds.length; i += 10) {
      const batch = periodIds.slice(i, i + 10);
      const { data, error } = await supabase
        .from("payroll_entries")
        .select("id, employee_id, payroll_period_id, hourly_rate, tenant_id")
        .eq("tenant_id", tenant_id)
        .in("payroll_period_id", batch);
      if (error) throw error;
      allPE = allPE.concat(data || []);
    }

    // Index PE by period_id + hourly_rate for fast lookup
    const peByPeriod: Record<string, any[]> = {};
    for (const pe of allPE) {
      const key = pe.payroll_period_id;
      if (!peByPeriod[key]) peByPeriod[key] = [];
      peByPeriod[key].push(pe);
    }

    // ─── STEP 4: Match each orphan ───
    const resolved: any[] = [];
    const flagged: any[] = [];

    for (const orphan of orphans) {
      const nameRaw = (orphan.employee_name || "").trim();
      const nameLower = nameRaw.toLowerCase();
      // Remove suffixes like "(implied)"
      const nameClean = nameLower.replace(/\s*\(.*?\)\s*/g, "").trim();

      // Strategy 1: Full name match
      let candidates = nameIndex[nameClean] || [];

      // Strategy 2: If no full match, try forename-only or surname-only
      if (candidates.length === 0) {
        // Try first word as forename
        const firstWord = nameClean.split(/\s+/)[0];
        candidates = nameIndex[firstWord] || [];
      }

      // Strategy 3: Cross-reference with payroll_entries in same period + rate
      if (candidates.length > 1) {
        const periodEntries = peByPeriod[orphan.payroll_period_id] || [];
        const candidateIds = new Set(candidates.map(c => c.id));
        const peMatches = periodEntries.filter(pe =>
          candidateIds.has(pe.employee_id) &&
          Math.abs(Number(pe.hourly_rate) - Number(orphan.rate)) < 0.50
        );
        if (peMatches.length === 1) {
          candidates = candidates.filter(c => c.id === peMatches[0].employee_id);
        } else if (peMatches.length > 1) {
          // Narrow by exact rate match
          const exactRate = peMatches.filter(pe =>
            Math.abs(Number(pe.hourly_rate) - Number(orphan.rate)) < 0.01
          );
          if (exactRate.length === 1) {
            candidates = candidates.filter(c => c.id === exactRate[0].employee_id);
          }
        }
      }

      // If still multiple candidates, try rate-based filtering
      if (candidates.length > 1) {
        const rateFiltered = candidates.filter(c =>
          Math.abs(Number(c.hourly_rate) - Number(orphan.rate)) < 0.50
        );
        if (rateFiltered.length === 1) candidates = rateFiltered;
      }

      if (candidates.length === 1) {
        resolved.push({
          payment_id: orphan.id,
          employee_id: candidates[0].id,
          employee_name: orphan.employee_name,
          matched_to: `${candidates[0].forename} ${candidates[0].surname}`,
          hours: orphan.hours,
          rate: orphan.rate,
          total: orphan.total,
          leave_year_start: orphan.leave_year_start,
          payroll_period_id: orphan.payroll_period_id,
        });
      } else {
        flagged.push({
          payment_id: orphan.id,
          employee_name: orphan.employee_name,
          hours: orphan.hours,
          rate: orphan.rate,
          total: orphan.total,
          candidate_count: candidates.length,
          candidates: candidates.map(c => ({ id: c.id, name: `${c.forename} ${c.surname}` })),
          reason: candidates.length === 0 ? "no_name_match" : "multiple_matches",
        });
      }
    }

    if (dry_run) {
      return new Response(JSON.stringify({
        dry_run: true,
        total_orphans: orphans.length,
        resolved: resolved.length,
        flagged: flagged.length,
        resolved_details: resolved,
        flagged_details: flagged,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── STEP 5: Apply resolved matches ───
    let updated = 0;
    for (const r of resolved) {
      const { error } = await supabase
        .from("holiday_payments")
        .update({ employee_id: r.employee_id })
        .eq("id", r.payment_id);
      if (error) {
        flagged.push({ ...r, reason: "update_failed", error: error.message });
      } else {
        updated++;
      }
    }

    // ─── STEP 6: Log flagged items to holiday_integrity_log ───
    for (const f of flagged) {
      await supabase.from("holiday_integrity_log").insert({
        tenant_id,
        check_type: "orphan_payment_unresolved",
        leave_year: f.leave_year_start
          ? new Date(f.leave_year_start).getFullYear()
          : new Date().getFullYear(),
        employee_name: f.employee_name,
        severity: "warning",
        status: "flagged",
        details: f,
      });
    }

    // ─── STEP 7: Rebuild holiday_ledger for resolved payments ───
    // For each resolved payment, ensure a holiday_taken ledger entry exists
    let ledgerInserted = 0;
    let ledgerSkipped = 0;
    for (const r of resolved) {
      // Check if ledger entry already exists for this source
      const { data: existing } = await supabase
        .from("holiday_ledger")
        .select("id")
        .eq("source_table", "holiday_payments")
        .eq("source_id", r.payment_id)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update the employee_id on existing ledger entry
        await supabase
          .from("holiday_ledger")
          .update({ employee_id: r.employee_id })
          .eq("source_table", "holiday_payments")
          .eq("source_id", r.payment_id);
        ledgerSkipped++;
      } else {
        // Insert new ledger entry
        const lys = r.leave_year_start || `${new Date().getFullYear()}-01-01`;
        const { error: ledErr } = await supabase
          .from("holiday_ledger")
          .insert({
            employee_id: r.employee_id,
            tenant_id,
            leave_year_start: lys,
            entry_date: lys,
            entry_type: "holiday_taken",
            hours: -Math.abs(Number(r.hours)),
            amount: Number(r.total),
            source_table: "holiday_payments",
            source_id: r.payment_id,
            notes: `Auto-linked orphan payment: ${r.employee_name}`,
          });
        if (!ledErr) ledgerInserted++;
      }
    }

    // ─── STEP 8: Rebuild holiday_balances for affected employees ───
    const affectedEmployeeIds = [...new Set(resolved.map(r => r.employee_id))];
    const balanceUpdates: any[] = [];

    for (const empId of affectedEmployeeIds) {
      // Get all leave years for this employee from ledger
      const { data: ledgerEntries } = await supabase
        .from("holiday_ledger")
        .select("leave_year_start, entry_type, hours")
        .eq("employee_id", empId)
        .eq("tenant_id", tenant_id);

      // Group by leave year
      const byYear: Record<string, { accrued: number; taken: number; carry_over: number; adjustments: number }> = {};
      for (const le of ledgerEntries || []) {
        const yr = le.leave_year_start;
        if (!byYear[yr]) byYear[yr] = { accrued: 0, taken: 0, carry_over: 0, adjustments: 0 };
        const h = Number(le.hours);
        switch (le.entry_type) {
          case "accrual": byYear[yr].accrued += h; break;
          case "holiday_taken": byYear[yr].taken += Math.abs(h); break;
          case "carry_over_in": byYear[yr].carry_over += h; break;
          case "manual_adjustment":
          case "correction": byYear[yr].adjustments += h; break;
        }
      }

      // Also get authoritative taken from holiday_payments
      const { data: hpData } = await supabase
        .from("holiday_payments")
        .select("hours, leave_year_start")
        .eq("employee_id", empId)
        .eq("tenant_id", tenant_id);

      const takenByYear: Record<string, number> = {};
      for (const hp of hpData || []) {
        const yr = hp.leave_year_start || "unknown";
        takenByYear[yr] = (takenByYear[yr] || 0) + Math.abs(Number(hp.hours));
      }

      // Update holiday_balances
      for (const [lys, totals] of Object.entries(byYear)) {
        const lysDate = lys;
        const lyeDate = `${new Date(lys).getFullYear()}-12-31`;
        const takenFromPayments = takenByYear[lys] || totals.taken;

        // Get current balance
        const { data: currentBal } = await supabase
          .from("holiday_balances")
          .select("*")
          .eq("employee_id", empId)
          .eq("leave_year_start", lysDate)
          .limit(1);

        const oldBal = currentBal?.[0];

        if (oldBal) {
          // Log audit before update
          await supabase.from("holiday_balance_audit_log").insert({
            employee_id: empId,
            tenant_id,
            leave_year_start: lysDate,
            leave_year_end: lyeDate,
            old_hours_accrued: oldBal.hours_accrued,
            old_hours_taken: oldBal.hours_taken,
            old_hours_carried_over: oldBal.hours_carried_over,
            old_updated_at: oldBal.updated_at,
            new_hours_taken: takenFromPayments,
            new_hours_accrued: oldBal.hours_accrued, // don't change accrued
            new_hours_carried_over: oldBal.hours_carried_over, // don't change carry
            taken_delta: takenFromPayments - Number(oldBal.hours_taken || 0),
            accrued_delta: 0,
            carried_over_delta: 0,
            reason: "orphan_payment_resolution",
            source_table: "holiday_payments",
          });

          // Only update hours_taken if it changed
          if (Math.abs(takenFromPayments - Number(oldBal.hours_taken || 0)) > 0.001) {
            await supabase
              .from("holiday_balances")
              .update({ hours_taken: takenFromPayments })
              .eq("id", oldBal.id);

            balanceUpdates.push({
              employee_id: empId,
              leave_year: lysDate,
              old_taken: oldBal.hours_taken,
              new_taken: takenFromPayments,
            });
          }
        }
      }
    }

    // ─── STEP 9: Integrity validation ───
    // Check for remaining orphans
    const { data: remainingOrphans } = await supabase
      .from("holiday_payments")
      .select("id")
      .eq("tenant_id", tenant_id)
      .is("employee_id", null);

    // Check for duplicate ledger entries
    const { data: dupCheck } = await supabase.rpc("execute_sql", { sql: "SELECT 1" }).maybeSingle();
    // We'll do a simpler check
    const integrityResults = {
      remaining_orphans: remainingOrphans?.length || 0,
      employees_updated: affectedEmployeeIds.length,
      balance_adjustments: balanceUpdates.length,
    };

    return new Response(JSON.stringify({
      success: true,
      total_orphans: orphans.length,
      resolved: updated,
      flagged: flagged.length,
      ledger_entries_inserted: ledgerInserted,
      ledger_entries_updated: ledgerSkipped,
      balance_updates: balanceUpdates,
      flagged_details: flagged,
      resolved_details: resolved,
      integrity: integrityResults,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
