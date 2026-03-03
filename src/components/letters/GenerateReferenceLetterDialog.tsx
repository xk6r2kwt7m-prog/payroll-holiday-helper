import { useState } from "react";
import { FileText, Download, Save } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { ReferenceLetterPDF, type ReferenceLetterData } from "./ReferenceLetterPDF";
import { SignaturePad } from "./SignaturePad";

interface GenerateReferenceLetterDialogProps {
  employeeId: string;
  employeeName: string;
  defaultJobTitle?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  trigger?: React.ReactNode;
}

export function GenerateReferenceLetterDialog({
  employeeId,
  employeeName,
  defaultJobTitle = "",
  defaultStartDate = "",
  defaultEndDate = "",
  trigger,
}: GenerateReferenceLetterDialogProps) {
  const [open, setOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState(defaultJobTitle);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [letterBody, setLetterBody] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const { data: settings } = useCompanySettings();
  const queryClient = useQueryClient();

  const companyName = settings?.company_name || "Ugly Dumpling";
  const companyAddress = settings?.address || "";
  const companyEmail = settings?.company_email || "";

  const buildLetterData = (): ReferenceLetterData => {
    const fmtDate = (d: string) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

    // Split body into paragraphs (double newline or single newline)
    const paragraphs = letterBody
      .split(/\n\n|\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    // If user left body empty, use a default confirmation paragraph
    const bodyParagraphs =
      paragraphs.length > 0
        ? paragraphs
        : [
            `This letter confirms that ${employeeName} was employed at ${companyName} as ${jobTitle || "a team member"} from ${fmtDate(startDate)} to ${fmtDate(endDate)}.`,
            `We appreciate their contribution to our team and wish them every success in their future career.`,
          ];

    return {
      employeeName,
      jobTitle: jobTitle || "Team Member",
      startDate,
      endDate,
      bodyParagraphs,
      signerName: signerName || "Management",
      signerTitle: signerTitle || "Operations Manager",
      companyName,
      legalName: "UD Restaurants Ltd",
      companyAddress,
      companyEmail,
      logoUrl: settings?.company_logo_url || undefined,
      letterDate,
      signatureImageUrl: signatureDataUrl || undefined,
    };
  };

  const handleDownload = async () => {
    try {
      const data = buildLetterData();
      const blob = await pdf(<ReferenceLetterPDF data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reference_Letter_${employeeName.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Letter downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const handleSaveToDocuments = async () => {
    setSaving(true);
    try {
      const data = buildLetterData();
      const blob = await pdf(<ReferenceLetterPDF data={data} />).toBlob();
      const file = new File([blob], `Reference_Letter_${employeeName.replace(/\s+/g, "_")}.pdf`, {
        type: "application/pdf",
      });

      const { data: { user } } = await supabase.auth.getUser();
      const fileName = `${employeeId}/${Date.now()}_reference_letter.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("employee_documents").insert({
        employee_id: employeeId,
        document_type: "other" as const,
        document_name: `Reference Letter – ${new Date(letterDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`,
        file_path: fileName,
        file_size: file.size,
        mime_type: "application/pdf",
        notes: `Reference letter for ${jobTitle}. Signed by ${signerName}, ${signerTitle}.`,
        uploaded_by: user?.id,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["employee_documents", employeeId] });
      toast.success("Letter saved to employee documents");
      setOpen(false);
    } catch {
      toast.error("Failed to save letter");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Reference Letter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            Reference Letter for {employeeName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Kitchen Food Preparation Assistant" />
            </div>
            <div className="space-y-2">
              <Label>Letter Date</Label>
              <Input type="date" value={letterDate} onChange={(e) => setLetterDate(e.target.value)} />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employment Start</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Employment End</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>Letter Body</Label>
            <Textarea
              value={letterBody}
              onChange={(e) => setLetterBody(e.target.value)}
              placeholder="Paste or type the full letter content here. Each paragraph will be formatted separately..."
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              Separate paragraphs with blank lines. Leave empty for a default confirmation letter.
            </p>
          </div>

          {/* Signer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Signer Name</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="e.g. Aderito Barros" />
            </div>
            <div className="space-y-2">
              <Label>Signer Title</Label>
              <Input value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} placeholder="e.g. Operations Manager" />
            </div>
          </div>

          {/* Signature */}
          <div className="space-y-2">
            <Label>Your Signature</Label>
            <div className="relative">
              <Input
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Type your name to sign..."
                className="text-lg h-14 font-serif italic"
                style={{ fontFamily: "'Dancing Script', 'Georgia', cursive" }}
              />
            </div>
            {signatureText && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">Signature preview</p>
                <p className="text-2xl italic text-card-foreground" style={{ fontFamily: "'Dancing Script', 'Georgia', cursive" }}>
                  {signatureText}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Type your name as you'd like it to appear as a handwritten signature on the PDF.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button className="flex-1 gap-2" onClick={handleSaveToDocuments} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save to Documents"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
