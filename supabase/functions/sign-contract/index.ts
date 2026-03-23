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

interface SignatureForPdf {
  signer_type: string;
  signer_name: string;
  typed_name: string | null;
  signatory_title: string | null;
  signed_at: string;
  signed_by_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  signature_data: string | null;
  signature_type: string | null;
  consent_text: string;
  document_hash: string | null;
}

async function buildAuditTrailPdf(params: {
  companyName: string;
  documentName: string;
  employeeName: string;
  documentId: string;
  originalDocumentHash: string;
  finalDocumentHash: string;
  signatures: SignatureForPdf[];
}) {
  const pdfDoc = await PDFDocument.create();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (minY: number) => {
    if (y < minY) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  page.drawText(params.companyName, {
    x: margin, y, size: 11, font: fontBold, color: rgb(0.16, 0.47, 0.43),
  });
  page.drawText("Signing Evidence & Audit Trail", {
    x: margin, y: y - 28, size: 16, font: fontBold, color: rgb(0.11, 0.16, 0.18),
  });
  y -= 52;

  y = drawWrappedText(page, "The following evidence has been recorded as part of the electronic signing process for the contract above. This data forms the audit trail and should be retained for legal and compliance purposes.", {
    font: fontRegular, size: 9, x: margin, y, maxWidth: contentWidth, lineHeight: 13,
  });
  y -= 16;

  const summaryRows = [
    ["Document", params.documentName],
    ["Employee", params.employeeName],
    ["Contract reference", params.documentId.substring(0, 8).toUpperCase()],
  ];
  for (const [label, value] of summaryRows) {
    ensureSpace(60);
    page.drawText(`${label}:`, { x: margin, y, size: 9, font: fontBold, color: rgb(0.35, 0.35, 0.35) });
    y = drawWrappedText(page, value, { font: fontRegular, size: 9, x: margin + 120, y, maxWidth: contentWidth - 120, lineHeight: 13, color: rgb(0.12, 0.16, 0.18) });
    y -= 6;
  }
  y -= 10;

  const hashRows = [
    ["Original document hash (SHA-256)", params.originalDocumentHash],
    ["Final package hash (SHA-256)", params.finalDocumentHash],
  ];
  for (const [label, value] of hashRows) {
    ensureSpace(60);
    page.drawText(`${label}:`, { x: margin, y, size: 8, font: fontBold, color: rgb(0.35, 0.35, 0.35) });
    y -= 12;
    page.drawText(value, { x: margin + 8, y, size: 7.5, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
    y -= 14;
  }
  y -= 8;

  for (const signature of params.signatures) {
    ensureSpace(200);
    const isEmployee = signature.signer_type === "employee";
    const blockTitle = isEmployee ? "Team Member Signing Evidence" : "Employer Signing Evidence";

    page.drawRectangle({
      x: margin, y: y - 150, width: contentWidth, height: 145,
      borderWidth: 1, borderColor: rgb(0.85, 0.88, 0.9), color: rgb(0.98, 0.99, 0.99),
    });

    let blockY = y - 16;
    page.drawText(blockTitle, { x: margin + 12, y: blockY, size: 10, font: fontBold, color: rgb(0.11, 0.16, 0.18) });

    const details = [
      ["Signer name", signature.signer_name],
      ["Typed name", signature.typed_name || signature.signer_name],
      ...(signature.signatory_title ? [["Job title", signature.signatory_title]] : []),
      ["Email", signature.signed_by_email || "Not recorded"],
      ["Signed at (UTC)", new Date(signature.signed_at).toISOString()],
      ["Signed at (Local)", new Date(signature.signed_at).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })],
      ["IP address", signature.ip_address || "Not recorded"],
      ["Browser / device", (signature.user_agent || "Not recorded").substring(0, 80)],
      ["Signature method", signature.signature_type || "drawn"],
      ["Document hash at signing", signature.document_hash || params.originalDocumentHash],
    ];

    for (const [label, value] of details) {
      blockY -= 12;
      if (blockY < margin + 20) break;
      page.drawText(`${label}:`, { x: margin + 12, y: blockY, size: 7.5, font: fontBold, color: rgb(0.35, 0.35, 0.35) });
      page.drawText(String(value).substring(0, 70), { x: margin + 130, y: blockY, size: 7.5, font: fontRegular, color: rgb(0.12, 0.16, 0.18) });
    }
    y -= 162;
  }

  ensureSpace(100);
  y -= 10;
  page.drawText("CONSENT RECORDS", { x: margin, y, size: 9, font: fontBold, color: rgb(0.16, 0.47, 0.43) });
  y -= 16;

  for (const signature of params.signatures) {
    ensureSpace(60);
    const roleLabel = signature.signer_type === "employee" ? "Team Member" : "Employer";
    page.drawText(`${roleLabel} — ${signature.signer_name}`, { x: margin, y, size: 8.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 12;
    y = drawWrappedText(page, signature.consent_text, {
      font: fontRegular, size: 7.5, x: margin + 8, y, maxWidth: contentWidth - 16, lineHeight: 10, color: rgb(0.35, 0.35, 0.35),
    });
    y -= 14;
  }

  ensureSpace(60);
  y -= 10;
  drawWrappedText(page, "This document forms part of the authoritative completed contract file. All signature data, timestamps, IP addresses, device information, and consent records have been stored securely. This constitutes a legally binding electronic signature record under the UK Electronic Communications Act 2000.", {
    font: fontRegular, size: 7.5, x: margin, y, maxWidth: contentWidth, lineHeight: 10, color: rgb(0.4, 0.4, 0.4),
  });

  return await pdfDoc.save();
}

async function drawSignatureBlockOnPage(
  pdfDoc: any,
  page: any,
  params: {
    companyName: string;
    signatures: SignatureForPdf[];
    startY: number;
    margin: number;
    contentWidth: number;
  },
) {
  const { companyName, signatures, margin, contentWidth } = params;
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let y = params.startY;

  const employerSig = signatures.find(s => s.signer_type === "employer");
  const employeeSig = signatures.find(s => s.signer_type === "employee");

  // ── EMPLOYER BLOCK ──
  page.drawText("EMPLOYER", { x: margin, y, size: 10, font: fontBold, color: rgb(0.16, 0.47, 0.43) });
  y -= 16;

  if (employerSig) {
    const signatoryTitle = employerSig.signatory_title || "";
    const onBehalfText = `Signed for and on behalf of ${companyName} by ${employerSig.signer_name}${signatoryTitle ? `, ${signatoryTitle}` : ""}`;
    y = drawWrappedText(page, onBehalfText, {
      font: fontItalic, size: 9, x: margin, y, maxWidth: contentWidth / 2 - 20, lineHeight: 12, color: rgb(0.15, 0.15, 0.15),
    });
    y -= 6;

    const employerSigImage = decodeDataUrl(employerSig.signature_data);
    if (employerSigImage) {
      try {
        const embedded = employerSigImage.mime.includes("png")
          ? await pdfDoc.embedPng(employerSigImage.bytes)
          : await pdfDoc.embedJpg(employerSigImage.bytes);
        const maxSigW = 160;
        const maxSigH = 50;
        const scale = Math.min(maxSigW / embedded.width, maxSigH / embedded.height, 1);
        page.drawImage(embedded, {
          x: margin, y: y - (embedded.height * scale),
          width: embedded.width * scale, height: embedded.height * scale,
        });
        y -= (embedded.height * scale) + 4;
      } catch (e) {
        console.error("Could not embed employer sig image", e);
      }
    }

    page.drawLine({ start: { x: margin, y }, end: { x: margin + 180, y }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) });
    y -= 11;
    page.drawText("Signature", { x: margin, y, size: 7.5, font: fontRegular, color: rgb(0.45, 0.45, 0.45) });
    y -= 14;
    page.drawText(`Name: ${employerSig.signer_name}`, { x: margin, y, size: 8.5, font: fontBold, color: rgb(0.12, 0.16, 0.18) });
    y -= 12;
    if (signatoryTitle) {
      page.drawText(`Title: ${signatoryTitle}`, { x: margin, y, size: 8.5, font: fontRegular, color: rgb(0.12, 0.16, 0.18) });
      y -= 12;
    }
    const employerDate = new Date(employerSig.signed_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    page.drawText(`Date: ${employerDate}`, { x: margin, y, size: 8.5, font: fontRegular, color: rgb(0.12, 0.16, 0.18) });
    y -= 12;
  }

  // ── TEAM MEMBER BLOCK — draw on the right side ──
  const rightX = margin + contentWidth / 2 + 10;
  let ey = params.startY;

  page.drawText("TEAM MEMBER", { x: rightX, y: ey, size: 10, font: fontBold, color: rgb(0.16, 0.47, 0.43) });
  ey -= 16;

  if (employeeSig) {
    page.drawText(employeeSig.signer_name, { x: rightX, y: ey, size: 9, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
    ey -= 14;

    const employeeSigImage = decodeDataUrl(employeeSig.signature_data);
    if (employeeSigImage) {
      try {
        const embedded = employeeSigImage.mime.includes("png")
          ? await pdfDoc.embedPng(employeeSigImage.bytes)
          : await pdfDoc.embedJpg(employeeSigImage.bytes);
        const maxSigW = 160;
        const maxSigH = 50;
        const scale = Math.min(maxSigW / embedded.width, maxSigH / embedded.height, 1);
        page.drawImage(embedded, {
          x: rightX, y: ey - (embedded.height * scale),
          width: embedded.width * scale, height: embedded.height * scale,
        });
        ey -= (embedded.height * scale) + 4;
      } catch (e) {
        console.error("Could not embed employee sig image", e);
      }
    }

    page.drawLine({ start: { x: rightX, y: ey }, end: { x: rightX + 180, y: ey }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) });
    ey -= 11;
    page.drawText("Signature", { x: rightX, y: ey, size: 7.5, font: fontRegular, color: rgb(0.45, 0.45, 0.45) });
    ey -= 14;
    page.drawText(`Name: ${employeeSig.signer_name}`, { x: rightX, y: ey, size: 8.5, font: fontBold, color: rgb(0.12, 0.16, 0.18) });
    ey -= 12;
    const employeeDate = new Date(employeeSig.signed_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    page.drawText(`Date: ${employeeDate}`, { x: rightX, y: ey, size: 8.5, font: fontRegular, color: rgb(0.12, 0.16, 0.18) });
    ey -= 12;
  }
}

async function buildFinalSignedContractPdf(params: {
  originalPdfBytes: Uint8Array;
  documentName: string;
  employeeName: string;
  companyName: string;
  documentId: string;
  originalDocumentHash: string;
  signatures: SignatureForPdf[];
}) {
  const appendixHashSource = await sha256(JSON.stringify({
    documentId: params.documentId,
    originalDocumentHash: params.originalDocumentHash,
    signatures: params.signatures.map((sig) => ({
      signer_type: sig.signer_type,
      signer_name: sig.signer_name,
      signed_at: sig.signed_at,
      signed_by_email: sig.signed_by_email,
      document_hash: sig.document_hash,
    })),
  }));

  // Step 1: Load original PDF and overlay signatures on last page
  const finalPdf = await PDFDocument.load(params.originalPdfBytes);
  const pages = finalPdf.getPages();
  const lastPage = pages[pages.length - 1];
  const { width: pageWidth, height: pageHeight } = lastPage.getSize();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  // Cover the bottom portion of the last page to fully mask original blank signature placeholders.
  // Most employment contract templates place the signature block in the bottom 40-45% of the page.
  // We use 42% of page height to ensure full coverage without touching contract body text above.
  const coverHeight = Math.round(pageHeight * 0.42);
  lastPage.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: coverHeight,
    color: rgb(1, 1, 1),
  });

  // Draw completed execution block starting near the top of the covered area,
  // so it sits exactly where the original blank signature section was.
  const sigBlockStartY = coverHeight - 24;
  await drawSignatureBlockOnPage(finalPdf, lastPage, {
    companyName: params.companyName,
    signatures: params.signatures,
    startY: sigBlockStartY,
    margin,
    contentWidth,
  });

  // Step 2: Build audit trail as a separate appendix
  const auditBytes = await buildAuditTrailPdf({
    companyName: params.companyName,
    documentName: params.documentName,
    employeeName: params.employeeName,
    documentId: params.documentId,
    originalDocumentHash: params.originalDocumentHash,
    finalDocumentHash: appendixHashSource,
    signatures: params.signatures,
  });

  // Step 3: Append audit trail pages
  const auditPdf = await PDFDocument.load(auditBytes);
  const auditPages = await finalPdf.copyPages(auditPdf, auditPdf.getPageIndices());
  auditPages.forEach((p) => finalPdf.addPage(p));

  const finalBytes = await finalPdf.save();
  const finalHash = await sha256Bytes(finalBytes);

  return { finalBytes, finalHash };
}

async function resolveManagerRecipients(supabase: any, tenantId: string, documentId?: string | null) {
  // Priority 1: Per-contract override stored on employee_documents
  if (documentId) {
    const { data: docRecord } = await supabase
      .from("employee_documents")
      .select("employer_signatory_name, employer_signatory_email, employer_signatory_source")
      .eq("id", documentId)
      .maybeSingle();

    const overrideName = docRecord?.employer_signatory_name;
    const overrideEmail = docRecord?.employer_signatory_email;
    if (overrideName && overrideEmail) {
      return {
        recipients: [{
          user_id: null,
          role: "contract_signatory",
          email: overrideEmail,
          full_name: overrideName,
          title: null,
        }],
        source: docRecord?.employer_signatory_source === "override" ? "contract_override" : "contract_default",
      };
    }
  }

  // Priority 2: Default from company_settings
  const { data: settings } = await supabase
    .from("company_settings")
    .select("default_signatory_name, default_signatory_email, default_signatory_title")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const signatoryName = settings?.default_signatory_name;
  const signatoryEmail = settings?.default_signatory_email;
  const signatoryTitle = settings?.default_signatory_title;

  if (signatoryName && signatoryEmail) {
    return {
      recipients: [{
        user_id: null,
        role: "configured_signatory",
        email: signatoryEmail,
        full_name: signatoryName,
        title: signatoryTitle || null,
      }],
      source: "company_settings",
    };
  }

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
        title: null,
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

    // ════════════════════════════════════════════
    // GET: Fetch contract info for signing page
    // ════════════════════════════════════════════
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

      // ROLE LOCKING: If this signer_type already has a signature, block
      if (existingSignerTypes.includes(signingToken.signer_type)) {
        const roleLabel = signingToken.signer_type === "employee" ? "Team Member" : "Employer";
        return new Response(JSON.stringify({
          error: `The ${roleLabel} section has already been signed. This signing link can no longer be used.`,
          error_code: "already_signed",
          already_signed: true,
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: originalDocumentFile, error: originalDocumentError } = await supabase.storage
        .from("employee-documents")
        .download(signingToken.employee_documents.file_path);

      if (originalDocumentError || !originalDocumentFile) {
        return new Response(JSON.stringify({ error: "The contract document could not be loaded. Please contact your employer.", error_code: "missing_document" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const brandedDocumentUrl = `${CANONICAL_APP_URL}/document/view?token=${token}`;

      const docHash = await sha256Bytes(await originalDocumentFile.arrayBuffer());

      // Resolve employer details for context on the signing page
      let employer_signatory_name: string | null = null;
      let employer_signatory_title: string | null = null;
      if (signingToken.signer_type === "employer") {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("default_signatory_name, default_signatory_title, company_name")
          .eq("tenant_id", signingToken.tenant_id)
          .maybeSingle();
        employer_signatory_name = settings?.default_signatory_name || null;
        employer_signatory_title = settings?.default_signatory_title || null;
      }

      // Get company name for context
      const { data: compSettings } = await supabase
        .from("company_settings")
        .select("company_name")
        .eq("tenant_id", signingToken.tenant_id)
        .maybeSingle();

      return new Response(JSON.stringify({
        signer_type: signingToken.signer_type,
        employee_name: `${signingToken.employees.forename} ${signingToken.employees.surname}`,
        employee_email: signingToken.employees.email || null,
        document_name: signingToken.employee_documents.document_name,
        document_url: brandedDocumentUrl,
        document_hash: docHash,
        expires_at: signingToken.expires_at,
        existing_signatures: existingSignerTypes,
        company_name: compSettings?.company_name || null,
        // For employer signing: prefill signatory details
        employer_signatory_name,
        employer_signatory_title,
        signature_details: (existingSigs || []).map((s: any) => ({
          signer_type: s.signer_type,
          signer_name: s.signer_name,
          signed_at: s.signed_at,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════
    // POST: Submit signature
    // ════════════════════════════════════════════
    if (req.method === "POST") {
      const body = await req.json();
      const {
        typed_name,
        consent_given,
        signature_data,
        signature_type,
        consent_text,
        document_hash,
        signatory_title,
      } = body;

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

      // ROLE LOCKING: Prevent duplicate role signatures
      const { data: existingRoleSigs } = await supabase
        .from("contract_signatures")
        .select("signer_type")
        .eq("employee_document_id", signingToken.employee_document_id)
        .eq("signer_type", signingToken.signer_type);

      if (existingRoleSigs && existingRoleSigs.length > 0) {
        const roleLabel = signingToken.signer_type === "employee" ? "Team Member" : "Employer";
        return new Response(JSON.stringify({
          error: `The ${roleLabel} section has already been signed. This signing link can no longer be used.`,
          error_code: "already_signed",
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
      const userAgent = req.headers.get("user-agent") || "unknown";
      const signedAt = new Date().toISOString();
      const currentSignerType = signingToken.signer_type;
      const originalFilePath = signingToken.employee_documents?.file_path;

      // CRITICAL: Use the correct email per role
      // Employee → employee's email from the employee record
      // Employer → the employer's email (from company settings or the person who is actually signing)
      let signedByEmail: string | null;
      if (currentSignerType === "employer") {
        // Priority: per-contract override → company_settings default
        const { data: docOverride } = await supabase
          .from("employee_documents")
          .select("employer_signatory_email")
          .eq("id", signingToken.employee_document_id)
          .maybeSingle();
        if (docOverride?.employer_signatory_email) {
          signedByEmail = docOverride.employer_signatory_email;
        } else {
          const { data: settings } = await supabase
          .from("company_settings")
          .select("default_signatory_email")
          .eq("tenant_id", signingToken.tenant_id)
          .maybeSingle();
          signedByEmail = settings?.default_signatory_email || null;
        }
      } else {
        signedByEmail = signingToken.employees?.email || null;
      }

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

      // Record signature with role-specific fields
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
          signatory_title: currentSignerType === "employer" ? (signatory_title || null) : null,
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
        .select("signer_type, signed_at, signer_name, signature_data, ip_address, user_agent, signed_by_email, typed_name, signatory_title, signature_type, consent_text, document_hash")
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

        // Build final PDF with proper signature blocks
        const signaturesForPdf: SignatureForPdf[] = (allSigs || []).sort((a: any, b: any) => {
          const order = { employee: 1, employer: 0 } as Record<string, number>;
          return (order[a.signer_type] ?? 99) - (order[b.signer_type] ?? 99);
        }).map((s: any) => ({
          signer_type: s.signer_type,
          signer_name: s.signer_name,
          typed_name: s.typed_name,
          signatory_title: s.signatory_title || null,
          signed_at: s.signed_at,
          signed_by_email: s.signed_by_email,
          ip_address: s.ip_address,
          user_agent: s.user_agent,
          signature_data: s.signature_data,
          signature_type: s.signature_type,
          consent_text: s.consent_text,
          document_hash: s.document_hash,
        }));

        const finalPackage = await buildFinalSignedContractPdf({
          originalPdfBytes,
          documentName: signingToken.employee_documents.document_name,
          employeeName: `${signingToken.employees?.forename || ""} ${signingToken.employees?.surname || ""}`.trim(),
          companyName,
          documentId: signingToken.employee_document_id,
          originalDocumentHash: serverDocumentHash,
          signatures: signaturesForPdf,
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
      const roleLabel = currentSignerType === "employee" ? "team_member" : "employer";
      await supabase.from("audit_log").insert({
        action: "create",
        table_name: "contract_signatures",
        record_id: signingToken.employee_document_id,
        tenant_id: signingToken.tenant_id,
        ip_address: ip,
        user_agent: userAgent,
        new_data: {
          event: "contract_signed",
          signer_role: roleLabel,
          employee_id: signingToken.employee_id,
          employee_document_id: signingToken.employee_document_id,
          signing_token_id: signingToken.id,
          signer_type: currentSignerType,
          signer_name: typed_name.trim(),
          signatory_title: currentSignerType === "employer" ? (signatory_title || null) : null,
          signed_by_email: signedByEmail,
          signed_at: signedAt,
          document_hash: serverDocumentHash,
          signature_type: signature_type || "drawn",
          fully_signed: fullySignedNow,
          signing_field: currentSignerType === "employee" ? "team_member_block" : "employer_block",
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
        const { data: docRecord2 } = await supabase
          .from("employee_documents")
          .select("final_signed_pdf_url")
          .eq("id", signingToken.employee_document_id)
          .maybeSingle();

        // Create a long-lived download token (90 days) so email recipients
        // can access the final signed contract without app login
        const downloadExpiresAt = new Date();
        downloadExpiresAt.setDate(downloadExpiresAt.getDate() + 90);

        const { data: downloadTokenRecord, error: downloadTokenError } = await supabase
          .from("signing_tokens")
          .insert({
            employee_document_id: signingToken.employee_document_id,
            employee_id: signingToken.employee_id,
            signer_type: "download",
            tenant_id: signingToken.tenant_id,
            expires_at: downloadExpiresAt.toISOString(),
          })
          .select("id, token, expires_at")
          .single();

        if (downloadTokenError || !downloadTokenRecord?.token) {
          console.error("Failed to create final contract download token:", downloadTokenError);
          return new Response(JSON.stringify({
            error: "The contract was signed, but the final download link could not be created. Please contact support.",
            error_code: "download_token_creation_failed",
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase.from("audit_log").insert({
          action: "create",
          table_name: "signing_tokens",
          record_id: downloadTokenRecord.id,
          tenant_id: signingToken.tenant_id,
          new_data: {
            event: "final_contract_download_token_created",
            employee_document_id: signingToken.employee_document_id,
            employee_id: signingToken.employee_id,
            signer_type: "download",
            expires_at: downloadTokenRecord.expires_at,
          },
        });

        // Use token-based branded URL so employees can access without logging in
        const emailDownloadUrl = `${CANONICAL_APP_URL}/document/view?token=${downloadTokenRecord.token}&variant=final`;

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

        // Send completion email to MANAGER(S)
        try {
          const { recipients: managerRecipients, source: managerSource } = await resolveManagerRecipients(supabase, signingToken.tenant_id, signingToken.employee_document_id);

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
              signatory_title: s.signatory_title,
            })),
          },
        });
      } else if (currentSignerType === "employee") {
        // ── EMPLOYEE SIGNED ── Check email automation policy before sending
        const { data: emailPolicyRow } = await supabase
          .from("tenant_preferences")
          .select("preferences")
          .eq("tenant_id", signingToken.tenant_id)
          .eq("category", "email_automation")
          .maybeSingle();

        const emailPolicy = emailPolicyRow?.preferences as Record<string, string> | null;
        const contractSigningMode = emailPolicy?.contract_signing || "manual";

        // Send acknowledgment to employee (only if contract_signing is not disabled)
        if (signedByEmail && contractSigningMode !== "disabled") {
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

            await supabase.from("audit_log").insert({
              action: "create",
              table_name: "email_sent",
              record_id: signingToken.employee_document_id,
              tenant_id: signingToken.tenant_id,
              new_data: {
                event: "employee_signature_receipt_email_sent",
                status: "sent",
                email_type: "contract_signature_received",
                recipient_email: signedByEmail,
                employee_name: employeeName,
                trigger: "automatic",
                policy_mode: contractSigningMode,
              },
            });
          } catch (emailErr) {
            console.error("Signature received email failed:", emailErr);
          }
        } else if (signedByEmail && contractSigningMode === "disabled") {
          await supabase.from("audit_log").insert({
            action: "create",
            table_name: "email_blocked",
            record_id: signingToken.employee_document_id,
            tenant_id: signingToken.tenant_id,
            new_data: {
              event: "employee_signature_receipt_email_blocked",
              status: "blocked",
              reason: "Email automation policy: contract_signing is disabled",
              email_type: "contract_signature_received",
              recipient_email: signedByEmail,
              employee_name: employeeName,
              trigger: "automatic",
            },
          });
        }

        // ── AUTO-GENERATE EMPLOYER SIGNING TOKEN & SEND TO MANAGER ──
        // Only auto-send if contract_signing is set to "auto"
        if (contractSigningMode === "auto") {
          try {
            const { recipients: managerRecipients, source: managerSource } = await resolveManagerRecipients(supabase, signingToken.tenant_id, signingToken.employee_document_id);

            if (managerRecipients.length > 0) {
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

                await supabase.from("audit_log").insert({
                  action: "create",
                  table_name: "employer_signing_email_sent",
                  record_id: employerToken.id,
                  tenant_id: signingToken.tenant_id,
                  new_data: {
                    event: "employer_signing_email_auto_sent",
                    status: "sent",
                    email_type: "contract_employer_sign_now",
                    employee_document_id: signingToken.employee_document_id,
                    employee_id: signingToken.employee_id,
                    triggered_by: "employee_signature",
                    trigger: "automatic",
                    policy_mode: contractSigningMode,
                    recipient_source: managerSource,
                    recipients: managerRecipients.map((recipient: any) => ({ email: recipient.email, role: recipient.role })),
                  },
                });
              }
            }
          } catch (notifyErr) {
            console.error("Manager auto-signing notification failed (non-critical):", notifyErr);
          }
        } else {
          // Log that the employer signing email was NOT auto-sent
          await supabase.from("audit_log").insert({
            action: "create",
            table_name: "employer_signing_email_blocked",
            record_id: signingToken.employee_document_id,
            tenant_id: signingToken.tenant_id,
            new_data: {
              event: "employer_signing_email_not_auto_sent",
              status: contractSigningMode === "disabled" ? "blocked" : "pending_manual",
              reason: contractSigningMode === "disabled"
                ? "Email automation policy: contract_signing is disabled"
                : "Email automation policy: contract_signing is set to manual — admin must send manually",
              email_type: "contract_employer_sign_now",
              employee_document_id: signingToken.employee_document_id,
              employee_name: employeeName,
              trigger: "automatic_blocked",
              policy_mode: contractSigningMode,
            },
          });
          console.log(`[SIGN-CONTRACT] Employer signing email NOT auto-sent (policy: ${contractSigningMode})`);
        }
      }

      const roleConfirmLabel = currentSignerType === "employee" ? "Team Member" : "Employer";

      return new Response(JSON.stringify({
        success: true,
        message: fullySignedNow
          ? "Contract fully signed"
          : `Your signature has been applied to the ${roleConfirmLabel} section`,
        signed_at: signedAt,
        signer_type: currentSignerType,
        signing_field: currentSignerType === "employee" ? "team_member_block" : "employer_block",
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
