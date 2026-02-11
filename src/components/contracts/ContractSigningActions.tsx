import { useState } from "react";
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
import { Link2, CheckCircle2, Clock, Copy, Send, ShieldCheck, Loader2 } from "lucide-react";

interface ContractSigningActionsProps {
  documentId: string;
  employeeId: string;
  employeeName: string;
}

export function ContractSigningActions({
  documentId,
  employeeId,
  employeeName,
}: ContractSigningActionsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [signerType, setSignerType] = useState<"employee" | "employer">("employee");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const generateLink = useGenerateSigningLink();
  const { data: signatures } = useContractSignatures(documentId);
  const { data: tokens } = useSigningTokens(documentId);

  const employeeSigned = signatures?.some((s) => s.signer_type === "employee");
  const employerSigned = signatures?.some((s) => s.signer_type === "employer");
  const bothSigned = employeeSigned && employerSigned;

  const handleGenerate = async () => {
    try {
      const result = await generateLink.mutateAsync({
        employeeDocumentId: documentId,
        employeeId,
        signerType,
      });

      const link = `${window.location.origin}/sign/${result.token}`;
      setGeneratedLink(link);
    } catch {
      toast({ title: "Error", description: "Failed to generate signing link", variant: "destructive" });
    }
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast({ title: "Copied!", description: "Signing link copied to clipboard" });
  };

  return (
    <>
      {/* Inline status badges */}
      <div className="flex items-center gap-1">
        {bothSigned ? (
          <Badge className="bg-primary/10 text-primary border-0 text-[10px] gap-1">
            <CheckCircle2 className="h-3 w-3" /> Fully Signed
          </Badge>
        ) : (
          <>
            {employeeSigned && (
              <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/20">
                <CheckCircle2 className="h-3 w-3" /> Staff
              </Badge>
            )}
            {employerSigned && (
              <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/20">
                <CheckCircle2 className="h-3 w-3" /> Employer
              </Badge>
            )}
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => { setOpen(true); setGeneratedLink(null); }}
          title="Generate signing link"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Dialog for generating links */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Send for Signing
            </DialogTitle>
            <DialogDescription>
              Generate a secure link for {employeeName} or yourself to sign this contract.
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
                ) : (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="h-3 w-3" /> Pending
                  </Badge>
                )}
              </div>
            </div>

            {/* Generate new link */}
            {!generatedLink ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Generate link for</label>
                  <Select value={signerType} onValueChange={(v) => setSignerType(v as "employee" | "employer")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee ({employeeName})</SelectItem>
                      <SelectItem value="employer">Employer (You)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleGenerate} disabled={generateLink.isPending} className="w-full gradient-primary">
                  {generateLink.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Generate Signing Link
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">Link expires in 7 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-foreground mb-2">Signing Link Ready</p>
                  <div className="bg-card rounded border border-border p-2 text-xs text-muted-foreground break-all select-all">
                    {generatedLink}
                  </div>
                </div>
                <Button onClick={copyLink} className="w-full" variant="outline">
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Share this link via WhatsApp, email, or any messenger. The signer does not need an account.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
