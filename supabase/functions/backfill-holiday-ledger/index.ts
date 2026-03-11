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

    const entries: any[] = [];
    const skipped: any[] = [];

    // 1. Accruals from payroll_entries
    const { data: payrollEntries, error: peErr } = await supabase
      .from("payroll_entries")
      .select(`
        id, employee_id, holiday_accrued_hours, hourly_rate, tenant_id,
        payroll_periods!inner (start_date, period_name)
      `)
      .eq("tenant_id", tenant_id)
      .gt("holiday_accrued_hours", 0);
    if (peErr) throw peErr;

    for (const pe of payrollEntries || []) {
      const periodStart = (pe as any).payroll_periods?.start_date;
      if (!periodStart) continue;
      const leaveYearStart = `${new Date(periodStart).getFullYear()}-01-01`;
      entries.push({
        employee_id: pe.employee_id,
        tenant_id: pe.tenant_id,
        leave_year_start: leaveYearStart,
        entry_date: periodStart,
        entry_type: "accrual",
        hours: Number(pe.holiday_accrued_hours),
        amount: null,
        source_table: "payroll_entries",
        source_id: pe.id,
        notes: `Auto-backfill from ${(pe as any).payroll_periods?.period_name || "payroll"}`,
      });
    }

    // 2. Holiday taken from holiday_payments
    const { data: holidayPayments, error: hpErr } = await supabase
      .from("holiday_payments")
      .select("id, employee_id, hours, total, holiday_taken_date, leave_year_start, tenant_id, notes")
      .eq("tenant_id", tenant_id);
    if (hpErr) throw hpErr;

    for (const hp of holidayPayments || []) {
      if (!hp.employee_id) continue;
      const lys = hp.leave_year_start || (hp.holiday_taken_date
        ? `${new Date(hp.holiday_taken_date).getFullYear()}-01-01`
        : null);
      if (!lys) continue;
      entries.push({
        employee_id: hp.employee_id,
        tenant_id: hp.tenant_id,
        leave_year_start: lys,
        entry_date: hp.holiday_taken_date || lys,
        entry_type: "holiday_taken",
        hours: -Math.abs(Number(hp.hours)),
        amount: Number(hp.total),
        source_table: "holiday_payments",
        source_id: hp.id,
        notes: hp.notes || "Auto-backfill from holiday_payments",
      });
    }

    // 3. Carry-over from holiday_balances
    const { data: balances, error: balErr } = await supabase
      .from("holiday_balances")
      .select("id, employee_id, hours_carried_over, leave_year_start, tenant_id")
      .eq("tenant_id", tenant_id)
      .gt("hours_carried_over", 0);
    if (balErr) throw balErr;

    for (const bal of balances || []) {
      entries.push({
        employee_id: bal.employee_id,
        tenant_id: bal.tenant_id,
        leave_year_start: bal.leave_year_start,
        entry_date: bal.leave_year_start,
        entry_type: "carry_over_in",
        hours: Number(bal.hours_carried_over),
        amount: null,
        source_table: "holiday_balances",
        source_id: bal.id,
        notes: "Auto-backfill carry-over from holiday_balances",
      });
    }

    // 4. Manual adjustments from holiday_adjustments
    const { data: adjustments, error: adjErr } = await supabase
      .from("holiday_adjustments")
      .select("id, employee_id, hours, adjustment_type, reason, leave_year_start, tenant_id, created_at")
      .eq("tenant_id", tenant_id);
    if (adjErr) throw adjErr;

    for (const adj of adjustments || []) {
      entries.push({
        employee_id: adj.employee_id,
        tenant_id: adj.tenant_id,
        leave_year_start: adj.leave_year_start,
        entry_date: adj.created_at ? new Date(adj.created_at).toISOString().slice(0, 10) : adj.leave_year_start,
        entry_type: "manual_adjustment",
        hours: Number(adj.hours),
        amount: null,
        source_table: "holiday_adjustments",
        source_id: adj.id,
        notes: `${adj.adjustment_type}: ${adj.reason}`,
      });
    }

    if (dry_run) {
      return new Response(JSON.stringify({
        dry_run: true,
        total_entries: entries.length,
        breakdown: {
          accrual: entries.filter(e => e.entry_type === "accrual").length,
          holiday_taken: entries.filter(e => e.entry_type === "holiday_taken").length,
          carry_over_in: entries.filter(e => e.entry_type === "carry_over_in").length,
          manual_adjustment: entries.filter(e => e.entry_type === "manual_adjustment").length,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert in batches, using ON CONFLICT DO NOTHING via unique index
    let inserted = 0;
    let duplicates = 0;
    const BATCH = 500;

    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from("holiday_ledger")
        .upsert(batch, { onConflict: "source_table,source_id,entry_type", ignoreDuplicates: true })
        .select("id");

      if (error) {
        // If upsert fails due to unique constraint on partial index, insert individually
        for (const entry of batch) {
          const { error: singleErr } = await supabase
            .from("holiday_ledger")
            .insert(entry);
          if (singleErr) {
            if (singleErr.code === "23505") {
              duplicates++;
            } else {
              skipped.push({ entry, error: singleErr.message });
            }
          } else {
            inserted++;
          }
        }
      } else {
        inserted += data?.length || 0;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_processed: entries.length,
      inserted,
      duplicates,
      skipped: skipped.length,
      skipped_details: skipped.slice(0, 20),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
