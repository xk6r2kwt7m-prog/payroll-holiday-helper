import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // ──────────────────────────────────────────────────────
    // 1. LOAD ACTIVE EMPLOYEE BALANCES FOR CURRENT LEAVE YEAR
    // ──────────────────────────────────────────────────────
    const { data: balances, error: balErr } = await supabase
      .from("holiday_balances")
      .select(
        "id, employee_id, tenant_id, hours_accrued, hours_taken, hours_carried_over, leave_year_start, leave_year_end, employees(user_id, forename, surname, status, hourly_rate, pay_type)"
      )
      .lte("leave_year_start", todayStr)
      .gte("leave_year_end", todayStr);

    if (balErr) throw balErr;
    if (!balances || balances.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active balances found", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to active employees only
    const activeBalances = balances.filter(
      (b: any) => b.employees?.status === "active" && b.employees?.user_id
    );

    // ──────────────────────────────────────────────────────
    // 2. LOAD PENDING REQUESTS THAT MAY CAUSE OVERBOOKING
    // ──────────────────────────────────────────────────────
    const { data: pendingRequests } = await supabase
      .from("holiday_requests")
      .select("employee_id, hours_requested")
      .eq("status", "pending");

    // Sum pending hours per employee
    const pendingByEmployee = new Map<string, number>();
    if (pendingRequests) {
      for (const r of pendingRequests) {
        const prev = pendingByEmployee.get(r.employee_id) || 0;
        pendingByEmployee.set(r.employee_id, prev + (r.hours_requested || 0));
      }
    }

    // ──────────────────────────────────────────────────────
    // 3. DEDUPLICATION — skip if notified today
    // ──────────────────────────────────────────────────────
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("metadata")
      .gte("created_at", todayStr + "T00:00:00Z")
      .in("event_type", [
        "leave_low_balance",
        "leave_negative_balance",
        "leave_overbooking_risk",
        "leave_year_ending",
      ]);

    const alreadyNotified = new Set<string>();
    if (existingNotifs) {
      for (const n of existingNotifs) {
        const meta = n.metadata as any;
        if (meta?.dedup_key) alreadyNotified.add(meta.dedup_key);
      }
    }

    // ──────────────────────────────────────────────────────
    // 4. GET TENANT ADMINS/MANAGERS
    // ──────────────────────────────────────────────────────
    const tenantIds = [...new Set(activeBalances.map((b: any) => b.tenant_id))];
    const { data: tenantMembers } = await supabase
      .from("tenant_members")
      .select("user_id, tenant_id")
      .in("tenant_id", tenantIds)
      .in("role", ["company_admin", "manager"])
      .eq("is_active", true);

    const adminsByTenant = new Map<string, string[]>();
    if (tenantMembers) {
      for (const m of tenantMembers) {
        if (!adminsByTenant.has(m.tenant_id))
          adminsByTenant.set(m.tenant_id, []);
        adminsByTenant.get(m.tenant_id)!.push(m.user_id);
      }
    }

    // ──────────────────────────────────────────────────────
    // 5. ANALYSE EACH BALANCE AND GENERATE ALERTS
    // ──────────────────────────────────────────────────────
    const notifications: any[] = [];

    for (const b of activeBalances as any[]) {
      const emp = b.employees;
      const empName = `${emp.forename} ${emp.surname}`;
      const remaining = (b.hours_accrued || 0) + (b.hours_carried_over || 0) - (b.hours_taken || 0);
      const pendingHours = pendingByEmployee.get(b.employee_id) || 0;
      const remainingAfterPending = remaining - pendingHours;
      const leaveYearEnd = new Date(b.leave_year_end + "T00:00:00");
      const daysToYearEnd = Math.ceil(
        (leaveYearEnd.getTime() - today.getTime()) / 86400000
      );
      const yearEndLabel = leaveYearEnd.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const metadata = {
        employee_id: b.employee_id,
        balance_id: b.id,
        remaining_hours: remaining,
        pending_hours: pendingHours,
      };

      // ── ALERT A: Negative balance (already overbooked) ──
      if (remaining < 0) {
        const key = `neg_${b.employee_id}_${todayStr}`;
        if (!alreadyNotified.has(key)) {
          alreadyNotified.add(key);
          // Admin alert (action required)
          const admins = adminsByTenant.get(b.tenant_id) || [];
          for (const adminId of admins) {
            notifications.push({
              tenant_id: b.tenant_id,
              user_id: adminId,
              event_type: "leave_negative_balance",
              title: `Negative leave balance: ${empName}`,
              body: `${empName} has a negative balance of ${remaining.toFixed(1)}h. Review and resolve in Holiday Management.`,
              link: "/holidays/manage",
              metadata: { ...metadata, dedup_key: key },
            });
          }
        }
      }

      // ── ALERT B: Pending requests would cause overbooking ──
      if (pendingHours > 0 && remaining >= 0 && remainingAfterPending < 0) {
        const key = `overbook_${b.employee_id}_${todayStr}`;
        if (!alreadyNotified.has(key)) {
          alreadyNotified.add(key);
          const admins = adminsByTenant.get(b.tenant_id) || [];
          for (const adminId of admins) {
            notifications.push({
              tenant_id: b.tenant_id,
              user_id: adminId,
              event_type: "leave_overbooking_risk",
              title: `Overbooking risk: ${empName}`,
              body: `${empName} has ${remaining.toFixed(1)}h remaining but ${pendingHours.toFixed(1)}h pending. Approving would create a negative balance.`,
              link: "/holidays/manage",
              metadata: { ...metadata, dedup_key: key },
            });
          }
        }
      }

      // ── ALERT C: Low balance (≤ 16h / ~2 days remaining) ──
      if (remaining > 0 && remaining <= 16 && remaining >= -0.01) {
        const key = `low_${b.employee_id}_${todayStr}`;
        if (!alreadyNotified.has(key)) {
          alreadyNotified.add(key);
          // Employee gets informational
          notifications.push({
            tenant_id: b.tenant_id,
            user_id: emp.user_id,
            event_type: "leave_low_balance",
            title: "Low leave balance",
            body: `You have ${remaining.toFixed(1)} hours remaining this leave year. Plan any remaining leave carefully.`,
            link: "/holidays",
            metadata: { ...metadata, dedup_key: key },
          });
        }
      }

      // ── ALERT D: Leave year ending in ≤ 30 days with unused balance ──
      if (daysToYearEnd <= 30 && daysToYearEnd > 0 && remaining > 8) {
        const key = `yearend_${b.employee_id}_${todayStr}`;
        if (!alreadyNotified.has(key)) {
          alreadyNotified.add(key);
          // Employee: use it or lose it
          notifications.push({
            tenant_id: b.tenant_id,
            user_id: emp.user_id,
            event_type: "leave_year_ending",
            title: "Leave year ending soon",
            body: `Your leave year ends on ${yearEndLabel} with ${remaining.toFixed(1)}h unused. Check your carry-over allowance and plan any remaining leave.`,
            link: "/holidays",
            metadata: { ...metadata, dedup_key: key, days_to_year_end: daysToYearEnd },
          });
          // Admin: awareness
          const admins = adminsByTenant.get(b.tenant_id) || [];
          for (const adminId of admins) {
            notifications.push({
              tenant_id: b.tenant_id,
              user_id: adminId,
              event_type: "leave_year_ending",
              title: `Leave year ending: ${empName}`,
              body: `${empName} has ${remaining.toFixed(1)}h unused with ${daysToYearEnd} days left. May need carry-over or settlement review.`,
              link: "/holidays/manage",
              metadata: { ...metadata, dedup_key: key + "_admin", days_to_year_end: daysToYearEnd },
            });
          }
        }
      }
    }

    // ──────────────────────────────────────────────────────
    // 6. FILTER BY USER PREFERENCES
    // ──────────────────────────────────────────────────────
    const userIds = [...new Set(notifications.map((n: any) => n.user_id))];
    const { data: prefRows } = await supabase
      .from("notification_preferences")
      .select("user_id, leave_updates")
      .in("user_id", userIds);

    const disabledUsers = new Set<string>();
    if (prefRows) {
      for (const p of prefRows) {
        if (p.leave_updates === false) disabledUsers.add(p.user_id);
      }
    }

    // Negative balance alerts are mandatory for admins (compliance)
    const filtered = notifications.filter((n: any) => {
      if (n.event_type === "leave_negative_balance") return true; // always deliver
      if (n.event_type === "leave_overbooking_risk") return true; // always deliver
      return !disabledUsers.has(n.user_id);
    });

    // ──────────────────────────────────────────────────────
    // 7. INSERT
    // ──────────────────────────────────────────────────────
    let insertedCount = 0;
    if (filtered.length > 0) {
      for (let i = 0; i < filtered.length; i += 100) {
        const batch = filtered.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from("notifications")
          .insert(batch);
        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          insertedCount += batch.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Leave risk check complete",
        balances_checked: activeBalances.length,
        notifications_sent: insertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Leave risk check failed:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
