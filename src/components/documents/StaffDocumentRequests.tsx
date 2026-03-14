import { useState, useRef, useEffect } from "react";
import { format, isPast, differenceInDays } from "date-fns";
import {
  Upload, FileText, Clock, CheckCircle2, X, AlertTriangle,
  Eye, ChevronRight, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useMyDocumentRequests,
  useMarkRequestViewed,
  useFulfillDocumentRequest,
  type DocumentRequest,
} from "@/hooks/useDocumentRequests";
import { useUploadDocument, DOCUMENT_TYPES, type DocumentType } from "@/hooks/useEmployeeDocuments";
import { useExtractDocument } from "@/hooks/useDocumentExtraction";
import { useTenant } from "@/hooks/useTenant";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_DISPLAY: Record<string, { label: string; color: string; icon: any }> = {
  requested: { label: "Action Needed", color: "bg-warning/10 text-warning", icon: Send },
  viewed: { label: "Pending Upload", color: "bg-accent/10 text-accent-foreground", icon: Eye },
  uploaded: { label: "Under Review", color: "bg-primary/10 text-primary", icon: Clock },
  pending_review: { label: "Under Review", color: "bg-primary/10 text-primary", icon: Clock },
  verified: { label: "Verified", color: "bg-success/10 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected — Re-upload", color: "bg-destructive/10 text-destructive", icon: X },
};

interface Props {
  employeeId: string;
}

