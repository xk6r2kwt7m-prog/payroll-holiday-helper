import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { uploadComplianceFile } from "@/hooks/useCompliance";
import { useTenant } from "@/hooks/useTenant";
import { useEmailLicensingDocument } from "@/hooks/useDpsRegister";
import { clampLinkExpiryDays, LINK_EXPIRY_DAYS_DEFAULT, type RegisterRow } from "@/lib/dps-register";
import { LicensingDocumentPDF } from "@/components/compliance/LicensingDocumentPDF";
import type { LicensingDocument } from "@/lib/licensing-documents";
import { registerPdfRows, registerSummary } from "@/lib/dps-register";

/**
 * Sends the authorisation to sell alcohol, with the site register, to anyone
 * who asks for it — a licensing officer, the licence holder, or head office.
 * The PDF sent is exactly the copy shown on screen.
 */
export function EmailLicensingDocumentDialog({
  open, onOpenChange, branch, licenceId, doc, rows, summaryLine, warningLine,
  authoriserSignature, authoriserSignedAt, auditLine,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branch: string;
  licenceId?: string | null;
  doc: LicensingDocument;
  rows: RegisterRow[];
  summaryLine: string;
  warningLine?: string | null;
  authoriserSignature?: string | null;
  authoriserSignedAt?: string | null;
  auditLine?: string | null;
}) {
  const { tenantId } = useTenant();
  const send = useEmailLicensingDocument();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);
  const [expiryDays, setExpiryDays] = useState(String(LINK_EXPIRY_DAYS_DEFAULT));
  const [busy, setBusy] = useState(false);

  const summary = registerSummary(rows);

  const submit = async () => {
    if (!email.trim()) { toast.error("Enter the email address"); return; }
    if (!attachPdf && !includeLink) {
      toast.error("Attach the PDF, include a link, or both");
      return;
    }
    setBusy(true);
    try {
      const blob = await pdf(
        <LicensingDocumentPDF
          doc={doc}
          staff={registerPdfRows(rows)}
          summaryLine={summaryLine}
          warningLine={warningLine}
          authoriserSignature={authoriserSignature}
          authoriserSignedAt={authoriserSignedAt}
          auditLine={auditLine}
        />
      ).toBlob();
      const file = new File([blob], `${branch}-alcohol-authorisation.pdf`, { type: "application/pdf" });
      const filePath = await uploadComplianceFile(file, tenantId!, "licensing-issues");

      await send.mutateAsync({
        branch,
        licence_id: licenceId ?? null,
        subject_type: "dps_authorisation",
        recipient_name: name.trim(),
        recipient_email: email.trim(),
        message: message.trim() || undefined,
        attach_pdf: attachPdf,
        include_link: includeLink,
        link_expiry_days: clampLinkExpiryDays(expiryDays),
        file_path: filePath,
        snapshot: { document: doc, rows, summary_line: summaryLine },
        authorised_count: summary.authorised,
        listed_count: summary.listed,
      });
      toast.success(`Copy sent to ${email.trim()}`);
      onOpenChange(false);
      setName(""); setEmail(""); setMessage("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email a copy
          </DialogTitle>
          <DialogDescription>
            {branch} — {summary.authorised} of {summary.listed} people listed are currently authorised.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="licdoc-name">Their name (optional)</Label>
            <Input id="licdoc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="licdoc-email">Email address</Label>
            <Input
              id="licdoc-email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="licensing@council.gov.uk"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="licdoc-message">Message (optional)</Label>
            <Textarea
              id="licdoc-message" rows={3} value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="licdoc-attach" className="text-sm font-normal">Attach the PDF</Label>
            <Switch id="licdoc-attach" checked={attachPdf} onCheckedChange={setAttachPdf} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="licdoc-link" className="text-sm font-normal">Include a secure link</Label>
            <Switch id="licdoc-link" checked={includeLink} onCheckedChange={setIncludeLink} />
          </div>
          {includeLink && (
            <div className="space-y-1.5">
              <Label htmlFor="licdoc-expiry">Link works for (days)</Label>
              <Input
                id="licdoc-expiry" type="number" min={1} max={90} value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You can withdraw the link at any time from the issued copies list.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send copy"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
