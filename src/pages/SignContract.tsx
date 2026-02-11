import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, CheckCircle2, AlertTriangle, Loader2, Download, ShieldCheck } from "lucide-react";

interface ContractInfo {
  signer_type: string;
  employee_name: string;
  document_name: string;
  document_url: string | null;
  expires_at: string;
}

export default function SignContract() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchContractInfo();
  }, [token]);

  const fetchContractInfo = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("sign-contract", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });

      // The edge function uses query params, but supabase.functions.invoke doesn't support that easily
      // So we'll call it directly
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract?token=${token}`,
        { method: "GET" }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.already_signed) {
          setAlreadySigned(true);
        }
        setError(result.error || "Invalid link");
        return;
      }

      setContractInfo(result);
    } catch {
      setError("Unable to load contract. Please check the link and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signerName.trim() || !consentAgreed) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signer_name: signerName.trim(),
            consent_agreed: consentAgreed,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to sign");
        return;
      }

      setSigned(true);
    } catch {
      setError("Something went wrong. Please try again.");
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
          <h1 className="text-2xl font-bold text-foreground">Contract Signed</h1>
          <p className="text-muted-foreground">
            Your signature has been securely recorded with a timestamp and IP address.
            You may now close this page.
          </p>
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error or already signed
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
            {alreadySigned ? (
              <CheckCircle2 className="h-8 w-8 text-primary" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {alreadySigned ? "Already Signed" : "Invalid Link"}
          </h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!contractInfo) return null;

  const consentText = `I, ${signerName.trim() || "[your name]"}, confirm that I have read and agree to the terms of this employment contract. By typing my name and submitting this form, I understand this constitutes a legally binding electronic signature under the Electronic Communications Act 2000.`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">UD Restaurants Ltd</h1>
            <p className="text-xs text-muted-foreground">Employment Contract Signing</p>
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

        {/* Signing Form */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Sign Contract</h2>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Type your full legal name *
            </label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g. John Smith"
              className="text-base"
              autoComplete="name"
            />
          </div>

          {/* Consent Statement */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground leading-relaxed">
            {consentText}
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              checked={consentAgreed}
              onCheckedChange={(checked) => setConsentAgreed(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="consent" className="text-sm text-foreground cursor-pointer">
              I have read the contract and agree to the above statement
            </label>
          </div>

          <Button
            onClick={handleSign}
            disabled={!signerName.trim() || !consentAgreed || submitting}
            className="w-full gradient-primary h-12 text-base"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {submitting ? "Signing..." : "Sign Contract"}
          </Button>
        </div>

        {/* Legal footer */}
        <p className="text-[10px] text-muted-foreground text-center px-4">
          Your signature, timestamp, and IP address will be recorded as proof of signing.
          Valid under the UK Electronic Communications Act 2000.
        </p>
      </div>
    </div>
  );
}
