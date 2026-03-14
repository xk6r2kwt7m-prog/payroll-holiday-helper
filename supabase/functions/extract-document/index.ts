import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractionResult {
  document_type?: string;
  full_name?: string;
  surname?: string;
  given_names?: string;
  document_number?: string;
  nationality?: string;
  date_of_birth?: string;
  issue_date?: string;
  expiry_date?: string;
  gender?: string;
  mrz_data?: {
    line1?: string;
    line2?: string;
    passport_number?: string;
    surname?: string;
    given_names?: string;
    nationality?: string;
    date_of_birth?: string;
    expiry_date?: string;
    gender?: string;
  };
}

interface ExtractionWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, tenantId } = await req.json();

    if (!documentId || !tenantId) {
      return new Response(
        JSON.stringify({ error: "documentId and tenantId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch document record
    const { data: doc, error: docError } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("id", documentId)
      .eq("tenant_id", tenantId)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get signed URL for the file
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("employee-documents")
      .createSignedUrl(doc.file_path, 300);

    if (urlError || !signedUrlData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: "Failed to access document file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the image as base64
    const imageResponse = await fetch(signedUrlData.signedUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download document: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const mimeType = doc.mime_type || "image/jpeg";
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (!isImage && !isPdf) {
      // Non-image, non-PDF files — skip extraction
      const warnings: ExtractionWarning[] = [
        { code: "unsupported_format", message: "File format does not support visual extraction", severity: "warning" },
      ];

      await supabase
        .from("employee_documents")
        .update({
          extraction_warnings: warnings,
          extraction_source: "skipped",
        })
        .eq("id", documentId);

      return new Response(
        JSON.stringify({ extracted: false, warnings }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build AI prompt for document extraction
    const systemPrompt = `You are a document data extraction assistant for an HR system. 
You extract structured data from identity documents, passports, visas, residence permits, and certificates.

IMPORTANT RULES:
- Extract ONLY what you can clearly read from the document
- If a field is unclear or not present, omit it entirely
- For passport MRZ zones (the machine-readable lines at the bottom), parse them if visible
- Return quality warnings for any issues you detect
- NEVER fabricate or guess data — only extract what is visibly present
- Dates should be in ISO format (YYYY-MM-DD) where possible`;

    const userPrompt = `Analyze this ${doc.document_type.replace(/_/g, " ")} document and extract all readable information.

Return the extraction results using the extract_document_data tool.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_document_data",
              description: "Extract structured data from an identity or compliance document",
              parameters: {
                type: "object",
                properties: {
                  document_type: {
                    type: "string",
                    enum: ["passport", "visa", "biometric_residence_permit", "right_to_work", "driving_license", "certificate", "id_document", "other"],
                    description: "Type of document detected",
                  },
                  full_name: { type: "string", description: "Full name as shown on document" },
                  surname: { type: "string", description: "Surname/family name" },
                  given_names: { type: "string", description: "Given/first names" },
                  document_number: { type: "string", description: "Document number/ID" },
                  nationality: { type: "string", description: "Nationality or country of issue" },
                  date_of_birth: { type: "string", description: "Date of birth in YYYY-MM-DD format" },
                  issue_date: { type: "string", description: "Issue date in YYYY-MM-DD format" },
                  expiry_date: { type: "string", description: "Expiry date in YYYY-MM-DD format" },
                  gender: { type: "string", enum: ["M", "F", "X"], description: "Gender as shown" },
                  mrz_data: {
                    type: "object",
                    description: "MRZ (Machine Readable Zone) data if present on the document",
                    properties: {
                      line1: { type: "string" },
                      line2: { type: "string" },
                      passport_number: { type: "string" },
                      surname: { type: "string" },
                      given_names: { type: "string" },
                      nationality: { type: "string" },
                      date_of_birth: { type: "string" },
                      expiry_date: { type: "string" },
                      gender: { type: "string" },
                    },
                  },
                  warnings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        code: {
                          type: "string",
                          enum: [
                            "low_image_quality",
                            "blurry_image",
                            "cropped_document",
                            "mrz_unreadable",
                            "expiry_not_found",
                            "name_mismatch",
                            "document_type_unclear",
                            "partial_data",
                            "glare_detected",
                            "document_expired",
                          ],
                        },
                        message: { type: "string", description: "Human-readable warning description" },
                        severity: { type: "string", enum: ["info", "warning", "error"] },
                      },
                      required: ["code", "message", "severity"],
                    },
                    description: "Quality and risk warnings about the document",
                  },
                },
                required: ["document_type", "warnings"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_document_data" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted, please add funds" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI extraction failed: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return extraction results");
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    const warnings: ExtractionWarning[] = extracted.warnings || [];

    // Separate warnings from extracted data
    const { warnings: _w, ...extractedFields } = extracted;

    // Check for name mismatch with employee profile
    const { data: employee } = await supabase
      .from("employees")
      .select("forename, surname")
      .eq("id", doc.employee_id)
      .single();

    if (employee && extractedFields.full_name) {
      const docName = (extractedFields.full_name || "").toLowerCase().trim();
      const empName = `${employee.forename} ${employee.surname}`.toLowerCase().trim();
      if (docName && empName && !docName.includes(employee.surname.toLowerCase()) && !docName.includes(employee.forename.toLowerCase())) {
        warnings.push({
          code: "name_mismatch",
          message: `Document name "${extractedFields.full_name}" may not match employee profile "${employee.forename} ${employee.surname}"`,
          severity: "warning",
        });
      }
    }

    // Check if document is expired
    if (extractedFields.expiry_date) {
      const expiryDate = new Date(extractedFields.expiry_date);
      if (expiryDate < new Date()) {
        warnings.push({
          code: "document_expired",
          message: `Document expired on ${extractedFields.expiry_date}`,
          severity: "error",
        });
      }
    }

    // Determine confidence (simple heuristic based on warnings)
    const errorCount = warnings.filter((w) => w.severity === "error").length;
    const warnCount = warnings.filter((w) => w.severity === "warning").length;
    const fieldCount = Object.keys(extractedFields).filter((k) => k !== "mrz_data" && extractedFields[k]).length;
    let confidence = Math.min(1, Math.max(0.1, (fieldCount / 8) - errorCount * 0.3 - warnCount * 0.1));
    confidence = Math.round(confidence * 100) / 100;

    // Update document record
    const updatePayload: Record<string, any> = {
      extracted_data: extractedFields,
      extraction_source: extractedFields.mrz_data ? "ai_vision_mrz" : "ai_vision",
      extraction_confidence: confidence,
      extraction_warnings: warnings,
      document_status: "extracted",
    };

    // Auto-populate expiry_date if extracted and not already set
    if (extractedFields.expiry_date && !doc.expires_at) {
      updatePayload.expires_at = extractedFields.expiry_date;
    }

    await supabase
      .from("employee_documents")
      .update(updatePayload)
      .eq("id", documentId);

    // Log audit entry
    await supabase.from("document_audit_log").insert({
      document_id: documentId,
      employee_id: doc.employee_id,
      tenant_id: tenantId,
      action: "extraction_completed",
      metadata: {
        source: updatePayload.extraction_source,
        confidence,
        fields_extracted: Object.keys(extractedFields).filter((k) => extractedFields[k]),
        warning_count: warnings.length,
      },
    });

    return new Response(
      JSON.stringify({
        extracted: true,
        data: extractedFields,
        warnings,
        confidence,
        source: updatePayload.extraction_source,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("extract-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
