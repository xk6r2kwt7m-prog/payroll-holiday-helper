import { useState } from "react";
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
import { Link2, CheckCircle2, Clock, Copy, Send, ShieldCheck, Loader2, Mail, FileDown, Award, RefreshCw, FileSignature } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [signerType, setSignerType] = useState<"employee" | "employer">("employee");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedTokenId, setGeneratedTokenId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(contractSendStatus === "sent");
  const [downloadingCert, setDownloadingCert] = useState(false);

  const generateLink = useGenerateSigningLink();
  const { sendContractEmail } = useSendContractEmail();
  const { data: signatures } = useContractSignatures(documentId);
  const { data: tokens } = useSigningTokens(documentId);

  const employeeSigned = signatures?.some((s) => s.signer_type === "employee");
  const employerSigned = signatures?.some((s) => s.signer_type === "employer");
  const bothSigned = employeeSigned && employerSigned;

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
    const pathToUse = bothSigned ? finalSignedFilePath || filePath : filePath;
    if (pathToUse) {
      const { data } = await supabase.storage
        .from("employee-documents")
        .createSignedUrl(pathToUse, 3600);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        toast({ title: "Error", description: "Could not generate download link", variant: "destructive" });
      }
    }
  };

  const handleDownloadOriginalPdf = async () => {
    const pathToUse = filePath;
    if (pathToUse) {
      const { data } = await supabase.storage
        .from("employee-documents")
        .createSignedUrl(pathToUse, 3600);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        toast({ title: "Error", description: "Could not generate download link", variant: "destructive" });
      }
    }
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
                    <Button onClick={handleGenerate} disabled={generateLink.isPending} className="w-full" variant={employerTokenAutoSent ? "outline" : "default"}>
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
                      <Button onClick={handleSendEmail} disabled={sendingEmail} className="w-full gradient-primary">
                        {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        {sendingEmail ? "Sending..." : "Send contract"}
                      </Button>
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
    </>
  );
}
