import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/letters/SignaturePad";
import { FileText, CheckCircle2, AlertTriangle, Loader2, Download, ShieldCheck, Clock, XCircle, Building2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  signature_details?: Array<{
    signer_type: string;
    signer_name: string;
    signed_at: string;
  }>;
}

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
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [fullySigned, setFullySigned] = useState(false);
  const [signingField, setSigningField] = useState<string | null>(null);

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
  }, [contractInfo, isEmployer]);

  const fetchContractInfo = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract?token=${token}`,
        { method: "GET" }
      );
      const result = await response.json();
      if (!response.ok) {
        setErrorCode(result.error_code || "invalid_token");
        setErrorMessage(result.error || "Invalid link");
        return;
      }
      setContractInfo(result);
    } catch {
      setErrorCode("internal_error");
      setErrorMessage("Unable to load contract. Please check the link and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setSignatureData(dataUrl);
  }, []);

  const CONSENT_ITEMS_EMPLOYEE = [
    "I have read and understood this contract",
    "I agree to sign this document electronically",
    "This electronic signature represents my legal signature",
  ];

  const CONSENT_ITEMS_EMPLOYER = [
    "I have reviewed this contract and confirm it is ready for execution",
    "I am authorised to sign this document on behalf of the employer",
    "I agree to sign this document electronically",
    "This electronic signature represents my legal signature",
  ];

  const consentItems = isEmployer ? CONSENT_ITEMS_EMPLOYER : CONSENT_ITEMS_EMPLOYEE;

  const handleSign = async () => {
    if (!typedName.trim() || !consentGiven || !signatureData) return;

    setSubmitting(true);
    setErrorCode(null);
    setErrorMessage(null);

    const consentText = `I confirm that: ${consentItems.join("; ")}.`;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typed_name: typedName.trim(),
            consent_given: true,
            consent_text: consentText,
            signature_data: signatureData,
            signature_type: "drawn",
            document_hash: contractInfo?.document_hash || null,
            signatory_title: isEmployer ? signatoryTitle.trim() || null : null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setErrorCode(result.error_code || "save_failed");
        setErrorMessage(result.error || "Failed to record signature");
        return;
      }

      setSigned(true);
      setSignedAt(result.signed_at || new Date().toISOString());
      setFullySigned(result.fully_signed === true);
      setSigningField(result.signing_field || null);
    } catch {
      setErrorCode("internal_error");
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
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

  const canSubmit = typedName.trim().length > 0 && consentGiven && !!signatureData && !submitting;
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

          {/* Consent Statement */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">I confirm that:</p>
            <ul className="space-y-1">
              {consentItems.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              checked={consentGiven}
              onCheckedChange={(checked) => setConsentGiven(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="consent" className="text-sm text-foreground cursor-pointer leading-snug">
              {isEmployer
                ? `I confirm this is my signature and I am signing this contract on behalf of ${companyName} under the UK Electronic Communications Act 2000`
                : "I confirm this is my signature and I agree to sign this contract electronically under the UK Electronic Communications Act 2000"}
            </label>
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
    default:
      return {
        icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
        bgClass: "bg-destructive/10",
        title: "Invalid Link",
        message: errorMessage || "This signing link is not valid. Please request a new one from your employer.",
      };
  }
}
