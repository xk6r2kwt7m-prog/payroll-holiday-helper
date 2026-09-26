import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert a rota wall time using the workspace time zone. Offset checks on
// both sides of the day also cover the hour when clocks move forward/back.
function localParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"),
    hour: value("hour"), minute: value("minute") };
}

function rotaStartInstants(date: string, time: string, timezone: string): number[] {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const offsets = new Set<number>();
  for (const around of [naive - 86400000, naive, naive + 86400000]) {
    const local = localParts(new Date(around), timezone);
    const represented = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
    offsets.add(Math.round((represented - around) / 60000));
  }
  return [...offsets].map((offset) => naive - offset * 60000).filter((candidate) => {
    const local = localParts(new Date(candidate), timezone);
    return local.year === year && local.month === month && local.day === day
      && local.hour === hour && local.minute === minute;
  });
}

function nearbyDates(now: Date, timezone: string): string[] {
  const local = localParts(now, timezone);
  const midnight = Date.UTC(local.year, local.month - 1, local.day);
  return [-1, 0, 1].map((days) => new Date(midnight + days * 86400000).toISOString().slice(0, 10));
}

function matchingRotaShift(
  shifts: { id: string; shift_date: string; start_time: string; end_time: string }[],
  now: Date, timezone: string,
) {
  // These bounds only select an optional rota link; they do not prevent a
  // genuine clock-in when a shift is missing or unusually early/late.
  const candidates = shifts.filter((shift) => rotaStartInstants(
    shift.shift_date, shift.start_time, timezone,
  ).some((start) => now.getTime() >= start - 2 * 3600000 && now.getTime() <= start + 4 * 3600000));
  return candidates.length === 1 ? candidates[0] : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, latitude, longitude, branch, shift_id, notes, break_minutes } = body;

    if (!action || !["clock_in", "clock_out"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'clock_in' or 'clock_out'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve the caller's OWN employee record, scoped to the requested workspace.
    // The requested workspace is only a selector: it must match a record that
    // belongs to this user. Never trust employee IDs from the body.
    const requestedTenant = typeof body.tenant_id === "string" && body.tenant_id ? body.tenant_id : null;
    const json = (payload: unknown, status: number) =>
      new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let empQuery = serviceClient
      .from("employees")
      .select("id, department, status, tenant_id")
      .eq("user_id", user.id);
    if (requestedTenant) empQuery = empQuery.eq("tenant_id", requestedTenant);
    const { data: empRows, error: empError } = await empQuery.limit(2);

    if (empError) {
      console.error("clock-in-out employee lookup failed");
      return json({ error: "Could not look up your employee record. Please try again." }, 503);
    }
    if (!empRows || empRows.length === 0) {
      return json({ error: "No employee record linked to this account" }, 404);
    }
    if (empRows.length > 1) {
      return json({ error: "Your account is linked to more than one workspace. Open the workspace you work in and try again." }, 409);
    }
    const employee = empRows[0];

    // A switched-off membership must stop clocking. A missing membership is
    // preserved temporarily for the documented legacy linked employee; it
    // must be reconciled through the separate reviewed access workflow.
    const { data: membership, error: membershipError } = await serviceClient
      .from("tenant_members")
      .select("is_active")
      .eq("tenant_id", employee.tenant_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) return json({ error: "Could not check your workspace access. Please try again." }, 503);
    if (membership?.is_active === false) return json({ error: "Your workspace access is inactive. Ask a manager for help." }, 403);

    if (employee.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Employee account is not active" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only an existing branch of the employee's workspace may be recorded.
    // A client-supplied branch or shift ID is never authority for a different site.
    if (branch && typeof branch !== "string") {
      return json({ error: "Select a valid branch." }, 400);
    }
    const { data: tenantBranches, error: branchesError } = await serviceClient
      .from("branch_locations")
      .select("branch, latitude, longitude, geofence_radius_meters")
      .eq("tenant_id", employee.tenant_id);
    if (branchesError) return json({ error: "Could not check your branch. Please try again." }, 503);

    // Missing location is recorded as unverified, never as proof of presence.
    // Reject malformed or half-supplied coordinates rather than silently
    // treating zero, NaN, or an invalid latitude as a missing GPS reading.
    const hasLat = latitude !== undefined && latitude !== null;
    const hasLon = longitude !== undefined && longitude !== null;
    if (hasLat !== hasLon || (hasLat && (
      typeof latitude !== "number" || typeof longitude !== "number" ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    ))) return json({ error: "Location details could not be checked. Try again without location or ask a manager." }, 400);
    const hasLocation = hasLat && hasLon;

    // Check geofence if coordinates provided
    let withinGeofence = false;
    let branchToUse = branch;

    if (hasLocation) {
      if (tenantBranches) {
        for (const b of tenantBranches) {
          const distance = haversineDistance(
            latitude, longitude,
            Number(b.latitude), Number(b.longitude)
          );
          if (distance <= b.geofence_radius_meters && (!branchToUse || branchToUse === b.branch)) {
            withinGeofence = true;
            if (!branchToUse) branchToUse = b.branch;
            break;
          }
        }
      }
    }
    if (branchToUse && !(tenantBranches ?? []).some((b) => b.branch === branchToUse)) {
      return json({ error: "This branch is not available in your workspace." }, 400);
    }

    if (action === "clock_in") {
      if (!branchToUse) {
        return new Response(
          JSON.stringify({ error: "Branch is required for clock-in", within_geofence: false }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already clocked in
      const { data: existing, error: existingError } = await serviceClient
        .from("time_entries")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("tenant_id", employee.tenant_id)
        .eq("status", "clocked_in")
        .limit(2);

      if (existingError) return json({ error: "Could not check your clock-in status. Please try again." }, 503);

      if (existing?.length) {
        return new Response(
          JSON.stringify({ error: "Already clocked in. Please clock out first." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find matching shift for today
      let shift;
      if (shift_id) {
        if (typeof shift_id !== "string") return json({ error: "Select a valid shift." }, 400);
        const { data, error } = await serviceClient.from("shifts")
          .select("id, start_time, end_time")
          .eq("id", shift_id).eq("tenant_id", employee.tenant_id)
          .eq("employee_id", employee.id).eq("branch", branchToUse)
          .eq("status", "scheduled").maybeSingle();
        if (error) return json({ error: "Could not check your shift. Please try again." }, 503);
        if (!data) return json({ error: "That shift does not belong to you in this workspace." }, 400);
        shift = data;
      } else {
        const { data: workspace, error: workspaceError } = await serviceClient.from("tenants")
          .select("timezone").eq("id", employee.tenant_id).single();
        if (workspaceError || !workspace?.timezone) return json({ error: "Could not check your workspace time zone. Please try again." }, 503);
        let dates: string[];
        try { dates = nearbyDates(new Date(), workspace.timezone); }
        catch { return json({ error: "Your workspace time zone needs review. Ask a manager for help." }, 503); }
        const { data, error } = await serviceClient.from("shifts")
          .select("id, shift_date, start_time, end_time")
          .eq("employee_id", employee.id).eq("tenant_id", employee.tenant_id)
          .eq("branch", branchToUse).eq("status", "scheduled")
          .in("shift_date", dates);
        if (error) return json({ error: "Could not check your shift. Please try again." }, 503);
        try { shift = matchingRotaShift(data ?? [], new Date(), workspace.timezone); }
        catch { return json({ error: "Could not check the rota time. Please try again." }, 503); }
      }

      // Block clock-in if outside geofence
      if (!withinGeofence && hasLocation) {
        return new Response(
          JSON.stringify({
            error: "You are outside the allowed area. Please move closer to the branch or request a manager override.",
            within_geofence: false,
            requires_override: true,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // FIX: Include tenant_id from the employee record (server-side source of truth)
      const { data: entry, error: insertError } = await serviceClient
        .from("time_entries")
        .insert({
          employee_id: employee.id,
          tenant_id: employee.tenant_id,
          shift_id: shift?.id || null,
          branch: branchToUse,
          department: employee.department,
          clock_in_time: new Date().toISOString(),
          clock_in_latitude: hasLocation ? latitude : null,
          clock_in_longitude: hasLocation ? longitude : null,
          clock_in_within_geofence: withinGeofence,
          scheduled_start: shift?.start_time || null,
          scheduled_end: shift?.end_time || null,
          status: "clocked_in",
        })
        .select()
        .single();

      if (insertError) {
        // Handle duplicate constraint violation gracefully
        if (insertError.code === "23505") {
          return new Response(
            JSON.stringify({ error: "Already clocked in. Please clock out first." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, entry, within_geofence: withinGeofence,
          requires_review: !hasLocation, location_status: hasLocation ? "inside_geofence" : "unavailable" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "clock_out") {
      // Find active clock-in
      const { data: activeRows, error: findError } = await serviceClient
        .from("time_entries")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("tenant_id", employee.tenant_id)
        .eq("status", "clocked_in")
        .limit(2);

      if (findError) return json({ error: "Could not check your clock-in status. Please try again." }, 503);
      if ((activeRows?.length ?? 0) > 1) return json({ error: "More than one open clock-in was found. Ask a manager to review your timesheet." }, 409);
      const activeEntry = activeRows?.[0];
      if (!activeEntry) {
        return new Response(
          JSON.stringify({ error: "No active clock-in found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // An employee must be able to end an open shift. Outside or missing GPS
      // is flagged for manager review instead of trapping a running clock.

      const clockOutTime = new Date().toISOString();

      // Validate clock-out is after clock-in
      if (new Date(clockOutTime) <= new Date(activeEntry.clock_in_time)) {
        return new Response(
          JSON.stringify({ error: "Clock-out time cannot be before clock-in time" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updatePayload: Record<string, unknown> = {
        clock_out_time: clockOutTime,
        clock_out_latitude: hasLocation ? latitude : null,
        clock_out_longitude: hasLocation ? longitude : null,
        clock_out_within_geofence: withinGeofence,
        notes: notes || null,
      };

      // Persist break_minutes if provided by the client
      if (typeof break_minutes === "number" && break_minutes >= 0) {
        updatePayload.break_minutes = Math.round(break_minutes);
      }

      const { data: updated, error: updateError } = await serviceClient
        .from("time_entries")
        .update(updatePayload)
        .eq("id", activeEntry.id)
        .eq("tenant_id", employee.tenant_id)
        .eq("status", "clocked_in")
        .select()
        .single();

      if (updateError) {
        if (updateError.code === "PGRST116") return json({ error: "Your clock-in changed. Refresh and try again." }, 409);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, entry: updated, within_geofence: withinGeofence,
          requires_review: !withinGeofence, location_status: !hasLocation ? "unavailable" :
            withinGeofence ? "inside_geofence" : "outside_geofence" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
