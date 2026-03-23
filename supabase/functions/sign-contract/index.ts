import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CANONICAL_APP_URL = "https://udp.lovable.app";

async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Bytes(content: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "contract";
}

function decodeDataUrl(dataUrl: string | null | undefined): { bytes: Uint8Array; mime: string } | null {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;

  const [, mime, base64] = match;
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return { bytes, mime };
}

function drawWrappedText(
  page: any,
  text: string,
  options: {
    font: any;
    size: number;
    x: number;
    y: number;
    maxWidth: number;
    lineHeight?: number;
    color?: any;
  },
) {
  const { font, size, x, maxWidth } = options;
  const lineHeight = options.lineHeight ?? size + 3;
  const color = options.color ?? rgb(0.25, 0.25, 0.25);

  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  let cursorY = options.y;
  for (const line of lines) {
    page.drawText(line, { x, y: cursorY, size, font, color });
    cursorY -= lineHeight;
  }

  return cursorY;
}

async function buildSigningAppendixPdf(params: {
  documentName: string;
  employeeName: string;
  companyName: string;
  documentId: string;
  originalDocumentHash: string;
  finalDocumentHash: string;
  signatures: Array<{
    signer_type: string;
    signer_name: string;
    typed_name: string | null;
    signed_at: string;
    signed_by_email: string | null;
    ip_address: string | null;
    user_agent: string | null;
    signature_data: string | null;
    signature_type: string | null;
    consent_text: string;
    document_hash: string | null;
  }>;
}) {
  const pdfDoc = await PDFDocument.create();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const addPage = () => pdfDoc.addPage([pageWidth, pageHeight]);
  let page = addPage();
  let y = pageHeight - margin;

  const ensureSpace = (minY: number) => {
    if (y < minY) {
      page = addPage();
      y = pageHeight - margin;
    }
  };

  page.drawText(params.companyName, {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.16, 0.47, 0.43),
  });
  page.drawText("Final Signed Contract Appendix", {
    x: margin,
    y: y - 28,
    size: 20,
    font: fontBold,
    color: rgb(0.11, 0.16, 0.18),
  });
  y -= 58;

  y = drawWrappedText(page, "This appendix forms part of the authoritative completed contract file. It records the final execution evidence for the original contract pages attached immediately before this section.", {
    font: fontRegular,
    size: 10,
    x: margin,
    y,
    maxWidth: contentWidth,
    lineHeight: 14,
  });
  y -= 12;

  const summaryRows = [
    ["Document", params.documentName],
    ["Employee", params.employeeName],
    ["Contract reference", params.documentId],
    ["Signing order", "Employee signature followed by Employer signature"],
    ["Original document hash", params.originalDocumentHash],
    ["Completed package hash", params.finalDocumentHash],
  ];

  for (const [label, value] of summaryRows) {
    ensureSpace(120);
    page.drawText(`${label}:`, {
      x: margin,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.35, 0.35, 0.35),
    });
    y = drawWrappedText(page, value, {
      font: fontRegular,
      size: 9,
      x: margin + 120,
      y,
      maxWidth: contentWidth - 120,
      lineHeight: 13,
      color: rgb(0.12, 0.16, 0.18),
    });
    y -= 6;
  }

  for (const signature of params.signatures) {
    ensureSpace(220);
    page.drawRectangle({
      x: margin,
      y: y - 160,
      width: contentWidth,
      height: 150,
      borderWidth: 1,
      borderColor: rgb(0.85, 0.88, 0.9),
    });

    let blockY = y - 24;
    page.drawText(`${signature.signer_type === "employee" ? "Employee" : "Employer"} Signature`, {
      x: margin + 16,
      y: blockY,
      size: 12,
      font: fontBold,
      color: rgb(0.11, 0.16, 0.18),
    });

    const details = [
      ["Signer name", signature.signer_name],
      ["Typed name", signature.typed_name || signature.signer_name],
      ["Email", signature.signed_by_email || "Not recorded"],
      ["Signed at", new Date(signature.signed_at).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })],
      ["IP address", signature.ip_address || "Not recorded"],
      ["Browser / device", signature.user_agent || "Not recorded"],
      ["Signature type", signature.signature_type || "drawn"],
      ["Document hash at signing", signature.document_hash || params.originalDocumentHash],
    ];

    for (const [label, value] of details) {
      page.drawText(`${label}:`, {
        x: margin + 16,
        y: blockY - 22,
        size: 8.5,
        font: fontBold,
        color: rgb(0.35, 0.35, 0.35),
      });
      blockY = drawWrappedText(page, value, {
        font: fontRegular,
        size: 8.5,
        x: margin + 140,
        y: blockY - 22,
        maxWidth: contentWidth - 156,
        lineHeight: 11,
        color: rgb(0.12, 0.16, 0.18),
      });
    }

    const signatureImage = decodeDataUrl(signature.signature_data);
    if (signatureImage) {
      try {
        const embedded = signatureImage.mime.includes("png")
          ? await pdfDoc.embedPng(signatureImage.bytes)
          : await pdfDoc.embedJpg(signatureImage.bytes);
        const scaled = embedded.scale(0.35);
        page.drawText("Visible signature:", {
          x: margin + 16,
          y: y - 128,
          size: 8.5,
          font: fontBold,
          color: rgb(0.35, 0.35, 0.35),
        });
        page.drawImage(embedded, {
          x: margin + 140,
          y: y - 148,
          width: Math.min(scaled.width, 180),
          height: Math.min(scaled.height, 52),
        });
      } catch (error) {
        console.error("Could not embed signature image", error);
      }
    }

    y -= 172;
  }

  ensureSpace(90);
  drawWrappedText(page, "This completed PDF package should be retained as the authoritative contract record together with the underlying audit trail stored in the system.", {
    font: fontRegular,
    size: 8,
    x: margin,
    y,
    maxWidth: contentWidth,
    lineHeight: 11,
    color: rgb(0.4, 0.4, 0.4),
  });

  return await pdfDoc.save();
}

