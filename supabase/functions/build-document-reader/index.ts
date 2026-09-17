import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";
import { splitIntoSections } from "../_shared/document-reader-sections.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "employee-documents";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Suggested {
  section_index: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

/**
 * Drafts one comprehension check per section. Nothing is shown to staff until a
 * manager approves it, so a failure here is not fatal to the reading version.
 */
async function suggestQuestions(
  sections: { heading: string; body: string }[],
  documentName: string,
): Promise<Suggested[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return [];
  const trimmed = sections.slice(0, 20).map((s, i) => ({
    index: i,
    heading: s.heading,
    text: s.body.slice(0, 1500),
  }));

  const prompt = [
    "You write short comprehension checks for UK hospitality staff reading a workplace document.",
    "For each numbered section, write ONE multiple-choice question with 3 options that checks understanding of something practical in that section.",
    "Use only information present in the section text. Plain British English, short sentences, no jargon.",
    "Skip a section entirely if it has no practical content (cover pages, contents lists, signature blocks).",
    `Document: ${documentName}`,
    "",
    trimmed.map((s) => `### Section ${s.index}: ${s.heading}\n${s.text}`).join("\n\n"),
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "submit_questions",
            description: "Return the drafted comprehension checks.",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      section_index: { type: "number" },
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correct_index: { type: "number" },
                      explanation: { type: "string" },
                    },
                    required: ["section_index", "question", "options", "correct_index"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_questions" } },
      }),
    });
    if (!res.ok) {
      console.error("[BUILD-READER] question drafting failed", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
    const list: Suggested[] = Array.isArray(args?.questions) ? args.questions : [];
    return list.filter((q) =>
      typeof q?.question === "string" &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index < q.options.length
    );
  } catch (e) {
    console.error("[BUILD-READER] question drafting error", e);
    return [];
  }
}

/**
 * Builds an on-screen reading version of one compliance document.
 * The uploaded file is only read, never changed or replaced.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let documentId = "";
  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    if (!jwt) return json({ error: "Please sign in again." }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Please sign in again." }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    documentId = String(body?.document_id ?? "");
    const regenerateQuestions = body?.regenerate_questions !== false;
    if (!documentId) return json({ error: "Missing document." }, 400);

    const { data: doc } = await admin
      .from("compliance_documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();
    if (!doc) return json({ error: "Document not found." }, 404);

    const { data: member } = await admin
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", doc.tenant_id)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!member || !["company_admin", "manager"].includes(member.role)) {
      return json({ error: "You do not have permission to do this." }, 403);
    }
    if (!doc.file_path) return json({ error: "This document has no file to read." }, 400);

    await admin.from("compliance_documents")
      .update({ reader_status: "building", reader_error: null })
      .eq("id", documentId);

    // ── Read the stored file ──
    const { data: file, error: dlErr } = await admin.storage.from(BUCKET).download(doc.file_path);
    if (dlErr || !file) throw new Error("The stored file could not be opened.");
    const bytes = new Uint8Array(await file.arrayBuffer());

    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const raw = Array.isArray(text) ? text.join("\n\n") : String(text ?? "");
    if (raw.replace(/\s/g, "").length < 200) {
      throw new Error(
        "No readable text was found — this file is probably a scan. Staff can still open the original.",
      );
    }

    const sections = splitIntoSections(raw, doc.name ?? "Document");

    // Replace any previous reading version for this document (progress rows
    // cascade with their section, so nothing is silently left half-linked).
    await admin.from("document_reader_sections").delete().eq("document_id", documentId);

    const { data: inserted, error: insErr } = await admin
      .from("document_reader_sections")
      .insert(sections.map((s, i) => ({
        tenant_id: doc.tenant_id,
        document_id: documentId,
        document_version: doc.version ?? null,
        sort_order: i,
        heading: s.heading.slice(0, 200),
        body: s.body,
      })))
      .select("id, sort_order");
    if (insErr) throw insErr;

    const orderedIds = (inserted ?? []).sort((a, b) => a.sort_order - b.sort_order).map((r) => r.id);

    let suggestedCount = 0;
    if (regenerateQuestions) {
      // Existing approved questions belong to sections that have just been
      // replaced, so drafts are recreated; approvals are never assumed.
      await admin.from("document_reader_questions").delete().eq("document_id", documentId);
      const drafted = await suggestQuestions(sections, doc.name ?? "Document");
      const rows = drafted
        .filter((q) => orderedIds[q.section_index])
        .map((q, i) => ({
          tenant_id: doc.tenant_id,
          document_id: documentId,
          section_id: orderedIds[q.section_index],
          question: q.question.slice(0, 500),
          options: q.options.slice(0, 5).map((o) => String(o).slice(0, 200)),
          correct_index: q.correct_index,
          explanation: q.explanation ? String(q.explanation).slice(0, 500) : null,
          origin: "suggested",
          approval_status: "suggested",
          sort_order: i,
        }));
      if (rows.length) {
        const { error } = await admin.from("document_reader_questions").insert(rows);
        if (error) throw error;
        suggestedCount = rows.length;
      }
    }

    await admin.from("compliance_documents").update({
      reader_status: "ready",
      reader_built_at: new Date().toISOString(),
      reader_built_version: doc.version ?? null,
      reader_error: null,
    }).eq("id", documentId);

    await admin.from("audit_log").insert({
      tenant_id: doc.tenant_id,
      user_id: userId,
      action: "update",
      table_name: "compliance_documents",
      record_id: documentId,
      new_data: {
        event: "reading_version_built",
        event_label: "On-screen reading version prepared",
        sections: sections.length,
        suggested_questions: suggestedCount,
        document_version: doc.version ?? null,
      },
    });

    return json({ success: true, sections: sections.length, suggested_questions: suggestedCount });
  } catch (e) {
    const message = (e as Error).message || "The reading version could not be prepared.";
    console.error("[BUILD-READER]", message);
    if (documentId) {
      await admin.from("compliance_documents")
        .update({ reader_status: "failed", reader_error: message })
        .eq("id", documentId);
    }
    return json({ error: message }, 500);
  }
});
