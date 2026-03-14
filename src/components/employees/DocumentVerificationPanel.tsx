import { useState } from "react";
import {
  Shield, CheckCircle2, X, Eye, FileText, AlertTriangle, Loader2,
  Scan, Brain, ChevronDown, ChevronUp, Edit2, Info, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVerifyDocument, useRejectDocument, useLogDocumentAction } from "@/hooks/useDocumentVerification";
import { useExtractDocument, type ExtractedDocumentData, type ExtractionWarning } from "@/hooks/useDocumentExtraction";
import { useDocumentDownloadUrl, type EmployeeDocument } from "@/hooks/useEmployeeDocuments";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface DocumentVerificationPanelProps {
  documents: EmployeeDocument[];
  employeeId: string;
  tenantId: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  uploaded: { label: "Uploaded", color: "bg-muted text-muted-foreground", icon: FileText },
  extracted: { label: "Extracted", color: "bg-accent/10 text-accent-foreground", icon: Brain },
  pending_review: { label: "Pending Review", color: "bg-warning/10 text-warning", icon: AlertTriangle },
  pending_verification: { label: "Pending Verification", color: "bg-warning/10 text-warning", icon: AlertTriangle },
  verified: { label: "Verified", color: "bg-success/10 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: X },
  expired: { label: "Expired", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

const WARNING_ICONS: Record<string, string> = {
  low_image_quality: "📷",
  blurry_image: "🔍",
  cropped_document: "✂️",
  mrz_unreadable: "🔤",
  expiry_not_found: "📅",
  name_mismatch: "⚠️",
  document_type_unclear: "❓",
  partial_data: "📊",
  glare_detected: "✨",
  document_expired: "⏰",
};

const EXTRACTED_FIELD_LABELS: Record<string, string> = {
  document_type: "Document Type",
  full_name: "Full Name",
  surname: "Surname",
  given_names: "Given Names",
  document_number: "Document Number",
  nationality: "Nationality",
  date_of_birth: "Date of Birth",
  issue_date: "Issue Date",
  expiry_date: "Expiry Date",
  gender: "Gender",
};

export function DocumentVerificationPanel({ documents, employeeId, tenantId }: DocumentVerificationPanelProps) {
  const [selectedDoc, setSelectedDoc] = useState<EmployeeDocument | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState("in_person");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});

  const verifyDoc = useVerifyDocument();
  const rejectDoc = useRejectDocument();
  const logAction = useLogDocumentAction();
  const extractDoc = useExtractDocument();
  const qc = useQueryClient();

  const toggleExpanded = (docId: string) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      next.has(docId) ? next.delete(docId) : next.add(docId);
      return next;
    });
  };

  const handleExtract = async (doc: EmployeeDocument) => {
    await extractDoc.mutateAsync({ documentId: doc.id, tenantId });
  };

  const handleVerify = async () => {
    if (!selectedDoc) return;
    await verifyDoc.mutateAsync({
      documentId: selectedDoc.id,
      employeeId,
      tenantId,
      verificationMethod,
      notes: verificationNotes,
    });
    setVerifyDialogOpen(false);
    setVerificationNotes("");
    setSelectedDoc(null);
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectReason.trim()) return;
    await rejectDoc.mutateAsync({
      documentId: selectedDoc.id,
      employeeId,
      tenantId,
      reason: rejectReason,
    });
    setRejectDialogOpen(false);
    setRejectReason("");
    setSelectedDoc(null);
  };

  const handleView = (doc: EmployeeDocument) => {
    logAction.mutate({
      documentId: doc.id,
      employeeId,
      tenantId,
      action: "view",
    });
  };

  const handleSaveEditedFields = async (doc: EmployeeDocument) => {
    if (Object.keys(editedFields).length === 0) return;

    const existingData = (doc as any).extracted_data || {};
    const updatedData = { ...existingData, ...editedFields };

    const { error } = await supabase
      .from("employee_documents")
      .update({ extracted_data: updatedData, document_status: "pending_review" } as any)
      .eq("id", doc.id);

    if (error) {
      toast.error("Failed to save changes");
      return;
    }

    // Log audit
    logAction.mutate({
      documentId: doc.id,
      employeeId,
      tenantId,
      action: "admin_edited_extraction",
      metadata: { edited_fields: Object.keys(editedFields) },
    });

    toast.success("Extracted data updated");
    setEditedFields({});
    qc.invalidateQueries({ queryKey: ["employee_documents"] });
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground px-4">
        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">No documents to verify</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Upload documents first, then return here to verify them for right-to-work compliance.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {documents.map(doc => {
          const docAny = doc as any;
          const status = STATUS_MAP[docAny.document_status || "uploaded"] || STATUS_MAP.uploaded;
          const StatusIcon = status.icon;
          const extractedData: ExtractedDocumentData | null = docAny.extracted_data || null;
          const warnings: ExtractionWarning[] = docAny.extraction_warnings || [];
          const confidence: number | null = docAny.extraction_confidence;
          const source: string | null = docAny.extraction_source;
          const isExpanded = expandedDocs.has(doc.id);
          const canExtract = ["uploaded"].includes(docAny.document_status || "uploaded");
          const canVerify = ["uploaded", "extracted", "pending_review", "pending_verification"].includes(docAny.document_status || "uploaded");

          return (
            <div key={doc.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Document Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon className={cn("h-5 w-5 shrink-0",
                      status.color.includes("success") ? "text-success" :
                      status.color.includes("warning") ? "text-warning" :
                      status.color.includes("destructive") ? "text-destructive" :
                      "text-muted-foreground"
                    )} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.document_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{doc.document_type.replace(/_/g, " ")}</Badge>
                        <Badge className={cn("text-[10px]", status.color)}>{status.label}</Badge>
                        {confidence !== null && (
                          <Badge variant="outline" className={cn("text-[10px]",
                            confidence >= 0.7 ? "text-success border-success/30" :
                            confidence >= 0.4 ? "text-warning border-warning/30" :
                            "text-destructive border-destructive/30"
                          )}>
                            {Math.round(confidence * 100)}% conf
                          </Badge>
                        )}
                        {source && source.includes("mrz") && (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">MRZ</Badge>
                        )}
                      </div>
                      {doc.expires_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {new Date(doc.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {/* Extract Button */}
                    {canExtract && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8 p-0"
                        onClick={() => handleExtract(doc)}
                        disabled={extractDoc.isPending}
                        title="Extract document data"
                      >
                        {extractDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                      </Button>
                    )}
                    <DocumentViewButton doc={doc} onView={handleView} />
                    {canVerify && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-success hover:text-success hover:bg-success/10 h-8 w-8 p-0"
                          onClick={() => { setSelectedDoc(doc); setVerifyDialogOpen(true); }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          onClick={() => { setSelectedDoc(doc); setRejectDialogOpen(true); }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {/* Expand/collapse for extracted data */}
                    {(extractedData || warnings.length > 0) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => toggleExpanded(doc.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Warnings Summary (always visible if present) */}
                {warnings.length > 0 && !isExpanded && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {warnings.slice(0, 3).map((w, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className={cn("text-[10px] gap-1",
                          w.severity === "error" ? "text-destructive border-destructive/30" :
                          w.severity === "warning" ? "text-warning border-warning/30" :
                          "text-muted-foreground"
                        )}
                      >
                        <span>{WARNING_ICONS[w.code] || "⚠️"}</span>
                        {w.code.replace(/_/g, " ")}
                      </Badge>
                    ))}
                    {warnings.length > 3 && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        +{warnings.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Section — Extracted Data & Warnings */}
              {isExpanded && (
                <div className="border-t border-border">
                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <div className="px-4 py-3 bg-muted/30">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        Warnings & Flags
                      </p>
                      <div className="space-y-1.5">
                        {warnings.map((w, i) => (
                          <div
                            key={i}
                            className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                              w.severity === "error" ? "bg-destructive/5 border border-destructive/10 text-destructive" :
                              w.severity === "warning" ? "bg-warning/5 border border-warning/10 text-warning" :
                              "bg-muted border border-border text-muted-foreground"
                            )}
                          >
                            <span className="text-sm shrink-0 mt-px">{WARNING_ICONS[w.code] || "⚠️"}</span>
                            <span>{w.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extracted Fields */}
                  {extractedData && (
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          Extracted Data
                        </p>
                        <div className="flex items-center gap-1.5">
                          {source && (
                            <Badge variant="outline" className="text-[10px]">
                              Source: {source.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(EXTRACTED_FIELD_LABELS).map(([key, label]) => {
                          const value = (extractedData as any)[key];
                          if (!value && !editedFields[key]) return null;
                          const displayValue = editedFields[key] ?? value ?? "";
                          const isEdited = key in editedFields;
                          return (
                            <div key={key} className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{label}</Label>
                              <Input
                                value={displayValue}
                                onChange={(e) => setEditedFields(prev => ({ ...prev, [key]: e.target.value }))}
                                className={cn("h-8 text-sm", isEdited && "border-primary/50 bg-primary/5")}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* MRZ Data */}
                      {extractedData.mrz_data && (
                        <div className="mt-3 rounded-lg bg-muted/50 border border-border p-3">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                            MRZ Data (Machine Readable Zone)
                          </p>
                          <div className="space-y-1">
                            {extractedData.mrz_data.line1 && (
                              <p className="text-xs font-mono text-foreground break-all">{extractedData.mrz_data.line1}</p>
                            )}
                            {extractedData.mrz_data.line2 && (
                              <p className="text-xs font-mono text-foreground break-all">{extractedData.mrz_data.line2}</p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {extractedData.mrz_data.passport_number && (
                              <div>
                                <span className="text-[10px] text-muted-foreground">Passport #</span>
                                <p className="text-xs font-medium text-foreground">{extractedData.mrz_data.passport_number}</p>
                              </div>
                            )}
                            {extractedData.mrz_data.nationality && (
                              <div>
                                <span className="text-[10px] text-muted-foreground">Nationality</span>
                                <p className="text-xs font-medium text-foreground">{extractedData.mrz_data.nationality}</p>
                              </div>
                            )}
                            {extractedData.mrz_data.date_of_birth && (
                              <div>
                                <span className="text-[10px] text-muted-foreground">DOB</span>
                                <p className="text-xs font-medium text-foreground">{extractedData.mrz_data.date_of_birth}</p>
                              </div>
                            )}
                            {extractedData.mrz_data.expiry_date && (
                              <div>
                                <span className="text-[10px] text-muted-foreground">Expiry</span>
                                <p className="text-xs font-medium text-foreground">{extractedData.mrz_data.expiry_date}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Save edits button */}
                      {Object.keys(editedFields).length > 0 && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleSaveEditedFields(doc)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Save Changes
                          </Button>
                        </div>
                      )}

                      {/* Safety disclaimer */}
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          AI extraction assists verification only. Admin must confirm document authenticity.
                          Right to work documents require employer verification regardless of extraction results.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Footer */}
              {docAny.document_status === "rejected" && docAny.rejected_reason && (
                <div className="px-4 pb-3">
                  <div className="rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
                    <p className="text-xs text-destructive">Rejected: {docAny.rejected_reason}</p>
                  </div>
                </div>
              )}
              {docAny.document_status === "verified" && (
                <div className="px-4 pb-3">
                  <div className="rounded-lg bg-success/5 border border-success/10 px-3 py-2">
                    <p className="text-xs text-success">
                      Verified via {docAny.verification_method?.replace(/_/g, " ")} on {docAny.verification_date ? new Date(docAny.verification_date).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-success" />
              Verify Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm you have verified <strong>{selectedDoc?.document_name}</strong> against the original document.
            </p>

            {/* Right to work specific checks */}
            {selectedDoc?.document_type && ["right_to_work", "visa", "passport"].includes(selectedDoc.document_type) && (
              <div className="rounded-lg bg-warning/5 border border-warning/20 px-3 py-2.5">
                <p className="text-xs font-medium text-warning mb-1.5">Right to Work Compliance</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>☐ Original document seen in person or via certified copy</li>
                  <li>☐ Share code checked (if applicable)</li>
                  <li>☐ Document appears genuine and belongs to the employee</li>
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label>Verification Method</Label>
              <Select value={verificationMethod} onValueChange={setVerificationMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="video_call">Video Call</SelectItem>
                  <SelectItem value="certified_copy">Certified Copy</SelectItem>
                  <SelectItem value="digital_check">Digital Check (Share Code)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={verificationNotes}
                onChange={e => setVerificationNotes(e.target.value)}
                placeholder="Any notes about the verification..."
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-2 bg-success hover:bg-success/90" onClick={handleVerify} disabled={verifyDoc.isPending}>
                {verifyDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Verify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reject Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting <strong>{selectedDoc?.document_name}</strong>. The employee will be notified.
            </p>
            <div className="space-y-2">
              <Label>Reason for Rejection <span className="text-destructive">*</span></Label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g., Document is expired, image is blurry, wrong document type..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1 gap-2" onClick={handleReject} disabled={!rejectReason.trim() || rejectDoc.isPending}>
                {rejectDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DocumentViewButton({ doc, onView }: { doc: EmployeeDocument; onView: (doc: EmployeeDocument) => void }) {
  const { data: url } = useDocumentDownloadUrl(doc.file_path);

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => {
        onView(doc);
        if (url) window.open(url, "_blank");
      }}
    >
      <Eye className="h-4 w-4" />
    </Button>
  );
}