async function buildFinalSignedContractPdf(params: {
  originalPdfBytes: Uint8Array;
  documentName: string;
  employeeName: string;
  companyName: string;
  documentId: string;
  originalDocumentHash: string;
  signatures: Array<{
    signer_type: string;
    signer_name: string;
    typed_name: string | null;
    signed_at: string;
    signed_by_email: string | null;
    ip_address: string | null;
    user_agent: string | null;
    signature_data: string | null;
    signature_type: string | null;
    consent_text: string;
    document_hash: string | null;
  }>;
}) {
  const appendixHashSource = await sha256(JSON.stringify({
    documentId: params.documentId,
    originalDocumentHash: params.originalDocumentHash,
    signatures: params.signatures.map((signature) => ({
      signer_type: signature.signer_type,
      signer_name: signature.signer_name,
      signed_at: signature.signed_at,
      signed_by_email: signature.signed_by_email,
      document_hash: signature.document_hash,
    })),
  }));

  const appendixBytes = await buildSigningAppendixPdf({
    documentName: params.documentName,
    employeeName: params.employeeName,
    companyName: params.companyName,
    documentId: params.documentId,
    originalDocumentHash: params.originalDocumentHash,
    finalDocumentHash: appendixHashSource,
    signatures: params.signatures,
  });

  const finalPdf = await PDFDocument.load(params.originalPdfBytes);
  const appendixPdf = await PDFDocument.load(appendixBytes);
  const appendixPages = await finalPdf.copyPages(appendixPdf, appendixPdf.getPageIndices());
  appendixPages.forEach((page) => finalPdf.addPage(page));
  const finalBytes = await finalPdf.save();
  const finalHash = await sha256Bytes(finalBytes);

  return { finalBytes, finalHash };
}

