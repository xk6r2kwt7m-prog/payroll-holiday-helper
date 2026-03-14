import { useState } from "react";
import { Shield, CheckCircle2, X, Eye, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVerifyDocument, useRejectDocument, useLogDocumentAction } from "@/hooks/useDocumentVerification";
import { useDocumentDownloadUrl, type EmployeeDocument } from "@/hooks/useEmployeeDocuments";
import { cn } from "@/lib/utils";

interface DocumentVerificationPanelProps {
  documents: EmployeeDocument[];
  employeeId: string;
  tenantId: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  uploaded: { label: "Uploaded", color: "bg-muted text-muted-foreground", icon: FileText },
  pending_verification: { label: "Pending Verification", color: "bg-warning/10 text-warning", icon: AlertTriangle },
  verified: { label: "Verified", color: "bg-success/10 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: X },
  expired: { label: "Expired", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

export function DocumentVerificationPanel({ documents, employeeId, tenantId }: DocumentVerificationPanelProps) {
  const [selectedDoc, setSelectedDoc] = useState<EmployeeDocument | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState("in_person");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const verifyDoc = useVerifyDocument();
  const rejectDoc = useRejectDocument();
  const logAction = useLogDocumentAction();

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

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {documents.map(doc => {
          const status = STATUS_MAP[(doc as any).document_status || "uploaded"] || STATUS_MAP.uploaded;
          const StatusIcon = status.icon;
          return (
            <div key={doc.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <StatusIcon className={cn("h-5 w-5 shrink-0", status.color.includes("success") ? "text-success" : status.color.includes("warning") ? "text-warning" : status.color.includes("destructive") ? "text-destructive" : "text-muted-foreground")} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.document_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{doc.document_type.replace(/_/g, " ")}</Badge>
                      <Badge className={cn("text-[10px]", status.color)}>{status.label}</Badge>
                    </div>
                    {doc.expires_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {new Date(doc.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <DocumentViewButton doc={doc} onView={handleView} />
                  {((doc as any).document_status === "uploaded" || (doc as any).document_status === "pending_verification") && (
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
                </div>
              </div>
              {(doc as any).document_status === "rejected" && (doc as any).rejected_reason && (
                <div className="mt-2 rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
                  <p className="text-xs text-destructive">Rejected: {(doc as any).rejected_reason}</p>
                </div>
              )}
              {(doc as any).document_status === "verified" && (
                <div className="mt-2 rounded-lg bg-success/5 border border-success/10 px-3 py-2">
                  <p className="text-xs text-success">
                    Verified via {(doc as any).verification_method?.replace(/_/g, " ")} on {(doc as any).verification_date ? new Date((doc as any).verification_date).toLocaleDateString() : "—"}
                  </p>
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
