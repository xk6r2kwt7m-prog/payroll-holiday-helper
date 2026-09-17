import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Serves an issued licensing document (DPS written authorisation and the site
 * alcohol register) to whoever holds the secure link.
 *
 * The link only opens while it is live: it must exist, not be revoked, and not
 * be past its expiry date. Every opening is counted so the audit trail shows
 * that the copy was viewed. Nothing here can change a licence, an
 * authorisation, or a signature.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const BUCKET = "employee-documents";

function page(title: string, body: string, status: number) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${title}</title>
     <div style="font-family:system-ui,sans-serif;max-width:34rem;margin:12vh auto;padding:0 1.25rem;color:#1a1a2e">
       <h1 style="font-size:1.25rem">${title}</h1><p style="line-height:1.6;color:#444">${body}</p>
     </div>`,
    { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") {
    return page("Not available", "This link can only be opened in a browser.", 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return page("We can't open this link", "The link is incomplete. Please ask for a new copy.", 400);

    const { data: issue, error } = await supabase
      .from("licence_document_issues")
      .select("id, branch, subject_type, file_path, token_expires_at, revoked_at, open_count")
      .eq("access_token", token)
      .maybeSingle();

    if (error) {
      console.error("licensing-document: lookup failed", error.message);
      return page("We can't open this link right now", "Please try again in a moment.", 500);
    }
    if (!issue) {
      return page("We can't open this link", "This link is not recognised. Please ask for a new copy.", 404);
    }
    if (issue.revoked_at) {
      return page("This link has been withdrawn", "Please ask the manager who sent it for a current copy.", 410);
    }
    if (issue.token_expires_at && new Date(issue.token_expires_at) < new Date()) {
      return page("This link has expired", "Please ask the manager who sent it for a current copy.", 410);
    }
    if (!issue.file_path) {
      return page("The document is not available", "Please ask the manager who sent it for a current copy.", 404);
    }

    const { data: file, error: fileError } = await supabase.storage
      .from(BUCKET)
      .download(issue.file_path);
    if (fileError || !file) {
      console.error("licensing-document: download failed", fileError?.message);
      return page("We can't open this document right now", "Please try again in a moment.", 500);
    }

    await supabase
      .from("licence_document_issues")
      .update({ opened_at: new Date().toISOString(), open_count: (issue.open_count ?? 0) + 1 })
      .eq("id", issue.id);

    const name = `${issue.branch.replace(/[^a-z0-9]+/gi, "-")}-alcohol-authorisation.pdf`;
    return new Response(await file.arrayBuffer(), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("licensing-document: unexpected failure", (e as Error).message);
    return page("Something went wrong", "Please try again in a moment.", 500);
  }
});
