import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { evaluateContractSend, normaliseSendMode, type ContractSendMode } from "@/lib/contract-send-rules";
import { getCanonicalOrigin } from "@/lib/getCanonicalUrl";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useGenerateSigningLink,
  useContractSignatures,
  useSigningTokens,
} from "@/hooks/useContractSigning";
import { useSendContractEmail } from "@/hooks/useSendContractEmail";
import { supabase } from "@/integrations/supabase/client";
import { pdf } from "@react-pdf/renderer";
import { SigningCertificatePDF } from "./SigningCertificatePDF";
import type { SignatureRecord } from "./SigningCertificatePDF";
import { Link2, CheckCircle2, Clock, Copy, Send, ShieldCheck, Loader2, Mail, FileDown, Award, RefreshCw, FileSignature, PenLine, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/hooks/useTenant";

interface ContractSigningActionsProps {
  documentId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string | null;
  contractSendStatus?: string | null;
  contractSentAt?: string | null;
  contractSentTo?: string | null;
  finalSignedFilePath?: string | null;
  filePath?: string | null;
  documentName?: string;
  companyName?: string;
}

export function ContractSigningActions({
  documentId,
  employeeId,
  employeeName,
  employeeEmail,
  contractSendStatus,
  contractSentAt,
  contractSentTo,
  finalSignedFilePath,
  filePath,
  documentName = "Employment Contract",
  companyName = "Ugly Dumpling",
}: ContractSigningActionsProps) {
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [signerType, setSignerType] = useState<"employee" | "employer">("employee");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedTokenId, setGeneratedTokenId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(contractSendStatus === "sent");
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [overrideName, setOverrideName] = useState("");
  const [overrideEmail, setOverrideEmail] = useState("");
  const [defaultName, setDefaultName] = useState("");
  const [defaultEmail, setDefaultEmail] = useState("");
  const [defaultTitle, setDefaultTitle] = useState("");
  const [signatoryLoaded, setSignatoryLoaded] = useState(false);
  const [sendMode, setSendMode] = useState<ContractSendMode>("manual");
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [scheduledSendAt, setScheduledSendAt] = useState<string | null>(null);
  const [scheduleInput, setScheduleInput] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [confirmSignOpen, setConfirmSignOpen] = useState(false);
  const [signingAsEmployer, setSigningAsEmployer] = useState(false);
  const [signedScanPath, setSignedScanPath] = useState<string | null>(null);
  const [signedScanAt, setSignedScanAt] = useState<string | null>(null);


  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const [{ data: settings }, { data: docRecord }] = await Promise.all([
        supabase
          .from("company_settings")
          .select(
            "default_signatory_name, default_signatory_email, default_signatory_title, contract_send_mode, default_signature_data"
          )
          .eq("tenant_id", tenantId)
          .maybeSingle(),
        supabase
          .from("employee_documents")
          .select(
            "employer_signatory_name, employer_signatory_email, contract_scheduled_send_at, signed_scan_file_path, signed_scan_uploaded_at"
          )
          .eq("id", documentId)
          .maybeSingle(),
      ]);
      const defName = (settings as any)?.default_signatory_name || "";
      const defEmail = (settings as any)?.default_signatory_email || "";
      setDefaultName(defName);
      setDefaultEmail(defEmail);
      setDefaultTitle((settings as any)?.default_signatory_title || "");
      setSendMode(normaliseSendMode((settings as any)?.contract_send_mode));
      setSavedSignature((settings as any)?.default_signature_data || null);
      setOverrideName((docRecord as any)?.employer_signatory_name || defName);
      setOverrideEmail((docRecord as any)?.employer_signatory_email || defEmail);
      const sched = (docRecord as any)?.contract_scheduled_send_at as string | null;
      setScheduledSendAt(sched || null);
      setScheduleInput(sched ? new Date(sched).toISOString().slice(0, 16) : "");
      setSignedScanPath((docRecord as any)?.signed_scan_file_path || null);
      setSignedScanAt((docRecord as any)?.signed_scan_uploaded_at || null);
      setSignatoryLoaded(true);
    })();
  }, [tenantId, documentId]);

  /** Open the scanned copy the signer uploaded (supporting evidence only). */
  const handleViewSignedScan = async () => {
    if (!signedScanPath) return;
    const { data, error } = await supabase.storage
      .from("employee-documents")
      .createSignedUrl(signedScanPath, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not open file", description: "Please try again.", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  /** Save (or clear) the per-contract "send on" date. */
  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    const value = scheduleInput ? new Date(scheduleInput).toISOString() : null;
    const { error } = await supabase
      .from("employee_documents")
      .update({ contract_scheduled_send_at: value } as any)
      .eq("id", documentId);
    setSavingSchedule(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setScheduledSendAt(value);
    toast({
      title: value ? "Send date saved" : "Send date cleared",
      description: value
        ? "This contract will be held until that date."
        : "This contract can be sent whenever you choose.",
    });
  };

  /** Apply the admin's saved signature to the employer block, after confirmation. */
  const handleSignWithSavedSignature = async () => {
    if (!savedSignature || !overrideName.trim()) return;
    setSigningAsEmployer(true);
    try {
      await supabase
        .from("employee_documents")
        .update({
          employer_signatory_name: overrideName.trim() || null,
          employer_signatory_email: overrideEmail.trim() || null,
          employer_signatory_source:
            overrideName.trim() !== defaultName || overrideEmail.trim() !== defaultEmail
              ? "override"
              : "default",
        } as any)
        .eq("id", documentId);

      const tokenResult = await generateLink.mutateAsync({
        employeeDocumentId: documentId,
        employeeId,
        signerType: "employer",
      });

      const consentText =
        "I confirm that: I have reviewed this contract and confirm it is ready for execution; I am authorised to sign this document on behalf of the employer; I agree to sign this document electronically; This electronic signature represents my legal signature.";

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-contract?token=${tokenResult.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typed_name: overrideName.trim(),
            consent_given: true,
            consent_text: consentText,
            signature_data: savedSignature,
            signature_type: "saved_drawn",
            signatory_title: defaultTitle || null,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not apply signature");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contract_signatures", documentId] }),
        queryClient.invalidateQueries({ queryKey: ["signing_tokens", documentId] }),
        queryClient.invalidateQueries({ queryKey: ["employee_documents"] }),
      ]);

      setConfirmSignOpen(false);
      toast({
        title: "Contract signed",
        description: "Your signature has been applied to the employer section.",
      });
    } catch (err: any) {
      toast({
        title: "Could not sign",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigningAsEmployer(false);
    }
  };


  const generateLink = useGenerateSigningLink();
  const { sendContractEmail } = useSendContractEmail();
  const { data: signatures } = useContractSignatures(documentId);
  const { data: tokens } = useSigningTokens(documentId);

  const employeeSigned = signatures?.some((s) => s.signer_type === "employee");
  const employerSigned = signatures?.some((s) => s.signer_type === "employer");
  const bothSigned = employeeSigned && employerSigned;

  const sendEval = evaluateContractSend({
    mode: sendMode,
    employerSigned: !!employerSigned,
    scheduledSendAt,
  });


  // Check if an employer token was auto-generated (exists but not yet used)
  const employerTokenAutoSent = tokens?.some(
    (t) => t.signer_type === "employer" && !t.used_at && new Date(t.expires_at) > new Date()
  );
  const employerTokenUsed = tokens?.some(
    (t) => t.signer_type === "employer" && t.used_at
  );

  const getSigningStage = () => {
    if (bothSigned) return "fully_signed";
    if (employeeSigned && !employerSigned) return "employee_signed";
    if (employerSigned && !employeeSigned) return "employer_signed";
    if (contractSendStatus === "sent" || emailSent) return "sent";
    return "draft";
  };
  const signingStage = getSigningStage();

  const handleGenerate = async () => {
    try {
      // Persist per-contract signatory before generating link
      const isOverride = overrideName.trim() !== defaultName || overrideEmail.trim() !== defaultEmail;
      await supabase
        .from("employee_documents")
        .update({
          employer_signatory_name: overrideName.trim() || null,
          employer_signatory_email: overrideEmail.trim() || null,
          employer_signatory_source: isOverride ? "override" : "default",
        } as any)
        .eq("id", documentId);

      const result = await generateLink.mutateAsync({
        employeeDocumentId: documentId,
        employeeId,
        signerType,
      });

      const link = `${getCanonicalOrigin()}/sign/${result.token}`;
      setGeneratedLink(link);
      setGeneratedTokenId(result.id);
      setEmailSent(false);
    } catch {
      toast({ title: "Error", description: "Failed to generate signing link", variant: "destructive" });
    }
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast({ title: "Copied!", description: "Signing link copied to clipboard" });
  };

  /** For fully-signed contracts, download the authoritative completed contract package.
   *  For pending contracts, view the original PDF. */
  const handleViewFinalContract = async () => {
    const variant = bothSigned ? "final" : "original";
    window.open(`/document/view?id=${documentId}&variant=${variant}`, "_blank");
  };

  const handleDownloadOriginalPdf = async () => {
    window.open(`/document/view?id=${documentId}&variant=original`, "_blank");
  };

  const handleDownloadSigningCertificate = async () => {
    if (!signatures || signatures.length === 0) return;
    setDownloadingCert(true);
    try {
      const { data: fullSigs, error } = await supabase
        .from("contract_signatures")
        .select("*")
        .eq("employee_document_id", documentId)
        .order("signed_at", { ascending: true });

      if (error || !fullSigs) throw error;

      const { data: docRecord } = await supabase
        .from("employee_documents")
        .select("final_document_hash")
        .eq("id", documentId)
        .maybeSingle();

      const sigRecords: SignatureRecord[] = fullSigs.map((s) => ({
        signer_type: s.signer_type,
        signer_name: s.signer_name,
        typed_name: s.typed_name,
        signed_at: s.signed_at,
        signed_by_email: s.signed_by_email,
        ip_address: s.ip_address,
        user_agent: s.user_agent,
        signature_data: s.signature_data,
        signature_type: s.signature_type,
        consent_text: s.consent_text,
        consent_given: s.consent_given,
        document_hash: s.document_hash,
      }));

      const blob = await pdf(
        <SigningCertificatePDF
          documentName={documentName}
          employeeName={employeeName}
          companyName={companyName}
          signatures={sigRecords}
          documentId={documentId}
          finalDocumentHash={docRecord?.final_document_hash}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Signed_Contract_${employeeName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Certificate download error:", err);
      toast({ title: "Error", description: "Could not generate signing certificate", variant: "destructive" });
    } finally {
      setDownloadingCert(false);
    }
  };

  const handleSendEmail = async () => {
    if (!generatedLink || !employeeEmail || !generatedTokenId) return;

    setSendingEmail(true);
    try {
      const result = await sendContractEmail({
        recipientEmail: employeeEmail,
        employeeName,
        signingUrl: generatedLink,
        signingTokenId: generatedTokenId,
        employeeId,
        employeeDocumentId: documentId,
      });

      if (result.success) {
        setEmailSent(true);
        toast({ title: "Contract sent", description: `Contract sent to ${employeeEmail}` });
      } else {
        toast({
          title: "Email failed",
          description: "Contract link was generated, but the email failed to send. You can still copy the link manually.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Email failed",
        description: "Contract link was generated, but the email failed to send. You can still copy the link manually.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      {/* Inline status badges */}
      <div className="flex items-center gap-1">
        {signingStage === "fully_signed" && (
          <>
            <Badge className="bg-primary/10 text-primary border-0 text-[10px] gap-1">
              <CheckCircle2 className="h-3 w-3" /> Fully Signed
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleViewFinalContract}
              disabled={downloadingCert}
              title="Download signed contract"
            >
              {downloadingCert ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            </Button>
          </>
        )}
        {signingStage === "employee_signed" && (
          <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-200">
            <Clock className="h-3 w-3" />
            {employerTokenAutoSent
              ? "Employer link sent — awaiting signature"
              : "Employee signed — awaiting employer"}
          </Badge>
        )}
        {signingStage === "employer_signed" && (
          <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-200">
            <Clock className="h-3 w-3" /> Employer signed — awaiting employee
          </Badge>
        )}
        {signingStage === "sent" && (
          <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-200">
            <Mail className="h-3 w-3" /> Sent
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            setOpen(true);
            setGeneratedLink(null);
            setGeneratedTokenId(null);
            // Pre-select the correct signer type based on current state
            if (employeeSigned && !employerSigned) {
              setSignerType("employer");
            } else {
              setSignerType("employee");
            }
          }}
          title="Contract signing options"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Dialog for generating links & sending */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Contract Signing
            </DialogTitle>
            <DialogDescription>
              Manage signing for {employeeName}'s contract.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Signature status */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Signature Status</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Employee</span>
                {employeeSigned ? (
                  <Badge className="bg-primary/10 text-primary border-0 text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Signed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="h-3 w-3" /> Pending
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Employer</span>
                {employerSigned ? (
                  <Badge className="bg-primary/10 text-primary border-0 text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Signed
                  </Badge>
                ) : employerTokenAutoSent ? (
                  <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-200">
                    <Mail className="h-3 w-3" /> Link sent
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="h-3 w-3" /> Pending
                  </Badge>
                )}
              </div>

              {/* Show signing details if signatures exist */}
              {signatures && signatures.length > 0 && (
                <div className="pt-2 mt-2 border-t border-border space-y-1">
                  {signatures.map((sig, i) => (
                    <div key={i} className="text-[10px] text-muted-foreground">
                      <span className="capitalize font-medium">{sig.signer_type}</span>: {sig.signer_name} —{" "}
                      {new Date(sig.signed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  ))}
                </div>
              )}

              {/* Auto-send info */}
              {employeeSigned && !employerSigned && employerTokenAutoSent && (
                <div className="pt-2 mt-1 border-t border-border">
                  <p className="text-[10px] text-primary">
                    ✓ Employer signing link was automatically sent to your managers after the employee signed.
                  </p>
                </div>
              )}

              {bothSigned && (
                <div className="pt-2 mt-1 border-t border-border space-y-1">
                  <p className="text-[10px] text-primary">
                    ✓ Final completed signed contract stored as the authoritative record.
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Original unsigned contract and signing certificate remain available separately.
                  </p>
                </div>
              )}
            </div>

            {/* Signed copy uploaded by the signer */}
            {signedScanPath && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">Signed copy uploaded</p>
                {signedScanAt && (
                  <p className="text-[10px] text-muted-foreground">
                    Uploaded {new Date(signedScanAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={handleViewSignedScan}>
                  <FileDown className="h-3.5 w-3.5" />
                  View uploaded signed copy
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Supporting evidence only — the electronic signature remains the record of signing.
                </p>
              </div>
            )}

            {/* Sign now with my saved signature */}
            {!employerSigned && signatoryLoaded && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">My Signature</p>
                {savedSignature ? (
                  <>
                    <div className="rounded-md border border-border bg-white p-2">
                      <img src={savedSignature} alt="Your saved signature" className="h-12 w-auto object-contain" />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setConfirmSignOpen(true)}
                      disabled={signingAsEmployer || !overrideName.trim()}
                    >
                      {signingAsEmployer ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                      Sign this contract now
                    </Button>
                    <p className="text-[10px] text-muted-foreground">
                      Applies your saved signature to the employer section, with a full audit record.
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    No saved signature yet. Add one in Settings → Contracts to sign contracts yourself in one click.
                  </p>
                )}
              </div>
            )}

            {/* Per-contract send date */}
            {!employeeSigned && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-foreground">Send this contract on</p>
                </div>
                <Input
                  type="datetime-local"
                  value={scheduleInput}
                  onChange={(e) => setScheduleInput(e.target.value)}
                  className="h-9"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleSaveSchedule} disabled={savingSchedule}>
                    {savingSchedule ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Save date
                  </Button>
                  {scheduledSendAt && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setScheduleInput("");
                        handleSaveSchedule();
                      }}
                      disabled={savingSchedule}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Leave empty to send whenever you choose. With a date set, sending stays locked until then.
                </p>
              </div>
            )}



            {/* Download signed contract (fully signed) */}
            {bothSigned && (
              <div className="space-y-2">
                <Button
                  onClick={handleViewFinalContract}
                  disabled={downloadingCert}
                  className="w-full gradient-primary"
                >
                  {downloadingCert ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Download Final Completed Contract
                </Button>
                {filePath && (
                  <Button
                    onClick={handleDownloadOriginalPdf}
                    variant="outline"
                    className="w-full"
                  >
                    <FileSignature className="h-4 w-4" />
                    View Original Unsigned Contract
                  </Button>
                )}
                <Button
                  onClick={handleDownloadSigningCertificate}
                  disabled={downloadingCert}
                  variant="outline"
                  className="w-full"
                >
                  {downloadingCert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                  Download Separate Signing Certificate
                </Button>
              </div>
            )}

            {/* Download signing certificate if partial signatures exist (not fully signed) */}
            {!bothSigned && signatures && signatures.length > 0 && (
              <Button
                onClick={handleDownloadSigningCertificate}
                disabled={downloadingCert}
                variant="outline"
                className="w-full"
              >
                {downloadingCert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                Download Signing Certificate
              </Button>
            )}

            {/* Generate new link - only show when not fully signed */}
            {!bothSigned && (
              <>
                {!generatedLink ? (
                  <div className="space-y-3">
                    {/* Per-contract signatory override */}
                    {signatoryLoaded && (
                      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                        <p className="text-xs font-semibold text-foreground">Employer Signatory for this Contract</p>
                        {!overrideName.trim() && !overrideEmail.trim() && (
                          <p className="text-[10px] text-destructive font-medium">
                            ⚠ Default employer signatory is not configured. Please add manager name and email in contract settings or enter them below.
                          </p>
                        )}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Manager Name</Label>
                            <Input
                              value={overrideName}
                              onChange={(e) => setOverrideName(e.target.value)}
                              placeholder="Full name"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Manager Email</Label>
                            <Input
                              type="email"
                              value={overrideEmail}
                              onChange={(e) => setOverrideEmail(e.target.value)}
                              placeholder="Email address"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        {(overrideName.trim() !== defaultName || overrideEmail.trim() !== defaultEmail) &&
                          defaultName && (
                            <p className="text-[10px] text-amber-600">
                              ⚡ Using a contract-specific override. Default: {defaultName} ({defaultEmail})
                            </p>
                          )}
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">
                        {employeeSigned && !employerSigned
                          ? "Resend employer signing link"
                          : "Generate signing link for"}
                      </label>
                      <Select
                        value={signerType}
                        onValueChange={(v) => setSignerType(v as "employee" | "employer")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee" disabled={!!employeeSigned}>
                            Employee ({employeeName}) {employeeSigned ? "— already signed" : ""}
                          </SelectItem>
                          <SelectItem value="employer">
                            Employer (You) {employerSigned ? "— already signed" : ""}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleGenerate} disabled={generateLink.isPending || !overrideName.trim() || !overrideEmail.trim()} className="w-full" variant={employerTokenAutoSent ? "outline" : "default"}>
                      {generateLink.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : employeeSigned && !employerSigned && employerTokenAutoSent ? (
                        <RefreshCw className="h-4 w-4" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      {employeeSigned && !employerSigned && employerTokenAutoSent
                        ? "Generate New Employer Link"
                        : "Generate Signing Link"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">Link expires in 7 days</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-medium text-foreground mb-2">
                        {emailSent ? "✓ Contract sent" : "Signing Link Ready"}
                      </p>
                      {emailSent && (contractSentTo || employeeEmail) && (
                        <p className="text-xs text-primary mb-2">
                          Sent to {contractSentTo || employeeEmail}
                          {contractSentAt && (
                            <span className="text-muted-foreground ml-1">
                              · {new Date(contractSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Primary: Send by email (employee only) */}
                    {signerType === "employee" && employeeEmail && !emailSent && (
                      <>
                        {!sendEval.canSend && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs text-amber-700">{sendEval.message}</p>
                          </div>
                        )}
                        <Button
                          onClick={handleSendEmail}
                          disabled={sendingEmail || !sendEval.canSend}
                          className="w-full gradient-primary"
                        >
                          {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          {sendingEmail ? "Sending..." : "Send contract"}
                        </Button>
                      </>
                    )}


                    {signerType === "employee" && !employeeEmail && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          No email on file — copy the link to send manually
                        </p>
                      </div>
                    )}

                    {/* Fallback: Copy link */}
                    <Button onClick={copyLink} className="w-full" variant="outline">
                      <Copy className="h-4 w-4" />
                      Copy link
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Share this link via WhatsApp, email, or any messenger. The signer does not need an account.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm applying my saved signature */}
      <Dialog open={confirmSignOpen} onOpenChange={setConfirmSignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-primary" />
              Sign this contract?
            </DialogTitle>
            <DialogDescription>
              Your saved signature will be applied to {employeeName}'s contract as the employer signature. This is recorded and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {savedSignature && (
            <div className="rounded-md border border-border bg-white p-2">
              <img src={savedSignature} alt="Your saved signature" className="h-14 w-auto object-contain" />
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Signing as <span className="font-medium text-foreground">{overrideName}</span>
            {defaultTitle ? `, ${defaultTitle}` : ""}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setConfirmSignOpen(false)} disabled={signingAsEmployer}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSignWithSavedSignature} disabled={signingAsEmployer}>
              {signingAsEmployer ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}
              Confirm and sign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