export function StaffDocumentRequests({ employeeId }: Props) {
  const { tenantId } = useTenant();
  const { data: requests = [], isLoading } = useMyDocumentRequests(employeeId);
  const markViewed = useMarkRequestViewed();
  const fulfillRequest = useFulfillDocumentRequest();
  const uploadDocument = useUploadDocument();
  const extractDoc = useExtractDocument();

  const [uploadSheet, setUploadSheet] = useState(false);
  const [activeRequest, setActiveRequest] = useState<DocumentRequest | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRequests = requests.filter(r => !["verified", "cancelled"].includes(r.status));
  const completedRequests = requests.filter(r => r.status === "verified");

  const openUploadSheet = (req: DocumentRequest) => {
    setActiveRequest(req);
    setUploadSheet(true);
    setFile(null);
    setDocumentName(req.request_title);
    setExpiresAt("");

    // Mark as viewed if still in requested status
    if (req.status === "requested") {
      markViewed.mutate({ requestId: req.id });
    }
  };

  const handleFile = (f: File) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) {
      toast.error("Please upload a PDF or image file");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error("File too large (max 50MB)");
      return;
    }
    setFile(f);
    if (!documentName) setDocumentName(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleSubmit = async () => {
    if (!file || !activeRequest || !tenantId) return;

    try {
      // Map document_type to the enum
      const typeMap: Record<string, DocumentType> = {
        passport: "passport",
        visa: "visa",
        right_to_work: "right_to_work",
        driving_license: "driving_license",
        bank_details: "bank_statement",
        p45: "p45",
        training_certificate: "other",
        food_hygiene: "other",
        share_code: "right_to_work",
        proof_of_address: "other",
        signed_contract: "contract",
        policy_acknowledgement: "other",
        sick_note: "other",
        other: "other",
      };
      const docType = typeMap[activeRequest.document_type] || "other";

      const result = await uploadDocument.mutateAsync({
        employeeId,
        file,
        documentType: docType,
        documentName: documentName.trim() || activeRequest.request_title,
        expiresAt: expiresAt || undefined,
      });

      // Link to request
      if (result?.id) {
        await fulfillRequest.mutateAsync({
          requestId: activeRequest.id,
          documentId: result.id,
          tenantId,
          employeeId,
        });

        // Auto-extract if image/PDF
        const isExtractable = file.type.startsWith("image/") || file.type === "application/pdf";
        if (isExtractable) {
          extractDoc.mutate({ documentId: result.id, tenantId });
        }
      }

      setUploadSheet(false);
      setActiveRequest(null);
    } catch {
      toast.error("Failed to upload document");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading requests...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl bg-success/5 border border-success/15 p-5 text-center">
        <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-foreground mb-0.5">No outstanding document requests</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          You're all caught up. If your manager requests any documents, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Document Requests
            </h2>
            <Badge variant="outline" className="text-[10px] text-warning border-warning/30">
              {activeRequests.length} pending
            </Badge>
          </div>
          <div className="divide-y divide-border">
            {activeRequests.map(req => {
              const displayStatus = req.due_date && isPast(new Date(req.due_date)) && ["requested", "viewed"].includes(req.status)
                ? "overdue"
                : req.status;
              const statusInfo = STATUS_DISPLAY[req.status] || STATUS_DISPLAY.requested;
              const isOverdue = displayStatus === "overdue";
              const daysLeft = req.due_date ? differenceInDays(new Date(req.due_date), new Date()) : null;
              const canUpload = ["requested", "viewed", "rejected"].includes(req.status);

              return (
                <button
                  key={req.id}
                  onClick={() => canUpload && openUploadSheet(req)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 transition-colors min-h-[56px]",
                    canUpload ? "active:bg-muted" : "cursor-default"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{req.request_title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={cn("text-[10px]", isOverdue ? "bg-destructive/10 text-destructive" : statusInfo.color)}>
                          {isOverdue ? "Overdue" : statusInfo.label}
                        </Badge>
                        {req.priority === "urgent" && (
                          <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Urgent</Badge>
                        )}
                        {req.priority === "high" && (
                          <Badge variant="outline" className="text-[10px] text-warning border-warning/30">High</Badge>
                        )}
                      </div>
                      {req.due_date && (
                        <p className={cn("text-[11px] mt-1",
                          isOverdue ? "text-destructive" :
                          daysLeft !== null && daysLeft <= 3 ? "text-warning" :
                          "text-muted-foreground"
                        )}>
                          {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                          Due: {format(new Date(req.due_date), "d MMM yyyy")}
                          {daysLeft !== null && daysLeft < 0 && ` (${Math.abs(daysLeft)}d overdue)`}
                        </p>
                      )}
                      {req.request_description && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{req.request_description}</p>
                      )}
                      {req.rejection_reason && (
                        <p className="text-[11px] text-destructive mt-1">
                          ⚠️ {req.rejection_reason}
                        </p>
                      )}
                    </div>
                    {canUpload && (
                      <div className="shrink-0 flex items-center gap-1 text-primary">
                        <Upload className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedRequests.length > 0 && (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Completed</h2>
          </div>
          <div className="divide-y divide-border">
            {completedRequests.slice(0, 5).map(req => (
              <div key={req.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{req.request_title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Verified {req.verified_at ? format(new Date(req.verified_at), "d MMM yyyy") : ""}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Sheet */}
      <Sheet open={uploadSheet} onOpenChange={setUploadSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">
              {activeRequest?.status === "rejected" ? "Re-upload Document" : "Upload Document"}
            </SheetTitle>
          </SheetHeader>

          {activeRequest && (
            <div className="space-y-4 pt-4">
              {/* Request info */}
              <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1">
                <p className="text-sm font-medium text-foreground">{activeRequest.request_title}</p>
                {activeRequest.request_description && (
                  <p className="text-xs text-muted-foreground">{activeRequest.request_description}</p>
                )}
                {activeRequest.rejection_reason && (
                  <p className="text-xs text-destructive mt-1">
                    Previous rejection: {activeRequest.rejection_reason}
                  </p>
                )}
              </div>

              {/* File picker */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              {!file ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center active:bg-muted transition-colors"
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Tap to select file</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF or image, max 50MB</p>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-success/5 border border-success/20 p-4">
                  <FileText className="h-8 w-8 text-success shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Document Name */}
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input value={documentName} onChange={(e) => setDocumentName(e.target.value)} />
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <Label>Expiry Date (if applicable)</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>

              {/* Submit */}
              <Button
                className="w-full h-12 text-base"
                disabled={!file || uploadDocument.isPending || fulfillRequest.isPending}
                onClick={handleSubmit}
              >
                {uploadDocument.isPending ? "Uploading..." : "Submit Document"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