async function resolveManagerRecipients(supabase: any, tenantId: string) {
  const loadRecipients = async (roles: string[]) => {
    const { data: members } = await supabase
      .from("tenant_members")
      .select("user_id, role")
      .eq("tenant_id", tenantId)
      .in("role", roles)
      .eq("is_active", true);

    if (!members?.length) return [];

    const recipients = await Promise.all(members.map(async (member: { user_id: string; role: string }) => {
      const [{ data: authResult }, { data: profile }] = await Promise.all([
        supabase.auth.admin.getUserById(member.user_id),
        supabase.from("profiles").select("full_name").eq("user_id", member.user_id).maybeSingle(),
      ]);

      const email = authResult?.user?.email;
      if (!email) return null;

      return {
        user_id: member.user_id,
        role: member.role,
        email,
        full_name: profile?.full_name || (member.role === "company_admin" ? "Administrator" : "Manager"),
      };
    }));

    return recipients.filter(Boolean);
  };

  const admins = await loadRecipients(["company_admin"]);
  if (admins.length > 0) return { recipients: admins, source: "company_admin" };

  const managers = await loadRecipients(["manager"]);
  return { recipients: managers, source: managers.length > 0 ? "manager" : "none" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token", error_code: "missing_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: Fetch contract info for signing page
    if (req.method === "GET") {
      const { data: signingToken, error } = await supabase
        .from("signing_tokens")
        .select(`
          *,
          employee_documents (
            id,
            document_name,
            document_type,
            file_path
          ),
          employees (
            id,
            forename,
            surname,
            email,
            department
          )
        `)
        .eq("token", token)
        .maybeSingle();

      if (error || !signingToken) {
        return new Response(JSON.stringify({ error: "This signing link is not valid. Please request a new one from your employer.", error_code: "invalid_token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(signingToken.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "This signing link has expired. Please ask your employer to send a new one.", error_code: "expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (signingToken.used_at) {
        return new Response(JSON.stringify({ error: "This contract has already been signed.", error_code: "already_signed", already_signed: true }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!signingToken.employee_documents) {
        return new Response(JSON.stringify({ error: "The contract document could not be found. Please contact your employer.", error_code: "missing_document" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check existing signatures
      const { data: existingSigs } = await supabase
        .from("contract_signatures")
        .select("signer_type, signer_name, signed_at, signature_data")
        .eq("employee_document_id", signingToken.employee_document_id);

      const existingSignerTypes = (existingSigs || []).map((s: any) => s.signer_type);

      const { data: originalDocumentFile, error: originalDocumentError } = await supabase.storage
        .from("employee-documents")
        .download(signingToken.employee_documents.file_path);

      if (originalDocumentError || !originalDocumentFile) {
        return new Response(JSON.stringify({ error: "The contract document could not be loaded. Please contact your employer.", error_code: "missing_document" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: signedUrl } = await supabase.storage
        .from("employee-documents")
        .createSignedUrl(signingToken.employee_documents.file_path, 3600);

      const docHash = await sha256Bytes(await originalDocumentFile.arrayBuffer());

      return new Response(JSON.stringify({
        signer_type: signingToken.signer_type,
        employee_name: `${signingToken.employees.forename} ${signingToken.employees.surname}`,
        employee_email: signingToken.employees.email || null,
        document_name: signingToken.employee_documents.document_name,
        document_url: signedUrl?.signedUrl || null,
        document_hash: docHash,
        expires_at: signingToken.expires_at,
        existing_signatures: existingSignerTypes,
        // Include signature details for display on signing page
        signature_details: (existingSigs || []).map((s: any) => ({
          signer_type: s.signer_type,
          signer_name: s.signer_name,
          signed_at: s.signed_at,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Submit signature
    if (req.method === "POST") {
      const body = await req.json();
      const { typed_name, consent_given, signature_data, signature_type, consent_text, document_hash } = body;

      if (!typed_name?.trim()) {
        return new Response(JSON.stringify({ error: "Please type your full legal name", error_code: "missing_name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!consent_given) {
        return new Response(JSON.stringify({ error: "You must agree to the consent statement", error_code: "missing_consent" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!signature_data) {
        return new Response(JSON.stringify({ error: "Please draw your signature", error_code: "missing_signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch and validate token with relations
      const { data: signingToken, error } = await supabase
        .from("signing_tokens")
        .select(`
          *,
          employee_documents (
            id,
            document_name,
            file_path
          ),
          employees (
            id,
            forename,
            surname,
            email
          )
        `)
        .eq("token", token)
        .maybeSingle();

      if (error || !signingToken) {
        return new Response(JSON.stringify({ error: "This signing link is not valid.", error_code: "invalid_token" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(signingToken.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "This signing link has expired. Please ask your employer to send a new one.", error_code: "expired" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (signingToken.used_at) {
        return new Response(JSON.stringify({ error: "This contract has already been signed.", error_code: "already_signed" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
      const userAgent = req.headers.get("user-agent") || "unknown";
      const signedByEmail = signingToken.employees?.email || null;
      const signedAt = new Date().toISOString();
      const currentSignerType = signingToken.signer_type;
      const originalFilePath = signingToken.employee_documents?.file_path;

      if (!originalFilePath || !signingToken.employee_documents) {
        return new Response(JSON.stringify({ error: "The contract document could not be found.", error_code: "missing_document" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: originalPdfBlob, error: originalPdfError } = await supabase.storage
        .from("employee-documents")
        .download(originalFilePath);

      if (originalPdfError || !originalPdfBlob) {
        return new Response(JSON.stringify({ error: "The contract document could not be loaded.", error_code: "missing_document" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const originalPdfBytes = new Uint8Array(await originalPdfBlob.arrayBuffer());
      const serverDocumentHash = await sha256Bytes(originalPdfBytes);

      // Record signature
      const { error: sigError } = await supabase
        .from("contract_signatures")
        .insert({
          employee_document_id: signingToken.employee_document_id,
          employee_id: signingToken.employee_id,
          tenant_id: signingToken.tenant_id,
          signing_token_id: signingToken.id,
          signer_type: currentSignerType,
          signer_name: typed_name.trim(),
          typed_name: typed_name.trim(),
          signed_by_email: signedByEmail,
          signature_type: signature_type || "drawn",
          signature_data: signature_data,
          consent_given: true,
          consent_text: consent_text || `I confirm that I have read and understood this contract, I agree to sign this document electronically, and this electronic signature represents my legal signature.`,
          document_hash: serverDocumentHash,
          ip_address: ip,
          user_agent: userAgent,
          signed_at: signedAt,
        });

      if (sigError) {
        console.error("Signature insert error:", sigError);
        return new Response(JSON.stringify({
          error: "Your signature could not be recorded. Please try again.",
          error_code: "save_failed",
          detail: sigError.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark token as used ONLY after successful signature save
      await supabase
        .from("signing_tokens")
        .update({
          used_at: signedAt,
          used_by_ip: ip,
          used_by_user_agent: userAgent,
        })
        .eq("id", signingToken.id);

      // Check if BOTH signatures now exist
      const { data: allSigs } = await supabase
        .from("contract_signatures")
        .select("signer_type, signed_at, signer_name, signature_data, ip_address, user_agent, signed_by_email")
        .eq("employee_document_id", signingToken.employee_document_id);

      const signerTypes = (allSigs || []).map((s: any) => s.signer_type);
      const hasEmployee = signerTypes.includes("employee");
      const hasEmployer = signerTypes.includes("employer");
      const fullySignedNow = hasEmployee && hasEmployer;

      // Update employee_documents contract_send_status based on signing stage
      if (fullySignedNow) {
        const { data: companySettings } = await supabase
          .from("company_settings")
          .select("company_name")
          .eq("tenant_id", signingToken.tenant_id)
          .maybeSingle();

        const companyName = companySettings?.company_name || "Ugly Dumpling";
        const finalPackage = await buildFinalSignedContractPdf({
          originalPdfBytes,
          documentName: signingToken.employee_documents.document_name,
          employeeName: `${signingToken.employees?.forename || ""} ${signingToken.employees?.surname || ""}`.trim(),
          companyName,
          documentId: signingToken.employee_document_id,
          originalDocumentHash: serverDocumentHash,
          signatures: (allSigs || []).sort((a: any, b: any) => {
            const order = { employee: 0, employer: 1 } as Record<string, number>;
            return (order[a.signer_type] ?? 99) - (order[b.signer_type] ?? 99);
          }),
        });

        const finalPath = `contracts/final/${signingToken.tenant_id}/${signingToken.employee_document_id}/${sanitizeFileName(signingToken.employee_documents.document_name)}_completed_signed.pdf`;
        const { error: uploadFinalError } = await supabase.storage
          .from("employee-documents")
          .upload(finalPath, finalPackage.finalBytes, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadFinalError) {
          console.error("Failed to store final signed contract", uploadFinalError);
          return new Response(JSON.stringify({ error: "The final signed contract could not be stored.", error_code: "save_failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("employee_documents")
          .update({
            contract_send_status: "fully_signed",
            final_signed_pdf_url: finalPath,
            final_document_hash: finalPackage.finalHash,
          } as any)
          .eq("id", signingToken.employee_document_id);
      } else if (currentSignerType === "employee") {
        await supabase
          .from("employee_documents")
          .update({
            contract_send_status: "employee_signed",
          } as any)
          .eq("id", signingToken.employee_document_id);
      } else if (currentSignerType === "employer") {
        await supabase
          .from("employee_documents")
          .update({
            contract_send_status: "employer_signed",
          } as any)
          .eq("id", signingToken.employee_document_id);
      }

      // Insert audit log entry
      await supabase.from("audit_log").insert({
        action: "create",
        table_name: "contract_signatures",
        record_id: signingToken.employee_document_id,
        tenant_id: signingToken.tenant_id,
        ip_address: ip,
        user_agent: userAgent,
        new_data: {
          event: "contract_signed",
          employee_id: signingToken.employee_id,
          employee_document_id: signingToken.employee_document_id,
          signing_token_id: signingToken.id,
          signer_type: currentSignerType,
          signed_by_email: signedByEmail,
          signed_at: signedAt,
          document_hash: serverDocumentHash,
          signature_type: signature_type || "drawn",
          fully_signed: fullySignedNow,
        },
      });

      // Send stage-appropriate email
      const firstName = signingToken.employees?.forename || "there";
      const employeeName = `${signingToken.employees?.forename || ""} ${signingToken.employees?.surname || ""}`.trim();
      const formattedDate = new Date(signedAt).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      if (fullySignedNow) {
        // ── FULLY SIGNED ──
        // Generate a fresh download link for the email
        const { data: docRecord2 } = await supabase
          .from("employee_documents")
          .select("final_signed_pdf_url")
          .eq("id", signingToken.employee_document_id)
          .maybeSingle();

        let emailDownloadUrl = "";
        if (docRecord2?.final_signed_pdf_url) {
          const { data: freshSignedUrl } = await supabase.storage
            .from("employee-documents")
            .createSignedUrl(docRecord2.final_signed_pdf_url, 60 * 60 * 24 * 7);
          emailDownloadUrl = freshSignedUrl?.signedUrl || "";
        }

        // Send completion email to EMPLOYEE
        const recipientEmail = signingToken.employees?.email;
        if (recipientEmail) {
          try {
            await supabase.functions.invoke("send-notification", {
              body: {
                to: recipientEmail,
                subject: "Your contract is now complete",
                type: "contract_fully_signed",
                data: {
                  employee_name: employeeName,
                  first_name: firstName,
                  signed_at: formattedDate,
                  final_contract_url: emailDownloadUrl,
                },
                tenant_id: signingToken.tenant_id,
              },
            });
          } catch (emailErr) {
            console.error("Contract fully-signed email to employee failed:", emailErr);
          }
        }

        // Send completion email to MANAGER(S) too
        try {
          const { recipients: managerRecipients, source: managerSource } = await resolveManagerRecipients(supabase, signingToken.tenant_id);

          if (managerRecipients.length > 0) {
            for (const admin of managerRecipients) {
              await supabase.functions.invoke("send-notification", {
                body: {
                  to: admin.email,
                  subject: `Contract complete — ${employeeName}`,
                  type: "contract_fully_signed_manager",
                  data: {
                    employee_name: employeeName,
                    admin_name: admin.full_name,
                    signed_at: formattedDate,
                    final_contract_url: emailDownloadUrl,
                  },
                  tenant_id: signingToken.tenant_id,
                },
              });
            }

            await supabase.from("audit_log").insert({
              action: "create",
              table_name: "contract_signatures",
              record_id: signingToken.employee_document_id,
              tenant_id: signingToken.tenant_id,
              new_data: {
                event: "completed_contract_sent_to_managers",
                recipient_source: managerSource,
                recipients: managerRecipients.map((recipient: any) => ({ email: recipient.email, role: recipient.role })),
              },
            });
          }
        } catch (notifyErr) {
          console.error("Manager completion notification failed:", notifyErr);
        }

        // Log fully signed event
        await supabase.from("audit_log").insert({
          action: "create",
          table_name: "contract_signatures",
          record_id: signingToken.employee_document_id,
          tenant_id: signingToken.tenant_id,
          new_data: {
              event: "contract_fully_signed",
            employee_id: signingToken.employee_id,
            employee_document_id: signingToken.employee_document_id,
            signed_at: signedAt,
              authoritative_file: (await supabase
                .from("employee_documents")
                .select("final_signed_pdf_url, final_document_hash")
                .eq("id", signingToken.employee_document_id)
                .maybeSingle()).data,
            all_signatures: (allSigs || []).map((s: any) => ({
              signer_type: s.signer_type,
              signer_name: s.signer_name,
              signed_at: s.signed_at,
              signed_by_email: s.signed_by_email,
              ip_address: s.ip_address,
            })),
          },
        });
      } else if (currentSignerType === "employee") {
        // ── EMPLOYEE SIGNED ── Send acknowledgment to employee
        if (signedByEmail) {
          try {
            await supabase.functions.invoke("send-notification", {
              body: {
                to: signedByEmail,
                subject: "Your signature has been received",
                type: "contract_signature_received",
                data: {
                  employee_name: employeeName,
                  first_name: firstName,
                  signed_at: formattedDate,
                },
                tenant_id: signingToken.tenant_id,
              },
            });
          } catch (emailErr) {
            console.error("Signature received email failed:", emailErr);
          }
        }

        // ── AUTO-GENERATE EMPLOYER SIGNING TOKEN & SEND TO MANAGER ──
        try {
          const { recipients: managerRecipients, source: managerSource } = await resolveManagerRecipients(supabase, signingToken.tenant_id);

          if (managerRecipients.length > 0) {
            // Generate employer signing token
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const { data: employerToken, error: tokenErr } = await supabase
              .from("signing_tokens")
              .insert({
                employee_document_id: signingToken.employee_document_id,
                employee_id: signingToken.employee_id,
                signer_type: "employer",
                expires_at: expiresAt.toISOString(),
                tenant_id: signingToken.tenant_id,
              })
              .select()
              .single();

            if (tokenErr) {
              console.error("Failed to auto-generate employer token:", tokenErr);
            } else {
              const employerSigningUrl = `${CANONICAL_APP_URL}/sign/${employerToken.token}`;

              // Send signing link to the selected manager/admin recipients
              for (const admin of managerRecipients) {
                await supabase.functions.invoke("send-notification", {
                  body: {
                    to: admin.email,
                    subject: `Countersignature required — ${employeeName}'s contract`,
                    type: "contract_employer_sign_now",
                    data: {
                      employee_name: employeeName,
                      admin_name: admin.full_name,
                      signed_at: formattedDate,
                      signing_url: employerSigningUrl,
                    },
                    tenant_id: signingToken.tenant_id,
                  },
                });
              }

              // Audit log for auto-generated employer token
              await supabase.from("audit_log").insert({
                action: "create",
                table_name: "signing_tokens",
                record_id: employerToken.id,
                tenant_id: signingToken.tenant_id,
                new_data: {
                  event: "employer_signing_token_auto_generated",
                  employee_document_id: signingToken.employee_document_id,
                  employee_id: signingToken.employee_id,
                  triggered_by: "employee_signature",
                  recipient_source: managerSource,
                  recipients: managerRecipients.map((recipient: any) => ({ email: recipient.email, role: recipient.role })),
                },
              });
            }
          }
        } catch (notifyErr) {
          console.error("Manager auto-signing notification failed (non-critical):", notifyErr);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: fullySignedNow
          ? "Contract fully signed"
          : "Signature recorded successfully",
        signed_at: signedAt,
        signer_type: currentSignerType,
        fully_signed: fullySignedNow,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again.", error_code: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
