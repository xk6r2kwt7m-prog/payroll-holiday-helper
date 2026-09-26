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

    // NOTE (A02 review): an active-membership check is NOT added here, to preserve
    // existing behaviour. Flagged for a separate decision.

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

    // Check geofence if coordinates provided
    let withinGeofence = false;
    let branchToUse = branch;

    if (typeof latitude === "number" && typeof longitude === "number") {
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
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await serviceClient.from("shifts")
          .select("id, start_time, end_time")
          .eq("employee_id", employee.id).eq("tenant_id", employee.tenant_id)
          .eq("shift_date", today).eq("branch", branchToUse)
          .eq("status", "scheduled").maybeSingle();
        if (error) return json({ error: "Could not check your shift. Please try again." }, 503);
        shift = data;
      }

      // Block clock-in if outside geofence
      if (!withinGeofence && latitude && longitude) {
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
          clock_in_latitude: latitude || null,
          clock_in_longitude: longitude || null,
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
        JSON.stringify({ success: true, entry, within_geofence: withinGeofence }),
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

      // Block clock-out if outside geofence
      if (!withinGeofence && latitude && longitude) {
        return new Response(
          JSON.stringify({
            error: "You are outside the allowed area to clock out. Please move closer to the branch.",
            within_geofence: false,
            requires_override: true,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
        clock_out_latitude: latitude || null,
        clock_out_longitude: longitude || null,
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
        JSON.stringify({ success: true, entry: updated, within_geofence: withinGeofence }),
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
