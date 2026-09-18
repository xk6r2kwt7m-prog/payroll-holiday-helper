import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/letters/SignaturePad";
import { FileText, CheckCircle2, AlertTriangle, Loader2, Download, ShieldCheck, Clock, XCircle, Building2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PdfReader, fetchPdf } from "@/components/documents/PdfReader";

interface ContractInfo {
  signer_type: string;
  employee_name: string;
  employee_email: string | null;
  document_name: string;
  document_url: string | null;
  document_hash: string | null;
  expires_at: string;
  existing_signatures: string[];
  company_name: string | null;
  employer_signatory_name: string | null;
  employer_signatory_title: string | null;
  details_required?: boolean;
  /** Only the essential details that are genuinely not held yet. */
  missing_fields?: string[];
  /** Details already held, shown back for confirmation rather than re-asked. */
  on_file?: Record<string, string>;
  prefill?: Record<string, string>;
  signature_details?: Array<{
    signer_type: string;
    signer_name: string;
    signed_at: string;
  }>;
}

/**
 * PRIVACY RULE — contract link and contract emails:
 *  1. Never disclose stored personal data. Emails carry only a name and a
 *     secure link; this page never displays a held date of birth, National
 *     Insurance number, address, phone, bank detail or emergency contact.
 *  2. Never ask for anything outside the required contract set below.
 *     Anything else (emergency contacts, right-to-work documents, bank
 *     details) is collected through a staff details request chosen by an
 *     administrator, not through a contract link.
 */
const DETAIL_FIELDS = [
  { key: "full_name", label: "Full legal name", required: true, placeholder: "e.g. John Smith" },
  { key: "date_of_birth", label: "Date of birth", required: true, type: "date" },
  { key: "address", label: "Home address", required: true, placeholder: "House, street, town, postcode" },
  { key: "phone", label: "Mobile number", required: true, placeholder: "e.g. 07700 900123" },
] as const;

/** Held values that must never be rendered back to the signer. */
const NON_DISCLOSABLE_KEYS = [
  "date_of_birth",
  "national_insurance",
  "ni_number",
  "address",
  "phone",
  "bank",
  "sort_code",
  "account_number",
  "emergency_contact_name",
  "emergency_contact_phone",
] as const;


type ErrorCode = "invalid_token" | "expired" | "already_signed" | "missing_document" | "save_failed" | "missing_name" | "missing_consent" | "missing_signature" | "internal_error" | "missing_token" | string;

