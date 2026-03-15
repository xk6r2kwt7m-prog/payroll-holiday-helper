import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { talent_request_id, tenant_id } = await req.json();
    if (!talent_request_id || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the talent request
    const { data: request, error: reqError } = await supabase
      .from("talent_requests")
      .select("*")
      .eq("id", talent_request_id)
      .single();
    if (reqError) throw reqError;

    // Fetch visible talent profiles — privacy-safe fields only
    // EXCLUDED: tenant_id, employee internal fields, visibility_mode='hidden'
    // REMOVED: 'previous_employer_only' is no longer a valid visibility mode
    const { data: profiles, error: profError } = await supabase
      .from("talent_profiles")
      .select(`id, talent_pool_status, visibility_mode,
        preferred_roles, preferred_locations, preferred_countries, preferred_regions,
        employment_type_preference, profile_summary, years_experience, languages,
        work_eligibility_countries, willing_to_relocate, willing_to_travel,
        available_from, employees!inner(forename, surname)`)
      .in("talent_pool_status", ["open_to_work", "available_now", "available_from_date"])
      .neq("visibility_mode", "hidden");

    if (profError) throw profError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ matches_created: 0, message: "No visible profiles found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by visibility permissions for this tenant
    const { data: permissions } = await supabase
      .from("talent_visibility_permissions")
      .select("talent_profile_id, allowed_tenant_id, allowed_country, allowed_region");

    const visibleProfileIds = new Set<string>();
    for (const profile of profiles) {
      // 'all_approved' — visible to everyone
      if (profile.visibility_mode === "all_approved") {
        visibleProfileIds.add(profile.id);
        continue;
      }
      // 'selected_companies' or 'approved_country_region' — check permissions
      const perms = (permissions || []).filter((p: any) => p.talent_profile_id === profile.id);
      for (const perm of perms) {
        if (perm.allowed_tenant_id === tenant_id) {
          visibleProfileIds.add(profile.id);
          break;
        }
        if (request.country && perm.allowed_country === request.country) {
          visibleProfileIds.add(profile.id);
          break;
        }
        if (request.region && perm.allowed_region === request.region) {
          visibleProfileIds.add(profile.id);
          break;
        }
      }
    }

    const visibleProfiles = profiles.filter((p: any) => visibleProfileIds.has(p.id));
    if (visibleProfiles.length === 0) {
      return new Response(JSON.stringify({ matches_created: 0, message: "No profiles visible to your company" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare AI prompt — privacy-safe data only, surname initial only
    // NO tenant_id, NO employee_id, NO internal HR fields logged or sent
    const candidateSummaries = visibleProfiles.map((p: any) => ({
      id: p.id,
      name: `${p.employees.forename} ${p.employees.surname.charAt(0)}.`,
      status: p.talent_pool_status,
      roles: p.preferred_roles,
      locations: p.preferred_locations,
      countries: p.preferred_countries,
      experience: p.years_experience,
      languages: p.languages,
      employment_types: p.employment_type_preference,
      work_eligibility: p.work_eligibility_countries,
      relocate: p.willing_to_relocate,
      summary: p.profile_summary,
    }));

    const aiPrompt = `You are a talent matching AI. Given a job request and a list of candidates, score each candidate from 0.0 to 1.0 based on relevance.

Job Request:
- Role: ${request.role}
- Location: ${request.location || "Any"}
- Country: ${request.country || "Any"}
- Region: ${request.region || "Any"}
- Employment Type: ${request.employment_type || "Any"}
- Required Skills: ${(request.required_skills || []).join(", ") || "None specified"}

Candidates:
${JSON.stringify(candidateSummaries, null, 2)}

For each candidate, assess:
1. Role/skill match
2. Geography match (location, country, work eligibility)
3. Availability match`;

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a talent matching expert. Return structured match scores." },
          { role: "user", content: aiPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_matches",
              description: "Return scored matches for talent candidates",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        candidate_id: { type: "string" },
                        match_score: { type: "number", minimum: 0, maximum: 1 },
                        geography_match: { type: "boolean" },
                        skill_match: { type: "boolean" },
                        reasoning: { type: "string" },
                      },
                      required: ["candidate_id", "match_score", "geography_match", "skill_match", "reasoning"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_matches" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call response from AI");

    const matchResults = JSON.parse(toolCall.function.arguments);

    // Delete existing matches for this request
    await supabase
      .from("talent_request_matches")
      .delete()
      .eq("talent_request_id", talent_request_id);

    // Insert new matches
    const matchInserts = (matchResults.matches || [])
      .filter((m: any) => m.match_score > 0.2)
      .map((m: any) => ({
        talent_request_id,
        talent_profile_id: m.candidate_id,
        match_score: m.match_score,
        geography_match: m.geography_match,
        visibility_match: true,
        skill_match: m.skill_match,
        match_reasoning: m.reasoning,
        status: "pending",
      }));

    if (matchInserts.length > 0) {
      const { error: insertError } = await supabase
        .from("talent_request_matches")
        .insert(matchInserts);
      if (insertError) throw insertError;
    }

    // Audit log — only profile IDs and action, no raw payloads
    await supabase.from("talent_audit_log").insert(
      visibleProfiles
        .filter((p: any) => matchResults.matches?.some((m: any) => m.candidate_id === p.id))
        .map((p: any) => ({
          talent_profile_id: p.id,
          action: "ai_match_evaluated",
          new_data: { talent_request_id, tenant_id },
          tenant_id,
        }))
    );

    // Response — counts only, no profile data leaked
    return new Response(
      JSON.stringify({
        matches_created: matchInserts.length,
        total_candidates_evaluated: visibleProfiles.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("talent-ai-match error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
