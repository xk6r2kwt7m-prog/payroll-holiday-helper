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

/**
 * Transient failures (storage/network blips inside the isolate) are the most
 * common cause of a signing attempt failing. Retry them briefly instead of
 * showing the signer an error.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.error(`[SIGN-CONTRACT] ${label} attempt ${attempt} failed:`, err);
      if (attempt < attempts) await new Promise((r) => setTimeout(r, attempt * 400));
    }
  }
  throw lastError;
}

function makeReference(): string {
  return `SC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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

// In-app notification for admins/managers. Always runs, regardless of email
// automation policy (this is an internal alert, not an outbound email).
async function notifyAdminsInApp(
  supabase: any,
  tenantId: string,
  payload: { event_type: string; title: string; body: string; link?: string | null; metadata?: Record<string, unknown> },
) {
  try {
    const { data: admins } = await supabase
      .from("tenant_members")
      .select("user_id, role")
      .eq("tenant_id", tenantId)
      .in("role", ["company_admin", "manager"])
      .eq("is_active", true);

    if (!admins?.length) return;

    const targets = admins.some((a: any) => a.role === "company_admin")
      ? admins.filter((a: any) => a.role === "company_admin")
      : admins;

    await supabase.from("notifications").insert(
      targets.map((a: any) => ({
        tenant_id: tenantId,
        user_id: a.user_id,
        event_type: payload.event_type,
        title: payload.title,
        body: payload.body,
        link: payload.link ?? null,
        metadata: payload.metadata ?? {},
      })),
    );
  } catch (err) {
    console.error("In-app admin notification failed (non-critical):", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Where the request got to, so a failure can be reported and traced precisely.
  let failureStage = "request";
  let failureContext: { tenant_id?: string; employee_document_id?: string; employee_id?: string; signer_type?: string } = {};

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    // ════════════════════════════════════════════
    // Manager action: rebuild the combined signed file when assembly failed.
    // Signatures are never touched — only the derived PDF is produced again.
    // ════════════════════════════════════════════
    if (req.method === "POST" && url.searchParams.get("action") === "rebuild_final") {
      failureStage = "rebuild_final";
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Please sign in again.", error_code: "auth_required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Please sign in again.", error_code: "auth_required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rebuildBody = await req.json().catch(() => ({}));
      const documentId = String(rebuildBody?.document_id || "");
      if (!documentId) {
        return new Response(JSON.stringify({ error: "Missing contract reference", error_code: "missing_document" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const recoveryReason = String(rebuildBody?.reason || "").trim();
      if (recoveryReason.length < 5) {
        return new Response(JSON.stringify({
          error: "Please give the reason a recovery copy is needed.",
          error_code: "reason_required",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: doc } = await supabase
        .from("employee_documents")
        .select("id, tenant_id, employee_id, document_name, file_path, final_signed_pdf_url, final_document_hash, contract_state, employees ( forename, surname )")
        .eq("id", documentId)
        .maybeSingle();

      if (!doc) {
        return new Response(JSON.stringify({ error: "Contract not found", error_code: "missing_document" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: membership } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("tenant_id", doc.tenant_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!membership || !["company_admin", "manager"].includes(membership.role)) {
        return new Response(JSON.stringify({ error: "Access denied", error_code: "forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: sigs } = await supabase
        .from("contract_signatures")
        .select("signer_type, signed_at, signer_name, signature_data, ip_address, user_agent, signed_by_email, typed_name, signatory_title, signature_type, consent_text, document_hash, invalidated_at")
        .eq("employee_document_id", documentId);

      const liveSigs = (sigs || []).filter((s: any) => !s.invalidated_at);
      const types = liveSigs.map((s: any) => s.signer_type);
      if (!types.includes("employee") || !types.includes("employer")) {
        return new Response(JSON.stringify({
          error: "Both signatures are needed before the signed copy can be produced.",
          error_code: "not_fully_signed",
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: originalFile, error: originalError } = await withRetry("download original for rebuild", () =>
        supabase.storage.from("employee-documents").download(doc.file_path) as any, 3);
      if (originalError || !originalFile) {
        return new Response(JSON.stringify({ error: "The original contract file could not be read. Please try again.", error_code: "missing_document" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: rebuildSettings } = await supabase
        .from("company_settings")
        .select("company_name")
        .eq("tenant_id", doc.tenant_id)
        .maybeSingle();

      const originalBytes = new Uint8Array(await originalFile.arrayBuffer());
      const rebuildHash = await sha256Bytes(originalBytes);
      const existingFinalPath: string | null = (doc as any).final_signed_pdf_url || null;
      // The original completed file is never overwritten. When one already exists the
      // rebuild is stored as a separate, clearly labelled recovery copy.
      const canonicalFinalPath = `contracts/final/${doc.tenant_id}/${doc.id}/${sanitizeFileName(doc.document_name)}_completed_signed.pdf`;
      const isRecoveryCopy = Boolean(existingFinalPath);
      const rebuildPath = isRecoveryCopy
        ? `contracts/recovery/${doc.tenant_id}/${doc.id}/${new Date().toISOString().replace(/[:.]/g, "-")}_${sanitizeFileName(doc.document_name)}_recovery.pdf`
        : canonicalFinalPath;

      const rebuiltPackage = await withRetry("rebuild final signed contract", () =>
        buildFinalSignedContractPdf({
          originalPdfBytes: originalBytes,
          documentName: doc.document_name,
          employeeName: `${(doc as any).employees?.forename || ""} ${(doc as any).employees?.surname || ""}`.trim(),
          companyName: rebuildSettings?.company_name || "Ugly Dumpling",
          documentId: doc.id,
          originalDocumentHash: rebuildHash,
          signatures: liveSigs.sort((a: any, b: any) => (a.signer_type === "employer" ? -1 : 1)).map((s: any) => ({
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
          })) as SignatureForPdf[],
        }), 2);

      await withRetry("store rebuilt signed contract", async () => {
        const result = await supabase.storage
          .from("employee-documents")
          .upload(rebuildPath, rebuiltPackage.finalBytes, { contentType: "application/pdf", upsert: false });
        if (result.error) throw result.error;
        return result;
      });

      const { data: recoveryActor } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      await supabase.from("contract_file_recoveries").insert({
        tenant_id: doc.tenant_id,
        employee_document_id: doc.id,
        original_file_path: existingFinalPath,
        original_file_hash: (doc as any).final_document_hash || null,
        recovery_file_path: rebuildPath,
        recovery_file_hash: rebuiltPackage.finalHash,
        reason: recoveryReason,
        created_by: user.id,
        created_by_name: (recoveryActor as any)?.full_name || user.email || null,
      } as any);

      if (!isRecoveryCopy) {
        // No completed file existed, so this genuinely completes the record.
        await supabase
          .from("employee_documents")
          .update({
            final_signed_pdf_url: rebuildPath,
            final_document_hash: rebuiltPackage.finalHash,
            contract_send_status: "fully_signed",
            contract_state: "signed",
          } as any)
          .eq("id", doc.id);
      }

      await supabase.from("audit_log").insert({
        action: "update",
        table_name: "employee_documents",
        record_id: doc.id,
        tenant_id: doc.tenant_id,
        user_id: user.id,
        new_data: {
          event: isRecoveryCopy ? "contract_recovery_copy_created" : "final_signed_contract_file_rebuilt",
          employee_document_id: doc.id,
          employee_id: doc.employee_id,
          reason: recoveryReason,
          recovery_file_path: rebuildPath,
          recovery_file_hash: rebuiltPackage.finalHash,
          original_file_path: existingFinalPath,
          original_file_hash: (doc as any).final_document_hash || null,
          note: isRecoveryCopy
            ? "Recovery copy produced from the stored signatures. The original completed file and all signatures are unchanged and remain authoritative."
            : "Combined signed file produced from the stored signatures. Signatures unchanged.",
        },
      });

      return new Response(JSON.stringify({
        success: true,
        path: rebuildPath,
        recovery_copy: isRecoveryCopy,
        original_path: existingFinalPath,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════
    // Manager action: dated integrity check. Recalculates the fingerprint of the
    // stored files and records the result. Nothing is ever corrected automatically.
    // ════════════════════════════════════════════
    if (req.method === "POST" && url.searchParams.get("action") === "integrity_check") {
      failureStage = "integrity_check";
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Please sign in again.", error_code: "auth_required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Please sign in again.", error_code: "auth_required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const checkBody = await req.json().catch(() => ({}));
      const checkDocumentIds: string[] = Array.isArray(checkBody?.document_ids)
        ? checkBody.document_ids.map((v: unknown) => String(v))
        : checkBody?.document_id
          ? [String(checkBody.document_id)]
          : [];

      if (checkDocumentIds.length === 0) {
        return new Response(JSON.stringify({ error: "Missing contract reference", error_code: "missing_document" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: checkDocs } = await supabase
        .from("employee_documents")
        .select("id, tenant_id, document_name, file_path, final_signed_pdf_url, final_document_hash, contract_state")
        .in("id", checkDocumentIds);

      const results: Array<Record<string, unknown>> = [];

      for (const checkDoc of checkDocs || []) {
        const { data: membership } = await supabase
          .from("tenant_members")
          .select("role")
          .eq("tenant_id", checkDoc.tenant_id)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (!membership || membership.role !== "company_admin") {
          results.push({ document_id: checkDoc.id, result: "not_permitted" });
          continue;
        }

        const targets: Array<{ kind: string; path: string | null; stored: string | null }> = [
          { kind: "completed", path: (checkDoc as any).final_signed_pdf_url, stored: (checkDoc as any).final_document_hash },
          { kind: "original", path: (checkDoc as any).file_path, stored: null },
        ];

        for (const target of targets) {
          if (!target.path) {
            results.push({ document_id: checkDoc.id, file_kind: target.kind, result: "no_file" });
            continue;
          }

          let recalculated: string | null = null;
          let detail: string | null = null;
          let result = "match";

          try {
            const { data: fileData, error: fileError } = await withRetry(`integrity read ${target.kind}`, () =>
              supabase.storage.from("employee-documents").download(target.path as string) as any, 3);
            if (fileError || !fileData) throw fileError || new Error("File could not be read");
            recalculated = await sha256Bytes(new Uint8Array(await fileData.arrayBuffer()));
            if (!target.stored) {
              result = "recorded";
              detail = "No fingerprint was stored for this file, so this check records the fingerprint as at today only.";
            } else if (target.stored !== recalculated) {
              result = "mismatch";
              detail = "The stored fingerprint and the file do not match. No change has been made.";
            }
          } catch (checkErr) {
            result = "unreadable";
            detail = checkErr instanceof Error ? checkErr.message : String(checkErr);
          }

          const { data: inserted } = await supabase.from("contract_integrity_checks").insert({
            tenant_id: checkDoc.tenant_id,
            employee_document_id: checkDoc.id,
            file_kind: target.kind,
            file_path: target.path,
            stored_hash: target.stored,
            recalculated_hash: recalculated,
            result,
            detail,
            checked_by: user.id,
          } as any).select("id, checked_at").maybeSingle();

          results.push({
            document_id: checkDoc.id,
            file_kind: target.kind,
            result,
            detail,
            recalculated_hash: recalculated,
            checked_at: (inserted as any)?.checked_at || new Date().toISOString(),
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        results,
        note: "Each result confirms the file as at the date and time checked. It is not evidence of its condition before that date.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



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
            file_path,
            requires_details_first,
            details_submitted_at
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

      // ════════════════════════════════════════════
      // Details-first gate: for the employee signer, the contract stays
      // hidden until they have submitted their basic personal details.
      // Read-only check — nothing is modified here.
      // ════════════════════════════════════════════
      if (signingToken.signer_type === "employee" && signingToken.employee_documents.requires_details_first) {
        const { data: onboarding } = await supabase
          .from("employee_onboarding_data")
          .select("personal_info, submitted_at")
          .eq("employee_id", signingToken.employee_id)
          .maybeSingle();

        const detailsDone =
          !!signingToken.employee_documents.details_submitted_at || !!onboarding?.submitted_at;

        if (!detailsDone) {
          return new Response(JSON.stringify({
            signer_type: signingToken.signer_type,
            details_required: true,
            employee_name: `${signingToken.employees.forename} ${signingToken.employees.surname}`,
            employee_email: signingToken.employees.email || null,
            document_name: signingToken.employee_documents.document_name,
            document_url: null,
            document_hash: null,
            expires_at: signingToken.expires_at,
            existing_signatures: existingSignerTypes,
            company_name: null,
            employer_signatory_name: null,
            employer_signatory_title: null,
            prefill: {
              full_name: `${signingToken.employees.forename} ${signingToken.employees.surname}`,
              ...(onboarding?.personal_info as Record<string, unknown> | null ?? {}),
            },
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
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

      const brandedDocumentUrl = `${CANONICAL_APP_URL}/document/view?token=${token}&variant=original`;

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

      // ════════════════════════════════════════════
      // Optional extra: signer uploads a scan/photo of the signed contract.
      // Supporting evidence only — it never replaces the electronic signature
      // and never modifies the original contract document.
      // ════════════════════════════════════════════
      if (body?.action === "upload_scan") {
        const { file_data, file_name } = body as { file_data?: string; file_name?: string };
        const decoded = decodeDataUrl(file_data);

        if (!decoded) {
          return new Response(JSON.stringify({ error: "No file received", error_code: "missing_file" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
        if (!ALLOWED.includes(decoded.mime)) {
          return new Response(JSON.stringify({ error: "Please upload a PDF or a photo (PNG/JPG).", error_code: "invalid_file_type" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (decoded.bytes.byteLength > 15 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: "File is too large (15MB maximum).", error_code: "file_too_large" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: uploadToken } = await supabase
          .from("signing_tokens")
          .select("id, employee_document_id, employee_id, signer_type, expires_at, used_at, tenant_id")
          .eq("token", token)
          .maybeSingle();

        if (!uploadToken) {
          return new Response(JSON.stringify({ error: "This link is not valid.", error_code: "invalid_token" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // A used token stays valid for uploads for 30 days after signing,
        // so the signer can send their scan shortly after signing.
        const uploadDeadline = new Date(uploadToken.used_at ?? uploadToken.expires_at);
        uploadDeadline.setDate(uploadDeadline.getDate() + 30);
        if (uploadDeadline < new Date()) {
          return new Response(JSON.stringify({ error: "This upload link has expired. Please ask your employer for a new one.", error_code: "expired" }), {
            status: 410,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const ext = decoded.mime === "application/pdf" ? "pdf" : decoded.mime.split("/")[1].replace("jpeg", "jpg");
        const storagePath = `${uploadToken.employee_id}/signed-scan-${uploadToken.employee_document_id}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("employee-documents")
          .upload(storagePath, decoded.bytes, { contentType: decoded.mime, upsert: false });

        if (uploadError) {
          console.error("Signed scan upload failed:", uploadError);
          return new Response(JSON.stringify({ error: "Upload failed. Please try again.", error_code: "upload_failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("employee_documents")
          .update({
            signed_scan_file_path: storagePath,
            signed_scan_uploaded_at: new Date().toISOString(),
            signed_scan_uploaded_by_signer: uploadToken.signer_type,
          })
          .eq("id", uploadToken.employee_document_id);

        await supabase.from("document_audit_log").insert({
          tenant_id: uploadToken.tenant_id,
          document_id: uploadToken.employee_document_id,
          employee_id: uploadToken.employee_id,
          action: "signed_scan_uploaded",
          metadata: {
            signer_type: uploadToken.signer_type,
            file_name: file_name || null,
            storage_path: storagePath,
            mime_type: decoded.mime,
            size_bytes: decoded.bytes.byteLength,
          },
        } as any);

        return new Response(JSON.stringify({ success: true, storage_path: storagePath }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ════════════════════════════════════════════
      // Staff submit their basic details before the contract is revealed.
      // Stored as onboarding personal info; the original contract document
      // is never modified.
      // ════════════════════════════════════════════
      if (body?.action === "submit_details") {
        const details = (body.details ?? {}) as Record<string, string>;
        const required = ["full_name", "address", "date_of_birth", "phone"];
        const missing = required.filter((k) => !String(details[k] || "").trim());
        if (missing.length) {
          return new Response(JSON.stringify({ error: "Please complete all required fields.", error_code: "missing_details", missing }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: detailsToken } = await supabase
          .from("signing_tokens")
          .select("id, employee_document_id, employee_id, signer_type, expires_at, used_at, tenant_id")
          .eq("token", token)
          .maybeSingle();

        if (!detailsToken || detailsToken.signer_type !== "employee") {
          return new Response(JSON.stringify({ error: "This link is not valid.", error_code: "invalid_token" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (new Date(detailsToken.expires_at) < new Date()) {
          return new Response(JSON.stringify({ error: "This link has expired. Please ask your employer for a new one.", error_code: "expired" }), {
            status: 410,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: existingOnboarding } = await supabase
          .from("employee_onboarding_data")
          .select("id, personal_info")
          .eq("employee_id", detailsToken.employee_id)
          .maybeSingle();

        const personalInfo = {
          ...((existingOnboarding?.personal_info as Record<string, unknown> | null) ?? {}),
          ...details,
          submitted_via: "contract_signing_link",
        };

        const nowIso = new Date().toISOString();

        if (existingOnboarding?.id) {
          await supabase
            .from("employee_onboarding_data")
            .update({ personal_info: personalInfo, submitted_at: nowIso })
            .eq("id", existingOnboarding.id);
        } else {
          await supabase.from("employee_onboarding_data").insert({
            employee_id: detailsToken.employee_id,
            tenant_id: detailsToken.tenant_id,
            personal_info: personalInfo,
            submitted_at: nowIso,
          } as any);
        }

        await supabase
          .from("employee_documents")
          .update({ details_submitted_at: nowIso })
          .eq("id", detailsToken.employee_document_id);

        await supabase.from("document_audit_log").insert({
          tenant_id: detailsToken.tenant_id,
          document_id: detailsToken.employee_document_id,
          employee_id: detailsToken.employee_id,
          action: "employee_details_submitted",
          metadata: { fields: Object.keys(details) },
        } as any);

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }


      const {
        typed_name,
        consent_given,
        signature_data,
        signature_type,
        consent_text,
        consent_items,
        confirmed_email,
        document_hash,
        signatory_title,
      } = body;

      // The signer must confirm a usable email address before signing.
      const confirmedEmail = String(confirmed_email || "").trim();
      if (confirmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(confirmedEmail)) {
        return new Response(JSON.stringify({
          error: "Please check your email address.",
          error_code: "invalid_email",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }


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

      failureStage = "validate_link";
      failureContext = {
        tenant_id: signingToken.tenant_id,
        employee_document_id: signingToken.employee_document_id,
        employee_id: signingToken.employee_id,
        signer_type: signingToken.signer_type,
      };

      // ROLE LOCKING: one signature per role, never overwritten.
      const { data: existingRoleSigs } = await supabase
        .from("contract_signatures")
        .select("signer_type, signed_at, signing_token_id")
        .eq("employee_document_id", signingToken.employee_document_id)
        .eq("signer_type", signingToken.signer_type);

      // Same signer, same link, signature already stored: this is a retry after a
      // dropped connection. Confirm success instead of alarming them — nothing is
      // changed and the original signature stands.
      const ownReplay = (existingRoleSigs || []).find((s: any) => s.signing_token_id === signingToken.id);
      if (ownReplay) {
        const { data: sigsNow } = await supabase
          .from("contract_signatures")
          .select("signer_type")
          .eq("employee_document_id", signingToken.employee_document_id);
        const typesNow = (sigsNow || []).map((s: any) => s.signer_type);
        return new Response(JSON.stringify({
          success: true,
          message: "Your signature is already recorded.",
          signed_at: ownReplay.signed_at,
          signer_type: signingToken.signer_type,
          signing_field: signingToken.signer_type === "employee" ? "team_member_block" : "employer_block",
          fully_signed: typesNow.includes("employee") && typesNow.includes("employer"),
          replay: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if ((existingRoleSigs && existingRoleSigs.length > 0) || signingToken.used_at) {
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

      // The address the signer saw and confirmed on the signing screen takes precedence
      // and is what the completed contract is sent to.
      if (confirmedEmail) signedByEmail = confirmedEmail;

      if (!originalFilePath || !signingToken.employee_documents) {
        return new Response(JSON.stringify({ error: "The contract document could not be found.", error_code: "missing_document" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      failureStage = "load_contract_document";
      const { data: originalPdfBlob, error: originalPdfError } = await withRetry(
        "download original contract",
        async () => {
          const result = await supabase.storage.from("employee-documents").download(originalFilePath);
          if (result.error) throw result.error;
          return result;
        },
      ).catch((err) => ({ data: null, error: err } as any));

      if (originalPdfError || !originalPdfBlob) {
        console.error("[SIGN-CONTRACT] Original contract could not be downloaded", originalPdfError);
        return new Response(JSON.stringify({ error: "The contract document could not be loaded. Please try again in a moment, or contact your employer.", error_code: "missing_document" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const originalPdfBytes = new Uint8Array(await originalPdfBlob.arrayBuffer());
      const serverDocumentHash = await sha256Bytes(originalPdfBytes);
      failureStage = "record_signature";

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
          consent_items: Array.isArray(consent_items) ? consent_items : null,
          email_verified_at: confirmedEmail ? signedAt : null,
          document_hash: serverDocumentHash,
          ip_address: ip,
          user_agent: userAgent,
          signed_at: signedAt,
          signatory_title: currentSignerType === "employer" ? (signatory_title || null) : null,
        });

      if (sigError) {
        // Log a reference only — database messages can reveal internal schema.
        console.error("Signature insert failed", { code: sigError.code ?? "unknown" });
        return new Response(JSON.stringify({
          error: "Your signature could not be recorded. Please try again.",
          error_code: "save_failed",
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

        // The signatures are already stored — they are the legal record. Assembling
        // the combined PDF file is a derived step, so a failure here must never
        // discard the signature or show the signer an error. It is recorded for the
        // admin and can be rebuilt.
        failureStage = "assemble_final_pdf";
        const finalPath = `contracts/final/${signingToken.tenant_id}/${signingToken.employee_document_id}/${sanitizeFileName(signingToken.employee_documents.document_name)}_completed_signed.pdf`;
        let finalPdfStored = false;
        let finalPdfError: string | null = null;

        try {
          const finalPackage = await withRetry("assemble final signed contract", () =>
            buildFinalSignedContractPdf({
              originalPdfBytes,
              documentName: signingToken.employee_documents.document_name,
              employeeName: `${signingToken.employees?.forename || ""} ${signingToken.employees?.surname || ""}`.trim(),
              companyName,
              documentId: signingToken.employee_document_id,
              originalDocumentHash: serverDocumentHash,
              signatures: signaturesForPdf,
            }), 2);

          await withRetry("store final signed contract", async () => {
            const result = await supabase.storage
              .from("employee-documents")
              .upload(finalPath, finalPackage.finalBytes, { contentType: "application/pdf", upsert: false });
            if (result.error) throw result.error;
            return result;
          });

          await supabase
            .from("employee_documents")
            .update({
              contract_send_status: "fully_signed",
              contract_state: "signed",
              final_signed_pdf_url: finalPath,
              final_document_hash: finalPackage.finalHash,
            } as any)
            .eq("id", signingToken.employee_document_id);

          finalPdfStored = true;
        } catch (finalErr) {
          finalPdfError = finalErr instanceof Error ? finalErr.message : String(finalErr);
          console.error("[SIGN-CONTRACT] Final signed contract file could not be produced:", finalErr);

          // Both signatures exist, so the contract is fully signed. Only the
          // combined file is missing; it is never replaced by the unsigned original.
          await supabase
            .from("employee_documents")
            .update({
              contract_send_status: "fully_signed",
              contract_state: "signed",
            } as any)
            .eq("id", signingToken.employee_document_id);

          await supabase.from("audit_log").insert({
            action: "create",
            table_name: "contract_signatures",
            record_id: signingToken.employee_document_id,
            tenant_id: signingToken.tenant_id,
            new_data: {
              event: "final_signed_contract_file_pending",
              reason: finalPdfError,
              employee_id: signingToken.employee_id,
              employee_document_id: signingToken.employee_document_id,
              note: "Both signatures are stored. The combined signed file needs rebuilding before it can be sent or downloaded.",
            },
          });

          await notifyAdminsInApp(supabase, signingToken.tenant_id, {
            event_type: "contract_signed",
            title: "Signed contract file needs rebuilding",
            body: `${`${signingToken.employees?.forename || ""} ${signingToken.employees?.surname || ""}`.trim()} signed successfully, but the combined signed file could not be produced. Open the contract and rebuild it before sending.`,
            link: "/contracts",
            metadata: {
              employee_document_id: signingToken.employee_document_id,
              employee_id: signingToken.employee_id,
              reason: finalPdfError,
            },
          });
        }
        failureStage = "post_signature_updates";

        // If this contract is an amendment, supersede the parent and stamp the amendment log.
        const { data: signedDoc } = await supabase
          .from("employee_documents")
          .select("parent_contract_id")
          .eq("id", signingToken.employee_document_id)
          .maybeSingle();
        const parentContractId = (signedDoc as any)?.parent_contract_id;
        if (parentContractId) {
          await supabase
            .from("employee_documents")
            .update({
              contract_state: "superseded",
              superseded_by: signingToken.employee_document_id,
              superseded_at: new Date().toISOString(),
            } as any)
            .eq("id", parentContractId);

          await supabase
            .from("contract_amendments")
            .update({
              employee_resigned_at: new Date().toISOString(),
              employer_resigned_at: new Date().toISOString(),
              activated_at: new Date().toISOString(),
            } as any)
            .eq("new_contract_id", signingToken.employee_document_id);
        }

        // Phase 2A: activate or schedule structured employment terms from this contract.
        // This does NOT change payroll/rota logic — it just records the snapshot.
        try {
          const { error: termsErr } = await supabase.rpc("activate_contract_terms", {
            _contract_id: signingToken.employee_document_id,
          });
          if (termsErr) {
            console.error("activate_contract_terms failed", termsErr);
            await supabase.from("audit_log").insert({
              action: "create",
              table_name: "employee_contract_terms",
              record_id: signingToken.employee_document_id,
              tenant_id: signingToken.tenant_id,
              new_data: {
                event: "employment_terms_activation_failed",
                contract_id: signingToken.employee_document_id,
                employee_id: signingToken.employee_id,
                error: termsErr.message,
              },
            });
          }
        } catch (e) {
          console.error("activate_contract_terms threw", e);
        }

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
        await notifyAdminsInApp(supabase, signingToken.tenant_id, {
          event_type: "contract_signed",
          title: `Contract fully signed — ${employeeName}`,
          body: `${employeeName}'s contract is now signed by both parties (${formattedDate}).`,
          link: "/contracts",
          metadata: {
            employee_id: signingToken.employee_id,
            employee_document_id: signingToken.employee_document_id,
            stage: "fully_signed",
          },
        });
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

        // Check email automation policy for completion emails
        const { data: completionPolicyRow } = await supabase
          .from("tenant_preferences")
          .select("preferences")
          .eq("tenant_id", signingToken.tenant_id)
          .eq("category", "email_automation")
          .maybeSingle();

        const completionPolicy = completionPolicyRow?.preferences as Record<string, string> | null;
        const completionSigningMode = completionPolicy?.contract_signing || "manual";

        // Send completion email to EMPLOYEE (only if not disabled)
        const recipientEmail = signingToken.employees?.email;
        if (recipientEmail && completionSigningMode === "auto") {
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

            await supabase.from("audit_log").insert({
              action: "create",
              table_name: "email_sent",
              record_id: signingToken.employee_document_id,
              tenant_id: signingToken.tenant_id,
              new_data: {
                event: "contract_completion_email_sent_to_employee",
                status: "sent",
                email_type: "contract_fully_signed",
                recipient_email: recipientEmail,
                employee_name: employeeName,
                trigger: "automatic",
                policy_mode: completionSigningMode,
              },
            });
          } catch (emailErr) {
            console.error("Contract fully-signed email to employee failed:", emailErr);
          }
        } else if (recipientEmail) {
          // Policy is "manual" or "disabled" — do NOT auto-send, log blocked/pending
          await supabase.from("audit_log").insert({
            action: "create",
            table_name: "email_blocked",
            record_id: signingToken.employee_document_id,
            tenant_id: signingToken.tenant_id,
            new_data: {
              event: "contract_completion_email_blocked",
              status: completionSigningMode === "disabled" ? "blocked" : "pending_manual",
              reason: completionSigningMode === "disabled"
                ? "Email automation policy: contract_signing is disabled"
                : "Email automation policy: contract_signing is set to manual — admin must send manually",
              email_type: "contract_fully_signed",
              recipient_email: recipientEmail,
              employee_name: employeeName,
              trigger: "automatic_blocked",
              policy_mode: completionSigningMode,
            },
          });
        }

        // Send completion email to MANAGER(S) — managers always receive (not employee-facing)
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
              table_name: "email_sent",
              record_id: signingToken.employee_document_id,
              tenant_id: signingToken.tenant_id,
              new_data: {
                event: "completed_contract_sent_to_managers",
                status: "sent",
                email_type: "contract_fully_signed_manager",
                recipient_source: managerSource,
                recipients: managerRecipients.map((recipient: any) => ({ email: recipient.email, role: recipient.role })),
                trigger: "automatic",
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
        // ── EMPLOYEE SIGNED ── Always raise an in-app alert for the admin
        await notifyAdminsInApp(supabase, signingToken.tenant_id, {
          event_type: "contract_signed",
          title: `${employeeName} signed their contract`,
          body: `Signed ${formattedDate}. Your countersignature is required to complete it.`,
          link: "/contracts",
          metadata: {
            employee_id: signingToken.employee_id,
            employee_document_id: signingToken.employee_document_id,
            stage: "awaiting_employer",
          },
        });

        // Check email automation policy before sending
        const { data: emailPolicyRow } = await supabase
          .from("tenant_preferences")
          .select("preferences")
          .eq("tenant_id", signingToken.tenant_id)
          .eq("category", "email_automation")
          .maybeSingle();

        const emailPolicy = emailPolicyRow?.preferences as Record<string, string> | null;
        const contractSigningMode = emailPolicy?.contract_signing || "manual";

        // Send acknowledgment to employee (only if contract_signing is not disabled)
        if (signedByEmail && contractSigningMode === "auto") {
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
        } else if (signedByEmail) {
          // Policy is "manual" or "disabled" — do NOT auto-send, log blocked/pending
          await supabase.from("audit_log").insert({
            action: "create",
            table_name: "email_blocked",
            record_id: signingToken.employee_document_id,
            tenant_id: signingToken.tenant_id,
            new_data: {
              event: "employee_signature_receipt_email_blocked",
              status: contractSigningMode === "disabled" ? "blocked" : "pending_manual",
              reason: contractSigningMode === "disabled"
                ? "Email automation policy: contract_signing is disabled"
                : "Email automation policy: contract_signing is set to manual — admin must send manually",
              email_type: "contract_signature_received",
              recipient_email: signedByEmail,
              employee_name: employeeName,
              trigger: "automatic_blocked",
              policy_mode: contractSigningMode,
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
    const reference = makeReference();
    const detail = err instanceof Error ? err.message : String(err);
    // Keep server logs free of raw internals; the full reason goes to the audit trail.
    console.error(`[SIGN-CONTRACT] Unhandled failure ${reference} at stage "${failureStage}"`);

    // Never fail silently: leave a traceable record so the cause is known next time.
    if (failureContext.tenant_id) {
      try {
        await supabase.from("audit_log").insert({
          action: "create",
          table_name: "contract_signatures",
          record_id: failureContext.employee_document_id ?? null,
          tenant_id: failureContext.tenant_id,
          new_data: {
            event: "contract_signing_failed",
            reference,
            stage: failureStage,
            reason: detail,
            employee_id: failureContext.employee_id ?? null,
            employee_document_id: failureContext.employee_document_id ?? null,
            signer_type: failureContext.signer_type ?? null,
          },
        });
      } catch (logErr) {
        console.error("[SIGN-CONTRACT] Failure audit insert failed:", logErr);
      }
    }

    return new Response(JSON.stringify({
      error: `We could not complete this step. Your contract and any signature already given are safe. Please try again — if it happens again, quote reference ${reference} to your manager.`,
      error_code: "internal_error",
      reference,
      stage: failureStage,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