export default function SignContract() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptConfirmed, setAcceptConfirmed] = useState(false);
  const [eSignConfirmed, setESignConfirmed] = useState(false);
  const [signerEmail, setSignerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [fullySigned, setFullySigned] = useState(false);
  const [signingField, setSigningField] = useState<string | null>(null);
  const [uploadingScan, setUploadingScan] = useState(false);
  const [scanUploaded, setScanUploaded] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [readConfirmed, setReadConfirmed] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [needsHelp, setNeedsHelp] = useState(false);
  // Email ownership verification. Typing an address is never treated as proof of
  // ownership: a changed address must be verified with a one-time code first.
  const [emailOnFile, setEmailOnFile] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  const detailsRequired = contractInfo?.details_required === true;

  // Reads the original contract for the on-screen reader (never the signed copy).
  const loadContractPdf = useCallback(async () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return await fetchPdf(
      `https://${projectId}.supabase.co/functions/v1/serve-document?token=${token}&variant=original`,
    );
  }, [token]);

  useEffect(() => {
    if (contractInfo?.prefill) {
      setDetails((prev) => ({ ...contractInfo.prefill, ...prev }));
    }
  }, [contractInfo]);

  const submitDetails = async () => {
    setDetailsError(null);
    const missing = DETAIL_FIELDS.filter((f) => f.required && !String(details[f.key] || "").trim());
    if (missing.length) {
      setDetailsError(`Please complete: ${missing.map((f) => f.label).join(", ")}.`);
      return;
    }
    setSavingDetails(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit_details", details }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        setDetailsError(result.error || "Could not save your details. Please try again.");
        return;
      }
      setLoading(true);
      await fetchContractInfo();
    } catch {
      setDetailsError("Could not save your details. Please try again.");
    } finally {
      setSavingDetails(false);
    }
  };



  const isEmployer = contractInfo?.signer_type === "employer";
  const isEmployee = contractInfo?.signer_type === "employee";

  useEffect(() => {
    if (!token) return;
    fetchContractInfo();
  }, [token]);

  // Prefill employer details when contract info loads
  useEffect(() => {
    if (contractInfo && isEmployer) {
      if (contractInfo.employer_signatory_name) {
        setTypedName(contractInfo.employer_signatory_name);
      }
      if (contractInfo.employer_signatory_title) {
        setSignatoryTitle(contractInfo.employer_signatory_title);
      }
    }
    // The address on file is offered, but the signer must see and confirm it.
    if (contractInfo) {
      const onFile = isEmployer
        ? (contractInfo as any).employer_signatory_email || ""
        : contractInfo.employee_email || "";
      setEmailOnFile(onFile || "");
      setSignerEmail((prev) => (prev ? prev : onFile || ""));
    }
  }, [contractInfo, isEmployer]);

  const fetchContractInfo = async () => {
    const load = async () =>
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract?token=${token}`, { method: "GET" });

    try {
      let response: Response;
      try {
        response = await load();
      } catch {
        await new Promise((r) => setTimeout(r, 1200));
        response = await load();
      }

      const raw = await response.text();
      let result: any = {};
      try {
        result = raw ? JSON.parse(raw) : {};
      } catch {
        result = {};
      }

      if (!response.ok) {
        setErrorCode(result.error_code || (response.status >= 500 ? "internal_error" : "invalid_token"));
        setErrorMessage(result.error || "We could not open your contract just now. Please reload the page and try again.");
        return;
      }
      setContractInfo(result);
    } catch {
      setErrorCode("network_error");
      setErrorMessage("We could not reach the server. Check your connection and reload this page.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setSignatureData(dataUrl);
  }, []);

  // Two separate confirmations. The acceptance wording never mentions schedules or
  // incorporated documents unless this contract actually has them.
  const hasSchedules = Boolean((contractInfo as any)?.has_schedules);
  const acceptanceWording = isEmployer
    ? hasSchedules
      ? "I confirm that I have reviewed the complete employment contract, including its schedules and any documents expressly incorporated into it, and that I am authorised to sign it on behalf of the employer."
      : "I confirm that I have reviewed the complete employment contract and that I am authorised to sign it on behalf of the employer."
    : hasSchedules
      ? "I confirm that I have read and accept the complete employment contract, including its schedules and any documents expressly incorporated into it."
      : "I confirm that I have read and accept the complete employment contract.";
  const ESIGN_WORDING = "I consent to signing this document electronically.";

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(signerEmail.trim());
  const consentGiven = acceptConfirmed && eSignConfirmed;
  const consentItems = [acceptanceWording, ESIGN_WORDING];

  // A CHANGED address is only usable once a one-time code sent to it has been entered.
  const emailChanged =
    signerEmail.trim().toLowerCase() !== (emailOnFile || "").trim().toLowerCase();
  const emailVerified =
    !emailChanged || (verifiedEmail || "").toLowerCase() === signerEmail.trim().toLowerCase();

  const postAction = async (payload: Record<string, unknown>) =>
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  const requestEmailCode = async () => {
    setCodeSending(true);
    setCodeError(null);
    try {
      const response = await postAction({
        action: "request_email_verification",
        email: signerEmail.trim(),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCodeError(result.error || "We could not send the code. Please try again.");
        return;
      }
      setCodeRequested(true);
    } catch {
      setCodeError("We could not reach the server. Please check your connection and try again.");
    } finally {
      setCodeSending(false);
    }
  };

  const confirmEmailCode = async () => {
    setCodeChecking(true);
    setCodeError(null);
    try {
      const response = await postAction({
        action: "confirm_email_verification",
        email: signerEmail.trim(),
        code: codeInput.trim(),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCodeError(result.error || "That code could not be checked. Please try again.");
        return;
      }
      setVerifiedEmail(signerEmail.trim());
      setCodeRequested(false);
      setCodeInput("");
    } catch {
      setCodeError("We could not reach the server. Please check your connection and try again.");
    } finally {
      setCodeChecking(false);
    }
  };


  const handleSign = async () => {
    if (!typedName.trim() || !consentGiven || !signatureData || !emailLooksValid || !emailVerified) return;

    setSubmitting(true);
    setErrorCode(null);
    setErrorMessage(null);

    const consentText = consentItems.join(" ");

    // A dropped connection is retried once automatically — resending the same
    // signature is safe, because a signature already stored is never replaced.
    const post = async () =>
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typed_name: typedName.trim(),
          consent_given: true,
          consent_text: consentText,
          consent_items: [
            { key: "accept_terms", text: acceptanceWording, confirmed: true },
            { key: "electronic_signature", text: ESIGN_WORDING, confirmed: true },
          ],
          confirmed_email: signerEmail.trim(),
          signature_data: signatureData,
          signature_type: "drawn",
          document_hash: contractInfo?.document_hash || null,
          signatory_title: isEmployer ? signatoryTitle.trim() || null : null,
        }),
      });

    try {
      let response: Response;
      try {
        response = await post();
      } catch {
        await new Promise((r) => setTimeout(r, 1200));
        response = await post();
      }

      const raw = await response.text();
      let result: any = {};
      try {
        result = raw ? JSON.parse(raw) : {};
      } catch {
        result = {};
      }

      if (!response.ok) {
        setErrorCode(result.error_code || "save_failed");
        setErrorMessage(
          result.error ||
            "Your signature could not be saved just now. Your details are still here — please tap Sign again in a moment.",
        );
        return;
      }

      setSigned(true);
      setSignedAt(result.signed_at || new Date().toISOString());
      setFullySigned(result.fully_signed === true);
      setSigningField(result.signing_field || null);
    } catch {
      setErrorCode("network_error");
      setErrorMessage(
        "We could not reach the server. Check your connection and tap Sign again — nothing has been lost and your signature is still on screen.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);

    if (file.size > 15 * 1024 * 1024) {
      setScanError("That file is larger than 15MB. Please upload a smaller file.");
      return;
    }

    setUploadingScan(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read_failed"));
        reader.readAsDataURL(file);
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upload_scan",
            file_data: dataUrl,
            file_name: file.name,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        setScanError(result.error || "Upload failed. Please try again.");
        return;
      }
      setScanUploaded(true);
    } catch {
      setScanError("Upload failed. Please try again.");
    } finally {
      setUploadingScan(false);
    }
  };



  // ══════════ Success state ══════════
  if (signed) {
    const fieldLabel = signingField === "employer_block" ? "Employer" : "Team Member";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4 animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {fullySigned ? "Contract Complete" : "Signature Recorded"}
          </h1>
          <p className="text-muted-foreground">
            {fullySigned
              ? "Your contract has been fully signed by both you and the employer. A completed copy will be sent to you."
              : `Your signature has been applied to the ${fieldLabel} section of the contract.`}
          </p>
          {!fullySigned && (
            <p className="text-sm text-muted-foreground">
              Your contract is not yet finalised. It will be completed once the {isEmployer ? "team member" : "employer"} also signs it. You will receive a final copy once done.
            </p>
          )}
          {signedAt && (
            <p className="text-sm text-muted-foreground">
              Signed on {new Date(signedAt).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {/* Optional extra: upload a scan/photo of the signed contract */}
          <div className="rounded-lg border border-border p-4 space-y-2 text-left">
            <p className="text-sm font-semibold text-foreground">
              Optional: upload a signed copy
            </p>
            <p className="text-xs text-muted-foreground">
              Your electronic signature above is already complete. If you also have a printed copy you signed by hand, you can add a photo or PDF of it here.
            </p>
            {scanUploaded ? (
              <p className="text-xs text-primary">✓ Copy received. Thank you.</p>
            ) : (
              <>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleScanUpload}
                  disabled={uploadingScan}
                  className="block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:text-primary"
                />
                {uploadingScan && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                  </p>
                )}
                {scanError && <p className="text-xs text-destructive">{scanError}</p>}
                <p className="text-[10px] text-muted-foreground">
                  PDF or photo, up to 15MB. This is optional.
                </p>
              </>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 inline mr-1" />
            This electronic signature is legally binding under the UK Electronic Communications Act 2000.
          </div>

        </div>
      </div>
    );
  }

  // ══════════ Loading ══════════
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your contract…</p>
        </div>
      </div>
    );
  }

  // ══════════ Error states ══════════
  if (!contractInfo && errorCode) {
    const errorConfig = getErrorDisplay(errorCode, errorMessage);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full mx-auto ${errorConfig.bgClass}`}>
            {errorConfig.icon}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{errorConfig.title}</h1>
          <p className="text-muted-foreground">{errorConfig.message}</p>
        </div>
      </div>
    );
  }

  if (!contractInfo) return null;

  // Only ask for what is genuinely missing, and never more than the required
  // contract set. Held details are acknowledged but never displayed back.
  const onFileKeys = new Set(Object.keys(contractInfo.on_file ?? {}));
  const missingSet = new Set(contractInfo.missing_fields ?? []);
  const fieldsToAsk = DETAIL_FIELDS.filter((f) =>
    contractInfo.missing_fields ? missingSet.has(f.key) : true,
  );
  const alreadyOnFile = DETAIL_FIELDS.filter(
    (f) =>
      onFileKeys.has(f.key) &&
      !fieldsToAsk.some((a) => a.key === f.key) &&
      !NON_DISCLOSABLE_KEYS.includes(f.key as (typeof NON_DISCLOSABLE_KEYS)[number]),
  );


  // ══════════ Details first: contract stays hidden until submitted ══════════
  if (detailsRequired) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {fieldsToAsk.length ? "A few missing details" : "Check your details"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Step 1 of 2 — your contract appears once these are saved
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Hello {contractInfo.employee_name}.{" "}
              {fieldsToAsk.length
                ? "We already hold most of your details. Please add only the few below."
                : "We already hold everything we need — nothing further to add."}{" "}
              We only ask for details we don't already hold, we never show your
              stored details back on this page, and we never send your personal
              details by email.
            </p>

            {alreadyOnFile.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-medium text-foreground">Already on file</p>
                {alreadyOnFile.map((f) => (
                  <div key={f.key} className="flex justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="text-foreground text-right">{details[f.key]}</span>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground pt-1">
                  Anything else we hold is kept securely and not shown here. If
                  something is wrong, tell your manager — they will update it.
                </p>
              </div>
            )}


            {fieldsToAsk.map((field) => (
              <div key={field.key}>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  {field.label} {field.required && "*"}
                </label>
                <Input
                  type={"type" in field ? field.type : "text"}
                  value={details[field.key] || ""}
                  onChange={(e) => setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={"placeholder" in field ? field.placeholder : undefined}
                  className="text-base"
                />
              </div>
            ))}

            {detailsError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{detailsError}</p>
              </div>
            )}

            <Button
              onClick={submitDetails}
              disabled={savingDetails}
              className="w-full gradient-primary h-12 text-base"
            >
              {savingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {savingDetails ? "Saving…" : "Save and show my contract"}
            </Button>
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 inline mr-1" />
            Your details are stored securely and only visible to your employer.
          </div>
        </div>
      </div>
    );
  }


  // ══════════ Read-the-contract step (team member only) ══════════
  if (isEmployee && !reviewConfirmed) {
    const expiryLabel = contractInfo.expires_at
      ? new Date(contractInfo.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : null;

    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Read your contract</h1>
              <p className="text-xs text-muted-foreground">
                Take your time — you only sign when you are ready
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-foreground">{contractInfo.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Document</span>
                <span className="font-medium text-foreground truncate max-w-[200px]">{contractInfo.document_name}</span>
              </div>
              {contractInfo.company_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employer</span>
                  <span className="font-medium text-foreground">{contractInfo.company_name}</span>
                </div>
              )}
            </div>
          </div>

          {contractInfo.document_url ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <PdfReader load={loadContractPdf} fileName={contractInfo.document_name || "contract.pdf"} />
            </div>
          ) : (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                The contract file is not available yet. Please contact your manager before signing.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="read-confirm"
                checked={readConfirmed}
                onCheckedChange={(checked) => setReadConfirmed(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="read-confirm" className="text-sm text-foreground cursor-pointer leading-snug">
                I have read the whole contract and I understand it
              </label>
            </div>

            <Button
              onClick={() => setReviewConfirmed(true)}
              disabled={!readConfirmed || !contractInfo.document_url}
              className="w-full gradient-primary h-12 text-base"
            >
              <ShieldCheck className="h-4 w-4" />
              I have read it — continue to sign
            </Button>

            <Button
              variant="outline"
              onClick={() => setNeedsHelp((v) => !v)}
              className="w-full h-11"
            >
              <Clock className="h-4 w-4" />
              I am not ready to sign yet
            </Button>

            {needsHelp && (
              <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">That is completely fine.</p>
                <p>
                  Nothing has been signed. You can close this page and come back to the same link at any time to keep
                  reading{expiryLabel ? `, up to ${expiryLabel}` : ""}.
                </p>
                <p>
                  If anything is unclear, speak to your manager{contractInfo.company_name ? ` at ${contractInfo.company_name}` : ""} first.
                  They can talk you through the contract, or send you an updated version if something needs changing.
                </p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center px-4">
            You are never signed up to anything until you complete the signature step yourself.
          </p>
        </div>
      </div>
    );
  }

  const canSubmit =
    typedName.trim().length > 0 &&
    consentGiven &&
    !!signatureData &&
    emailLooksValid &&
    emailVerified &&
    !submitting;
  const companyName = contractInfo.company_name || "the employer";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {isEmployer ? "Countersign Contract" : "Sign Your Contract"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEmployer
                ? "Please review and sign the Employer section below"
                : "Please review and sign the Team Member section below"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Role indicator badge */}
        <div className="flex items-center justify-center">
          <Badge
            variant="outline"
            className={`gap-1.5 text-xs px-3 py-1.5 ${
              isEmployer
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-blue-300 bg-blue-50 text-blue-700"
            }`}
          >
            {isEmployer ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            You are signing as: {isEmployer ? "Employer" : "Team Member"}
          </Badge>
        </div>

        {/* Contract Info */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Contract Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employee</span>
              <span className="font-medium text-foreground">{contractInfo.employee_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Document</span>
              <span className="font-medium text-foreground truncate max-w-[200px]">{contractInfo.document_name}</span>
            </div>
            {companyName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employer</span>
                <span className="font-medium text-foreground">{companyName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Signing as</span>
              <span className="font-medium text-foreground">{isEmployer ? "Employer" : "Team Member"}</span>
            </div>
          </div>

          {/* Show existing signatures if the other party signed */}
          {contractInfo.signature_details && contractInfo.signature_details.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Already signed:</p>
              {contractInfo.signature_details.map((sig, i) => (
                <div key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium">{sig.signer_type === "employee" ? "Team Member" : "Employer"}</span>: {sig.signer_name} —{" "}
                  {new Date(sig.signed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              ))}
            </div>
          )}

          {contractInfo.document_url && (
            <a
              href={contractInfo.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline mt-2"
            >
              <Download className="h-4 w-4" />
              View / Download Contract PDF
            </a>
          )}
        </div>

        {/* Inline error after failed submit */}
        {errorCode && errorMessage && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {isEmployee && (
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={() => {
              setReviewConfirmed(false);
              setNeedsHelp(false);
            }}
          >
            <FileText className="h-4 w-4" />
            Back to reading the contract
          </Button>
        )}

        {/* ══════════ SIGNING FORM ══════════ */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {isEmployer ? "Employer Signature" : "Team Member Signature"}
          </h2>

          {/* Employer: "Signed for and on behalf of" indicator */}
          {isEmployer && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs text-primary font-medium">
                Signed for and on behalf of {companyName}
              </p>
            </div>
          )}

          {/* Typed name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              {isEmployer ? "Your full legal name (employer signatory) *" : "Your full legal name *"}
            </label>
            <Input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={isEmployer ? "e.g. Aderito Barros" : "e.g. John Smith"}
              className="text-base"
              autoComplete="name"
            />
          </div>

          {/* Employer: Job title */}
          {isEmployer && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Job title / position *
              </label>
              <Input
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="e.g. Director, General Manager"
                className="text-base"
              />
            </div>
          )}

          {/* Signature pad */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              {isEmployer ? "Draw your signature (Employer section) *" : "Draw your signature (Team Member section) *"}
            </label>
            <SignaturePad onSignatureChange={handleSignatureChange} />
          </div>

          {/* Email address used for this signature — confirmed by the signer */}
          <div>
            <label htmlFor="signer-email" className="text-xs text-muted-foreground mb-1.5 block">
              Your email address *
            </label>
            <Input
              id="signer-email"
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="you@example.com"
              className="text-base"
              autoComplete="email"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Please check this is correct. Your completed contract is sent here and the address is recorded with your
              signature.
            </p>
            {signerEmail.trim().length > 0 && !emailLooksValid && (
              <p className="text-[11px] text-destructive mt-1">That does not look like a full email address.</p>
            )}

            {/* A changed address must be proven by a one-time code before signing. */}
            {emailLooksValid && emailChanged && !emailVerified && (
              <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
                <p className="text-xs text-foreground">
                  This is different from the address held for this contract. To use it, we need to check it belongs to
                  you: we will email a 6-digit code to <span className="font-medium">{signerEmail.trim()}</span>.
                </p>
                {!codeRequested ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={requestEmailCode}
                    disabled={codeSending}
                    className="w-full"
                  >
                    {codeSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send me a code"}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit code"
                      inputMode="numeric"
                      className="text-base tracking-widest"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={confirmEmailCode}
                        disabled={codeInput.length !== 6 || codeChecking}
                        className="flex-1"
                      >
                        {codeChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check code"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={requestEmailCode} disabled={codeSending}>
                        Resend
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">The code lasts 15 minutes.</p>
                  </div>
                )}
                {codeError && <p className="text-[11px] text-destructive">{codeError}</p>}
              </div>
            )}

            {emailChanged && emailVerified && (
              <p className="text-[11px] text-success mt-2">
                This address has been verified. Your completed contract will be sent here.
              </p>
            )}
          </div>

          {/* Two separate confirmations: acceptance of the terms, and consent to sign electronically */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-accept"
                checked={acceptConfirmed}
                onCheckedChange={(checked) => setAcceptConfirmed(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="consent-accept" className="text-sm text-foreground cursor-pointer leading-snug">
                {acceptanceWording}
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="consent-esign"
                checked={eSignConfirmed}
                onCheckedChange={(checked) => setESignConfirmed(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="consent-esign" className="text-sm text-foreground cursor-pointer leading-snug">
                {ESIGN_WORDING}
              </label>
            </div>
          </div>

          <Button
            onClick={handleSign}
            disabled={!canSubmit}
            className="w-full gradient-primary h-12 text-base"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {submitting
              ? "Signing…"
              : isEmployer
                ? "Sign as Employer"
                : "Sign as Team Member"}
          </Button>
        </div>

        {/* Legal footer */}
        <p className="text-[10px] text-muted-foreground text-center px-4">
          Your signature, typed name, {isEmployer ? "job title, " : ""}timestamp, IP address, and device information will be recorded as proof of signing.
          This constitutes a legally binding electronic signature under the UK Electronic Communications Act 2000.
          {isEmployer && ` You are signing the Employer section of this contract on behalf of ${companyName}.`}
          {isEmployee && " You are signing the Team Member section of this contract."}
        </p>
      </div>
    </div>
  );
}

function getErrorDisplay(errorCode: ErrorCode, errorMessage: string | null) {
  switch (errorCode) {
    case "already_signed":
      return {
        icon: <CheckCircle2 className="h-8 w-8 text-primary" />,
        bgClass: "bg-primary/10",
        title: "Already Signed",
        message: errorMessage || "This contract has already been signed.",
      };
    case "expired":
      return {
        icon: <Clock className="h-8 w-8 text-warning" />,
        bgClass: "bg-warning/10",
        title: "Link Expired",
        message: errorMessage || "This signing link has expired. Please ask your employer to send a new one.",
      };
    case "missing_document":
      return {
        icon: <XCircle className="h-8 w-8 text-destructive" />,
        bgClass: "bg-destructive/10",
        title: "Contract Not Found",
        message: errorMessage || "The contract document could not be found. Please contact your employer.",
      };
    case "save_failed":
      return {
        icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
        bgClass: "bg-destructive/10",
        title: "Signature Failed",
        message: errorMessage || "Your signature could not be recorded. Please try again.",
      };
    case "network_error":
      return {
        icon: <AlertTriangle className="h-8 w-8 text-warning" />,
        bgClass: "bg-warning/10",
        title: "Connection Problem",
        message: errorMessage || "We could not reach the server. Check your connection and try again — nothing has been lost.",
      };
    case "internal_error":
      return {
        icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
        bgClass: "bg-destructive/10",
        title: "Something Interrupted This",
        message: errorMessage || "Please reload the page and try again. Your contract and any signature already given are safe.",
      };
    default:
      return {
        icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
        bgClass: "bg-destructive/10",
        title: "Invalid Link",
        message: errorMessage || "This signing link is not valid. Please request a new one from your employer.",
      };
  }
}
