import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const documentId = url.searchParams.get("id");
    const signingToken = url.searchParams.get("token");
    // Anything other than an explicit "final" means the original document, so a
    // caller that forgets the parameter can never be told the signed copy is missing.
    const variant = url.searchParams.get("variant") === "final" ? "final" : "original";

    if (!documentId && !signingToken) {
      return new Response(JSON.stringify({ error: "Missing document ID or signing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let filePath: string | null = null;
    let documentName = "contract.pdf";

    if (signingToken) {
      // Access via signing token — used on the signing page
      const { data: tokenData, error: tokenError } = await supabase
        .from("signing_tokens")
        .select(`
          id,
          employee_document_id,
          expires_at,
          employee_documents (
            id,
            document_name,
            file_path,
            final_signed_pdf_url
          )
        `)
        .eq("token", signingToken)
        .maybeSingle();

      if (tokenError) {
        console.error("serve-document: token lookup failed", tokenError.message);
        return new Response(JSON.stringify({ error: "The document link could not be checked. Please try again." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!tokenData) {
        return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "This link has expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const doc = tokenData.employee_documents as any;
      if (!doc) {
        return new Response(JSON.stringify({ error: "Document not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (variant === "final" && !doc.final_signed_pdf_url) {
        return new Response(JSON.stringify({ error: "The completed signed contract file is not ready yet.", error_code: "final_not_ready", fallback: "original" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      filePath = variant === "final" ? doc.final_signed_pdf_url : doc.file_path;
      documentName = doc.document_name || "contract.pdf";

    } else if (documentId) {
      // Access via document ID — requires auth header
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify JWT
      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid authentication" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: doc, error: docError } = await supabase
        .from("employee_documents")
        .select("id, document_name, file_path, final_signed_pdf_url, tenant_id, employee_id, document_type, contract_state")
        .eq("id", documentId)
        .maybeSingle();

      if (docError) {
        console.error("serve-document: document lookup failed", docError.message);
        return new Response(JSON.stringify({ error: "The document record could not be checked. Please try again." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!doc) {
        return new Response(JSON.stringify({ error: "Document not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check tenant membership
      const { data: membership } = await supabase
        .from("tenant_members")
        .select("id, role")
        .eq("tenant_id", doc.tenant_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Staff (non-manager roles) may only open their own completed contract.
      const isManagerial = ["company_admin", "manager", "supervisor"].includes(String((membership as any).role));
      if (!isManagerial) {
        const { data: ownEmployee } = await supabase
          .from("employees")
          .select("id, status")
          .eq("id", doc.employee_id)
          .eq("user_id", user.id)
          .maybeSingle();

        const completed = ["signed", "superseded", "terminated"].includes(String((doc as any).contract_state || ""));
        if (!ownEmployee || (ownEmployee as any).status === "leaver" || !completed) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (variant === "final" && !doc.final_signed_pdf_url) {
        return new Response(JSON.stringify({ error: "The completed signed contract file is not ready yet.", error_code: "final_not_ready", fallback: "original" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      filePath = variant === "final" ? doc.final_signed_pdf_url : doc.file_path;
      documentName = doc.document_name || "contract.pdf";
    }

    if (!filePath) {
      return new Response(JSON.stringify({ error: "Document file not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download and stream the file
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("employee-documents")
      .download(filePath);

    if (downloadError || !fileBlob) {
      return new Response(JSON.stringify({ error: "Could not load document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileBytes = await fileBlob.arrayBuffer();
    const safeFilename = documentName.replace(/[^a-zA-Z0-9._-]/g, "_");

    return new Response(fileBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });

  } catch (err) {
    console.error("serve-document error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
