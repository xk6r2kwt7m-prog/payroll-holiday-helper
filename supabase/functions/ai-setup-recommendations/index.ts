import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { business_type, company_name, country, modules } = body;

    if (!business_type) {
      return new Response(JSON.stringify({ error: "business_type is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a hospitality operations expert. A new ${business_type} business called "${company_name || "a hospitality business"}" in ${country || "the UK"} is setting up their HR platform.

Based on this business type, generate practical recommendations for their operational setup. Return a JSON object with these fields:

{
  "departments": ["list of recommended departments"],
  "roles": ["list of recommended job roles"],
  "training_modules": ["list of recommended training modules/certifications"],
  "compliance_items": ["list of required compliance documents"],
  "shift_templates": [{"name": "shift name", "start": "HH:MM", "end": "HH:MM"}],
  "document_categories": ["list of document categories to set up"]
}

Be specific and practical for a ${business_type} business. Include UK-relevant compliance items if the country is GB.
${modules?.payroll ? "Include payroll-relevant items." : ""}
${modules?.training ? "Focus on comprehensive training modules." : ""}

Return ONLY the JSON object, no markdown or explanation.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a hospitality operations expert. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", errText);
      throw new Error("AI service unavailable");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    // Parse the JSON from the response, handling potential markdown wrapping
    let recommendations;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      recommendations = {};
    }

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("ai-setup-recommendations error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
