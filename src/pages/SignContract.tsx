import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/letters/SignaturePad";
import { FileText, CheckCircle2, AlertTriangle, Loader2, Download, ShieldCheck, Clock, XCircle } from "lucide-react";

interface ContractInfo {
  signer_type: string;
  employee_name: string;
  employee_email: string | null;
  document_name: string;
  document_url: string | null;
  document_hash: string | null;
  expires_at: string;
  existing_signatures: string[];
}

type ErrorCode = "invalid_token" | "expired" | "already_signed" | "missing_document" | "save_failed" | "missing_name" | "missing_consent" | "missing_signature" | "internal_error" | "missing_token" | string;

const CONSENT_ITEMS = [
  "I have read and understood this contract",
  "I agree to sign this document electronically",
  "This electronic signature represents my legal signature",
];

export default function SignContract() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [fullySigned, setFullySigned] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchContractInfo();
  }, [token]);

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

  const handleSign = async () => {
    if (!typedName.trim() || !consentGiven || !signatureData) return;

    setSubmitting(true);
    setErrorCode(null);
    setErrorMessage(null);

    const consentText = `I confirm that: ${CONSENT_ITEMS.join("; ")}.`;

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
    } catch {
      setErrorCode("internal_error");
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (signed) {
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
              ? "Your contract has been fully signed by both you and the employer."
              : "Thank you. Your signature has been recorded successfully."}
          </p>
          {!fullySigned && (
            <p className="text-sm text-muted-foreground">
              Your contract is not yet finalised. It will be completed once the employer also signs it. You will receive a final copy once done.
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

  // Loading
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

  // Error states (before contract loads)
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Sign Your Contract</h1>
            <p className="text-xs text-muted-foreground">Please review and sign below</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Signing as</span>
              <span className="font-medium text-foreground capitalize">{contractInfo.signer_type}</span>
            </div>
          </div>

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

        {/* Signing Form */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Your Signature</h2>

          {/* Typed name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Type your full legal name *
            </label>
            <Input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="e.g. John Smith"
              className="text-base"
              autoComplete="name"
            />
          </div>

          {/* Signature pad */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Draw your signature *
            </label>
            <SignaturePad onSignatureChange={handleSignatureChange} />
          </div>

          {/* Consent Statement */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">I confirm that:</p>
            <ul className="space-y-1">
              {CONSENT_ITEMS.map((item, i) => (
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
              I confirm this is my signature and I agree to sign this contract electronically under the UK Electronic Communications Act 2000
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
            {submitting ? "Signing…" : "Sign Contract"}
          </Button>
        </div>

        {/* Legal footer */}
        <p className="text-[10px] text-muted-foreground text-center px-4">
          Your signature, typed name, timestamp, IP address, and device information will be recorded as proof of signing.
          This constitutes a legally binding electronic signature under the UK Electronic Communications Act 2000.
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
